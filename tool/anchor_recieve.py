import json
import ssl
import paho.mqtt.client as mqtt
from datetime import datetime

# 雲端 MQTT 配置
MQTT_BROKER = "067ec32ef1344d3bb20c4e53abdde99a.s1.eu.hivemq.cloud"
MQTT_PORT = 8883  # SSL/TLS 端口
MQTT_TOPIC_CONFIG = "UWB/GW16B8_AncConf"  # Anchor 配置主題
MQTT_TOPIC_TAGCONF = "UWB/GW16B8_TagConf"  # Tag 配置主題
MQTT_TOPIC_MESSAGE = "UWB/GW16B8_Message"  # 訊息主題
MQTT_USERNAME = "testweb1"
MQTT_PASSWORD = "Aa000000"

def on_connect(client, userdata, flags, rc):
    """MQTT 連接回調函數"""
    if rc == 0:
        print(f"[{datetime.now().strftime('%Y-%m-%d %H:%M:%S')}] 成功連接到 MQTT Broker")

        # 訂閱三個主題
        client.subscribe(MQTT_TOPIC_CONFIG)
        print(f"[{datetime.now().strftime('%Y-%m-%d %H:%M:%S')}] 已訂閱主題: {MQTT_TOPIC_CONFIG}")

        client.subscribe(MQTT_TOPIC_TAGCONF)
        print(f"[{datetime.now().strftime('%Y-%m-%d %H:%M:%S')}] 已訂閱主題: {MQTT_TOPIC_TAGCONF}")

        client.subscribe(MQTT_TOPIC_MESSAGE)
        print(f"[{datetime.now().strftime('%Y-%m-%d %H:%M:%S')}] 已訂閱主題: {MQTT_TOPIC_MESSAGE}")
    else:
        print(f"[{datetime.now().strftime('%Y-%m-%d %H:%M:%S')}] 連接失敗，返回碼: {rc}")

def handle_anchor_config_message(message, topic):
    """處理 Anchor 配置訊息"""
    print(f"\n{'='*60}")
    print(f"[{datetime.now().strftime('%Y-%m-%d %H:%M:%S')}] 收到 UWB Anchor 配置訊息")
    print(f"主題: {topic}")
    print(f"{'='*60}")

    # 格式化輸出訊息內容
    print("Anchor 配置訊息內容:")
    print(f"  內容類型: {message.get('content', 'N/A')}")
    print(f"  Gateway ID: {message.get('gateway id', 'N/A')}")
    print(f"  節點類型: {message.get('node', 'N/A')}")
    print(f"  設備名稱: {message.get('name', 'N/A')}")
    print(f"  設備 ID: {message.get('id', 'N/A')}")
    print(f"  韌體更新: {message.get('fw update', 'N/A')}")
    print(f"  LED 狀態: {message.get('led', 'N/A')}")
    print(f"  BLE 狀態: {message.get('ble', 'N/A')}")
    print(f"  發起者: {message.get('initiator', 'N/A')}")

    # 輸出位置信息
    position = message.get('position', {})
    if position:
        print("  位置坐標:")
        print(f"    X: {position.get('x', 'N/A')}")
        print(f"    Y: {position.get('y', 'N/A')}")
        print(f"    Z: {position.get('z', 'N/A')}")

def handle_tag_config_message(message, topic):
    """處理 Tag 配置訊息"""
    print(f"\n{'='*60}")
    print(f"[{datetime.now().strftime('%Y-%m-%d %H:%M:%S')}] 收到 UWB Tag 配置訊息")
    print(f"主題: {topic}")
    print(f"{'='*60}")

    # 格式化輸出訊息內容
    print("Tag 配置訊息內容:")
    print(f"  內容類型: {message.get('content', 'N/A')}")
    print(f"  Gateway ID: {message.get('gateway id', 'N/A')}")
    print(f"  節點類型: {message.get('node', 'N/A')}")
    print(f"  設備名稱: {message.get('name', 'N/A')}")
    print(f"  設備 ID: {message.get('id', 'N/A')}")
    print(f"  韌體更新: {message.get('fw update', 'N/A')}")
    print(f"  LED 狀態: {message.get('led', 'N/A')}")
    print(f"  BLE 狀態: {message.get('ble', 'N/A')}")
    print(f"  發起者: {message.get('initiator', 'N/A')}")

    # 輸出位置信息
    position = message.get('position', {})
    if position:
        print("  位置坐標:")
        print(f"    X: {position.get('x', 'N/A')}")
        print(f"    Y: {position.get('y', 'N/A')}")
        print(f"    Z: {position.get('z', 'N/A')}")

