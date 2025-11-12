# WebSocket 快速開始指南

## 🚀 快速測試 WebSocket 功能

### 步驟 1：安裝依賴

```bash
# 如果還沒安裝，需要安裝 ws 庫
npm install ws
```

### 步驟 2：啟動 MQTT Broker

```bash
# 使用本地 Mosquitto
mosquitto -c mosquitto.conf -v
```

### 步驟 3：啟動本地後端服務器

#### 基本啟動（測試消息默認啟用）

```bash
node test-backend-with-db.js
```

#### 禁用測試消息

如果你不想接收自動生成的測試消息，可以設置環境變量：

**Windows (PowerShell):**
```powershell
$env:ENABLE_TEST_MESSAGES="false"; node test-backend-with-db.js
```

**Windows (CMD):**
```cmd
set ENABLE_TEST_MESSAGES=false && node test-backend-with-db.js
```

**Linux/Mac:**
```bash
ENABLE_TEST_MESSAGES=false node test-backend-with-db.js
```

#### 調整測試消息發送間隔

默認每 5 秒發送一次，可以通過環境變量調整：

```bash
# 設置為每 10 秒發送一次（10000 毫秒）
TEST_MESSAGE_INTERVAL=10000 node test-backend-with-db.js
```

#### 同時設置多個環境變量

**Windows (PowerShell):**
```powershell
$env:ENABLE_TEST_MESSAGES="true"; $env:TEST_MESSAGE_INTERVAL="10000"; node test-backend-with-db.js
```

**Linux/Mac:**
```bash
ENABLE_TEST_MESSAGES=true TEST_MESSAGE_INTERVAL=10000 node test-backend-with-db.js
```

你應該看到：

```
================================================
🚀 測試後端服務器已啟動 (帶數據庫存儲)
📡 REST API: http://localhost:3001/api
🌐 WebSocket: ws://localhost:3002
================================================
🚀 WebSocket 服務器已啟動，監聽端口: 3002
🔌 MQTT測試服務器已連接
✅ 已訂閱位置主題: UWB/location/+
✅ 已訂閱設備狀態主題: UWB/device/+/status
✅ 已訂閱 UWB 主題: UWB/#
✅ 測試消息已啟用，發送間隔: 5000ms (5秒)
🧪 測試消息配置:
  ✅ 測試消息已啟用
  ⏱️  發送間隔: 5000ms (5秒)
  💡 提示: 設置環境變量 ENABLE_TEST_MESSAGES=false 來禁用測試消息
```

**注意：** 如果設置了 `ENABLE_TEST_MESSAGES=false`，你會看到：
```
⚠️  測試消息已禁用 (設置 ENABLE_TEST_MESSAGES=false 來禁用)
🧪 測試消息配置:
  ⚠️  測試消息已禁用
  💡 提示: 設置環境變量 ENABLE_TEST_MESSAGES=true 來啟用測試消息
```

### 步驟 4：啟動前端應用

```bash
npm run dev
```

### 步驟 5：測試 WebSocket 連接

#### 方法 1：使用瀏覽器控制台

```javascript
// 打開瀏覽器開發者工具，執行：
const ws = new WebSocket('ws://localhost:3002')

ws.onopen = () => {
    console.log('✅ WebSocket 連接成功')
}

ws.onmessage = (event) => {
    const message = JSON.parse(event.data)
    console.log('📨 收到消息:', message)
}

ws.onerror = (error) => {
    console.error('❌ WebSocket 錯誤:', error)
}
```

#### 方法 2：使用前端服務

在任何 React 組件中：

```typescript
import { wsService } from '@/services/websocketService'

// 連接 WebSocket
wsService.connect()

// 訂閱消息
const unsubscribe = wsService.subscribe('UWB/location/*', (message) => {
    console.log('收到位置數據:', message.payload)
})

// 監聽連接狀態
const unsubscribeStatus = wsService.onStatusChange((status) => {
    console.log('WebSocket 狀態:', status)
})

// 清理
return () => {
    unsubscribe()
    unsubscribeStatus()
}
```

### 步驟 6：發布測試 MQTT 消息

```bash
# 使用 mosquitto_pub 發布測試消息
mosquitto_pub -h localhost -p 1883 -t "UWB/location/test_tag_001" -m '{
  "tagId": "test_tag_001",
  "x": 12.34,
  "y": 56.78,
  "z": 1.5,
  "timestamp": 1699876543210
}'
```

### 步驟 7：驗證數據流

你應該在以下地方看到消息：

1. **後端控制台**：
```
📨 收到MQTT消息 [UWB/location/test_tag_001]: {"tagId":"test_tag_001","x":12.34,"y":56.78,"z":1.5,"timestamp":1699876543210}
📤 已推送消息到 1 個前端客戶端
```

