"""
camera.py - Camera monitoring for GuardianLens
Handles pose detection, fall alerts, and pause/resume for browser face enrollment.
"""
import cv2
import threading
import time
import base64
import numpy as np
from datetime import datetime
import os, sys

# Attempt to import mediapipe; gracefully degrade if unavailable
try:
    import mediapipe as mp
    from mediapipe.tasks import python
    from mediapipe.tasks.python import vision
    MP_AVAILABLE = True
except ImportError:
    MP_AVAILABLE = False
    print("[camera] mediapipe not available. Pose detection disabled.")

# ── Shared state ──────────────────────────────────────
_lock = threading.Lock()

_snapshot = {
    "image": None,
    "pose": "unknown",
    "status": "safe",
    "timestamp": "00:00:00",
    "camera_available": False,
    "fall_active": False,
}

_latest_jpeg: bytes | None = None

_paused = threading.Event()
_stop = threading.Event()
_monitor_thread = None
_start_time = time.time()


def get_snapshot() -> dict:
    with _lock:
        return dict(_snapshot)


def get_latest_frame_bytes() -> bytes | None:
    with _lock:
        return _latest_jpeg


def pause_camera():
    _paused.set()


def resume_camera():
    _paused.clear()


def is_paused() -> bool:
    return _paused.is_set()


# ── Pose Classification ───────────────────────────────────

def _classify_pose(landmarks) -> str:
    """
    Classify pose as standing / sitting / lying / unknown.

    Lying  : body is nearly horizontal — x_span/y_span > 1.3 AND
             BOTH knees (or both ankles) are visible (avoids camera tilt FP).
    Sitting: hips present, knee Y is close to hip Y (bent legs), OR
             no knees visible but shoulder-to-hip ratio looks compressed.
    Standing: default when upright.
    """
    if not landmarks:
        return "unknown"

    lm = landmarks.landmark

    def get_lm(idx, min_vis=0.4):
        l = lm[idx]
        vis = getattr(l, 'visibility', 1.0)
        return l if vis > min_vis else None

    nose       = get_lm(0)
    l_shoulder = get_lm(11)
    r_shoulder = get_lm(12)
    l_hip      = get_lm(23)
    r_hip      = get_lm(24)
    l_knee     = get_lm(25)
    r_knee     = get_lm(26)
    l_ankle    = get_lm(27)
    r_ankle    = get_lm(28)

    key_points = [p for p in [
        nose, l_shoulder, r_shoulder, l_hip, r_hip,
        l_knee, r_knee, l_ankle, r_ankle
    ] if p is not None]

    if len(key_points) < 4:
        return "unknown"

    if l_shoulder is None and r_shoulder is None:
        return "unknown"
    if l_hip is None and r_hip is None:
        return "unknown"

    xs = [p.x for p in key_points]
    ys = [p.y for p in key_points]
    x_span = max(xs) - min(xs)
    y_span = max(ys) - min(ys)

    # ── Compute key Y positions (needed for all checks below) ──────────
    shoulder_y = sum(p.y for p in [l_shoulder, r_shoulder] if p) / \
                 sum(1 for p in [l_shoulder, r_shoulder] if p)
    hip_y      = sum(p.y for p in [l_hip, r_hip] if p) / \
                 sum(1 for p in [l_hip, r_hip] if p)

    # ── Lying check ─────────────────────────────────────────────────────
    both_knees_visible = (l_knee is not None and r_knee is not None)
    both_ankles_visible = (l_ankle is not None and r_ankle is not None)
    reliable_lower_body = both_knees_visible or both_ankles_visible

    if reliable_lower_body and x_span > 0 and y_span > 0:
        ratio = x_span / y_span
        if ratio > 1.3:
            return "lying"

    # ── Upper-body-only lying check (webcam fallback) ────────────────────
    if not reliable_lower_body and l_shoulder and r_shoulder:
        shoulder_diff_y = abs(l_shoulder.y - r_shoulder.y)
        shoulder_diff_x = abs(l_shoulder.x - r_shoulder.x)
        # Very sensitive — any significant tilt triggers lying
        if shoulder_diff_x > 0.08 and shoulder_diff_y < 0.18:
            return "lying"
        if x_span > 0 and y_span > 0 and (x_span / y_span) > 0.9:
            return "lying"

    # ── Sitting check ────────────────────────────────────────────────────
    # Case 1: knees visible and roughly same height as hips (bent legs)
    if l_knee is not None or r_knee is not None:
        knee_vals = [p.y for p in [l_knee, r_knee] if p is not None]
        knee_y = sum(knee_vals) / len(knee_vals)
        hip_knee_diff = abs(hip_y - knee_y)
        # Relaxed threshold — 0.25 works for chairs with varying camera angles
        if hip_knee_diff < 0.25:
            return "sitting"

    # Case 2: no knees visible but shoulder-to-hip vertical span is compressed
    # (person sitting close to camera or legs out of frame)
    shoulder_hip_span = abs(hip_y - shoulder_y)
    if shoulder_hip_span < 0.20 and y_span < 0.45:
        return "sitting"

    return "standing"


