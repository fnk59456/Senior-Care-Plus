# LocationPage WebSocket/REST API 迁移说明

## 迁移时间
2025-11-12

## 迁移目标
将 `LocationPage.tsx` 从直接使用 MQTT Bus 迁移到使用 `realtimeDataService`，支持 WebSocket 和 MQTT 双模式，并实现 REST API 持久化存储。

---

## 主要改动

### 1. 导入更新
```typescript
// 新增导入
import { realtimeDataService, type RealtimeMessage } from "@/services/realtimeDataService"
```

### 2. 模式切换支持
通过环境变量 `VITE_USE_WEBSOCKET` 控制：
- `VITE_USE_WEBSOCKET=true`: 使用 WebSocket 模式
- `VITE_USE_WEBSOCKET=false`: 使用 MQTT 模式

### 3. 持久化存储机制

#### 3.1 localStorage 存储
```typescript
const saveMessageToLocalStorage = (message: RealtimeMessage) => {
  const storageKey = 'location_history_messages'
  // 存储最近 1000 条消息
  // 按时间戳降序排序
}
```

#### 3.2 REST API 加载（WebSocket 模式）
```typescript
const loadHistoryMessages = async () => {
  if (USE_WEBSOCKET) {
    // 从后端 REST API 加载历史消息
    const response = await fetch(`${API_BASE_URL}/mqtt/messages`)
    // 过滤 location 主题消息
    // 提取 Gateway 信息
    // 处理消息
  } else {
    // 从 mqttBus 加载历史消息
    const recentMessages = mqttBus.getRecentMessages({
      contentType: 'location'
    })
  }
}
```

#### 3.3 localStorage 备用加载
```typescript
const loadHistoryFromLocalStorage = () => {
  // 当 REST API 失败时的备用方案
  // 从 localStorage 读取历史消息
  // 过滤并处理消息
}
```

### 4. Gateway 筛选匹配逻辑

#### 4.1 从 Topic 提取 Gateway 信息
```typescript
// Topic 格式：UWB/GWxxxx_Loca
const gatewayMatch = msg.topic?.match(/GW([A-F0-9]+)/)
const gatewayInfo = gatewayMatch ? {
  id: gatewayMatch[1],  // 例如：16B8
  name: gatewayMatch[0]  // 例如：GW16B8
} : undefined
```

#### 4.2 匹配算法
使用两种匹配方式：

**方式 1: MAC 地址后4位匹配**
```typescript
const macSuffix = gatewayMac.replace(/:/g, '').slice(-4).toUpperCase()
const matches = msgGateway.includes(macSuffix)
```

**方式 2: 名称前缀匹配**
```typescript
const matches = msgGateway.toUpperCase().includes(gateway.name.split('_')[0].toUpperCase())
```

#### 4.3 完整筛选逻辑
```typescript
if (selectedGateway) {
  const gateway = gateways.find(gw => gw.id === selectedGateway)
  if (gateway) {
    const msgGateway = message.gateway?.name || ''
    const gatewayMac = gateway.macAddress || ''
    const macSuffix = gatewayMac.replace(/:/g, '').slice(-4).toUpperCase()

    const matches = (
      msgGateway.includes(macSuffix) ||
      msgGateway.toUpperCase().includes(gateway.name.split('_')[0].toUpperCase())
    )

    if (!matches) {
      return // 跳过不匹配的消息
    }
  }
}
```

### 5. 实时消息订阅

#### 5.1 主题模式
```typescript
let locationTopicPattern: string | RegExp

if (selectedGateway) {
  // 使用具体 Gateway 的主题
  locationTopicPattern = gateway.cloudData.pub_topic.location || `UWB/GW${gatewayName}_Loca`
} else {
  // 使用通配符订阅所有 Gateway
  locationTopicPattern = USE_WEBSOCKET ? 'UWB/*_Loca' : /^UWB\/GW.*_Loca$/
}
```

#### 5.2 订阅与处理
```typescript
const unsubscribe = realtimeDataService.subscribe(locationTopicPattern, (message: RealtimeMessage) => {
  // 去重检查
  // 持久化存储
  // 处理消息
  processLocationMessage(message, processedMessages)
})
```

### 6. 连接状态监听
```typescript
useEffect(() => {
  const unsubscribe = realtimeDataService.onStatusChange((status) => {
    setCloudConnected(status === 'connected')
    setCloudConnectionStatus(...)
  })

  return unsubscribe
}, [t])
```

