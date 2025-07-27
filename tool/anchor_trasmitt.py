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
    message = {
        "content": "configChange",
        "gateway id": 4192540344,
        "node": "ANCHOR",
        "name": "DW4C0B",
        "id": 19467,
        "fw update": 0,
        "led": 1,
        "ble": 1,
        "initiator": 0,
        "position": {
            "x": 1.1,
            "y": 1.11,
            "z": 1.111
        },
        "serial no": 1302
    }
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

            # 輸出原始 JSON
            print(f"\n發送的 JSON:")
            print(json.dumps(message, indent=2, ensure_ascii=False))
            print(f"{'='*60}\n")

        else:
            print(f"[{datetime.now().strftime('%Y-%m-%d %H:%M:%S')}] 發送失敗，錯誤碼: {result.rc}")

    except Exception as e:
        print(f"[{datetime.now().strftime('%Y-%m-%d %H:%M:%S')}] 發送訊息時發生錯誤: {e}")

def main():
    """主程式"""
    print("UWB 雲端 MQTT 訊息發送程式")
    print(f"雲端 MQTT Broker: {MQTT_BROKER}:{MQTT_PORT}")
    print(f"用戶名: {MQTT_USERNAME}")
    print(f"發送主題: {MQTT_TOPIC}")
    print("使用 SSL/TLS 加密連接")
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

        while True:
            try:
                # 發送訊息
                send_message(client)

                # 等待用戶輸入決定是否繼續發送
                user_input = input("按 Enter 繼續發送，輸入 'q' 退出: ")
                if user_input.lower() == 'q':
                    break

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

if __name__ == "__main__":
    main()