# ── Fall Detection ────────────────────────────────────────

_prev_pose = "unknown"
_was_upright = False
_upright_lost_time: float | None = None
_fall_candidate_time: float | None = None
_fall_active = False
_safe_start_time: float | None = None
_prev_shoulder_y: float | None = None

FALL_CONFIRM_SECONDS    = 0.5   # Lying sustained this long → fall confirmed
SAFE_CONFIRM_SECONDS    = 4.0   # Must see standing/sitting this long to clear alert


def _detect_fall(pose: str, log_fn, shoulder_y: float | None = None) -> bool:
    """
    Fall detector — ONLY triggers when pose == 'lying' is sustained.

    The disappear-from-frame signal has been intentionally removed because
    in a typical webcam/laptop setup the full body is rarely visible, so
    'unknown' is the baseline state and caused constant false positives.

    Recovery: person must be seen standing or sitting for SAFE_CONFIRM_SECONDS.
    """
    global _prev_pose, _fall_candidate_time, _fall_active, _safe_start_time

    now = time.time()
    is_safe_pose = pose in ('standing', 'sitting')
    is_lying     = pose == 'lying'

    # ── Fall candidate: ONLY lying pose ───────────────────
    if is_lying:
        if not _fall_active:
            _safe_start_time = None
            if _fall_candidate_time is None:
                _fall_candidate_time = now
            elif now - _fall_candidate_time >= FALL_CONFIRM_SECONDS:
                _fall_active = True
                _fall_candidate_time = None
                log_fn("Fall Detected!", "Person has fallen and is lying on the ground.", "🚨")
                # Send external notifications (SMS/WhatsApp/Telegram)
                try:
                    from backend import notifications
                    notifications.send_fall_alert()
                except Exception:
                    pass
                return True
    else:
        # Not lying — reset the candidate timer
        _fall_candidate_time = None

        # ── Recovery logic ─────────────────────────────────
        # Only count recovery on clearly visible safe poses.
        # 'unknown' frames are ignored so momentary occlusion
        # while getting up doesn't restart the timer.
        if _fall_active:
            if is_safe_pose:
                if _safe_start_time is None:
                    _safe_start_time = now
                elif now - _safe_start_time >= SAFE_CONFIRM_SECONDS:
                    _fall_active = False
                    _safe_start_time = None
                    log_fn("Fall Cleared", "Person has recovered and is upright.", "✅")
        else:
            if is_safe_pose:
                _safe_start_time = None

    _prev_pose = pose
    return False


# ── Monitor Thread ─────────────────────────────────────────