### 7. UI 更新
- 动态显示 WebSocket 或 MQTT 连接状态
- 显示模式提示信息

---

## 数据流程

### WebSocket 模式
```
后端 MQTT → 后端 WebSocket 服务 → 前端 WebSocket 客户端 → realtimeDataService → LocationPage
                                    ↓
                             localStorage 持久化
                                    ↑
                          REST API 历史加载（页面初始化）
```

### MQTT 模式
```
云端 MQTT → 前端 MQTT 客户端 → mqttBus → realtimeDataService → LocationPage
                                              ↓
                                    localStorage 持久化
```

---

## 匹配逻辑示例

### 示例 1: WebSocket 模式从 Topic 提取
```
收到消息:
  topic: "UWB/GW16B8_Loca"
  payload: { content: "location", id: "AA:BB:CC:DD:EE:FF", position: {...} }

提取 Gateway:
  gatewayMatch = "GW16B8"
  gatewayInfo = { id: "16B8", name: "GW16B8" }

筛选匹配:
  selectedGateway.macAddress = "F9:E5:16:B8"
  macSuffix = "16B8"
  msgGateway = "GW16B8"

  匹配结果: "GW16B8".includes("16B8") → ✅ true
```

### 示例 2: MQTT 模式完整 Gateway 信息
```
收到消息:
  gateway: { id: "xxx", name: "GwF9E516B8_192" }
  topic: "UWB/GwF9E516B8_192_Loca"

筛选匹配:
  selectedGateway.name = "GwF9E516B8_192"
  msgGateway = "GwF9E516B8_192"

  匹配结果: "GwF9E516B8".includes("GwF9E516B8") → ✅ true
```

---

## 兼容性保证

### 1. 向后兼容
- 保留 `mqttBus` 导入（MQTT 模式需要）
- Gateway 切换时清除数据的逻辑保持不变
- 设备状态缓存机制保持不变

### 2. 双模式支持
- 可随时通过环境变量切换模式
- 两种模式的数据格式统一
- 持久化机制对两种模式都有效

### 3. 降级策略
- REST API 失败 → localStorage
- localStorage 失败 → 仅实时数据

---

## 测试要点

### 1. WebSocket 模式
- [ ] 页面加载时从 REST API 加载历史数据
- [ ] 实时接收新的位置消息
- [ ] Gateway 筛选正常工作
- [ ] 切换 Gateway 时数据正确更新
- [ ] localStorage 持久化正常

### 2. MQTT 模式
- [ ] 页面加载时从 mqttBus 加载历史数据
- [ ] 实时接收新的位置消息
- [ ] Gateway 筛选正常工作
- [ ] 切换 Gateway 时数据正确更新
- [ ] localStorage 持久化正常

### 3. 切换模式
- [ ] 从 MQTT 切换到 WebSocket 数据不丢失
- [ ] 从 WebSocket 切换到 MQTT 数据不丢失

### 4. Gateway 筛选
- [ ] MAC 地址后4位匹配正确
- [ ] 名称前缀匹配正确
- [ ] 不同格式的 Gateway 信息都能正确匹配

---

## 与 TemperaturePage 的一致性

### 相同点
1. 使用 `realtimeDataService` 统一接口
2. 支持双模式切换
3. REST API + localStorage 持久化机制
4. Gateway 筛选匹配逻辑
5. 消息去重机制
6. 连接状态监听

### 不同点
1. **消息类型**: LocationPage 处理 `location` 消息，TemperaturePage 处理 `300B` 消息
2. **Topic 后缀**: `_Loca` vs `_Health`
3. **存储 Key**: `location_history_messages` vs `temperature_history_messages`
4. **数据结构**: 位置数据包含 `position` 对象，体温数据包含温度值

---

## 后续优化建议

1. **性能优化**
   - 考虑使用 IndexedDB 替代 localStorage（更大容量）
   - 实现分页加载历史数据

2. **用户体验**
   - 添加加载状态指示器
   - 显示最后更新时间
   - 添加手动刷新按钮

3. **错误处理**
   - 更详细的错误提示
   - 自动重试机制
   - 网络状态检测

4. **监控与调试**
   - 添加性能监控
   - 详细的日志记录
   - 开发者调试面板

---

## 参考文档
- [realtimeDataService API 说明](./websocket-api-specification.md)
- [TemperaturePage 迁移文档](./temperature-page-websocket-migration.md)
- [WebSocket 快速开始指南](./websocket-quick-start.md)

