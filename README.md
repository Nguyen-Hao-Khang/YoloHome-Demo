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