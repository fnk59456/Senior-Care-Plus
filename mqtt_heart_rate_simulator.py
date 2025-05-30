#!/usr/bin/env python3
"""
MQTT心率模擬器
模擬多個用戶的心率數據並通過MQTT發送
"""

import json
import random
import time
import threading
from datetime import datetime, timedelta
from typing import Dict, List, Optional
import paho.mqtt.client as mqtt
import logging

# 配置日誌
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# MQTT配置
MQTT_BROKER = "localhost"
MQTT_PORT = 1883
MQTT_TOPIC = "health/data"
MQTT_QOS = 1

# 用戶配置
USERS = [
    {"id": "user001", "name": "張三", "gateway_id": "gateway001"},
    {"id": "user002", "name": "李四", "gateway_id": "gateway001"},
    {"id": "user003", "name": "王五", "gateway_id": "gateway001"},
    {"id": "user004", "name": "趙六", "gateway_id": "gateway001"},
    {"id": "user005", "name": "陳七", "gateway_id": "gateway001"},
]

# 心率範圍設置
HEART_RATE_RANGES = {
    "normal_min": 60,
    "normal_max": 100,
    "low_threshold": 60,
    "high_threshold": 100,
    "critical_low": 40,
    "critical_high": 150
}

# 全局變量
running = False
client = None
heart_rate_history = {}

def setup_mqtt_client():
    """設置MQTT客戶端"""
    global client
    
    def on_connect(client, userdata, flags, rc):
        if rc == 0:
            logger.info("成功連接到MQTT代理")
        else:
            logger.error(f"連接MQTT代理失敗，返回碼: {rc}")
    
    def on_disconnect(client, userdata, rc):
        logger.info("與MQTT代理斷開連接")
    
    def on_publish(client, userdata, mid):
        logger.debug(f"消息已發布，消息ID: {mid}")
    
    client = mqtt.Client()
    client.on_connect = on_connect
    client.on_disconnect = on_disconnect
    client.on_publish = on_publish
    
    try:
        client.connect(MQTT_BROKER, MQTT_PORT, 60)
        client.loop_start()
        return True
    except Exception as e:
        logger.error(f"連接MQTT代理時出錯: {e}")
        return False

def generate_heart_rate_data(user_id: str, base_heart_rate: Optional[int] = None) -> int:
    """
    生成心率數據
    
    Args:
        user_id: 用戶ID
        base_heart_rate: 基礎心率，如果為None則隨機生成
    
    Returns:
        生成的心率值
    """
    current_time = datetime.now()
    
    # 如果沒有基礎心率，則生成一個
    if base_heart_rate is None:
        base_heart_rate = random.randint(
            HEART_RATE_RANGES["normal_min"], 
            HEART_RATE_RANGES["normal_max"]
        )
    
    # 根據時間模擬心率變化（白天較高，夜間較低）
    hour = current_time.hour
    if 6 <= hour <= 22:  # 白天
        time_factor = 1.0 + random.uniform(-0.1, 0.2)
    else:  # 夜間
        time_factor = 0.8 + random.uniform(-0.1, 0.1)
    
    # 添加隨機變化
    variation = random.uniform(-5, 5)
    
    # 計算最終心率
    heart_rate = int(base_heart_rate * time_factor + variation)
    
    # 確保心率在合理範圍內
    heart_rate = max(HEART_RATE_RANGES["critical_low"], 
                    min(HEART_RATE_RANGES["critical_high"], heart_rate))
    
    # 偶爾生成異常值（5%概率）
    if random.random() < 0.05:
        if random.random() < 0.5:
            # 生成高心率
            heart_rate = random.randint(
                HEART_RATE_RANGES["high_threshold"] + 10,
                HEART_RATE_RANGES["critical_high"]
            )
        else:
            # 生成低心率
            heart_rate = random.randint(
                HEART_RATE_RANGES["critical_low"],
                HEART_RATE_RANGES["low_threshold"] - 10
            )
    
    return heart_rate

