import streamlit as st
import cv2
import numpy as np
import mediapipe as mp
from mediapipe.tasks import python
from mediapipe.tasks.python import vision
import requests
import time
import os
import threading
import pyttsx3


PHONE_IP = "IP_ADDRESS"  # Replace with your phone's IP address
VIDEO_URL = f"http://{PHONE_IP}:8080/video"

MODEL_PATH = "pose_landmarker_lite.task"


if not os.path.exists(MODEL_PATH):
    with st.spinner("Downloading FAST AI Model..."):
        url = "https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task"
        r = requests.get(url)
        with open(MODEL_PATH, "wb") as f: f.write(r.content)


st.set_page_config(page_title="GuardianLens Turbo", layout="wide")
st.title("⚡ GuardianLens: High-Speed Sentinel")

monitor_active = st.sidebar.toggle("ACTIVATE MONITORING", value=False)
sensitivity = st.sidebar.slider("Fall Sensitivity", 0.1, 0.4, 0.22)

video_placeholder = st.empty()
status_placeholder = st.empty()

if monitor_active:
    
    base_options = python.BaseOptions(model_asset_path=MODEL_PATH)
    options = vision.PoseLandmarkerOptions(
        base_options=base_options,
        running_mode=vision.RunningMode.IMAGE
    )
    detector = vision.PoseLandmarker.create_from_options(options)
    
    cap = cv2.VideoCapture(VIDEO_URL)
    
    cap.set(cv2.CAP_PROP_BUFFERSIZE, 1) 
    
    frame_count = 0
    
    while cap.isOpened() and monitor_active:
        ret, frame = cap.read()
        if not ret: break

        frame_count += 1
                
        small_frame = cv2.resize(frame, (480, 360))
        rgb_frame = cv2.cvtColor(small_frame, cv2.COLOR_BGR2RGB)
        
        
        if frame_count % 2 == 0:
            mp_image = mp.Image(image_format=mp.ImageFormat.SRGB, data=rgb_frame)
            detection_result = detector.detect(mp_image)
            
            status, color = "✅ Safe", "green"

            if detection_result.pose_landmarks:
                landmarks = detection_result.pose_landmarks[0]
                
                
                for id in [0, 11, 12, 23, 24]: 
                    lm = landmarks[id]
                    cx, cy = int(lm.x * 480), int(lm.y * 360)
                    cv2.circle(rgb_frame, (cx, cy), 5, (0, 255, 0), -1)

                
                if abs(landmarks[24].y - landmarks[0].y) < sensitivity:
                    status, color = "🚨 FALL!", "red"

            
            video_placeholder.image(rgb_frame, use_column_width=True)
            status_placeholder.markdown(f'<div style="background-color:{color}; padding:10px; border-radius:10px; text-align:center; color:white;"><h2>{status}</h2></div>', unsafe_allow_html=True)

        
else:
    video_placeholder.info("System Standby.")