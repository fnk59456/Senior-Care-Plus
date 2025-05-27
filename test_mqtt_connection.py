#!/usr/bin/env python3
# -*- coding: utf-8 -*-

import paho.mqtt.client as mqtt
import json
import time
from datetime import datetime

# MQTT設置
MQTT_BROKER = "localhost"
MQTT_PORT = 1883
TOPIC_HEALTH = "GW17F5_Health"

def on_connect(client, userdata, flags, rc):
    if rc == 0:
        print(f"已連接到MQTT代理 {MQTT_BROKER}:{MQTT_PORT}")
        client.subscribe(TOPIC_HEALTH)
        print(f"已訂閱主題: {TOPIC_HEALTH}")
        
        # 發送一條測試消息
        test_data = {
            "content": "temperature",
            "gateway id": 137205,
            "node": "TAG",
            "id": "E005",
            "name": "錢七",
            "temperature": {
                "value": 37.2,
                "unit": "celsius",
                "is_abnormal": False,
                "room_temp": 24.5
            },
            "time": datetime.now().strftime("%Y-%m-%dT%H:%M:%S.%f")[:-3],
            "serial no": 12345
        }
        
        client.publish(TOPIC_HEALTH, json.dumps(test_data))
        print("已發送測試消息")
        
    else:
        print(f"連接失敗，返回碼: {rc}")

def on_message(client, userdata, msg):
    print(f"\n收到來自主題 {msg.topic} 的消息:")
    try:
        data = json.loads(msg.payload.decode())
        print(f"內容: {json.dumps(data, indent=2, ensure_ascii=False)}")
    except:
        print(f"原始數據: {msg.payload}")

def main():
    client = mqtt.Client(client_id="test_client")
    client.on_connect = on_connect
    client.on_message = on_message
    
    try:
        client.connect(MQTT_BROKER, MQTT_PORT, 60)
        client.loop_start()
        
        print("測試運行中...按Ctrl+C停止")
        while True:
            time.sleep(1)
            
    except KeyboardInterrupt:
        print("\n停止測試...")
    finally:
        client.loop_stop()
        client.disconnect()
        print("測試結束")

if __name__ == "__main__":
    main() 