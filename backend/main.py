import os
import sqlite3
import uvicorn
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from paho.mqtt import client as mqtt_client
from dotenv import load_dotenv

# Load credentials from .env
load_dotenv()
app = FastAPI()

# Enable CORS for Frontend communication
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])

# Configuration
USER = os.getenv("AIO_USERNAME")
KEY = os.getenv("AIO_KEY")
GROUP_NAME = "yolohome" 

# Global state
stats = {
    "temp": 0, "humi": 0, "light": 0, 
    "pir": 0, "led": 0, "fan": 2, "servo": 8, "auth": 10
}

def init_db():
    conn = sqlite3.connect('database.db')
    cursor = conn.cursor()
    cursor.execute('''CREATE TABLE IF NOT EXISTS history 
                     (id INTEGER PRIMARY KEY AUTOINCREMENT, 
                      temp REAL, humi REAL, time DATETIME DEFAULT CURRENT_TIMESTAMP)''')
    conn.commit()
    conn.close()

init_db()

def on_message(client, userdata, msg):
    try:
        topic_path = msg.topic.split('.')[-1].lower() 
        payload = msg.payload.decode()
        val = float(payload)
        
        key = "pir" if topic_path == "dist" else topic_path
        
        if key in stats:
            stats[key] = val
            if key in ["temp", "humi"]:
                conn = sqlite3.connect('database.db')
                c = conn.cursor()
                c.execute("INSERT INTO history (temp, humi) VALUES (?, ?)", (stats["temp"], stats["humi"]))
                conn.commit()
                conn.close()
    except Exception as e:
        print(f"Error processing message: {e}")

# Initialize MQTT Client (using Callback Version 2 for latest paho-mqtt)
mqtt = mqtt_client.Client(callback_api_version=mqtt_client.CallbackAPIVersion.VERSION2)
mqtt.username_pw_set(USER, KEY)
mqtt.on_message = on_message

print("Connecting to Adafruit IO...")
mqtt.connect("io.adafruit.com", 1883)

# Subscribe to all feeds in the yolohome group
mqtt.subscribe(f"{USER}/feeds/#")
mqtt.loop_start() # Run MQTT in a background thread

# --- API Endpoints ---

@app.get("/data")
async def get_data():
    return stats

@app.get("/history")
async def get_history():
    conn = sqlite3.connect('database.db')
    cursor = conn.cursor()
    cursor.execute("SELECT temp, humi FROM history ORDER BY id DESC LIMIT 10")
    data = cursor.fetchall()
    conn.close()
    return {"temp": [r[0] for r in data][::-1], "humi": [r[1] for r in data][::-1]}

@app.post("/control/{device}/{val}")
async def control(device: str, val: str):
    publish_topic = f"{USER}/feeds/{GROUP_NAME}.{device}"
    mqtt.publish(publish_topic, val)
    
    if device in stats:
        stats[device] = float(val)
    return {"status": "ok", "topic": publish_topic}

# api for AI trigger auth (state 10, 11, 12, 13, 14)
@app.post("/ai_trigger_auth/{auth_val}")
async def ai_trigger_auth(auth_val: str):
    """
    API endpoint to trigger AI authentication. The auth val can be one of the following:
    - 10: Yolobit detected no motion, maintain current access state
    - 11: Yolobit detected motion, print hello and look at the camera in lcd, backend will prepare for scanning face
    - 12: Backend start AI face recognition, push auth = 12 to cloud for yolobit print verify process in lcd and turn on the light (white) - LED mode 1
    - 13: Backend authentication success, push auth = 13 to cloud for yolobit print success in lcd and turn on the light (green) - LED mode 2 (servo open in 10s, and then return to 10 or 11 based on motion)
    - 14: Backend authentication failed, push auth = 14 to cloud for yolobit print failed in lcd and turn on the light (red) - LED mode 3 (print failed in 10s, and then return to 10 or 11 based on motion)
    """
    publish_topic = f"{USER}/feeds/{GROUP_NAME}.auth"
    mqtt.publish(publish_topic, auth_val)
    stats["auth"] = float(auth_val)
    
    # Auto control LED based on auth state
    led_mode = 0
    if auth_val == "12":  # Verifying - White light
        led_mode = 1
    elif auth_val == "13":  # Success - Green light
        led_mode = 2
    elif auth_val == "14":  # Failed - Red light
        led_mode = 3
    
    if led_mode > 0:
        led_topic = f"{USER}/feeds/{GROUP_NAME}.led"
        mqtt.publish(led_topic, str(led_mode))
        stats["led"] = float(led_mode)
    
    return {"status": "AI auth triggered", "auth": auth_val, "led": led_mode}

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)