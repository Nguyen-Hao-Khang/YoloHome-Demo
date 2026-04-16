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
# Adafruit feed names should match your dashboard: yolohome.temp, yolohome.humi, etc.
GROUP_NAME = "yolohome" 

# Global state for dashboard
stats = {
    "temp": 0, "humi": 0, "light": 0, "dist": 0,
    "led": 0, "fan": 2, "servo": 4
}



# Database setup
def init_db():
    conn = sqlite3.connect('database.db')
    cursor = conn.cursor()
    cursor.execute('''CREATE TABLE IF NOT EXISTS history 
                     (id INTEGER PRIMARY KEY AUTOINCREMENT, 
                      temp REAL, humi REAL, time DATETIME DEFAULT CURRENT_TIMESTAMP)''')
    conn.commit()
    conn.close()

init_db()

# MQTT Callbacks
def on_message(client, userdata, msg):
    # msg.topic example: "<AIO_USERNAME>/feeds/yolohome.temp"
    try:
        topic_tail = msg.topic.split('/')[-1] 
        topic_path = topic_tail.split('.')[-1].lower() 
        payload = msg.payload.decode()
        
        print(f"MQTT Inbox: {topic_path} -> {payload}")
        
        if topic_path in stats:
            val = float(payload)
            stats[topic_path] = val
            
            # Chỉ lưu temp/humi vào DB để vẽ biểu đồ
            if topic_path in ["temp", "humi"]:
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
    # Reverse to show chronological order on chart
    return {"temp": [r[0] for r in data][::-1], "humi": [r[1] for r in data][::-1]}

@app.post("/control/{device}/{val}")
async def control(device: str, val: str):
    publish_topic = f"{USER}/feeds/{GROUP_NAME}.{device}"
    mqtt.publish(publish_topic, val)
    print(f"Published: {val} to {publish_topic}")
    return {"status": "ok", "topic": publish_topic}

# Main entry point to keep the server alive
if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)