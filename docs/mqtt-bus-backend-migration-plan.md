# MQTT Bus 後端化遷移規劃

## 📊 當前狀態總結

### ✅ 已完成後端化的模塊
1. **Homes (場域)** - ✅ 完成
2. **Floors (樓層)** - ✅ 完成
3. **Gateways (網關)** - ✅ 完成
4. **Anchors (錨點)** - ✅ 剛剛完成
5. **Tags (標籤)** - ✅ 後端 API 已實現

### 🔄 當前 MQTT Bus 架構

**現狀**：
- 前端直接連接 MQTT Broker (`src/services/mqttBus.ts`)
- 前端訂閱 MQTT Topics
- 前端處理所有 MQTT 消息

**問題**：
- 每個前端實例都需要單獨連接 MQTT
- 無法統一管理 MQTT 連接
- 無法實現消息去重和統一處理
- 不符合系統架構圖的設計（後端應該處理 MQTT）

---

## 🎯 目標架構

根據系統架構圖，目標是：

```
IoT 設備 (Tags/Gateways)
    ↓ MQTT Publish
MQTT Broker (HiveMQ Cloud)
    ↓ Subscribe
後端服務器 (Ktor Backend)
    ↓ 處理、去重、存儲
    ↓ WebSocket 推送
前端 (React)
    ↓ 接收實時數據
```

---

## 📋 遷移步驟

### 階段 1: 後端 MQTT 連接服務 ⭐ **下一步**

#### 1.1 在後端實現 MQTT 連接
**文件**: `test-backend-with-db.js` (或未來的 Ktor 後端)

**任務**：
- [ ] 創建後端 MQTT 客戶端連接
- [ ] 訂閱所有必要的 Topics
- [ ] 實現消息接收和處理邏輯
- [ ] 實現消息去重機制（參考架構圖中的 Cloud Dataflow）
- [ ] 將消息存儲到 Redis (即時快取) 和 BigQuery (歷史歸檔)

**代碼結構**：
```javascript
// test-backend-with-db.js 中新增

// MQTT 連接管理
class BackendMQTTService {
    constructor() {
        this.client = null
        this.subscribedTopics = new Set()
        this.messageBuffer = new Map() // 用於去重
    }

    connect() {
        // 連接到 MQTT Broker
        // 訂閱所有必要的 Topics
    }

    handleMessage(topic, payload) {
        // 1. 解析消息
        // 2. 去重處理
        // 3. 存儲到 Redis (即時)
        // 4. 批次寫入 BigQuery (歷史)
        // 5. 通過 WebSocket 推送到前端
    }
}
```

#### 1.2 實現 WebSocket 服務器
**任務**：
- [ ] 在後端添加 WebSocket 支持
- [ ] 實現 WebSocket 連接管理
- [ ] 實現消息推送機制
- [ ] 支持多客戶端連接

**代碼結構**：
```javascript
// 使用 ws 庫實現 WebSocket
import { WebSocketServer } from 'ws'

const wss = new WebSocketServer({ port: 3002 })

wss.on('connection', (ws) => {
    // 處理前端連接
    // 推送 MQTT 消息到前端
})
```

---

### 階段 2: 前端 WebSocket 客戶端

#### 2.1 創建 WebSocket 服務
**文件**: `src/services/websocketService.ts` (新建)

**任務**：
- [ ] 創建 WebSocket 客戶端連接
- [ ] 實現連接狀態管理
- [ ] 實現消息接收和分發
- [ ] 實現自動重連機制

**代碼結構**：
```typescript
// src/services/websocketService.ts
export class WebSocketService {
    private ws: WebSocket | null = null
    private status: 'disconnected' | 'connecting' | 'connected' = 'disconnected'
    private messageHandlers = new Map<string, Set<Function>>()

    connect() {
        // 連接到後端 WebSocket
    }

    subscribe(topic: string, handler: Function) {
        // 訂閱特定 Topic 的消息
    }

    onMessage(message: any) {
        // 分發消息到對應的處理器
    }
}
```

#### 2.2 修改 MQTT Bus 為 WebSocket 適配器
**文件**: `src/services/mqttBus.ts`