def handle_status_message(message, topic):
    """處理狀態訊息"""
    print(f"\n{'='*60}")
    print(f"[{datetime.now().strftime('%Y-%m-%d %H:%M:%S')}] 收到 UWB 狀態訊息")
    print(f"主題: {topic}")
    print(f"{'='*60}")

    # 格式化輸出訊息內容
    print("狀態訊息內容:")
    print(f"  內容類型: {message.get('content', 'N/A')}")
    print(f"  Gateway ID: {message.get('gateway id', 'N/A')}")
    print(f"  節點類型: {message.get('node', 'N/A')}")
    print(f"  設備 ID: {message.get('id', 'N/A')}")
    print(f"  5V 電源狀態: {message.get('5V plugged', 'N/A')}")
    print(f"  序列號: {message.get('serial no', 'N/A')}")

def on_message(client, userdata, msg):
    """MQTT 訊息接收回調函數"""
    try:
        # 解析 JSON 訊息
        message = json.loads(msg.payload.decode('utf-8'))

        # 根據主題判斷訊息類型並處理
        if msg.topic == MQTT_TOPIC_CONFIG:
            handle_anchor_config_message(message, msg.topic)
        elif msg.topic == MQTT_TOPIC_TAGCONF:
            handle_tag_config_message(message, msg.topic)
        elif msg.topic == MQTT_TOPIC_MESSAGE:
            handle_status_message(message, msg.topic)
        else:
            print(f"\n{'='*60}")
            print(f"[{datetime.now().strftime('%Y-%m-%d %H:%M:%S')}] 收到未知主題訊息")
            print(f"主題: {msg.topic}")
            print(f"{'='*60}")

        # 輸出原始 JSON（便於調試）
        print(f"\n原始 JSON:")
        print(json.dumps(message, indent=2, ensure_ascii=False))
        print(f"{'='*60}\n")

    except json.JSONDecodeError as e:
        print(f"[{datetime.now().strftime('%Y-%m-%d %H:%M:%S')}] JSON 解析錯誤: {e}")
        print(f"主題: {msg.topic}")
        print(f"原始訊息: {msg.payload.decode('utf-8')}")
    except Exception as e:
        print(f"[{datetime.now().strftime('%Y-%m-%d %H:%M:%S')}] 處理訊息時發生錯誤: {e}")

def on_disconnect(client, userdata, rc):
    """MQTT 斷線回調函數"""
    print(f"[{datetime.now().strftime('%Y-%m-%d %H:%M:%S')}] 與 MQTT Broker 斷線，返回碼: {rc}")

def main():
    """主程式"""
    print("UWB 雲端 MQTT 多主題訊息監聽程式")
    print(f"雲端 MQTT Broker: {MQTT_BROKER}:{MQTT_PORT}")
    print(f"用戶名: {MQTT_USERNAME}")
    print(f"監聽主題 1: {MQTT_TOPIC_CONFIG} (Anchor 配置)")
    print(f"監聽主題 2: {MQTT_TOPIC_TAGCONF} (Tag 配置)")
    print(f"監聽主題 3: {MQTT_TOPIC_MESSAGE} (狀態訊息)")
    print("使用 SSL/TLS 加密連接")
    print("按 Ctrl+C 退出程式\n")

    # 創建 MQTT 客戶端
    client = mqtt.Client()

    # 設置回調函數
    client.on_connect = on_connect
    client.on_message = on_message
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

        # 開始監聽
        client.loop_forever()

    except KeyboardInterrupt:
        print(f"\n[{datetime.now().strftime('%Y-%m-%d %H:%M:%S')}] 程式被用戶中斷")
    except Exception as e:
        print(f"[{datetime.now().strftime('%Y-%m-%d %H:%M:%S')}] 發生錯誤: {e}")
    finally:
        client.disconnect()
        print(f"[{datetime.now().strftime('%Y-%m-%d %H:%M:%S')}] 程式結束")

if __name__ == "__main__":
    main()