2. **前端瀏覽器控制台**：
```
📨 收到 MQTT 消息 [UWB/location/test_tag_001]: {tagId: "test_tag_001", x: 12.34, y: 56.78, z: 1.5, timestamp: 1699876543210}
```

3. **前端訂閱的處理器**：
```
收到位置數據: {tagId: "test_tag_001", x: 12.34, y: 56.78, z: 1.5, timestamp: 1699876543210}
```

---

## 🧪 測試消息去重

### 發送兩次相同的消息

```bash
# 第一次
mosquitto_pub -h localhost -p 1883 -t "UWB/location/test_tag_001" -m '{
  "tagId": "test_tag_001",
  "x": 12.34,
  "timestamp": 1699876543210
}'

# 第二次（相同內容）
mosquitto_pub -h localhost -p 1883 -t "UWB/location/test_tag_001" -m '{
  "tagId": "test_tag_001",
  "x": 12.34,
  "timestamp": 1699876543210
}'
```

### 預期結果

- 後端控制台應該顯示：
```
📨 收到MQTT消息 [UWB/location/test_tag_001]: ...
📤 已推送消息到 1 個前端客戶端
⏭️ 重複消息已跳過: UWB/location/test_tag_001-1699876543210-...
```

- 前端只應該收到一次消息

---

## 🔧 環境配置

### 開發環境（使用 WebSocket）

創建或修改 `.env.development`：

```env
VITE_USE_WEBSOCKET=true
VITE_WS_URL=ws://localhost:3002
VITE_API_BASE_URL=http://localhost:3001/api
```

### 開發環境（使用 MQTT 直連）

```env
VITE_USE_WEBSOCKET=false
VITE_MQTT_PROTOCOL=ws
VITE_MQTT_BROKER=localhost
VITE_MQTT_PORT=8083
VITE_MQTT_USERNAME=test
VITE_MQTT_PASSWORD=test
```

### 生產環境

創建或修改 `.env.production`：

```env
VITE_USE_WEBSOCKET=true
VITE_WS_URL=wss://api.seniorcare.com/ws
VITE_API_BASE_URL=https://api.seniorcare.com/api
```

---

## 🐛 常見問題排查

### 問題 1：WebSocket 連接失敗

**症狀**：`WebSocket connection failed`

**排查**：
1. 確認後端服務器已啟動
2. 確認端口 3002 沒有被占用
3. 檢查防火牆設置

```bash
# 檢查端口是否被占用
netstat -an | grep 3002

# Windows
netstat -ano | findstr "3002"
```

### 問題 2：收不到 MQTT 消息

**症狀**：WebSocket 連接成功，但收不到 MQTT 消息

**排查**：
1. 確認 MQTT Broker 已啟動
2. 確認後端已連接到 MQTT
3. 檢查 Topic 是否正確

```bash
# 測試 MQTT 連接
mosquitto_sub -h localhost -p 1883 -t "UWB/#" -v
```

### 問題 3：消息重複

**症狀**：前端收到重複消息

**排查**：
1. 檢查後端消息去重邏輯是否正常
2. 查看後端日誌是否有 "重複消息已跳過"
3. 確認消息 ID 生成邏輯

---

## 📊 性能監控

### 後端監控

```javascript
// 在 test-backend-with-db.js 中查看統計
console.log('去重緩存大小:', messageDeduplication.size)
console.log('WebSocket 客戶端數:', wsClients.size)
```

### 前端監控

```javascript
// 在瀏覽器控制台查看
wsService.debug()
```

輸出：
```
🔍 WebSocket Service Debug
Status: connected
URL: ws://localhost:3002
Reconnect Attempts: 0
Subscriptions: ["UWB/location/*", "*"]
Status Handlers: 2
```

---

## ✅ 驗收標準

### 功能測試

- [ ] WebSocket 能成功連接
- [ ] 能收到 connected 消息
- [ ] 能收到 MQTT 推送的消息
- [ ] 消息格式正確（包含 type, topic, payload, timestamp）
- [ ] 消息去重正常工作
- [ ] 斷線後能自動重連

### 性能測試

- [ ] 消息延遲 < 100ms
- [ ] 支持至少 10 個前端同時連接
- [ ] 沒有內存泄漏

---

## 🎯 下一步

完成測試後，可以：

1. ✅ 將 WebSocket 集成到室內定位頁面
2. ✅ 將 WebSocket 集成到心率監控頁面
3. ✅ 將 WebSocket 集成到尿布監控頁面
4. ✅ 提供 WebSocket 規範給後端工程師
5. ✅ 協調後端工程師部署雲端 WebSocket 服務

---

**最後更新**: 2025-11-12