def _monitor_loop(log_activity_fn):
    global _snapshot

    try:
        cap = None
        pose_detector = None

        if MP_AVAILABLE:
            model_path = os.path.join(os.path.dirname(__file__), '..', 'pose_landmarker_lite.task')
            if os.path.exists(model_path):
                base_options = python.BaseOptions(model_asset_path=model_path)
                options = vision.PoseLandmarkerOptions(
                    base_options=base_options,
                    running_mode=vision.RunningMode.IMAGE
                )
                pose_detector = vision.PoseLandmarker.create_from_options(options)
            else:
                print(f"[camera] Model not found at {model_path}. Pose detection disabled.")

        raw_url = os.environ.get('CAMERA_URL', '0')
        camera_index = int(raw_url) if raw_url.isdigit() else raw_url

        while not _stop.is_set():

            # ── Pause handling ──────────────────────────────
            if _paused.is_set():
                if cap is not None:
                    cap.release()
                    cap = None
                with _lock:
                    _snapshot['camera_available'] = False
                    _snapshot['image'] = None
                time.sleep(0.5)
                continue

            # ── Open camera if needed ───────────────────────
            if cap is None or not cap.isOpened():
                if isinstance(camera_index, int):
                    # Try without DSHOW first — DSHOW can give noise on Windows
                    cap = cv2.VideoCapture(camera_index)
                    if not cap.isOpened():
                        cap = cv2.VideoCapture(camera_index, cv2.CAP_DSHOW)
                else:
                    cap = cv2.VideoCapture(camera_index)

                if not cap.isOpened():
                    with _lock:
                        _snapshot['camera_available'] = False
                        _snapshot['timestamp'] = datetime.now().strftime('%H:%M:%S')
                    time.sleep(2)
                    continue

                # Set MJPEG + explicit resolution to avoid noise on Windows
                cap.set(cv2.CAP_PROP_FOURCC, cv2.VideoWriter_fourcc(*'MJPG'))
                cap.set(cv2.CAP_PROP_FRAME_WIDTH, 640)
                cap.set(cv2.CAP_PROP_FRAME_HEIGHT, 480)
                cap.set(cv2.CAP_PROP_FPS, 30)
                cap.set(cv2.CAP_PROP_BUFFERSIZE, 1)
                # Warm up
                for _ in range(10):
                    cap.read()

            ret, frame = cap.read()
            if not ret:
                cap.release()
                cap = None
                time.sleep(1)
                continue

            pose_label = "unknown"
            shoulder_y_val = None

            # ── Pose detection ──────────────────────────────
            if pose_detector is not None:
                rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
                mp_image = mp.Image(image_format=mp.ImageFormat.SRGB, data=rgb)
                results = pose_detector.detect(mp_image)

                if results.pose_landmarks:
                    landmarks = results.pose_landmarks[0]

                    # Extract shoulder Y for motion tracking
                    try:
                        l_sh = landmarks[11]
                        r_sh = landmarks[12]
                        if getattr(l_sh, 'visibility', 0) > 0.3 or getattr(r_sh, 'visibility', 0) > 0.3:
                            shoulder_y_val = (l_sh.y + r_sh.y) / 2.0
                    except Exception:
                        pass

                    class DummyLandmarkList:
                        pass
                    dummy = DummyLandmarkList()
                    dummy.landmark = landmarks

                    pose_label = _classify_pose(dummy)
                    _detect_fall(pose_label, log_activity_fn, shoulder_y=shoulder_y_val)

                    # Draw skeleton — red if fall active, pink otherwise
                    skel_color = (0, 0, 255) if _fall_active else (255, 20, 147)
                    dot_color  = (0, 80, 255) if _fall_active else (0, 255, 200)
                    h, w, _ = frame.shape
                    connections = [
                        (11, 12), (11, 13), (13, 15), (12, 14), (14, 16),
                        (11, 23), (12, 24), (23, 24), (23, 25), (25, 27),
                        (24, 26), (26, 28)
                    ]
                    for s, e in connections:
                        if s < len(landmarks) and e < len(landmarks):
                            pt1 = (int(landmarks[s].x * w), int(landmarks[s].y * h))
                            pt2 = (int(landmarks[e].x * w), int(landmarks[e].y * h))
                            cv2.line(frame, pt1, pt2, skel_color, 2)
                    for lm in landmarks:
                        cv2.circle(frame, (int(lm.x * w), int(lm.y * h)), 3, dot_color, -1)

                    label = "!!! FALL DETECTED !!!" if _fall_active else "POSE: STANDING"
                    cv2.putText(frame, label, (10, 30), cv2.FONT_HERSHEY_SIMPLEX, 0.8,
                                (0, 0, 255) if _fall_active else (0, 255, 200), 2)

                else:
                    # No landmarks — call detector with 'unknown' so disappearance signal fires
                    _detect_fall("unknown", log_activity_fn, shoulder_y=None)
                    if _fall_active:
                        cv2.putText(frame, "!!! FALL DETECTED !!!", (10, 30),
                                    cv2.FONT_HERSHEY_SIMPLEX, 0.8, (0, 0, 255), 2)

            # ── Encode frame ────────────────────────────────
            _, buf = cv2.imencode('.jpg', frame, [cv2.IMWRITE_JPEG_QUALITY, 70])
            jpeg_bytes = buf.tobytes()
            b64 = 'data:image/jpeg;base64,' + base64.b64encode(jpeg_bytes).decode()

            with _lock:
                global _latest_jpeg
                _latest_jpeg = jpeg_bytes
                _snapshot.update({
                    "image": b64,
                    "pose": pose_label,
                    "status": "alert" if _fall_active else "safe",
                    "timestamp": datetime.now().strftime('%H:%M:%S'),
                    "camera_available": True,
                    "fall_active": _fall_active,
                })

            time.sleep(0.05)  # ~20 FPS

    except Exception as e:
        import traceback
        with _lock:
            _snapshot['timestamp'] = f"CRASH: {str(e)}"
            _snapshot['pose'] = traceback.format_exc()
    finally:
        if cap is not None:
            cap.release()
        if pose_detector is not None:
            pose_detector.close()


def start_monitor(log_activity_fn=None):
    global _monitor_thread, _stop
    _stop.clear()
    if log_activity_fn is None:
        log_activity_fn = lambda *a, **kw: None
    _monitor_thread = threading.Thread(
        target=_monitor_loop,
        args=(log_activity_fn,),
        daemon=True,
        name="CameraMonitor",
    )
    _monitor_thread.start()


def stop_monitor():
    _stop.set()
    if _monitor_thread:
        _monitor_thread.join(timeout=5)


def get_hours_monitored() -> float:
    return (time.time() - _start_time) / 3600
