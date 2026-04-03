<div align="center">

  # 🛡️ GuardianLens

  **Privacy-first AI home companion for elder care. Aging at home should feel safe, not surveilled.**

  [![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
  [![Python](https://img.shields.io/badge/Python-3.10+-blue.svg)](https://www.python.org/downloads/)
  [![React](https://img.shields.io/badge/React-19-61DAFB.svg?logo=react)](https://react.dev/)
  [![FastAPI](https://img.shields.io/badge/FastAPI-0.110-009688.svg?logo=fastapi)](https://fastapi.tiangolo.com/)
  [![NEAR](https://img.shields.io/badge/NEAR-Protocol-black.svg?logo=near)](https://near.org/)
  [![Status](https://img.shields.io/badge/Status-Beta-brightgreen.svg)]()

</div>

<br />

> **GuardianLens** is an intelligent, completely local-first edge computing solution designed to monitor and assist elderly family members without compromising their privacy. All camera feeds are processed locally in-memory using OpenCV and Google MediaPipe — sensitive video data never leaves the home.

---

## ✨ Key Features

- **📷 Live MJPEG Feed**: Smooth ~20 FPS real-time stream delivered via a native MJPEG endpoint — no WebRTC complexity.
- **🚨 Intelligent Fall Detection**: Real-time pose tracking via MediaPipe detects falls and triggers instant caregiver alerts.
- **🔊 Voice Check-Ins**: Two-way communication via the Web Speech API lets caregivers send auditory reminders to the elder's device.
- **💊 Medication & Event Reminders**: Calendar-based events with automated voice alerts synchronized to a local SQLite database.
- **🤖 Context-Aware AI Chat**: Integrated with Groq or OpenAI to answer questions about daily activities, medications, and health status.
- **🔗 NEAR Wallet Login**: Decentralised, passwordless authentication via the NEAR Protocol — or use **Demo Mode** with no wallet required.
- **👤 Face Enrollment**: Enroll family members and caregivers by capturing their face directly in the browser.
- **📊 Activity Log**: A live feed of system events including falls, voice messages, member enrollments, and more.

---

## 🛠️ Technology Stack

| Category | Technology |
|---|---|
| **Backend** | Python, FastAPI, Uvicorn, SQLite |
| **Frontend** | React 19, TypeScript, Vite 8, TailwindCSS v4 |
| **UI / Animation** | Framer Motion, Lucide React, Heroicons |
| **Computer Vision** | OpenCV, Google MediaPipe (Pose Landmarker) |
| **AI Integration** | Groq API, OpenAI API |
| **Web3 / Auth** | NEAR Protocol (`near-api-js`) |

---

## 🚀 Getting Started

### Prerequisites

- Python 3.10+
- Node.js 18+ & npm
- Webcam (built-in or USB) or an IP camera RTSP URL

### 1. Clone the Repository

```bash
git clone https://github.com/Krishna12-web/GuardianLens.git
cd GuardianLens
```

### 2. Set Up the Python Environment

```bash
python -m venv venv

# Windows
.\venv\Scripts\Activate.ps1

# macOS / Linux
source venv/bin/activate

pip install -r requirements.txt
```

> **Note (Windows):** If `mediapipe` fails to install, ensure you have the [Visual C++ Redistributable](https://aka.ms/vs/17/release/vc_redist.x64.exe) installed.

### 3. Configure Environment Variables

Create a `.env` file in the project root:

```env
CAMERA_URL=0                    # "0" for webcam, or an RTSP stream URL
FALL_SENSITIVITY=0.22           # Higher value = less sensitive to falls
GROQ_API_KEY=your_groq_key      # (Optional) For AI chat via Groq
OPENAI_API_KEY=your_openai_key  # (Optional) For AI chat via OpenAI
```

### 4. Install Frontend Dependencies

```bash
cd frontend
npm install
cd ..
```

### 5. Run the Application

Open **two terminals** in the project root:

**Terminal 1 — Backend:**
```bash
.\venv\Scripts\Activate.ps1   # (or source venv/bin/activate on macOS/Linux)
python -m uvicorn backend.main:app --reload --host 0.0.0.0 --port 8000
```

**Terminal 2 — Frontend:**
```bash
cd frontend
npm run dev
```

Then open **[http://localhost:5173](http://localhost:5173)** in your browser.

| Service | URL |
|---|---|
| Frontend (Vite) | http://localhost:5173 |
| Backend (FastAPI) | http://localhost:8000 |
| API Docs (Swagger) | http://localhost:8000/docs |

---

## 💻 Dashboard Overview

| Page | Description |
|---|---|
| **🔒 Login** | Connect your NEAR Testnet Wallet or enter Demo Mode (no wallet needed). |
| **📊 Dashboard** | Live stats: hours monitored, alerts today, last activity, and medication adherence. |
| **📹 Live Feed** | Real-time MJPEG stream with pose wireframe overlay and fall-alert banner. Camera can be paused for privacy. |
| **📅 Calendar** | Add/delete medication reminders and appointments. The system fires voice alerts at the scheduled time. |
| **👥 Members** | Enroll family members and caregivers with name, role, and a face capture via webcam. |
| **🤖 AI Assistant** | Chat with an AI that has full context of calendar events and recent activity logs. |
| **📋 Activity** | Chronological log of all system events — falls, voice messages, enrollments, and more. |
| **⚙️ Settings** | Security preferences, notification settings, and wallet configuration. |

---

## 🔒 Privacy Architecture

At **GuardianLens**, we believe surveillance is not safety.

- **No Cloud Video Storage**: Video frames are analyzed in-memory and instantly discarded — never written to disk or sent upstream.
- **Data Minimization**: Only structured metadata (e.g., `"fall detected"`, `"medication reminder sent"`) is saved to the local SQLite database.
- **AI Abstraction**: The AI assistant is fed structured telemetry, not raw video, so LLMs provide insight without invading privacy.
- **Local-First**: The entire stack — backend, database, and ML models — runs on your own machine.

---

## 📡 API Reference

The FastAPI backend exposes a self-documenting REST API. After starting the backend, visit **[http://localhost:8000/docs](http://localhost:8000/docs)** for the interactive Swagger UI.

Key endpoints:

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/live-feed` | MJPEG video stream (~20 FPS) |
| `GET` | `/api/stats` | Dashboard stats snapshot |
| `GET/POST` | `/api/members` | List or add household members |
| `POST` | `/api/members/{id}/enroll-face` | Enroll a face image (base64) |
| `GET/POST` | `/api/calendar` | List or add calendar events |
| `GET` | `/api/activity` | Recent activity log |
| `POST` | `/api/chat` | Send a message to the AI assistant |
| `POST` | `/api/camera/pause` | Pause the camera monitor |
| `POST` | `/api/camera/resume` | Resume the camera monitor |

---

## 🤝 Contributing

Contributions make the open source community an amazing place to learn, inspire, and create. Any contributions you make are **greatly appreciated**.

1. Fork the Project
2. Create your Feature Branch (`git checkout -b feature/AmazingFeature`)
3. Commit your Changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the Branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

---

<div align="center">
  <sub>Built with ❤️ for the safety and independence of our loved ones.</sub>
</div>
