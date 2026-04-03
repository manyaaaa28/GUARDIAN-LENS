"""
test_fall_detection.py
Quick verification of the _classify_pose and _detect_fall logic.
Run with: python test_fall_detection.py
"""
import sys, os, time

# Add project root to path
sys.path.insert(0, os.path.dirname(__file__))

# ── Mock mediapipe before importing camera ──────────────────────────────────
class MockLandmark:
    def __init__(self, x, y, z=0.0, visibility=0.9):
        self.x = x
        self.y = y
        self.z = z
        self.visibility = visibility

class MockLandmarkList:
    def __init__(self, lm_list):
        self.landmark = lm_list

# Patch _fall_active, _prev_pose, etc. directly from camera module
import importlib, types

# We'll test _classify_pose by importing the module with mediapipe mocked
import unittest.mock as mock

mock_mp = types.ModuleType("mediapipe")
mock_tasks = types.ModuleType("mediapipe.tasks")
mock_python = types.ModuleType("mediapipe.tasks.python")
mock_vision = types.ModuleType("mediapipe.tasks.python.vision")
mock_mp.tasks = mock_tasks
mock_tasks.python = mock_python
mock_python.vision = mock_vision

# ImageFormat mock
mock_mp.ImageFormat = mock.MagicMock()
mock_mp.ImageFormat.SRGB = 1
mock_mp.Image = mock.MagicMock()

sys.modules["mediapipe"] = mock_mp
sys.modules["mediapipe.tasks"] = mock_tasks
sys.modules["mediapipe.tasks.python"] = mock_python
sys.modules["mediapipe.tasks.python.vision"] = mock_vision

from backend.camera import _classify_pose, _detect_fall

# ── Build realistic landmark sets ───────────────────────────────────────────

def make_landmarks(config: str) -> MockLandmarkList:
    """
    Create 33 landmarks for different body positions.
    config: 'standing' | 'sitting' | 'lying'
    
    For a person facing camera:
    - Standing: body spans vertically (y_span >> x_span)
    - Sitting: hips and knees at same height
    - Lying: body spans horizontally (x_span >= y_span)
    """
    # All we need are indices 0,11,12,23,24,25,26,27,28 (others can be zeros)
    lm = [MockLandmark(0.5, 0.5) for _ in range(33)]  # default filler
    
    if config == 'standing':
        # Nose at top, ankles at bottom — tall narrow pose
        lm[0]  = MockLandmark(0.50, 0.05)   # nose
        lm[11] = MockLandmark(0.45, 0.25)   # L shoulder
        lm[12] = MockLandmark(0.55, 0.25)   # R shoulder
        lm[23] = MockLandmark(0.47, 0.55)   # L hip
        lm[24] = MockLandmark(0.53, 0.55)   # R hip
        lm[25] = MockLandmark(0.47, 0.75)   # L knee
        lm[26] = MockLandmark(0.53, 0.75)   # R knee
        lm[27] = MockLandmark(0.47, 0.95)   # L ankle
        lm[28] = MockLandmark(0.53, 0.95)   # R ankle
        # x_span ~ 0.08, y_span ~ 0.90 → aspect = 0.09 → standing
        
    elif config == 'sitting':
        # Hips and knees at similar Y, ankles lower
        lm[0]  = MockLandmark(0.50, 0.10)   # nose
        lm[11] = MockLandmark(0.44, 0.30)   # L shoulder
        lm[12] = MockLandmark(0.56, 0.30)   # R shoulder
        lm[23] = MockLandmark(0.43, 0.55)   # L hip
        lm[24] = MockLandmark(0.57, 0.55)   # R hip
        lm[25] = MockLandmark(0.43, 0.60)   # L knee (close to hip)
        lm[26] = MockLandmark(0.57, 0.60)   # R knee
        lm[27] = MockLandmark(0.43, 0.85)   # L ankle (hanging down)
        lm[28] = MockLandmark(0.57, 0.85)   # R ankle
        # x_span ~ 0.14, y_span ~ 0.75 → aspect = 0.19 → sitting
        
    elif config == 'lying':
        # Body horizontal — wide x span, small y span
        lm[0]  = MockLandmark(0.10, 0.50)   # nose (left side)
        lm[11] = MockLandmark(0.25, 0.48)   # L shoulder
        lm[12] = MockLandmark(0.25, 0.52)   # R shoulder
        lm[23] = MockLandmark(0.55, 0.48)   # L hip
        lm[24] = MockLandmark(0.55, 0.52)   # R hip
        lm[25] = MockLandmark(0.75, 0.47)   # L knee
        lm[26] = MockLandmark(0.75, 0.53)   # R knee
        lm[27] = MockLandmark(0.90, 0.47)   # L ankle
        lm[28] = MockLandmark(0.90, 0.53)   # R ankle
        # x_span ~ 0.80, y_span ~ 0.06 → aspect >> 1 → lying
        
    return MockLandmarkList(lm)


