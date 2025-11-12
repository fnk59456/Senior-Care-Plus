# WebSocket 推送问题排查指南

## 📊 架构理解总结

### ✅ 正确的理解

```
MQTT Broker (Mosquitto)
    ↓ 订阅 UWB/#
本地后端 (test-backend-with-db.js)
    ├── 接收 MQTT 消息
    ├── 消息去重
    ├── 保存到 mqtt_messages.json（持久化存储）
    └── **实时推送** 到所有 WebSocket 客户端
        ↓ WebSocket 连接 (ws://localhost:3002)
前端 websocketService
    ├── 接收所有推送的消息
    └── 按主题过滤并分发给订阅者
        ↓ 订阅特定主题
TemperaturePage（订阅 UWB/*_Health）
```

### 关键点

1. **mqtt_messages.json 的作用**
   - ✅ 后端持久化存储（供调试和历史查询）
   - ✅ 重启后可恢复历史消息
   - ❌ **前端不直接访问这个文件**
   - ❌ **不是前端"提取"数据的来源**

2. **数据流向**
   - 后端 **主动推送**（Push），不是前端主动提取（Pull）
   - 后端推送所有消息，前端在客户端进行主题过滤
   - WebSocket 是实时双向通信，不需要轮询

---

## 🔍 问题排查步骤

### 步骤 1: 确认后端是否正常运行

#### 1.1 启动后端服务

**重要：后端需要连接到云端 MQTT Broker 才能接收真实设备消息！**

##### Windows:
```powershell
# 使用启动脚本（推荐）
.\start-backend-with-cloud-mqtt.bat

# 或者手动设置环境变量
$env:MQTT_URL="wss://067ec32ef1344d3bb20c4e53abdde99a.s1.eu.hivemq.cloud:8884/mqtt"
$env:MQTT_USERNAME="testweb1"
$env:MQTT_PASSWORD="Aa000000"
node test-backend-with-db.js
```

##### Linux/Mac:
```bash
# 使用启动脚本（推荐）
chmod +x start-backend-with-cloud-mqtt.sh
./start-backend-with-cloud-mqtt.sh

# 或者手动设置环境变量
export MQTT_URL="wss://067ec32ef1344d3bb20c4e53abdde99a.s1.eu.hivemq.cloud:8884/mqtt"
export MQTT_USERNAME="testweb1"
export MQTT_PASSWORD="Aa000000"
node test-backend-with-db.js
```

##### 本地测试（使用本地 MQTT Broker）:
```bash
# 不设置环境变量，使用默认配置
node test-backend-with-db.js
```

#### 1.2 检查启动日志

你应该看到以下关键日志：

```
✅ MQTT 連接成功
✅ 已訂閱 UWB 主題: UWB/#
✅ 已訂閱設備狀態主題: UWB/device/+/status
🚀 WebSocket 服務器已啟動，監聽端口: 3002

📊 後端服務已啟動
📡 MQTT Broker: mqtt://your-mqtt-broker:1883
🌐 WebSocket URL: ws://localhost:3002

🎯 功能狀態
  ✅ MQTT 消息接收
  ✅ WebSocket 實時推送
  ✅ 消息去重機制
  ✅ 自動清理過期記錄
```

**如果看不到这些日志**：
- ❌ MQTT Broker 未运行 → 启动 Mosquitto
- ❌ MQTT 连接失败 → 检查 `.env` 中的 MQTT 配置
- ❌ WebSocket 端口被占用 → 更换端口或关闭占用端口的进程

---

### 步骤 2: 确认后端是否接收到 MQTT 消息

#### 2.1 观察 MQTT 消息日志

后端应该持续输出：

```
📨 收到MQTT消息 [UWB/GW16B8_Health]: {"content":"300B","MAC":"..."}
📝 MQTT 消息已保存: UWB/GW16B8_Health
```

**如果没有这些日志**：
- ❌ 没有 MQTT 设备在发送消息
- ❌ MQTT Broker 未运行
- ❌ 后端未正确订阅主题

#### 2.2 手动发送测试消息

使用 `mosquitto_pub` 手动发送测试消息：

