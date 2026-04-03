"""
main.py - FastAPI backend for GuardianLens
Run: uvicorn backend.main:app --host 0.0.0.0 --port 8000 --reload
  OR from root: python -m uvicorn backend.main:app --reload
"""
import base64
import os
from datetime import datetime

# Load .env file automatically if present
try:
    from dotenv import load_dotenv
    load_dotenv()
except ImportError:
    pass

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from typing import Optional, AsyncGenerator
import asyncio

from backend import database as db
from backend import camera
from backend import ai_helper

# ── App setup ──────────────────────────────────────────────
app = FastAPI(title="GuardianLens API")

# Track which reminder IDs have already been notified (resets on restart)
_notified_reminders: set = set()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
async def on_startup():
    db.init_db()
    camera.start_monitor(log_activity_fn=db.log_activity)
    db.log_activity("System Started", "GuardianLens monitoring is now active.", "🛡️")


@app.on_event("shutdown")
async def on_shutdown():
    camera.stop_monitor()


# ── Models ────────────────────────────────────────────────

class NewMember(BaseModel):
    name: str
    role: str = "family"
    age: int = 0
    condition: str = ""
    avatar: str = "👤"


class EnrollFaceRequest(BaseModel):
    image: str  # base64 data URL: "data:image/jpeg;base64,..."


class NewEvent(BaseModel):
    title: str
    description: str = ""
    date: str
    time: str
    type: str = "other"


class VoiceRequest(BaseModel):
    message: str


class ChatRequest(BaseModel):
    message: str


class NotificationConfig(BaseModel):
    twilio_sid: str = ""
    twilio_token: str = ""
    phone_from: str = ""
    phone_to: str = ""
    whatsapp_enabled: bool = False
    telegram_token: str = ""
    telegram_chat_id: str = ""


# ── Stats ──────────────────────────────────────────────────

@app.get("/api/debug/pose")
def debug_pose():
    snap = camera.get_snapshot()
    import backend.camera as cam
    return {
        "pose": snap.get("pose"),
        "status": snap.get("status"),
        "fall_active": snap.get("fall_active"),
        "camera_available": snap.get("camera_available"),
        "fall_candidate_time": cam._fall_candidate_time,
        "safe_start_time": cam._safe_start_time,
    }


def get_stats():
    snap = camera.get_snapshot()
    activities = db.get_recent_activity(1)
    last_act = activities[0]['title'] + " at " + activities[0]['time'] if activities else "No activity yet"
    alerts = db.get_alerts_today()
    return {
        "camera_available": snap["camera_available"],
        "hours_monitored": round(camera.get_hours_monitored(), 2),
        "alerts_today": alerts,
        "status": snap["status"],
        "statusLabel": "FALL DETECTED" if snap["status"] == "alert" else "All Clear",
        "medicationAdherence": 100,
        "lastActivity": last_act,
    }


# ── Snapshot ──────────────────────────────────────────────

@app.get("/api/snapshot")
def get_snapshot():
    return camera.get_snapshot()


# ── Live Feed (MJPEG stream) ──────────────────────────────

async def _mjpeg_generator():
    """Yields MJPEG frames continuously at ~20 FPS."""
    boundary = b'--frame\r\nContent-Type: image/jpeg\r\n\r\n'
    while True:
        frame = camera.get_latest_frame_bytes()
        if frame:
            yield boundary + frame + b'\r\n'
        await asyncio.sleep(0.05)  # ~20 FPS


@app.get("/api/live-feed")
async def live_feed():
    """MJPEG stream endpoint — open directly in <img src=...> or browser."""
    return StreamingResponse(
        _mjpeg_generator(),
        media_type='multipart/x-mixed-replace; boundary=frame',
        headers={
            'Cache-Control': 'no-cache',
            'Connection': 'keep-alive',
        }
    )


# ── Voice check-in ────────────────────────────────────────

@app.post("/api/voice")
def send_voice(req: VoiceRequest):
    """Log voice message and optionally use TTS (stub)."""
    db.log_activity("Voice Message Sent", req.message, "🎙️")
    return {"ok": True}


# ── Camera pause/resume ──────────────────────────────────

@app.post("/api/camera/pause")
def pause_camera():
    camera.pause_camera()
    return {"ok": True, "paused": True}


@app.post("/api/camera/resume")
def resume_camera():
    camera.resume_camera()
    return {"ok": True, "paused": False}


# ── Members ────────────────────────────────────────────────

@app.get("/api/members")
def list_members():
    return db.get_all_members()


@app.post("/api/members", status_code=201)
def create_member(member: NewMember):
    db.add_member(
        name=member.name,
        role=member.role,
        age=member.age,
        condition=member.condition,
        avatar=member.avatar,
    )
    db.log_activity("Member Added", f"{member.name} was enrolled.", "👤")
    return {"ok": True}


@app.delete("/api/members/{member_id}")
def remove_member(member_id: int):
    db.delete_member(member_id)
    return {"ok": True}