# ── Tests ────────────────────────────────────────────────────────────────────

PASS = "\033[92m✓ PASS\033[0m"
FAIL = "\033[91m✗ FAIL\033[0m"

def test_classify(config, expected):
    lm = make_landmarks(config)
    result = _classify_pose(lm)
    ok = result == expected
    print(f"  [{PASS if ok else FAIL}] classify_pose({config!r:10s}) → expected={expected!r:10s}, got={result!r}")
    return ok

def test_fall_detection():
    """Simulate standing → lying → standing transition."""
    import backend.camera as cam
    
    # Reset state
    cam._prev_pose = "standing"
    cam._fall_start_time = None
    cam._fall_active = False
    cam._safe_start_time = None
    
    logs = []
    def log_fn(title, desc, icon):
        logs.append((title, icon))
        print(f"    📋 Activity logged: {icon} {title}")
    
    # 1. 10 frames of standing — should not trigger
    for _ in range(10):
        cam._detect_fall("standing", log_fn)
    
    ok1 = not cam._fall_active
    print(f"  [{PASS if ok1 else FAIL}] Standing for 10 frames → fall_active=False")
    
    # 2. Simulate 2 seconds of lying (> FALL_CONFIRM_SECONDS=1.5s)
    cam._fall_start_time = time.time() - 2.0  # pretend it started 2s ago
    cam._detect_fall("lying", log_fn)
    
    ok2 = cam._fall_active
    print(f"  [{PASS if ok2 else FAIL}] After 2s lying → fall_active=True")
    
    # 3. Status should stay "alert" while lying continues
    cam._detect_fall("lying", log_fn)
    ok3 = cam._fall_active
    print(f"  [{PASS if ok3 else FAIL}] Continuing to lie → fall_active stays True")
    
    # 4. Get back up and wait 4 seconds (> SAFE_CONFIRM_SECONDS=3.0s)
    cam._safe_start_time = time.time() - 4.0  # pretend safe for 4s
    cam._detect_fall("standing", log_fn)
    
    ok4 = not cam._fall_active
    print(f"  [{PASS if ok4 else FAIL}] After 4s standing (recovered) → fall_active=False")
    
    return ok1 and ok2 and ok3 and ok4


print("\n══════════════════════════════════")
print("  GuardianLens Fall Detection Tests")
print("══════════════════════════════════\n")

print("▶ _classify_pose() tests:")
r1 = test_classify('standing', 'standing')
r2 = test_classify('sitting',  'sitting')
r3 = test_classify('lying',    'lying')

print()
print("▶ _detect_fall() state machine tests:")
r4 = test_fall_detection()

print()
total = sum([r1, r2, r3, r4])
print(f"Result: {total}/4 tests passed")
if total == 4:
    print("\033[92m\n  ALL TESTS PASSED ✓\033[0m\n")
else:
    print("\033[91m\n  SOME TESTS FAILED ✗\033[0m\n")
    sys.exit(1)