```bash
# Windows PowerShell
"C:\Program Files\mosquitto\mosquitto_pub.exe" -h 127.0.0.1 -p 1883 -t "UWB/GW1234_Health" -m "{\"content\":\"300B\",\"MAC\":\"AA:BB:CC:DD:EE:FF\",\"skin temp\":\"36.5\",\"room temp\":\"25.0\",\"steps\":\"1000\",\"light sleep (min)\":\"120\",\"deep sleep (min)\":\"60\",\"battery level\":\"80\"}"

# Linux/Mac
mosquitto_pub \
  -h 127.0.0.1 \
  -p 1883 \
  -t "UWB/GW1234_Health" \
  -m '{"content":"300B","MAC":"AA:BB:CC:DD:EE:FF","skin temp":"36.5","room temp":"25.0","steps":"1000","battery level":"80"}'
```

后端应该立即输出：

```
📨 收到MQTT消息 [UWB/GW1234_Health]: {"content":"300B",...}
📝 MQTT 消息已保存: UWB/GW1234_Health
📤 已推送消息到 1 個前端客戶端
```

**关键**：必须看到 `📤 已推送消息到 X 個前端客戶端`，这表示：
- ✅ 后端接收到了 MQTT 消息
- ✅ 消息已推送到前端
- ✅ X 是当前连接的前端客户端数量

**如果看到 `📤 已推送消息到 0 個前端客戶端`**：
- ❌ 前端 WebSocket 未连接
- → 进入步骤 3

---

### 步骤 3: 确认前端 WebSocket 是否连接成功

#### 3.1 检查环境变量

确认 `.env.development` 文件中：

```env
VITE_USE_WEBSOCKET=true
VITE_WS_URL=ws://localhost:3002
```

#### 3.2 重启前端开发服务器

```bash
npm run dev
```

**重要**：修改 `.env` 文件后必须重启 Vite 开发服务器！

#### 3.3 打开浏览器控制台

访问 `http://localhost:5173/temperature`，在控制台中查找：

```
🌐 WebSocket Service 初始化，URL: ws://localhost:3002
🔌 正在連接 WebSocket: ws://localhost:3002
✅ WebSocket 連接已建立
🎉 WebSocket 歡迎消息: 歡迎連接到後端 WebSocket 服務
✅ 已訂閱 WebSocket 消息: UWB/*_Health
```

**如果看不到连接成功日志**：
- ❌ WebSocket 服务未启动 → 检查步骤 1
- ❌ 端口不匹配 → 检查环境变量
- ❌ 浏览器阻止了 WebSocket 连接 → 检查浏览器控制台的网络错误

#### 3.4 检查后端日志

前端连接成功时，后端应该输出：

```
✅ 前端 WebSocket 連接已建立
📊 當前連接數: 1
```

---

### 步骤 4: 确认消息是否被成功推送

#### 4.1 后端推送日志

当有 MQTT 消息时，后端应该输出：

```
📨 收到MQTT消息 [UWB/GW16B8_Health]: ...
📤 已推送消息到 1 個前端客戶端
```

**如果只看到第一条，没有第二条**：
- ❌ `broadcastToClients` 函数未被调用
- → 检查代码逻辑

#### 4.2 前端接收日志

前端控制台应该输出：

```
📨 收到 MQTT 消息 [UWB/GW16B8_Health]: {...}
✅ 收到新消息: UWB/GW16B8_Health at 15:30:45
📦 消息內容: {...}
```

**如果后端有推送日志，但前端没有接收日志**：
- ❌ WebSocket 连接已断开
- ❌ 消息格式错误，前端解析失败
- → 检查步骤 5

---

### 步骤 5: 确认主题匹配是否正确

#### 5.1 检查订阅的主题模式

在 `TemperaturePage.tsx` 中，确认：

```typescript
// WebSocket 模式
let healthTopicPattern: string | RegExp
if (USE_WEBSOCKET) {
  healthTopicPattern = 'UWB/*_Health'  // ✅ 正确：匹配所有 Health 主题
} else {
  healthTopicPattern = /^UWB\/GW.*_Health$/  // MQTT 正则格式
}
```