**任務**：
- [ ] 保留現有 API 接口（向後兼容）
- [ ] 將內部實現改為使用 WebSocket
- [ ] 移除直接的 MQTT 連接代碼
- [ ] 通過 WebSocket 接收消息

**遷移策略**：
```typescript
// 保持現有 API 不變
export class MQTTBus {
    // 內部改為使用 WebSocket
    private wsService: WebSocketService

    connect() {
        // 改為連接 WebSocket
        this.wsService.connect()
    }

    subscribe(topic: string, handler: MessageHandler) {
        // 通過 WebSocket 訂閱
        this.wsService.subscribe(topic, handler)
    }
}
```

---

### 階段 3: 數據處理和存儲

#### 3.1 實現消息去重
**任務**：
- [ ] 在後端實現消息去重邏輯
- [ ] 使用消息 ID 或時間戳進行去重
- [ ] 參考架構圖中的 Cloud Dataflow 去重機制

#### 3.2 實現數據存儲
**任務**：
- [ ] 即時數據存儲到 Redis (TTL: 1小時)
- [ ] 歷史數據批次寫入 BigQuery (保留30天)
- [ ] 靜態元數據存儲到 PostgreSQL

---

### 階段 4: 測試和驗證

#### 4.1 功能測試
- [ ] 測試後端 MQTT 連接
- [ ] 測試 WebSocket 推送
- [ ] 測試前端接收消息
- [ ] 測試消息去重機制
- [ ] 測試數據存儲

#### 4.2 性能測試
- [ ] 測試高頻消息處理 (48,000 RPS)
- [ ] 測試多客戶端連接
- [ ] 測試消息延遲 (< 100ms)

---

## 🔧 實施細節

### 後端 MQTT 服務實現

```javascript
// test-backend-with-db.js 新增部分

const { WebSocketServer } = require('ws')

// WebSocket 服務器
const wss = new WebSocketServer({ port: 3002 })

// MQTT 消息處理
const messageDeduplication = new Map() // 用於去重

mqttClient.on('message', (topic, message) => {
    try {
        const data = JSON.parse(message.toString())
        const messageId = `${topic}-${data.timestamp || Date.now()}`

        // 去重檢查
        if (messageDeduplication.has(messageId)) {
            console.log(`⏭️ 重複消息已跳過: ${messageId}`)
            return
        }

        messageDeduplication.set(messageId, Date.now())

        // 清理過期記錄（1小時前）
        const oneHourAgo = Date.now() - 60 * 60 * 1000
        for (const [id, timestamp] of messageDeduplication.entries()) {
            if (timestamp < oneHourAgo) {
                messageDeduplication.delete(id)
            }
        }

        // 存儲到 Redis (即時快取) - 待實現
        // await redis.set(`mqtt:${topic}`, JSON.stringify(data), 'EX', 3600)

        // 批次寫入 BigQuery (歷史歸檔) - 待實現
        // await bigquery.insert(data)

        // 通過 WebSocket 推送到所有連接的前端
        const wsMessage = JSON.stringify({
            type: 'mqtt_message',
            topic,
            data,
            timestamp: new Date().toISOString()
        })

        wss.clients.forEach(client => {
            if (client.readyState === WebSocket.OPEN) {
                client.send(wsMessage)
            }
        })

        console.log(`📤 已推送 MQTT 消息到 ${wss.clients.size} 個前端客戶端`)

    } catch (error) {
        console.error('❌ 處理 MQTT 消息失敗:', error)
    }
})

wss.on('connection', (ws) => {
    console.log('✅ 前端 WebSocket 連接已建立')

    ws.on('close', () => {
        console.log('🔌 前端 WebSocket 連接已關閉')
    })

    ws.on('error', (error) => {
        console.error('❌ WebSocket 錯誤:', error)
    })
})
```

### 前端 WebSocket 服務實現

