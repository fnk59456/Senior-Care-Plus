# WebSocket 集成总结 - 室内定位页面

## ✅ 已完成

### 1. 实时数据服务适配器 ✅

**文件**: `src/services/realtimeDataService.ts`

**功能**：
- ✅ 支持 WebSocket 和 MQTT 两种模式
- ✅ 通过环境变量 `VITE_USE_WEBSOCKET` 切换
- ✅ 统一的 API 接口
- ✅ 自动适配消息格式

---

### 2. 室内定位页面集成 ✅

**文件**: `src/pages/UWBLocationPage.tsx`

**已完成的修改**：

#### ✅ Gateway 数据接收
- **之前**：直接使用 `mqtt.connect()` 连接云端 MQTT
- **现在**：使用 `realtimeDataService` 订阅 `UWB/UWB_Gateway`
- **支持**：WebSocket 和 MQTT 两种模式

#### ✅ Anchor 数据接收
- **之前**：直接使用 `mqtt.connect()` 连接并订阅 Anchor 主题
- **现在**：使用 `realtimeDataService` 订阅 Anchor Config 和 Ack 主题
- **支持**：WebSocket 和 MQTT 两种模式

---

## 🔧 如何使用

### 启用 WebSocket 模式

**步骤 1**：创建或修改 `.env.development`

```env
VITE_USE_WEBSOCKET=true
VITE_WS_URL=ws://localhost:3002
VITE_API_BASE_URL=http://localhost:3001/api
```

**步骤 2**：启动服务

```bash
# 终端 1：MQTT Broker
mosquitto -c mosquitto.conf -v

# 终端 2：本地后端（包含 WebSocket）
node test-backend-with-db.js

# 终端 3：前端
npm run dev
```

**步骤 3**：访问室内定位页面

- 打开浏览器控制台
- 应该看到：`🌐 使用 WebSocket 連接雲端 Gateway 數據`
- Gateway 和 Anchor 数据应该能正常接收

---

### 切换回 MQTT 模式

**修改 `.env.development`**：

```env
VITE_USE_WEBSOCKET=false
VITE_MQTT_PROTOCOL=ws
VITE_MQTT_BROKER=localhost
VITE_MQTT_PORT=8083
VITE_MQTT_USERNAME=test
VITE_MQTT_PASSWORD=test
```

**重启前端**：`npm run dev`

---

## 📊 数据流对比

### WebSocket 模式（新）

```
MQTT Broker
    ↓
本地后端 (订阅 MQTT)
    ├── 消息去重
    └── WebSocket 推送
        ↓
前端 (realtimeDataService)
    └── 室内定位页面
        ├── Gateway 数据 ✅
        └── Anchor 数据 ✅
```

### MQTT 模式（旧，向后兼容）

```
MQTT Broker
    ↓
前端 (realtimeDataService → mqttBus)
    └── 室内定位页面
        ├── Gateway 数据 ✅
        └── Anchor 数据 ✅
```

---

## 🎯 下一步

### 待完成

- [ ] Location 数据接收（Tag 位置数据）
- [ ] 完整测试

### 可选

- [ ] 消息发布功能（通过 WebSocket）
- [ ] 性能优化
- [ ] 连接状态 UI 改进

---

## 📝 关键代码位置

### Gateway 数据接收

```typescript
// src/pages/UWBLocationPage.tsx 第 1209-1395 行
useEffect(() => {
    realtimeDataService.connect()
    const unsubscribe = realtimeDataService.subscribe(CLOUD_MQTT_TOPIC, async (message) => {
        // 处理 Gateway 数据
    })
}, [])
```

### Anchor 数据接收

```typescript
// src/pages/UWBLocationPage.tsx 第 1397-1636 行
useEffect(() => {
    const unsubscribeAnchor = realtimeDataService.subscribe(anchorTopic, (message) => {
        // 处理 Anchor Config 数据
    })
    const unsubscribeAck = realtimeDataService.subscribe(ackTopic, (message) => {
        // 处理 Ack 数据
    })
}, [selectedGatewayForAnchors])
```

---

## ✅ 验证

### 测试 Gateway 数据

1. 启动所有服务
2. 打开室内定位页面
3. 查看"云端闸道器发现"部分
4. 应该能看到 Gateway 列表更新

### 测试 Anchor 数据

1. 选择一个 Gateway
2. 查看"锚点列表"部分
3. 应该能看到 Anchor 数据更新

---

**状态**: ✅ Gateway 和 Anchor 数据接收已完成
**日期**: 2025-11-12

