import json
import ssl
import paho.mqtt.client as mqtt
from datetime import datetime
import time

# 雲端 MQTT 配置
MQTT_BROKER = "067ec32ef1344d3bb20c4e53abdde99a.s1.eu.hivemq.cloud"
MQTT_PORT = 8883  # SSL/TLS 端口

MQTT_TOPIC = "UWB/GW16B8_Dwlink"  # 發送主題
MQTT_USERNAME = "testweb1"
MQTT_PASSWORD = "Aa000000"

# 全域變數用於追蹤序列號
serial_counter = 1240

def on_connect(client, userdata, flags, rc):
    """MQTT 連接回調函數"""
    if rc == 0:
        print(f"[{datetime.now().strftime('%Y-%m-%d %H:%M:%S')}] 成功連接到 MQTT Broker")
        print(f"[{datetime.now().strftime('%Y-%m-%d %H:%M:%S')}] 準備發送到主題: {MQTT_TOPIC}")
    else:
        print(f"[{datetime.now().strftime('%Y-%m-%d %H:%M:%S')}] 連接失敗，返回碼: {rc}")

def on_publish(client, userdata, mid):
    """MQTT 發布回調函數"""
    print(f"[{datetime.now().strftime('%Y-%m-%d %H:%M:%S')}] 訊息發送成功，訊息ID: {mid}")

def on_disconnect(client, userdata, rc):
    """MQTT 斷線回調函數"""
    print(f"[{datetime.now().strftime('%Y-%m-%d %H:%M:%S')}] 與 MQTT Broker 斷線，返回碼: {rc}")

def create_anchor_message():
    """創建 Anchor 配置訊息"""
    global serial_counter

    # 計算坐標值 (序列號/1000)
    coordinate_value = serial_counter / 1000.0

    message = {
        "content": "configChange",
        "gateway id": 4192540344,
        "node": "ANCHOR",
        "name": "0x8E97",
        "id": 36503,
        "fw update": 0,
        "led": 1,
        "ble": 1,
        "initiator": 0,
        "position": {
            "x": coordinate_value,
            "y": coordinate_value,
            "z": coordinate_value
        },
        "serial no": serial_counter
    }

    # 序列號遞增
    serial_counter += 1

    return message

def send_message(client):
    """發送訊息到 MQTT"""
    try:
        # 創建訊息
        message = create_anchor_message()

        # 轉換為 JSON 字符串
        json_message = json.dumps(message, ensure_ascii=False)

        # 發送訊息
        result = client.publish(MQTT_TOPIC, json_message)

        if result.rc == mqtt.MQTT_ERR_SUCCESS:
            print(f"\n{'='*60}")
            print(f"[{datetime.now().strftime('%Y-%m-%d %H:%M:%S')}] 發送 UWB Anchor 配置訊息")
            print(f"主題: {MQTT_TOPIC}")
            print(f"{'='*60}")

            # 格式化輸出發送的訊息內容
            print("發送訊息內容:")
            print(f"  內容類型: {message['content']}")
            print(f"  Gateway ID: {message['gateway id']}")
            print(f"  節點類型: {message['node']}")
            print(f"  設備名稱: {message['name']}")
            print(f"  設備 ID: {message['id']}")
            print(f"  韌體更新: {message['fw update']}")
            print(f"  LED 狀態: {message['led']}")
            print(f"  BLE 狀態: {message['ble']}")
            print(f"  發起者: {message['initiator']}")
            print(f"  序列號: {message['serial no']}")

            # 輸出位置信息
            position = message['position']
            print("  位置坐標:")
            print(f"    X: {position['x']}")
            print(f"    Y: {position['y']}")
            print(f"    Z: {position['z']}")

            # 輸出原始 JSON（簡化顯示）
            print(f"\n發送的 JSON (簡化):")
            print(f"  序列號: {message['serial no']}, 坐標: ({position['x']}, {position['y']}, {position['z']})")
            print(f"{'='*60}\n")

        else:
            print(f"[{datetime.now().strftime('%Y-%m-%d %H:%M:%S')}] 發送失敗，錯誤碼: {result.rc}")

    except Exception as e:
        print(f"[{datetime.now().strftime('%Y-%m-%d %H:%M:%S')}] 發送訊息時發生錯誤: {e}")

def main():
    """主程式"""
    global serial_counter

    print("UWB 雲端 MQTT 自動循環發送程式")
    print(f"雲端 MQTT Broker: {MQTT_BROKER}:{MQTT_PORT}")
    print(f"用戶名: {MQTT_USERNAME}")
    print(f"發送主題: {MQTT_TOPIC}")
    print("使用 SSL/TLS 加密連接")
    print(f"序列號起始值: {serial_counter}")
    print("每1秒發送一次訊息，XYZ坐標 = 序列號/1000")
    print("按 Ctrl+C 退出程式\n")

    # 創建 MQTT 客戶端
    client = mqtt.Client()

    # 設置回調函數
    client.on_connect = on_connect
    client.on_publish = on_publish
    client.on_disconnect = on_disconnect

    try:
        # 設置 SSL/TLS
        client.tls_set(ca_certs=None, certfile=None, keyfile=None,
                      cert_reqs=ssl.CERT_REQUIRED, tls_version=ssl.PROTOCOL_TLS,
                      ciphers=None)

        # 設置用戶名和密碼
        client.username_pw_set(MQTT_USERNAME, MQTT_PASSWORD)

        # 連接到雲端 MQTT Broker
        client.connect(MQTT_BROKER, MQTT_PORT, 60)

        # 啟動網路循環
        client.loop_start()

        # 等待連接建立
        time.sleep(2)

        print("開始自動發送訊息...")

        # 自動循環發送
        while True:
            try:
                # 發送訊息
                send_message(client)

                # 等待1秒
                time.sleep(1)

            except KeyboardInterrupt:
                print(f"\n[{datetime.now().strftime('%Y-%m-%d %H:%M:%S')}] 程式被用戶中斷")
                break

        # 停止網路循環
        client.loop_stop()

    except Exception as e:
        print(f"[{datetime.now().strftime('%Y-%m-%d %H:%M:%S')}] 發生錯誤: {e}")
    finally:
        client.disconnect()
        print(f"[{datetime.now().strftime('%Y-%m-%d %H:%M:%S')}] 程式結束")
        print(f"最後發送的序列號: {serial_counter - 1}")

if __name__ == "__main__":
    main()