def send_heart_rate_data(user: Dict[str, str]):
    """
    為指定用戶發送心率數據
    
    Args:
        user: 用戶信息字典
    """
    try:
        # 獲取或生成基礎心率
        if user["id"] not in heart_rate_history:
            heart_rate_history[user["id"]] = {
                "base_heart_rate": random.randint(65, 85),
                "last_heart_rate": None,
                "readings": []
            }
        
        user_history = heart_rate_history[user["id"]]
        
        # 生成心率數據
        heart_rate = generate_heart_rate_data(
            user["id"], 
            user_history["base_heart_rate"]
        )
        
        # 更新歷史記錄
        user_history["last_heart_rate"] = heart_rate
        user_history["readings"].append({
            "heart_rate": heart_rate,
            "timestamp": datetime.now().isoformat(),
            "is_abnormal": heart_rate < HEART_RATE_RANGES["low_threshold"] or 
                          heart_rate > HEART_RATE_RANGES["high_threshold"]
        })
        
        # 保持最近100條記錄
        if len(user_history["readings"]) > 100:
            user_history["readings"] = user_history["readings"][-100:]
        
        # 構建MQTT消息
        message = {
            "type": "health",
            "id": user["id"],
            "name": user["name"],
            "gateway_id": user["gateway_id"],
            "heart_rate": heart_rate,
            "temperature": random.uniform(36.0, 37.5),  # 同時發送溫度數據
            "time": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
            "timestamp": int(datetime.now().timestamp() * 1000)
        }
        
        # 發送MQTT消息
        if client and client.is_connected():
            result = client.publish(MQTT_TOPIC, json.dumps(message), MQTT_QOS)
            if result.rc == mqtt.MQTT_ERR_SUCCESS:
                logger.info(f"發送心率數據: {user['name']} - {heart_rate} bpm")
            else:
                logger.error(f"發送心率數據失敗: {result.rc}")
        else:
            logger.warning("MQTT客戶端未連接，無法發送數據")
            
    except Exception as e:
        logger.error(f"發送心率數據時出錯: {e}")

def print_statistics():
    """打印心率統計信息"""
    while running:
        try:
            logger.info("=== 心率統計 ===")
            for user_id, history in heart_rate_history.items():
                if history["readings"]:
                    recent_readings = [r["heart_rate"] for r in history["readings"][-10:]]
                    avg_heart_rate = sum(recent_readings) / len(recent_readings)
                    abnormal_count = sum(1 for r in history["readings"] if r["is_abnormal"])
                    
                    user_name = next((u["name"] for u in USERS if u["id"] == user_id), user_id)
                    logger.info(f"{user_name}: 平均心率 {avg_heart_rate:.1f} bpm, "
                              f"異常讀數 {abnormal_count}/{len(history['readings'])}")
            
            time.sleep(60)  # 每分鐘打印一次統計
        except Exception as e:
            logger.error(f"打印統計信息時出錯: {e}")
            time.sleep(60)

def main():
    """主函數"""
    global running
    
    logger.info("啟動MQTT心率模擬器...")
    
    # 設置MQTT客戶端
    if not setup_mqtt_client():
        logger.error("無法連接到MQTT代理，退出程序")
        return
    
    # 等待連接建立
    time.sleep(2)
    
    running = True
    
    # 啟動統計線程
    stats_thread = threading.Thread(target=print_statistics, daemon=True)
    stats_thread.start()
    
    logger.info(f"開始為 {len(USERS)} 個用戶模擬心率數據...")
    
    try:
        while running:
            # 為每個用戶發送心率數據
            for user in USERS:
                if not running:
                    break
                send_heart_rate_data(user)
                time.sleep(1)  # 每個用戶之間間隔1秒
            
            # 等待下一輪發送（每30秒發送一輪）
            time.sleep(25)  # 5個用戶 * 1秒 + 25秒 = 30秒總間隔
            
    except KeyboardInterrupt:
        logger.info("收到中斷信號，正在停止模擬器...")
    except Exception as e:
        logger.error(f"模擬器運行時出錯: {e}")
    finally:
        running = False
        if client:
            client.loop_stop()
            client.disconnect()
        logger.info("心率模擬器已停止")

if __name__ == "__main__":
    main() 