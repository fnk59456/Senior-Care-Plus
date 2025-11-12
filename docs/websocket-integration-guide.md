# WebSocket 集成指南 - 室内定位页面

## ✅ 已完成的工作

### 1. 创建实时数据服务适配器 ✅

**文件**: `src/services/realtimeDataService.ts`

**功能**：
- 支持通过环境变量切换 WebSocket 或 MQTT
- 统一的 API 接口
- 自动适配不同的消息格式

**使用方式**：
```typescript
import { realtimeDataService } from '@/services/realtimeDataService'

// 连接
realtimeDataService.connect()

// 订阅消息
const unsubscribe = realtimeDataService.subscribe('UWB/UWB_Gateway', (message) => {
    console.log('收到消息:', message.payload)
})

// 监听状态
realtimeDataService.onStatusChange((status) => {
    console.log('连接状态:', status)
})
```

---

### 2. 修改室内定位页面 ✅

**文件**: `src/pages/UWBLocationPage.tsx`

**已完成的修改**：

#### ✅ Gateway 数据接收
- 从直接 MQTT 连接改为使用 `realtimeDataService`
- 支持 WebSocket 和 MQTT 两种模式
- 保持相同的消息处理逻辑

#### ✅ Anchor 数据接收
- 从直接 MQTT 连接改为使用 `realtimeDataService`
- 支持订阅 Anchor Config 和 Ack 主题
- 保持原有的数据更新逻辑

---

## 🔧 环境配置

### 使用 WebSocket（推荐）

创建或修改 `.env.development`：

```env
# 使用 WebSocket
VITE_USE_WEBSOCKET=true
VITE_WS_URL=ws://localhost:3002
VITE_API_BASE_URL=http://localhost:3001/api
```

### 使用 MQTT 直连（向后兼容）

```env
# 使用 MQTT 直连
VITE_USE_WEBSOCKET=false
VITE_MQTT_PROTOCOL=ws
VITE_MQTT_BROKER=localhost
VITE_MQTT_PORT=8083
VITE_MQTT_USERNAME=test
VITE_MQTT_PASSWORD=test
VITE_API_BASE_URL=http://localhost:3001/api
```

---

## 🚀 测试步骤

### 步骤 1：启动服务

```bash
# 终端 1：启动 MQTT Broker
mosquitto -c mosquitto.conf -v

# 终端 2：启动本地后端（包含 WebSocket 服务器）
node test-backend-with-db.js

# 终端 3：启动前端
npm run dev
```

### 步骤 2：配置环境变量

确保 `.env.development` 中设置了：

```env
VITE_USE_WEBSOCKET=true
VITE_WS_URL=ws://localhost:3002
```

### 步骤 3：测试 Gateway 数据接收

1. 打开室内定位页面
2. 查看浏览器控制台，应该看到：
   ```
   🌐 使用 WebSocket 連接雲端 Gateway 數據
   📊 雲端連接狀態變更: connected
   ```

3. 发布测试消息：
   ```bash
   mosquitto_pub -h localhost -p 1883 -t "UWB/UWB_Gateway" -m '{
     "content": "gateway topic",
     "gateway_id": 12345,
     "name": "TestGateway"
   }'
   ```

4. 前端应该收到消息并更新 Gateway 列表

### 步骤 4：测试 Anchor 数据接收

1. 在室内定位页面选择 Gateway
2. 查看浏览器控制台，应该看到：
   ```
   🌐 使用 WebSocket 連接 Anchor 數據
   ✅ 已訂閱 Anchor Config 主題: UWB/GWXXX_AncConf
   ```

3. 发布测试消息：
   ```bash
   mosquitto_pub -h localhost -p 1883 -t "UWB/GWXXX_AncConf" -m '{
     "content": "config",
     "node": "ANCHOR",
     "id": 12345,
     "name": "TestAnchor"
   }'
   ```

4. 前端应该收到消息并更新 Anchor 列表

---

## 📊 数据流

### WebSocket 模式

```
MQTT Broker
    ↓ (后端订阅)
本地后端 (test-backend-with-db.js)
    ├── 消息去重
    └── WebSocket 推送
        ↓
前端 (realtimeDataService)
    └── 室内定位页面
        ├── Gateway 数据 ✅
        └── Anchor 数据 ✅
```

### MQTT 模式（向后兼容）

```
MQTT Broker
    ↓ (前端直接订阅)
前端 (realtimeDataService → mqttBus)
    └── 室内定位页面
        ├── Gateway 数据 ✅
        └── Anchor 数据 ✅
```

---

## 🔍 调试信息

### 浏览器控制台

查看以下日志：

1. **连接状态**：
   ```
   🌐 使用 WebSocket 連接雲端 Gateway 數據
   📊 雲端連接狀態變更: connected
   ```

2. **消息接收**：
   ```
   📨 收到雲端 Gateway 消息: {...}
   處理 Gateway Topic 數據...
   ```

3. **订阅确认**：
   ```
   ✅ 已訂閱 Anchor Config 主題: UWB/GWXXX_AncConf
   ```

### 后端控制台

查看以下日志：

1. **WebSocket 连接**：
   ```
   ✅ 前端 WebSocket 連接已建立
   📤 已推送消息到 1 個前端客戶端
   ```

2. **消息去重**：
   ```
   ⏭️ 重複消息已跳過: ...
   ```

---

## ⚠️ 注意事项

### 1. 发布消息（仍使用 MQTT）

**当前状态**：发布消息（如 Anchor 配置）仍使用直接的 MQTT 连接

**原因**：
- WebSocket 主要用于接收数据
- 发布消息可能需要后端支持或保持 MQTT 直连

**未来改进**：
- 可以通过 WebSocket 发送命令到后端
- 后端再转发到 MQTT

### 2. 向后兼容

- ✅ 可以通过环境变量切换回 MQTT 模式
- ✅ 代码自动适配不同的消息格式
- ✅ 保持原有的业务逻辑不变

### 3. 数据存储

- Anchor 数据仍会存储到 `anchorStore`
- 如果使用 MQTT 模式，数据会通过 `mqttBus` 自动存储
- 如果使用 WebSocket 模式，数据直接处理，不经过 `mqttBus`

---

## 🎯 下一步

### 待完成

- [ ] 修改 Location 数据接收（Tag 位置数据）
- [ ] 测试完整的数据流
- [ ] 性能优化

### 可选优化

- [ ] 添加消息发布功能到 WebSocket 服务
- [ ] 统一所有 MQTT 连接为 WebSocket
- [ ] 添加连接状态监控 UI

---

## 📝 代码变更总结

### 新增文件

1. `src/services/realtimeDataService.ts` - 实时数据服务适配器

### 修改文件

1. `src/pages/UWBLocationPage.tsx`
   - Gateway 数据接收：使用 `realtimeDataService`
   - Anchor 数据接收：使用 `realtimeDataService`
   - 移除直接的 MQTT 连接代码（保留发布消息部分）

### 保持不变

- 业务逻辑
- UI 界面
- 数据格式
- 状态管理

---

## ✅ 验证清单

- [ ] Gateway 数据能通过 WebSocket 接收
- [ ] Anchor 数据能通过 WebSocket 接收
- [ ] 可以通过环境变量切换回 MQTT
- [ ] 连接状态正确显示
- [ ] 消息去重正常工作
- [ ] 错误处理完善

---

**最后更新**: 2025-11-12
**状态**: ✅ Gateway 和 Anchor 数据接收已完成

