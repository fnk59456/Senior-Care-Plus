# WebSocket API 接口規範

## 📋 文檔目的

本文檔為後端工程師提供 WebSocket 服務的完整規範，用於替代前端直連 MQTT 的方案。

---

## 🎯 架構概述

```
IoT 設備 (Tags/Anchors/Gateways)
    ↓ MQTT Publish
MQTT Broker
    ↓ Subscribe
後端服務器
    ├── MQTT 連接管理
    ├── 消息接收和解析
    ├── 消息去重處理
    └── WebSocket 推送
        ↓
前端應用 (React)
    └── WebSocket 客戶端接收實時數據
```

---

## 🌐 WebSocket 服務器規範

### 連接信息

| 項目 | 值 |
|------|-----|
| **協議** | WebSocket (ws:// 或 wss://) |
| **開發環境** | `ws://localhost:3002` |
| **生產環境** | `wss://api.seniorcare.com/ws` |
| **心跳間隔** | 30 秒 |

---

## 📨 消息格式

### 通用消息結構

所有 WebSocket 消息都使用 JSON 格式：

```json
{
  "type": "消息類型",
  "timestamp": "ISO 8601 時間戳",
  ...其他字段
}
```

---

## 📥 服務器 → 前端消息

### 1. 連接成功消息

**時機**：前端連接成功後立即發送

```json
{
  "type": "connected",
  "message": "歡迎連接到後端 WebSocket 服務",
  "timestamp": "2025-11-12T10:30:00.000Z",
  "clientCount": 3
}
```

| 字段 | 類型 | 說明 |
|------|------|------|
| `type` | string | 固定為 `"connected"` |
| `message` | string | 歡迎消息 |
| `timestamp` | string | ISO 8601 時間戳 |
| `clientCount` | number | 當前連接的客戶端數量 |

---

### 2. MQTT 消息推送

**時機**：後端接收到 MQTT 消息並通過去重後推送

```json
{
  "type": "mqtt_message",
  "topic": "UWB/location/tag_001",
  "payload": {
    "tagId": "tag_001",
    "x": 12.34,
    "y": 56.78,
    "z": 1.5,
    "timestamp": 1699876543210
  },
  "timestamp": "2025-11-12T10:30:15.123Z",
  "messageId": "UWB/location/tag_001-1699876543210-{\"ta"
}
```

| 字段 | 類型 | 說明 |
|------|------|------|
| `type` | string | 固定為 `"mqtt_message"` |
| `topic` | string | MQTT Topic |
| `payload` | object | MQTT 消息內容（已解析為 JSON） |
| `timestamp` | string | 後端接收時間（ISO 8601） |
| `messageId` | string | 用於去重的消息 ID（前50字符） |

---

### 3. 訂閱確認消息

**時機**：前端發送訂閱請求後的確認

```json
{
  "type": "subscribed",
  "topics": ["UWB/location/+", "UWB/device/+/status"],
  "timestamp": "2025-11-12T10:30:00.500Z"
}
```

| 字段 | 類型 | 說明 |
|------|------|------|
| `type` | string | 固定為 `"subscribed"` |
| `topics` | array | 已訂閱的 Topic 列表 |
| `timestamp` | string | ISO 8601 時間戳 |

---

### 4. 錯誤消息

**時機**：發生錯誤時

```json
{
  "type": "error",
  "error": "Connection to MQTT broker failed",
  "code": "MQTT_CONN_ERROR",
  "timestamp": "2025-11-12T10:30:20.000Z"
}
```

| 字段 | 類型 | 說明 |
|------|------|------|
| `type` | string | 固定為 `"error"` |
| `error` | string | 錯誤描述 |
| `code` | string | 錯誤代碼 |
| `timestamp` | string | ISO 8601 時間戳 |

---

## 📤 前端 → 服務器消息

### 1. 訂閱請求（可選）

**說明**：前端可以主動訂閱特定 Topic（如果後端支持動態訂閱）

```json
{
  "type": "subscribe",
  "topics": ["UWB/location/+", "UWB/device/+/status"]
}
```

| 字段 | 類型 | 說明 |
|------|------|------|
| `type` | string | 固定為 `"subscribe"` |
| `topics` | array | 要訂閱的 Topic 列表（支持 MQTT 通配符） |

---

### 2. 取消訂閱請求（可選）

```json
{
  "type": "unsubscribe",
  "topics": ["UWB/location/+"]
}
```

---

### 3. 心跳消息（可選）

**說明**：如果服務器需要心跳保持連接

```json
{
  "type": "ping",
  "timestamp": "2025-11-12T10:30:30.000Z"
}
```

**響應**：

```json
{
  "type": "pong",
  "timestamp": "2025-11-12T10:30:30.010Z"
}
```

---

## 🔧 後端實現要求

### 1. MQTT 連接管理

- [ ] 連接到 MQTT Broker
- [ ] 訂閱所有必要的 Topics
- [ ] 處理 MQTT 連接斷開和重連
- [ ] 記錄 MQTT 連接狀態

**必須訂閱的 Topics**：
- `UWB/#` - 所有 UWB 相關消息
- `UWB/location/+` - 位置數據
- `UWB/device/+/status` - 設備狀態
- `UWB/device/+/config` - 設備配置
- `UWB/gateway/+/health` - 網關健康狀態

---

### 2. 消息去重機制 ⭐ **關鍵功能**

#### 去重邏輯

```javascript
// 生成唯一消息 ID
const messageId = `${topic}-${payload.timestamp || Date.now()}-${JSON.stringify(payload).substring(0, 50)}`

// 檢查是否已處理
if (messageDeduplication.has(messageId)) {
    return // 跳過重複消息
}

// 記錄消息
messageDeduplication.set(messageId, Date.now())
```

#### 清理策略

- 保留時間：1 小時
- 清理頻率：每 5 分鐘
- 清理過期記錄，避免內存泄漏

```javascript
setInterval(() => {
    const oneHourAgo = Date.now() - 60 * 60 * 1000
    for (const [id, timestamp] of messageDeduplication.entries()) {
        if (timestamp < oneHourAgo) {
            messageDeduplication.delete(id)
        }
    }
}, 5 * 60 * 1000)
```

---

### 3. WebSocket 服務器

- [ ] 監聽 WebSocket 端口（開發：3002，生產：根據配置）
- [ ] 管理多個客戶端連接
- [ ] 處理客戶端連接和斷開
- [ ] 廣播消息到所有連接的客戶端
- [ ] 處理客戶端錯誤

#### 廣播實現示例

```javascript
const broadcastToClients = (message) => {
    const messageStr = JSON.stringify(message)

    wsClients.forEach(client => {
        if (client.readyState === WebSocket.OPEN) {
            client.send(messageStr)
        }
    })
}
```

---

### 4. 錯誤處理

- [ ] MQTT 連接錯誤
- [ ] WebSocket 連接錯誤
- [ ] 消息解析錯誤
- [ ] 網絡超時錯誤

#### 錯誤響應格式

```json
{
  "type": "error",
  "error": "錯誤描述",
  "code": "ERROR_CODE",
  "timestamp": "ISO 8601 時間戳"
}
```

---

### 5. 日誌記錄

必須記錄的事件：

- ✅ WebSocket 客戶端連接/斷開
- ✅ MQTT 消息接收
- ✅ 消息去重（跳過重複）
- ✅ 消息推送成功/失敗
- ✅ 錯誤和異常

**日誌級別**：
- `INFO`: 正常操作（連接、斷開）
- `DEBUG`: 調試信息（消息內容）
- `WARN`: 警告（重複消息）
- `ERROR`: 錯誤（連接失敗、推送失敗）

---

## 📊 性能要求

| 指標 | 要求 | 說明 |
|------|------|------|
| **消息延遲** | < 100ms | MQTT 接收到 WebSocket 推送的時間 |
| **並發連接數** | 100+ | 支持至少 100 個前端同時連接 |
| **消息吞吐量** | 48,000 RPS | 根據架構圖要求 |
| **去重效率** | > 99% | 重複消息應被正確識別 |
| **內存使用** | < 500MB | 去重緩存和消息緩衝 |

---

## 🧪 測試用例

### 測試 1：WebSocket 連接

```javascript
const ws = new WebSocket('ws://localhost:3002')

ws.onopen = () => {
    console.log('✅ 連接成功')
}

ws.onmessage = (event) => {
    const message = JSON.parse(event.data)
    console.log('📨 收到消息:', message)

    // 應該收到 connected 消息
    assert(message.type === 'connected')
}
```

---

### 測試 2：MQTT 消息推送

```javascript
// 1. 發布 MQTT 消息
mqttClient.publish('UWB/location/tag_001', JSON.stringify({
    tagId: 'tag_001',
    x: 12.34,
    y: 56.78,
    z: 1.5,
    timestamp: Date.now()
}))

// 2. 前端應該通過 WebSocket 收到消息
ws.onmessage = (event) => {
    const message = JSON.parse(event.data)

    assert(message.type === 'mqtt_message')
    assert(message.topic === 'UWB/location/tag_001')
    assert(message.payload.tagId === 'tag_001')
}
```

---

### 測試 3：消息去重

```javascript
// 1. 發布相同的消息兩次
const payload = { tagId: 'tag_001', x: 12.34, timestamp: 1699876543210 }

mqttClient.publish('UWB/location/tag_001', JSON.stringify(payload))
mqttClient.publish('UWB/location/tag_001', JSON.stringify(payload))

// 2. 前端應該只收到一次
let messageCount = 0

ws.onmessage = (event) => {
    const message = JSON.parse(event.data)
    if (message.type === 'mqtt_message') {
        messageCount++
    }
}

setTimeout(() => {
    assert(messageCount === 1, '應該只收到一條消息')
}, 1000)
```

---

## 🔒 安全考慮

### 1. 認證（生產環境必須）

```javascript
// 前端連接時攜帶認證信息
const ws = new WebSocket('wss://api.seniorcare.com/ws?token=JWT_TOKEN')

// 或通過首條消息認證
ws.send(JSON.stringify({
    type: 'auth',
    token: 'JWT_TOKEN'
}))
```

### 2. 授權

- 根據用戶角色限制可訂閱的 Topics
- 驗證用戶是否有權訪問特定數據

### 3. 加密

- 生產環境必須使用 WSS (WebSocket Secure)
- 使用 TLS/SSL 加密傳輸

---

## 📦 依賴庫建議

### Node.js 後端

```json
{
  "dependencies": {
    "ws": "^8.x",              // WebSocket 服務器
    "mqtt": "^5.x",            // MQTT 客戶端
    "express": "^4.x"          // HTTP 服務器（可選）
  }
}
```

### Kotlin (Ktor) 後端

```kotlin
dependencies {
    implementation("io.ktor:ktor-server-websockets")
    implementation("org.eclipse.paho:org.eclipse.paho.client.mqttv3:1.2.5")
}
```

---

## 📝 本地測試服務器

已提供完整的本地測試服務器實現：`test-backend-with-db.js`

### 啟動方式

```bash
# 安裝依賴
npm install ws mqtt express cors

# 啟動服務器
node test-backend-with-db.js
```

### 測試方式

```bash
# 啟動 MQTT Broker
mosquitto -c mosquitto.conf -v

# 啟動測試服務器
node test-backend-with-db.js

# 啟動前端
npm run dev
```

---

## 🔗 相關文檔

- [API 接口規格](api-specification.md)
- [MQTT 設置指南](mqtt-setup-guide.md)
- [測試指南](testing-guide.md)
- [後端工程師交接文檔](backend-engineer-handover.md)

---

## 📞 聯繫方式

如有疑問，請聯繫：
- **前端開發**: [您的聯繫方式]
- **項目文檔**: `docs/` 目錄

---

## ✅ 實施檢查清單

### 後端工程師實施步驟

- [ ] 閱讀本規範文檔
- [ ] 參考 `test-backend-with-db.js` 實現
- [ ] 實現 MQTT 連接管理
- [ ] 實現消息去重機制
- [ ] 實現 WebSocket 服務器
- [ ] 實現消息廣播功能
- [ ] 添加錯誤處理和日誌
- [ ] 實現認證和授權（生產環境）
- [ ] 性能測試
- [ ] 與前端聯調測試
- [ ] 部署到測試環境
- [ ] 部署到生產環境

---

**最後更新**: 2025-11-12
**版本**: 1.0.0