@app.post("/api/members/{member_id}/enroll-face")
def enroll_face(member_id: int, req: EnrollFaceRequest):
    """Save a face image (base64 data URL) for the given member."""
    try:
        # Strip data URL prefix: "data:image/jpeg;base64,<data>"
        image_str = req.image
        if "," in image_str:
            image_str = image_str.split(",", 1)[1]

        image_bytes = base64.b64decode(image_str)
        if len(image_bytes) < 1000:
            raise HTTPException(status_code=400, detail="Image too small — please retake.")

        db.enroll_member_face(member_id, image_bytes)
        db.log_activity("Face Enrolled", f"Member ID {member_id} face successfully enrolled.", "😊")
        return {"ok": True, "message": "Face enrolled successfully."}

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to save face: {str(e)}")


# ── Calendar ──────────────────────────────────────────────

@app.get("/api/calendar")
def list_events():
    return db.get_all_events()


@app.post("/api/calendar", status_code=201)
def add_event(event: NewEvent):
    db.add_event(
        title=event.title,
        description=event.description,
        date=event.date,
        time=event.time,
        event_type=event.type,
    )
    return {"ok": True}


@app.patch("/api/calendar/{event_id}/toggle")
def toggle_event(event_id: int):
    db.toggle_event(event_id)
    return {"ok": True}


@app.delete("/api/calendar/{event_id}")
def delete_event(event_id: int):
    db.delete_event(event_id)
    return {"ok": True}


# ── Activity ──────────────────────────────────────────────

@app.get("/api/activity")
def get_activity(limit: int = 20):
    activities = db.get_recent_activity(limit)
    return {"activities": activities}


# ── Chat ──────────────────────────────────────────────────

@app.get("/api/chat/history")
def chat_history():
    return db.get_chat_history()


@app.post("/api/chat")
def chat(req: ChatRequest):
    db.save_chat_message("user", req.message)

    # Gather context
    calendar_events = db.get_all_events()
    recent_activities = db.get_recent_activity(10)

    # Get AI response
    response = ai_helper.ask_ai(req.message, calendar_events, recent_activities)
    now = datetime.now().strftime('%I:%M %p')

    db.save_chat_message("assistant", response)
    return {"response": response, "time": now}


# ── Notification Config ───────────────────────────────────

@app.get("/api/notifications/config")
def get_notif_config():
    cfg = db.get_notification_config()
    # Mask secrets before sending to frontend
    if cfg.get('twilio_token'):
        cfg['twilio_token'] = '••••••••'
    if cfg.get('telegram_token'):
        cfg['telegram_token'] = '••••••••'
    return cfg


@app.post("/api/notifications/config")
def save_notif_config(cfg: NotificationConfig):
    existing = db.get_notification_config()
    # Don't overwrite masked values
    twilio_token = existing.get('twilio_token', '') if cfg.twilio_token == '••••••••' else cfg.twilio_token
    telegram_token = existing.get('telegram_token', '') if cfg.telegram_token == '••••••••' else cfg.telegram_token
    db.save_notification_config(
        twilio_sid=cfg.twilio_sid,
        twilio_token=twilio_token,
        phone_from=cfg.phone_from,
        phone_to=cfg.phone_to,
        whatsapp_enabled=cfg.whatsapp_enabled,
        telegram_token=telegram_token,
        telegram_chat_id=cfg.telegram_chat_id,
    )
    return {"ok": True}


@app.post("/api/notifications/test")
def test_notification():
    from backend import notifications
    # Bypass cooldown for test, and run synchronously so errors surface
    cfg = db.get_notification_config()
    import requests as req
    errors = []
    if cfg.get('telegram_token') and cfg.get('telegram_chat_id'):
        try:
            url = f"https://api.telegram.org/bot{cfg['telegram_token']}/sendMessage"
            resp = req.post(url, json={
                'chat_id': cfg['telegram_chat_id'],
                'text': '🧪 GuardianLens test alert — Telegram is connected!',
            }, timeout=10)
            if not resp.ok:
                errors.append(f"Telegram: {resp.text}")
        except Exception as e:
            errors.append(f"Telegram error: {str(e)}")
    else:
        errors.append("Telegram token or chat_id not configured")

    if errors:
        raise HTTPException(status_code=400, detail="; ".join(errors))
    return {"ok": True, "message": "Test alert sent!"}


# ── Reminders check ───────────────────────────────────────

@app.get("/api/reminders/due")
def get_due_reminders():
    """Return calendar events due within the next 15 minutes and send Telegram alert."""
    from datetime import timedelta
    import requests as req
    now = datetime.now()
    soon = now + timedelta(minutes=15)
    events = db.get_all_events()
    due = []
    for e in events:
        if e.get('completed'):
            continue
        try:
            event_dt = datetime.fromisoformat(f"{e['date']}T{e['time']}")
            if now <= event_dt <= soon:
                due.append(e)
        except Exception:
            pass

    # Send Telegram notification for newly due reminders (only once per event)
    if due:
        cfg = db.get_notification_config()
        if cfg.get('telegram_token') and cfg.get('telegram_chat_id'):
            for e in due:
                event_id = e['id']
                if event_id not in _notified_reminders:
                    _notified_reminders.add(event_id)
                    try:
                        msg = f"⏰ REMINDER: {e['title']}"
                        if e.get('description'):
                            msg += f"\n{e['description']}"
                        msg += f"\n🕐 {e['time']} — {e['date']}"
                        req.post(
                            f"https://api.telegram.org/bot{cfg['telegram_token']}/sendMessage",
                            json={'chat_id': cfg['telegram_chat_id'], 'text': msg},
                            timeout=5
                        )
                    except Exception:
                        pass

    return {"due": due}