```typescript
// src/services/websocketService.ts (新建)
import { EventEmitter } from 'events'

export class WebSocketService extends EventEmitter {
    private ws: WebSocket | null = null
    private status: 'disconnected' | 'connecting' | 'connected' = 'disconnected'
    private reconnectTimer: NodeJS.Timeout | null = null
    private reconnectAttempts = 0
    private maxReconnectAttempts = 10

    connect() {
        if (this.status === 'connected' || this.status === 'connecting') {
            return
        }

        this.setStatus('connecting')
        const wsUrl = import.meta.env.VITE_WS_URL || 'ws://localhost:3002'

        try {
            this.ws = new WebSocket(wsUrl)

            this.ws.onopen = () => {
                console.log('✅ WebSocket 連接已建立')
                this.setStatus('connected')
                this.reconnectAttempts = 0
                this.emit('connected')
            }

            this.ws.onmessage = (event) => {
                try {
                    const message = JSON.parse(event.data)
                    this.emit('message', message)
                } catch (error) {
                    console.error('❌ 解析 WebSocket 消息失敗:', error)
                }
            }

            this.ws.onclose = () => {
                console.log('🔌 WebSocket 連接已關閉')
                this.setStatus('disconnected')
                this.emit('disconnected')
                this.scheduleReconnect()
            }

            this.ws.onerror = (error) => {
                console.error('❌ WebSocket 錯誤:', error)
                this.emit('error', error)
            }

        } catch (error) {
            console.error('❌ WebSocket 連接失敗:', error)
            this.setStatus('disconnected')
            this.scheduleReconnect()
        }
    }

    private scheduleReconnect() {
        if (this.reconnectAttempts >= this.maxReconnectAttempts) {
            console.error('❌ 達到最大重連次數，停止重連')
            return
        }

        const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 30000)
        this.reconnectAttempts++

        console.log(`🔄 ${delay}ms 後嘗試重連 (第 ${this.reconnectAttempts} 次)`)

        this.reconnectTimer = setTimeout(() => {
            this.connect()
        }, delay)
    }

    private setStatus(status: typeof this.status) {
        if (this.status !== status) {
            this.status = status
            this.emit('status', status)
        }
    }

    getStatus() {
        return this.status
    }

    disconnect() {
        if (this.reconnectTimer) {
            clearTimeout(this.reconnectTimer)
            this.reconnectTimer = null
        }

        if (this.ws) {
            this.ws.close()
            this.ws = null
        }

        this.setStatus('disconnected')
    }
}

export const wsService = new WebSocketService()
```

---

## 📝 實施檢查清單

### 階段 1: 後端 MQTT 服務
- [ ] 在 `test-backend-with-db.js` 中實現 MQTT 連接管理
- [ ] 實現消息接收和處理
- [ ] 實現消息去重機制
- [ ] 添加 WebSocket 服務器支持
- [ ] 實現消息推送到前端

### 階段 2: 前端 WebSocket 客戶端
- [ ] 創建 `src/services/websocketService.ts`
- [ ] 實現 WebSocket 連接管理
- [ ] 實現自動重連機制
- [ ] 修改 `src/services/mqttBus.ts` 使用 WebSocket
- [ ] 保持現有 API 向後兼容

### 階段 3: 數據存儲（可選，後續實現）
- [ ] 集成 Redis (即時快取)
- [ ] 集成 BigQuery (歷史歸檔)
- [ ] 實現數據批次寫入

### 階段 4: 測試
- [ ] 測試後端 MQTT 連接
- [ ] 測試 WebSocket 推送
- [ ] 測試前端接收
- [ ] 測試消息去重
- [ ] 性能測試

---

## ⚠️ 注意事項

1. **向後兼容**：保持現有的 `mqttBus` API 不變，只改變內部實現
2. **錯誤處理**：實現完善的錯誤處理和重連機制
3. **性能優化**：注意消息去重的性能影響
4. **安全性**：WebSocket 連接需要認證（後續實現）

---

## 🎯 下一步行動

**立即開始**：階段 1 - 在後端實現 MQTT 連接和 WebSocket 推送

1. 修改 `test-backend-with-db.js`，添加 WebSocket 服務器
2. 實現 MQTT 消息接收和去重
3. 實現 WebSocket 消息推送
4. 測試後端功能

完成後，繼續階段 2：前端 WebSocket 客戶端實現。

