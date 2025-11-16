# SeniorCarePlus Backend API 文檔

## 📖 概述
SeniorCarePlus 後端提供 RESTful API 和 WebSocket 服務，用於處理長者照護系統的健康監測、位置追蹤和警報管理。

## 🌐 基本資訊
- **基礎URL**: `http://localhost:8080`
- **API版本**: v1.2.0
- **數據格式**: JSON
- **認證方式**: Bearer Token

## 📋 目錄
- [健康監測 API](#健康監測-api)
- [位置追蹤 API](#位置追蹤-api)
- [用戶管理 API](#用戶管理-api)
- [設備管理 API](#設備管理-api)
- [WebSocket 服務](#websocket-服務)
- [MQTT 主題](#mqtt-主題)

---

## 🏥 健康監測 API

### 獲取所有患者列表
```http
GET /api/health/patients
```

**響應示例：**
```json
{
  "success": true,
  "data": [
    {
      "id": "P001",
      "name": "張三",
      "age": 75,
      "room": "101",
      "status": "active"
    }
  ],
  "message": "患者列表獲取成功",
  "timestamp": "2024-01-15T10:30:00"
}
```

### 獲取特定患者健康數據
```http
GET /api/health/patient/{patientId}
```

**參數：**
- `patientId`: 患者ID

**響應示例：**
```json
{
  "success": true,
  "data": {
    "patientId": "P001",
    "name": "張三",
    "heartRate": {
      "value": 72,
      "unit": "bpm",
      "timestamp": "2024-01-15T10:30:00",
      "status": "normal"
    },
    "temperature": {
      "value": 36.5,
      "unit": "°C",
      "timestamp": "2024-01-15T10:29:00",
      "status": "normal"
    },
    "bloodPressure": {
      "systolic": 120,
      "diastolic": 80,
      "unit": "mmHg",
      "timestamp": "2024-01-15T10:25:00",
      "status": "normal"
    }
  },
  "message": "健康數據獲取成功",
  "timestamp": "2024-01-15T10:30:00"
}
```

---

## 📍 位置追蹤 API

### 獲取所有設備位置
```http
GET /api/location/devices
```

**響應示例：**
```json
{
  "success": true,
  "data": [
    {
      "deviceId": "E001",
      "patientId": "P001",
      "x": 125.5,
      "y": 235.8,
      "z": 0.0,
      "floor": 1,
      "batteryLevel": 75,
      "signalStrength": -45,
      "timestamp": 1705295400000
    }
  ],
  "message": "設備位置列表獲取成功",
  "timestamp": "2024-01-15T10:30:00"
}
```

### 獲取特定設備位置
```http
GET /api/location/device/{deviceId}
```

**參數：**
- `deviceId`: 設備ID

**響應示例：**
```json
{
  "success": true,
  "data": {
    "deviceId": "E001",
    "patientId": "P001",
    "x": 125.5,
    "y": 235.8,
    "z": 0.0,
    "floor": 1,
    "batteryLevel": 75,
    "signalStrength": -45,
    "timestamp": 1705295400000
  },
  "message": "設備位置獲取成功",
  "timestamp": "2024-01-15T10:30:00"
}
```

### 更新設備位置
```http
POST /api/location/update
```

**請求體：**
```json
{
  "deviceId": "E001",
  "patientId": "P001",
  "x": 125.5,
  "y": 235.8,
  "z": 0.0,
  "floor": 1,
  "batteryLevel": 75,
  "signalStrength": -45,
  "timestamp": 1705295400000
}
```

### 獲取位置歷史記錄
```http
GET /api/location/history/{deviceId}?from={timestamp}&to={timestamp}&limit={number}
```

**查詢參數：**
- `from`: 開始時間戳（可選）
- `to`: 結束時間戳（可選）
- `limit`: 記錄數量限制（默認100）

### 獲取Gateway列表
```http
GET /api/location/gateways
```

**響應示例：**
```json
{
  "success": true,
  "data": [
    {
      "gatewayId": "GW001",
      "name": "主閘道器",
      "status": "online",
      "ipAddress": "192.168.1.100",
      "lastSeen": 1705295400000,
      "connectedDevices": 8
    }
  ],
  "message": "Gateway列表獲取成功",
  "timestamp": "2024-01-15T10:30:00"
}
```

### 獲取Anchor設備列表
```http
GET /api/location/anchors
```

### 獲取Tag設備列表
```http
GET /api/location/tags
```

---

## 🔌 WebSocket 服務

### 健康數據WebSocket
```
ws://localhost:8080/ws/health
```

**連接後會收到歡迎消息：**
```json
{
  "type": "welcome",
  "service": "health",
  "message": "連接到SeniorCarePlus健康數據服務",
  "sessionId": "health_1705295400000"
}
```

**數據更新消息：**
```json

{
  "type": "health_update",
  "data": {
    "patients": [...],
    "alerts": [...]
  },
  "timestamp": 1705295400000
}
```

**支持的客戶端消息：**
```json
// Ping消息
{
  "type": "ping",
  "timestamp": 1705295400000
}

// 訂閱特定患者
{
  "type": "subscribe_patient",
  "patientId": "P001"
}
```

### 位置數據WebSocket
```
ws://localhost:8080/ws/location
```

**初始數據消息：**
```json
{
  "type": "initial_data",
  "data": {
    "devices": [...],
    "gateways": [...],
    "anchors": [...],
    "tags": [...]
  },
  "timestamp": 1705295400000
}
```

**位置更新消息：**
```json
{
  "type": "location_update",
  "data": {
    "deviceId": "E001",
    "patientId": "P001",
    "x": 125.5,
    "y": 235.8,
    "z": 0.0,
    "floor": 1,
    "batteryLevel": 75,
    "signalStrength": -45,
    "timestamp": 1705295400000
  },
  "timestamp": 1705295400000
}
```

**電池狀態更新：**
```json
{
  "type": "battery_update",
  "data": {
    "deviceId": "E001",
    "batteryLevel": 75
  },
  "timestamp": 1705295400000
}
```

**Gateway狀態更新：**
```json
{
  "type": "gateway_status_update",
  "data": {
    "gatewayId": "GW001",
    "name": "主閘道器",
    "status": "online",
    "ipAddress": "192.168.1.100",
    "lastSeen": 1705295400000,
    "connectedDevices": 8
  },
  "timestamp": 1705295400000
}
```

**支持的客戶端消息：**
```json
// Ping消息
{
  "type": "ping",
  "timestamp": 1705295400000
}

// 獲取特定設備位置
{
  "type": "get_device_location",
  "deviceId": "E001"
}

// 訂閱特定設備
{
  "type": "subscribe_device",
  "deviceId": "E001"
}
```

### 警報WebSocket
```
ws://localhost:8080/ws/alerts
```

**警報更新消息：**
```json
{
  "type": "alerts_update",
  "alerts": [
    {
      "id": "A001",
      "type": "health_critical",
      "patientId": "P001",
      "message": "心率過高警報",
      "severity": "high",
      "timestamp": 1705295400000,
      "acknowledged": false
    }
  ],
  "count": 1,
  "timestamp": 1705295400000
}
```

---

## 📡 MQTT 主題

### 健康數據主題
```
seniorcareplus/heartrate/{patientId}      # 心率數據
seniorcareplus/temperature/{patientId}    # 體溫數據
seniorcareplus/diaper/{patientId}         # 尿布狀態
seniorcareplus/bloodpressure/{patientId}  # 血壓數據
seniorcareplus/sleep/{patientId}          # 睡眠數據
seniorcareplus/steps/{patientId}          # 步數數據
```

### 位置數據主題
```
seniorcareplus/location/{deviceId}        # 位置數據
seniorcareplus/gateway/{gatewayId}        # Gateway狀態
seniorcareplus/battery/{deviceId}         # 電池狀態
```

### 設備控制主題
```
seniorcareplus/device/status/{deviceId}   # 設備狀態
seniorcareplus/device/config/{deviceId}   # 設備配置（下發指令）
```

### MQTT消息格式示例

**位置數據消息：**
```json
{
  "deviceId": "E001",
  "patientId": "P001",
  "x": 125.5,
  "y": 235.8,
  "z": 0.0,
  "floor": 1,
  "batteryLevel": 75,
  "signalStrength": -45,
  "timestamp": 1705295400000
}
```

**Gateway狀態消息：**
```json
{
  "gatewayId": "GW001",
  "status": "online",
  "connected_devices": 8,
  "timestamp": 1705295400000
}
```

**設備配置指令：**
```json
{
  "command": "update_config",
  "config": {
    "fw_update": false,
    "led": true,
    "ble": true,
    "location_engine": true,
    "responsive_mode": "normal",
    "stationary_detect": true,
    "nominal_update_rate": 1000,
    "stationary_update_rate": 5000
  }
}
```

---

## 📊 健康檢查端點

### 系統健康狀態
```http
GET /health
```

**響應示例：**
```json
{
  "status": "healthy",
  "service": "SeniorCarePlus Backend",
  "database": "connected",
  "mqtt": "running",
  "websocket_connections": {
    "health": 2,
    "location": 3,
    "alerts": 1,
    "total": 6
  },
  "timestamp": 1705295400000
}
```

## 🔧 數據庫配置

### PostgreSQL設置
```bash
# 創建數據庫
createdb seniorcareplus

# 連接字符串示例
DATABASE_URL=postgresql://username:password@localhost:5432/seniorcareplus
```

### 主要數據表
- `patients` - 患者基本信息
- `health_records` - 健康數據記錄
- `location_records` - 位置歷史記錄
- `devices` - 設備信息
- `gateways` - 閘道器信息
- `alerts` - 警報記錄

---

## 🚀 快速開始

### 1. 啟動後端服務
```bash
cd SeniorCarePlusBackend
./gradlew run
```

### 2. 測試連接
```bash
curl http://localhost:8080/health
```

### 3. 連接WebSocket（JavaScript示例）
```javascript
// 位置數據WebSocket
const locationSocket = new WebSocket('ws://localhost:8080/ws/location');

locationSocket.onmessage = function(event) {
    const message = JSON.parse(event.data);
    console.log('收到位置更新:', message);
};

// 發送Ping消息
locationSocket.send(JSON.stringify({
    type: 'ping',
    timestamp: Date.now()
}));
```

### 4. Android客戶端示例
```kotlin
// 使用BackendApiService
val apiService = BackendApiService()
apiService.connectToLocationWebSocket()

// 監聽位置更新
lifecycleScope.launch {
    apiService.locationUpdates.collect { locationData ->
        // 處理位置更新
        updateMapLocation(locationData)
    }
}
```

---

## 📝 注意事項

1. **實時性**：位置數據通過WebSocket實時推送，確保低延遲
2. **電池監控**：設備電池狀態會自動監控並在低電量時發出警報
3. **連接管理**：WebSocket連接會自動重連，確保服務穩定性
4. **數據存儲**：所有位置數據都會存儲到PostgreSQL以供歷史查詢
5. **擴展性**：支持多個Gateway和無限數量的Tag設備

## 🔒 安全性

- 使用HTTPS和WSS協議進行生產環境部署
- 實施適當的身份認證和授權機制
- 定期更新API密鑰和證書
- 監控異常訪問模式

---

*更新時間：2024年1月15日*
*API版本：v1.2.0* 