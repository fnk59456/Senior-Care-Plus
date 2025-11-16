#!/bin/bash

echo "🧪 MQTT到PostgreSQL測試腳本"
echo "================================"

# 檢查後端服務是否運行
echo "1. 檢查後端服務..."
if curl -s http://localhost:8080/health > /dev/null; then
    echo "✅ 後端服務正在運行"
else
    echo "❌ 後端服務未運行，請先啟動："
    echo "   cd SeniorCarePlusBackend && ./gradlew run"
    exit 1
fi

# 檢查數據庫連接
echo ""
echo "2. 檢查數據庫狀態..."
response=$(curl -s http://localhost:8080/api/patients)
if [[ $response == *"["* ]]; then
    echo "✅ 數據庫連接正常"
    echo "患者數據: $response"
else
    echo "❌ 數據庫連接異常"
    echo "響應: $response"
fi

# 模擬MQTT心率數據
echo ""
echo "3. 模擬發送心率數據到MQTT..."
cat << 'EOF' > /tmp/test_heart_rate.py
import paho.mqtt.client as mqtt
import json
import time

def on_connect(client, userdata, flags, rc):
    print(f"連接結果: {rc}")

def on_publish(client, userdata, mid):
    print("✅ 心率數據已發送")

client = mqtt.Client()
client.on_connect = on_connect
client.on_publish = on_publish

# 連接到MQTT服務器
try:
    client.connect("067ec32ef1344d3bb20c4e53abdde99a.s1.eu.hivemq.cloud", 8883, 60)
    client.loop_start()
    
    # 發送測試心率數據
    heart_rate_data = {
        "deviceId": "device_001",
        "heartRate": 75,
        "timestamp": int(time.time() * 1000)
    }
    
    client.publish("health/heart_rate/device_001", json.dumps(heart_rate_data))
    time.sleep(2)
    
    client.loop_stop()
    client.disconnect()
    print("MQTT測試完成")
    
except Exception as e:
    print(f"❌ MQTT連接失敗: {e}")
EOF

python3 /tmp/test_heart_rate.py

# 等待數據處理
echo ""
echo "4. 等待數據處理（5秒）..."
sleep 5

# 檢查健康記錄
echo ""
echo "5. 檢查健康記錄是否已存儲..."
health_response=$(curl -s "http://localhost:8080/api/health/device_001")
echo "健康記錄響應: $health_response"

if [[ $health_response == *"heartRate"* ]]; then
    echo "✅ MQTT數據成功存儲到PostgreSQL！"
else
    echo "⚠️  未找到心率數據，可能需要更多時間處理"
fi

echo ""
echo "📊 測試完成！"
echo "如需查看詳細日誌，請檢查後端控制台輸出" 