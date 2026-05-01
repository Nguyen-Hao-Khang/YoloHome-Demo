# YoloHome Demo

IoT smart home automation project using Yolobit microcontroller, FastAPI backend, and web-based frontend with MQTT communication.

## Prerequisites
- Python 3.9+
- Yolobit microcontroller powered and connected to WiFi
- Adafruit IO account with credentials
- Browser with JavaScript enabled

## Setup Instructions

### 1. Clone Repository
```bash
git clone <repository-url>
cd YoloHome_Demo
```

### 2. Setup Python Backend
```bash
# Create virtual environment
python -m venv .venv

# Activate virtual environment
# On Windows:
.venv\Scripts\activate
# On macOS/Linux:
source .venv/bin/activate

# Install dependencies
pip install -r requirements.txt
```

### 3. Configure Environment Variables
```bash
# Copy example to .env
cp .env.example .env

# Edit .env with your Adafruit IO credentials
# AIO_USERNAME=your_username
# AIO_KEY=your_api_key
```

### 4. Run the Project
```bash
# Start Backend (from backend/ folder)
cd backend
python main.py
# Server runs on http://localhost:8000

# In another terminal, open Frontend
cd fontend
# Open index.html in browser or use Live Server extension
```

## Architecture
- **Backend**: FastAPI server with MQTT client for Adafruit IO communication
- **Frontend**: HTML/CSS/JavaScript dashboard for real-time monitoring
- **Hardware**: Yolobit with MicroPython
- **Database**: SQLite for historical sensor data

## Connectivity Notes
- Ensure Laptop and Smartphone are on the same WiFi network
- To access from Smartphone, update `localhost` in `script.js` to your Laptop's Local IP (e.g., `192.168.1.5`)
- MQTT broker: `io.adafruit.com` port 1883

## Project Structure
```
YoloHome_Demo/
├── backend/
│   └── main.py          # FastAPI server with MQTT
├── fontend/
│   ├── index.html       # Dashboard UI
│   ├── script.js        # Client logic
│   ├── style.css        # Styling
│   └── assets/          # Images and resources
├── requirements.txt     # Python dependencies
├── .env.example        # Environment variables template
├── .gitignore          # Git ignore rules
└── README.md           # This file
```

## Version 2 Dashboard Description: Smart Lock Authentication Flow

This section details the communication protocol and data flow for the facial recognition unlocking process in Version 2. The system relies on Adafruit IO feeds to act as a state machine, strictly synchronizing the Hardware (YoloBit), AI Backend, and Web Frontend.

### 1. Feed Mapping & Data Dictionary

| Feed Name | Values & Meanings | Description |
| :--- | :--- | :--- |
| **`led`** | `0`: Off, `1`: White, `2`: Green, `3`: Red | Controls the RGB Smart Lamp mode. |
| **`fan`** | `4`: Speed 0 (Off), `5`: Speed 1, `6`: Speed 2, `7`: Speed 3 | Controls the PWM Smart Fan speed. |
| **`servo`**| `8`: Locked (0°), `9`: Unlocked (90°) | Controls the Smart Lock / Door state. |
| **`pir`** | `0`: No Motion, `1`: Motion Detected | Published by YoloBit when physical presence is detected. |
| **`auth`**| `10`: Idle / No Motion<br>`11`: Motion Detected (Welcome)<br>`12`: Verifying Face<br>`13`: Auth Success (Unlocked)<br>`14`: Auth Failed | The core coordinator for the security protocol. |

### 2. Unlocking Data Flow

The authentication and unlocking process follows a strict sequence to ensure all system components react simultaneously:

1. **Trigger (Hardware ➔ Cloud):** 
   - The physical PIR sensor detects a person (`pir = 1`).
   - YoloBit turns on the LCD (displays *"Welcome! Look at camera."*) and automatically publishes `auth = 11` to the Cloud.
2. **AI Verification (Cloud ➔ Backend ➔ Cloud):**
   - The Python Backend fetches `auth = 11`, activates the webcam, and prepares the facial recognition model.
   - The Backend publishes `auth = 12` to the Cloud to signal that verification is in progress. 
   - *Reaction:* The Frontend UI instantly updates the Security Status to "VERIFYING FACE..." and infers the LED slider to White (`led = 1`). Concurrently, YoloBit receives `12` and turns the physical RGB LED White to illuminate the user's face for better camera accuracy.
3. **Decision Making (Backend ➔ Cloud):**
   - **Case A: Match (Success)** 
     - Backend publishes `auth = 13`.
     - *Hardware:* YoloBit receives `13`, opens the Servo (`servo = 9`), turns the LED Green (`led = 2`), and starts a 10-second countdown on the LCD.
     - *Frontend:* UI displays "AUTH SUCCESS", toggles the Smart Lock to OPEN, and shifts the LED slider to Green (`2`).
   - **Case B: No Match (Failed)** 
     - Backend publishes `auth = 14`.
     - *Hardware:* YoloBit turns the LED Red (`led = 3`), displays *"Failed!"* on the LCD, and keeps the servo locked. It holds this state for 3 seconds.
     - *Frontend:* UI displays "AUTH FAILED" and shifts the LED slider to Red (`3`).
4. **System Reset (Hardware ➔ Cloud):**
   - The Web Frontend and AI Backend are designed to be passive observers during the countdown.
   - After the timeout finishes (10s for success, 3s for failure), **YoloBit takes charge and publishes `auth = 10`** (or `11` if motion is still continuously detected) back to the Cloud.
   - The Backend and Frontend receive this updated state and cleanly reset their interfaces back to the default Standby/Idle mode.

## Version 3 fix bug backend demo and add the simulation .zip

### Wokwi Simulation using ESP32
The repository now includes `YoloHome-simulation.zip` in the project root. Use it to simulate the ESP32-based hardware with Wokwi.

#### Simulation setup
1. Open https://wokwi.com.
2. Create a new project using the **ESP32** starter template.
3. Unzip `YoloHome-simulation.zip` locally.
4. Upload and overwrite the existing project files in Wokwi.
5. Make sure to upload all files from the extracted archive (the package contains the three simulation files required by the demo).

#### Running the simulation
1. Start the backend server from `backend/`:
   ```bash
   cd backend
   python main.py
   ```
2. In the Wokwi circuit simulator, press **Run** to start the ESP32 simulation.
3. Open the Adafruit dashboard link:
   https://io.adafruit.com/NguyenHaoKhang/dashboards/yolohome
4. Use that dashboard to control the simulation and view live data from the Wokwi ESP32.
5. Optionally open the local frontend demo in `fontend/index.html` to view information and control devices indirectly through the web server.

#### Simulation workflow
- Backend handles MQTT and AI auth coordination.
- Wokwi simulates the ESP32 hardware sending/receiving Adafruit IO feed updates.
- The Adafruit dashboard shows the live state of the system.
- The local frontend demo displays the same data and can serve as an alternate control interface.