#### 5.2 测试主题匹配

在浏览器控制台手动测试：

```javascript
// 测试主题匹配
const pattern = 'UWB/*_Health'
const topic = 'UWB/GW16B8_Health'
const regex = new RegExp('^' + pattern.replace(/\*/g, '.*').replace(/\+/g, '[^/]+') + '$')
console.log('匹配结果:', regex.test(topic))  // 应该输出 true
```

#### 5.3 使用测试页面

访问 `http://localhost:5173/websocket-test`，这个页面会：
- 自动连接 WebSocket
- 订阅所有消息（`*`）
- 实时显示接收到的所有消息

**如果测试页面能收到消息，但 TemperaturePage 收不到**：
- ❌ TemperaturePage 的主题匹配逻辑有问题
- ❌ TemperaturePage 的订阅时机不对

---

### 步骤 6: 检查消息处理逻辑

#### 6.1 确认消息格式

后端推送的消息格式：

```json
{
  "type": "mqtt_message",
  "topic": "UWB/GW16B8_Health",
  "payload": {
    "content": "300B",
    "MAC": "AA:BB:CC:DD:EE:FF",
    "skin temp": "36.5",
    "room temp": "25.0",
    "steps": "1000",
    "battery level": "80"
  },
  "timestamp": "2025-11-12T08:30:45.123Z",
  "messageId": "UWB/GW16B8_Health-1699876..."
}
```

#### 6.2 确认 realtimeDataService 是否正确转换

`realtimeDataService` 应该将 WebSocket 消息转换为 `RealtimeMessage`：

```typescript
{
  topic: "UWB/GW16B8_Health",
  payload: { content: "300B", MAC: "...", ... },
  timestamp: Date,
  gateway: { id: "...", name: "..." }  // 可能为空
}
```

#### 6.3 确认 TemperaturePage 是否正确处理

检查 `processRealtimeMessage` 函数是否被调用：

```typescript
const processRealtimeMessage = (message: RealtimeMessage, processedSet: Set<string>) => {
  console.log('🔍 processRealtimeMessage 被调用:', message)

  const data = message.payload
  const MAC = data.MAC || data['mac address'] || data.macAddress

  if (!MAC || data.content !== '300B') {
    console.log('⏭️ 跳过非 300B 消息或无 MAC 消息')
    return
  }

  console.log('✅ 开始处理 300B 消息:', MAC)
  // ... 处理逻辑
}
```

---

## 🧪 完整测试流程

### 1. 启动后端

```bash
node test-backend-with-db.js
```

观察日志：
- ✅ MQTT 连接成功
- ✅ WebSocket 服务器启动

### 2. 启动前端

```bash
npm run dev
```

### 3. 打开测试页面

访问 `http://localhost:5173/websocket-test`

### 4. 发送测试消息

```bash
# 发送 Health 测试消息
mosquitto_pub -h 127.0.0.1 -p 1883 -t "UWB/GW1234_Health" -m '{"content":"300B","MAC":"AA:BB:CC:DD:EE:FF","skin temp":"36.5","room temp":"25.0","steps":"1000","battery level":"80"}'
```

### 5. 观察结果

#### 后端应输出：
```
📨 收到MQTT消息 [UWB/GW1234_Health]: ...
📤 已推送消息到 1 個前端客戶端
```

#### 前端测试页面应显示：
- 消息列表中出现新消息
- 消息类型：`mqtt_message`
- Topic：`UWB/GW1234_Health`
- Payload：完整的健康数据

### 6. 打开 TemperaturePage

访问 `http://localhost:5173/temperature`

### 7. 再次发送测试消息

```bash
mosquitto_pub -h 127.0.0.1 -p 1883 -t "UWB/GW1234_Health" -m '{"content":"300B","MAC":"AA:BB:CC:DD:EE:FF","skin temp":"37.2","room temp":"26.0","steps":"2000","battery level":"75"}'
```

### 8. 检查 TemperaturePage

- ✅ "已发现设备" 数量增加
- ✅ 设备列表中出现新设备
- ✅ 可以选择设备查看温度数据

