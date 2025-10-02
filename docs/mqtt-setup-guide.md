# MQTT 環境建置手順

## 概述

本文檔提供 Senior Care Plus UWB 定位系統的 MQTT 環境建置詳細步驟，包括 Mosquitto MQTT Broker 的安裝、配置和測試。

## 系統要求

- Windows 10/11
- 管理員權限
- 網絡連接

## 方法一：Docker 安裝 (推薦)

### 1. 安裝 Docker Desktop

1. 下載 Docker Desktop for Windows
2. 安裝並啟動 Docker Desktop
3. 確認 Docker 運行正常

### 2. 使用 Docker 運行 Mosquitto

```bash
# 拉取 Mosquitto 鏡像
docker pull eclipse-mosquitto:latest

# 創建配置目錄
mkdir C:\mosquitto\config
mkdir C:\mosquitto\data
mkdir C:\mosquitto\logs

# 創建配置文件
echo listener 1883 > C:\mosquitto\config\mosquitto.conf
echo protocol mqtt >> C:\mosquitto\config\mosquitto.conf
echo listener 8083 >> C:\mosquitto\config\mosquitto.conf
echo protocol websockets >> C:\mosquitto\config\mosquitto.conf
echo allow_anonymous true >> C:\mosquitto\config\mosquitto.conf

# 運行 Mosquitto 容器
docker run -it -d --name mosquitto-broker \
  -p 1883:1883 \
  -p 8083:8083 \
  -v C:\mosquitto\config\mosquitto.conf:/mosquitto/config/mosquitto.conf \
  -v C:\mosquitto\data:/mosquitto/data \
  -v C:\mosquitto\logs:/mosquitto/logs \
  eclipse-mosquitto:latest
```

### 3. 驗證安裝

```bash
# 檢查容器狀態
docker ps

# 查看容器日誌
docker logs mosquitto-broker

# 測試 MQTT 連接
docker exec -it mosquitto-broker mosquitto_pub -h localhost -t "test/topic" -m "Hello World"
```

## 方法二：原生 Windows 安裝

### 1. 下載 Mosquitto

