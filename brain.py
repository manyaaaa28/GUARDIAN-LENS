import cv2
import mediapipe as mp
import time
import os


URL = os.getenv("CAMERA_URL", "http://192.168.1.3:8080")
TELEGRAM_TOKEN = os.getenv("TELEGRAM_TOKEN", "YOUR_BOT_TOKEN")
CHAT_ID = os.getenv("CHAT_ID", "YOUR_CHAT_ID")

def send_alert(message):
    
    print(f"ALERT: {message}")


mp_pose = mp.solutions.pose
pose = mp_pose.Pose()
prev_hip_y = 0
fall_confirmed = False

cap = cv2.VideoCapture(URL)

while cap.isOpened():
    ret, frame = cap.read()
    if not ret: break    
    rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
    results = pose.process(rgb)

    if results.pose_landmarks:        
        hip_y = results.pose_landmarks.landmark[24].y
                
        velocity = hip_y - prev_hip_y
        
      
        if velocity > 0.15: 
            send_alert("Possible Fall Detected! Checking stability...")
            time.sleep(2) 
            
        prev_hip_y = hip_y

    cv2.imshow("GuardianLens Live Feed", frame)
    if cv2.waitKey(1) == ord('q'): break

cap.release()