---

## 🐛 常见问题

### 问题 1: 后端显示 `📤 已推送消息到 0 個前端客戶端`

**原因**：前端 WebSocket 未连接

**解决**：
1. 确认前端已启动
2. 确认 `.env.development` 中 `VITE_USE_WEBSOCKET=true`
3. 重启前端开发服务器
4. 刷新浏览器页面
5. 检查浏览器控制台是否有 WebSocket 连接错误

### 问题 2: 前端控制台没有 WebSocket 连接日志

**原因**：`realtimeDataService` 未初始化或使用了 MQTT 模式

**解决**：
1. 检查 `.env.development` 中 `VITE_USE_WEBSOCKET=true`
2. 重启 Vite 开发服务器（`npm run dev`）
3. 硬刷新浏览器（Ctrl+Shift+R 或 Cmd+Shift+R）
4. 检查 `src/services/realtimeDataService.ts` 是否正确判断模式

### 问题 3: WebSocket 连接失败（WebSocket connection failed）

**原因**：WebSocket 服务器未运行或端口不匹配

**解决**：
1. 确认后端已启动（`node test-backend-with-db.js`）
2. 确认后端日志显示 `🚀 WebSocket 服務器已啟動，監聽端口: 3002`
3. 确认 `.env.development` 中 `VITE_WS_URL=ws://localhost:3002`
4. 检查是否有防火墙阻止 3002 端口

### 问题 4: 测试页面能收到消息，但 TemperaturePage 收不到

**原因**：主题匹配不正确或消息被过滤

**解决**：
1. 检查 `healthTopicPattern` 的值
2. 确认实际的 MQTT topic 格式（例如 `UWB/GW16B8_Health`）
3. 确认主题模式（`UWB/*_Health`）能匹配实际 topic
4. 检查 `processRealtimeMessage` 函数的过滤条件（`data.content !== '300B'`）
5. 添加更多 console.log 调试

### 问题 5: 消息接收到但 UI 不更新

**原因**：State 更新逻辑问题或组件未重新渲染

**解决**：
1. 检查 `setCloudDeviceRecords` 是否被调用
2. 检查 React DevTools 中的 State 是否更新
3. 确认 `selectedCloudDevice` 是否正确设置
4. 检查 `currentCloudDeviceRecords` 的过滤逻辑

---

## 📝 调试检查清单

在报告问题前，请确认以下项目：

- [ ] 后端已启动（`node test-backend-with-db.js`）
- [ ] 后端显示 MQTT 连接成功
- [ ] 后端显示 WebSocket 服务器启动
- [ ] 后端显示接收到 MQTT 消息
- [ ] 后端显示推送消息到前端（客户端数量 > 0）
- [ ] 前端 `.env.development` 中 `VITE_USE_WEBSOCKET=true`
- [ ] 前端已重启（修改 `.env` 后）
- [ ] 浏览器控制台显示 WebSocket 连接成功
- [ ] 浏览器控制台显示订阅成功
- [ ] 浏览器控制台显示收到消息
- [ ] 测试页面能正常接收消息
- [ ] 手动发送测试消息能被接收

---

## 🔧 调试命令

### 查看 WebSocket 连接状态

```javascript
// 在浏览器控制台运行
import { wsService } from '@/services/websocketService'
wsService.debug()
```

### 查看订阅列表

```javascript
// 在浏览器控制台运行
console.log(wsService)
```

### 手动订阅测试

```javascript
// 在浏览器控制台运行
import { wsService } from '@/services/websocketService'

wsService.subscribe('*', (msg) => {
  console.log('收到消息:', msg)
})
```

---

## 📞 需要帮助？

如果按照以上步骤仍然无法解决问题，请提供以下信息：

1. **后端日志**（完整的启动日志和消息接收日志）
2. **前端控制台日志**（包括所有 WebSocket 相关日志）
3. **`.env.development` 文件内容**
4. **测试页面的接收情况**（能否接收到消息？）
5. **网络检查**（浏览器开发者工具 → Network → WS 标签）