1. 訪問 [Eclipse Mosquitto 官網](https://mosquitto.org/download/)
2. 下載 Windows 版本 (mosquitto-2.0.22-install-windows-x64.exe)
3. 以管理員身份運行安裝程序

### 2. 安裝步驟

1. 選擇安裝路徑：`C:\Program Files\mosquitto`
2. 選擇組件：全部選中
3. 完成安裝

### 3. 配置 Mosquitto

創建配置文件 `C:\Program Files\mosquitto\mosquitto.conf`：

```conf
# Mosquitto 配置文件
# 保存為: C:\Program Files\mosquitto\mosquitto.conf

# 監聽端口配置
listener 1883
protocol mqtt

# WebSocket 支持
listener 8083
protocol websockets
allow_anonymous true

# 允許匿名連接（開發環境）
allow_anonymous true

# 日誌配置
log_dest file C:\Program Files\mosquitto\mosquitto.log
log_type error
log_type warning
log_type notice
log_type information

# 持久化配置
persistence true
persistence_location C:\Program Files\mosquitto\data\

# 最大連接數
max_connections 1000

# 消息大小限制
max_packet_size 1048576

# 自動保存間隔
autosave_interval 1800
```

### 4. 啟動 Mosquitto 服務

```cmd
# 方法 1: 使用服務
net start mosquitto

# 方法 2: 手動啟動
cd "C:\Program Files\mosquitto"
mosquitto.exe -c mosquitto.conf -v
```

### 5. 驗證安裝

```cmd
# 檢查端口監聽
netstat -an | findstr :1883
netstat -an | findstr :8083

# 測試 MQTT 連接
mosquitto_pub -h localhost -t "test/topic" -m "Hello World"
mosquitto_sub -h localhost -t "test/topic"
```

## 配置說明

### 端口配置

| 端口 | 協議 | 用途 |
|------|------|------|
| 1883 | MQTT | 標準 MQTT 連接 |
| 8083 | WebSocket | 瀏覽器 WebSocket 連接 |

### 安全配置

#### 開發環境
```conf
allow_anonymous true
```

#### 生產環境
```conf
allow_anonymous false
password_file C:\Program Files\mosquitto\passwd
acl_file C:\Program Files\mosquitto\acl
```

### 創建用戶和密碼

```cmd
# 創建密碼文件
mosquitto_passwd -c C:\Program Files\mosquitto\passwd username

# 創建 ACL 文件
echo user username > C:\Program Files\mosquitto\acl
echo topic readwrite UWB/# >> C:\Program Files\mosquitto\acl
```

## 前端連接配置

### 環境變量設置

創建 `.env` 文件：

```env
# MQTT 配置
VITE_MQTT_PROTOCOL=ws
VITE_MQTT_BROKER=localhost
VITE_MQTT_PORT=8083
VITE_MQTT_USERNAME=
VITE_MQTT_PASSWORD=
```

### 連接代碼示例

```typescript
import mqtt from 'mqtt'

const mqttUrl = `${import.meta.env.VITE_MQTT_PROTOCOL}://${import.meta.env.VITE_MQTT_BROKER}:${import.meta.env.VITE_MQTT_PORT}/mqtt`

const client = mqtt.connect(mqttUrl, {
    username: import.meta.env.VITE_MQTT_USERNAME,
    password: import.meta.env.VITE_MQTT_PASSWORD,
    reconnectPeriod: 3000,
    connectTimeout: 30000,
    keepalive: 30,
    clean: true
})

client.on('connect', () => {
    console.log('MQTT 連接成功')
    client.subscribe('UWB/location/+')
})

client.on('message', (topic, message) => {
    console.log('收到消息:', topic, message.toString())
})
```

## MQTT 主題結構

### 位置數據主題
```
UWB/location/{tagId}
```

**消息格式:**
```json
{
    "tagId": "tag_123",
    "position": {
        "x": 10.5,
        "y": 20.3,
        "z": 0
    },
    "floorId": "floor_123",
    "timestamp": "2025-10-02T15:30:00.000Z",
    "signalStrength": -65.5,
    "batteryLevel": 85.2
}
```

### 設備狀態主題
```
UWB/device/{deviceId}/status
```

**消息格式:**
```json
{
    "deviceId": "device_123",
    "deviceType": "gateway",
    "status": "online",
    "lastSeen": "2025-10-02T15:30:00.000Z",
    "batteryLevel": 78.5,
    "signalStrength": -70.2
}
```

### 閘道器健康檢查主題
```
UWB/gateway/{gatewayId}/health
```

**消息格式:**
```json
{
    "gatewayId": "gateway_123",
    "status": "healthy",
    "timestamp": "2025-10-02T15:30:00.000Z",
    "uptime": 3600,
    "memoryUsage": 45.2,
    "cpuUsage": 12.8
}
```

## 故障排除

### 常見問題

#### 1. 端口被占用
```cmd
# 查看端口占用
netstat -ano | findstr :1883
netstat -ano | findstr :8083

# 終止進程
taskkill /PID <PID> /F
```

#### 2. 服務無法啟動
```cmd
# 檢查配置文件語法
mosquitto.exe -c mosquitto.conf -v

# 查看錯誤日誌
type "C:\Program Files\mosquitto\mosquitto.log"
```

#### 3. 連接被拒絕
- 檢查防火牆設置
- 確認端口配置正確
- 檢查用戶名密碼

#### 4. WebSocket 連接失敗
- 確認 WebSocket 監聽器已啟用
- 檢查端口 8083 是否開放
- 確認協議設置為 `websockets`

### 日誌分析

```cmd
# 實時查看日誌
tail -f "C:\Program Files\mosquitto\mosquitto.log"

# 過濾錯誤日誌
findstr "ERROR" "C:\Program Files\mosquitto\mosquitto.log"
```

## 性能優化

### 1. 連接池配置
```conf
max_connections 1000
max_inflight_messages 20
max_queued_messages 100
```

### 2. 持久化優化
```conf
persistence true
persistence_location C:\Program Files\mosquitto\data\
autosave_interval 1800
```

### 3. 內存管理
```conf
max_packet_size 1048576
message_size_limit 268435456
```

## 監控和維護

### 1. 健康檢查腳本

創建 `check-mqtt.bat`：

```batch
@echo off
echo 檢查 MQTT 服務狀態...

netstat -an | findstr :1883 >nul
if %errorlevel% == 0 (
    echo MQTT 端口 1883 正常
) else (
    echo MQTT 端口 1883 異常
)

netstat -an | findstr :8083 >nul
if %errorlevel% == 0 (
    echo WebSocket 端口 8083 正常
) else (
    echo WebSocket 端口 8083 異常
)

echo 檢查完成
pause
```

### 2. 自動重啟腳本

創建 `restart-mqtt.bat`：

```batch
@echo off
echo 重啟 MQTT 服務...

net stop mosquitto
timeout /t 5
net start mosquitto

echo MQTT 服務已重啟
pause
```

## 安全建議

1. **生產環境禁用匿名連接**
2. **使用強密碼和用戶認證**
3. **配置 ACL 限制主題訪問**
4. **啟用 TLS/SSL 加密**
5. **定期更新 Mosquitto 版本**
6. **監控連接和消息流量**

## 版本信息

- **Mosquitto 版本**: 2.0.22
- **文檔版本**: 1.0.0
- **更新日期**: 2025-10-02
