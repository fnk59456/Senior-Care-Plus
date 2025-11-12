# 后端工程师对接手册

**版本**: 1.0
**日期**: 2025-11-12
**前端工程师**: [Your Name]
**项目**: Senior Care Plus - 养老院管理系统

---

## 目录
1. [Gateway/Anchor 管理页面本地后端化](#1-gatewayanchor-管理页面本地后端化)
2. [Temperature/Location 页面 REST API + WebSocket 架构](#2-temperaturelocation-页面-rest-api--websocket-架构)
3. [WebSocket 模式启动程序](#3-websocket-模式启动程序)

---

## 1. Gateway/Anchor 管理页面本地后端化

### 📋 概述
`UWBLocationPage.tsx` 已实现场域管理、楼层管理、Gateway 管理、Anchor 管理的完整 CRUD 功能，目前使用 `localStorage` 作为本地数据存储。

### 🎯 后端化目标
将 `localStorage` 迁移到云端 SQL 数据库（建议使用 PostgreSQL 或 MySQL）。

---

### 📦 数据模型与接口建议

#### 1.1 Home (养老院/场域)

**数据模型**
```typescript
interface Home {
  id: string              // UUID
  name: string            // 养老院名称
  description: string     // 描述
  address: string         // 地址
  createdAt: Date        // 创建时间
}
```

**SQL 表结构建议**
```sql
CREATE TABLE homes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    address TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

**REST API 接口**
```
GET    /api/homes              # 获取所有养老院
GET    /api/homes/:id          # 获取单个养老院
POST   /api/homes              # 创建养老院
PUT    /api/homes/:id          # 更新养老院
DELETE /api/homes/:id          # 删除养老院
```

**请求/响应示例**
```json
// POST /api/homes
{
  "name": "阳光养老院",
  "description": "位于市中心的高级养老院",
  "address": "台北市中正區xxx路xxx號"
}

// Response
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "name": "阳光养老院",
  "description": "位于市中心的高级养老院",
  "address": "台北市中正區xxx路xxx號",
  "createdAt": "2025-11-12T10:30:00.000Z"
}
```

---

#### 1.2 Floor (楼层)

**数据模型**
```typescript
interface Floor {
  id: string
  homeId: string          // 关联的养老院ID
  name: string
  level: number           // 楼层号
  mapImage?: string       // Base64 图片数据
  dimensions?: {
    width: number         // 显示宽度(px)
    height: number        // 显示高度(px)
    realWidth: number     // 实际宽度(米)
    realHeight: number    // 实际高度(米)
  }
  calibration?: {
    originPixel: { x: number, y: number }
    originCoordinates?: { x: number, y: number }
    pixelToMeterRatio: number
    scalePoints?: {
      point1: { x: number, y: number } | null
      point2: { x: number, y: number } | null
    }
    realDistance?: number
    isCalibrated: boolean
  }
  createdAt: Date
}
```

**SQL 表结构建议**
```sql
CREATE TABLE floors (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    home_id UUID NOT NULL REFERENCES homes(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    level INTEGER NOT NULL,
    map_image TEXT,                    -- Base64 或 存储路径/URL
    dimensions JSONB,                  -- JSON 格式存储
    calibration JSONB,                 -- JSON 格式存储
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    UNIQUE(home_id, level)             -- 同一养老院的楼层号唯一
);

CREATE INDEX idx_floors_home_id ON floors(home_id);
```

**REST API 接口**
```
GET    /api/floors                    # 获取所有楼层
GET    /api/floors?homeId=xxx         # 获取指定养老院的楼层
GET    /api/floors/:id                # 获取单个楼层
POST   /api/floors                    # 创建楼层
PUT    /api/floors/:id                # 更新楼层
DELETE /api/floors/:id                # 删除楼层
POST   /api/floors/:id/map            # 上传地图图片
PUT    /api/floors/:id/calibration    # 更新校准信息
```

**⚠️ 注意事项**
- `mapImage` 字段可能很大（Base64 编码），建议：
  1. 使用对象存储（如 AWS S3、阿里云 OSS）存储图片
  2. 数据库只存储图片 URL
  3. 或者使用 PostgreSQL 的 `bytea` 类型存储二进制数据

**请求/响应示例**
```json
// POST /api/floors
{
  "homeId": "550e8400-e29b-41d4-a716-446655440000",
  "name": "1楼大厅",
  "level": 1,
  "dimensions": {
    "width": 800,
    "height": 600,
    "realWidth": 50,
    "realHeight": 40
  }
}

// PUT /api/floors/:id/calibration
{
  "originPixel": { "x": 100, "y": 100 },
  "originCoordinates": { "x": 0, "y": 0 },
  "pixelToMeterRatio": 16,
  "isCalibrated": true
}
```

---

#### 1.3 Gateway (网关)

**数据模型**
```typescript
interface Gateway {
  id: string
  floorId: string
  name: string
  macAddress: string      // 格式: "F9:E5:16:B8"
  ipAddress: string
  status: 'online' | 'offline' | 'error'
  lastSeen?: Date
  createdAt: Date
  cloudData?: CloudGatewayData  // MQTT 推送的实时数据
}
```

**SQL 表结构建议**
```sql
CREATE TABLE gateways (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    floor_id UUID NOT NULL REFERENCES floors(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    mac_address VARCHAR(17) NOT NULL UNIQUE,  -- Format: "F9:E5:16:B8"
    ip_address VARCHAR(45),                   -- 支持 IPv6
    status VARCHAR(20) DEFAULT 'offline',     -- 'online', 'offline', 'error'
    last_seen TIMESTAMP,
    cloud_data JSONB,                         -- 存储 MQTT 推送的实时数据
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_gateways_floor_id ON gateways(floor_id);
CREATE INDEX idx_gateways_mac_address ON gateways(mac_address);
CREATE INDEX idx_gateways_status ON gateways(status);
```

**REST API 接口**
```
GET    /api/gateways                  # 获取所有网关
GET    /api/gateways?floorId=xxx      # 获取指定楼层的网关
GET    /api/gateways/:id              # 获取单个网关
POST   /api/gateways                  # 创建网关
PUT    /api/gateways/:id              # 更新网关
DELETE /api/gateways/:id              # 删除网关
PUT    /api/gateways/:id/status       # 更新网关状态（由 MQTT 触发）
```

**⚠️ 关键逻辑**
- `status` 字段由后端 MQTT 监听服务自动更新：
  - 收到 MQTT 消息且 `uwb_joined === "yes"` → `status = 'online'`
  - 超过 30 秒未收到消息 → `status = 'offline'`
  - `uwb_joined === "no"` → `status = 'offline'`
- `cloudData` 字段实时更新，存储最新的 MQTT 数据
- `lastSeen` 字段在每次收到 MQTT 消息时更新

**请求/响应示例**
```json
// POST /api/gateways
{
  "floorId": "xxx-xxx-xxx",
  "name": "GwF9E516B8_192",
  "macAddress": "F9:E5:16:B8",
  "ipAddress": "192.168.1.100"
}

// Response
{
  "id": "gateway-uuid",
  "floorId": "xxx-xxx-xxx",
  "name": "GwF9E516B8_192",
  "macAddress": "F9:E5:16:B8",
  "ipAddress": "192.168.1.100",
  "status": "offline",
  "lastSeen": null,
  "cloudData": null,
  "createdAt": "2025-11-12T10:30:00.000Z"
}
```

---

#### 1.4 Anchor (锚点)

**数据模型**
```typescript
interface AnchorDevice {
  id: string
  gatewayId: string
  name: string
  macAddress: string
  status: 'paired' | 'unpaired' | 'calibrating' | 'active' | 'error'
  position?: {
    x: number
    y: number
    z: number
  }
  signalStrength?: number
  batteryLevel?: number
  lastSeen?: Date
  createdAt: Date
  cloudData?: CloudAnchorData
  cloudGatewayId?: number     // 关联的云端 Gateway ID
}
```

**SQL 表结构建议**
```sql
CREATE TABLE anchors (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    gateway_id UUID NOT NULL REFERENCES gateways(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    mac_address VARCHAR(17) NOT NULL,
    status VARCHAR(20) DEFAULT 'unpaired',  -- 'paired', 'unpaired', 'calibrating', 'active', 'error'
    position_x DECIMAL(10, 4),
    position_y DECIMAL(10, 4),
    position_z DECIMAL(10, 4),
    signal_strength INTEGER,
    battery_level INTEGER,
    last_seen TIMESTAMP,
    cloud_data JSONB,
    cloud_gateway_id INTEGER,               -- MQTT 数据中的 gateway_id
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    UNIQUE(gateway_id, mac_address)         -- 同一网关下 MAC 地址唯一
);

CREATE INDEX idx_anchors_gateway_id ON anchors(gateway_id);
CREATE INDEX idx_anchors_status ON anchors(status);
CREATE INDEX idx_anchors_cloud_gateway_id ON anchors(cloud_gateway_id);
```

**REST API 接口**
```
GET    /api/anchors                   # 获取所有锚点
GET    /api/anchors?gatewayId=xxx     # 获取指定网关的锚点
GET    /api/anchors/:id               # 获取单个锚点
POST   /api/anchors                   # 创建锚点
PUT    /api/anchors/:id               # 更新锚点
DELETE /api/anchors/:id               # 删除锚点
PUT    /api/anchors/:id/position      # 更新锚点位置（校准）
POST   /api/anchors/:id/config        # 发送配置到 MQTT（下行消息）
```

**⚠️ 关键逻辑**
- 创建锚点时可以从 MQTT 发现的设备中导入
- 位置校准后需要通过 MQTT 下行消息发送到设备
- `cloudGatewayId` 用于匹配 MQTT 数据中的 `gateway_id` 字段

**MQTT 下行消息接口**
```json
// POST /api/anchors/:id/config
{
  "position": {
    "x": 10.5,
    "y": 8.3,
    "z": 2.5
  },
  "sendToMqtt": true  // 是否发送到 MQTT
}

// 后端需要发送到 MQTT Topic: UWB/{gatewayName}_Dwlink
// 消息格式:
{
  "id": 1,  // Anchor ID (从 cloudData 获取)
  "name": "Anchor1",
  "fw_update": 0,
  "led": 1,
  "ble": 1,
  "initiator": 1,
  "x": 10.5,
  "y": 8.3,
  "z": 2.5
}
```

---

### 📊 数据关系图
```
Home (养老院)
  └── Floor (楼层)
        └── Gateway (网关)
              └── Anchor (锚点)
```

---

### 🔄 迁移建议

#### 阶段 1: 只读接口（推荐先实现）
1. 实现 `GET` 接口，前端可以从后端读取数据
2. 保留 `localStorage` 作为备用存储
3. 前端优先使用后端数据，后端不可用时降级到 `localStorage`

#### 阶段 2: 完整 CRUD
1. 实现 `POST`, `PUT`, `DELETE` 接口
2. 移除 `localStorage` 逻辑
3. 所有数据操作通过后端 API

#### 阶段 3: 实时同步
1. 后端监听 MQTT 主题：`UWB/#`
2. 自动更新 `gateways` 和 `anchors` 表的 `cloudData` 字段
3. 通过 WebSocket 推送更新到前端

---

### 📝 前端适配要点

前端已预留后端集成代码（见 `UWBLocationPage.tsx` 第 500-517 行）：

```typescript
// 检查后端是否可用
const checkBackendAvailability = async () => {
  try {
    const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001/api'
    const response = await fetch(`${API_BASE_URL}/health`, { method: 'GET', timeout: 3000 })
    return response.ok
  } catch {
    return false
  }
}
```

**前端需要修改的地方**：
1. 将所有 `localStorage` 读写操作替换为 API 调用
2. 添加错误处理和加载状态
3. 实现乐观更新（Optimistic Update）提升用户体验

---

## 2. Temperature/Location 页面 REST API + WebSocket 架构

### 📋 概述
`TemperaturePage.tsx` 和 `LocationPage.tsx` 已实现双模式架构：
- **MQTT 模式**: 前端直接连接云端 MQTT Broker
- **WebSocket 模式**: 前端通过后端 WebSocket 接收数据

### 🎯 后端化目标
后端接收云端 MQTT 消息，通过 WebSocket 推送到前端，并提供 REST API 用于历史数据查询。

---

### 🏗️ 架构要点

#### 2.1 数据流程

**WebSocket 模式（推荐）**
```
云端 MQTT Broker
    ↓ 订阅 UWB/#
后端 MQTT 客户端
    ↓ 解析消息
后端 WebSocket 服务
    ↓ 推送
前端 WebSocket 客户端
    ↓
React 组件 (TemperaturePage/LocationPage)
```

**MQTT 模式（向后兼容）**
```
云端 MQTT Broker
    ↓ 直接连接
前端 MQTT 客户端
    ↓
React 组件
```

---

#### 2.2 后端 MQTT 监听服务

**监听的主题**
```javascript
// 监听所有 UWB 主题
client.subscribe('UWB/#', (err) => {
  if (err) {
    console.error('订阅失败:', err)
  }
})
```

**处理的消息类型**
| Content Type | Topic Pattern | 描述 | 用于页面 |
|-------------|---------------|------|---------|
| `300B` | `UWB/GW*_Health` | 体温、心率、血氧等健康数据 | TemperaturePage |
| `location` | `UWB/GW*_Loca` | 室内定位数据 | LocationPage |
| `gateway topic` | `UWB/GW*_Message` | Gateway 状态数据 | GatewayManagement |
| `anchor config` | `UWB/GW*_AncConf` | Anchor 配置数据 | AnchorManagement |

**示例：处理 300B 消息**
```javascript
mqttClient.on('message', (topic, message) => {
  try {
    const parsedMessage = JSON.parse(message.toString())

    if (parsedMessage.content === '300B') {
      // 1. 保存到数据库（可选，用于历史查询）
      await saveMqttMessage({
        topic: topic,
        message: parsedMessage,
        timestamp: new Date()
      })

      // 2. 推送到所有连接的 WebSocket 客户端
      broadcastToWebSocket({
        topic: topic,
        payload: parsedMessage,
        timestamp: new Date()
      })
    }
  } catch (error) {
    console.error('处理 MQTT 消息失败:', error)
  }
})
```

---

#### 2.3 WebSocket 服务

**WebSocket 消息格式**
```json
{
  "type": "message",
  "data": {
    "topic": "UWB/GW16B8_Health",
    "payload": {
      "content": "300B",
      "MAC": "AA:BB:CC:DD:EE:FF",
      "skin temp": "36.5",
      "room temp": "25.0",
      "steps": "1000",
      "battery level": "80"
    },
    "timestamp": "2025-11-12T10:30:00.000Z"
  }
}
```

**订阅机制（可选实现）**
前端可以发送订阅请求，后端只推送相关主题的消息：

```json
// 前端 → 后端
{
  "type": "subscribe",
  "topics": ["UWB/*_Health", "UWB/*_Loca"]
}

// 后端 → 前端（确认）
{
  "type": "subscribed",
  "topics": ["UWB/*_Health", "UWB/*_Loca"]
}
```

---

#### 2.4 REST API（历史数据查询）

**接口：获取历史 MQTT 消息**
```
GET /api/mqtt/messages
```

**查询参数**
```
?startTime=2025-11-12T00:00:00Z   # 开始时间
&endTime=2025-11-12T23:59:59Z     # 结束时间
&topic=UWB/GW16B8_Health          # 主题过滤（支持通配符）
&content=300B                      # 内容类型过滤
&limit=1000                        # 返回数量限制
```

**响应格式**
```json
[
  {
    "id": "msg-uuid",
    "topic": "UWB/GW16B8_Health",
    "message": {
      "content": "300B",
      "MAC": "AA:BB:CC:DD:EE:FF",
      "skin temp": "36.5",
      "room temp": "25.0",
      "steps": "1000",
      "battery level": "80"
    },
    "timestamp": "2025-11-12T10:30:00.000Z"
  }
]
```

---

#### 2.5 数据库表结构（可选）

如果需要持久化 MQTT 消息：

```sql
CREATE TABLE mqtt_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    topic VARCHAR(255) NOT NULL,
    message JSONB NOT NULL,
    timestamp TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    content_type VARCHAR(50),  -- '300B', 'location', 'gateway topic', etc.

    -- 索引
    INDEX idx_mqtt_messages_timestamp (timestamp DESC),
    INDEX idx_mqtt_messages_topic (topic),
    INDEX idx_mqtt_messages_content_type (content_type)
);

-- 可以使用分区表提升查询性能
CREATE TABLE mqtt_messages PARTITION BY RANGE (timestamp);
```

**⚠️ 注意事项**
- MQTT 消息量可能很大，建议：
  1. 只保存最近 7-30 天的数据
  2. 使用时间分区表
  3. 定期归档或清理旧数据
  4. 考虑使用时序数据库（如 TimescaleDB、InfluxDB）

---

### 🔄 前端适配要点

#### 2.6 前端代码结构
```typescript
// 前端使用统一的 realtimeDataService
import { realtimeDataService } from '@/services/realtimeDataService'

// 连接服务
realtimeDataService.connect()

// 订阅主题
const unsubscribe = realtimeDataService.subscribe('UWB/*_Health', (message) => {
  // 处理消息
  console.log(message.topic, message.payload)
})

// 监听连接状态
realtimeDataService.onStatusChange((status) => {
  console.log('连接状态:', status)
})
```

#### 2.7 Gateway 筛选逻辑

前端已实现 Gateway 筛选，后端推送消息时需要包含 Gateway 信息：

**方式 1: 从 Topic 提取**
```javascript
// Topic: UWB/GW16B8_Health
const gatewayMatch = topic.match(/GW([A-F0-9]+)/)
const gateway = {
  id: gatewayMatch[1],  // "16B8"
  name: gatewayMatch[0]  // "GW16B8"
}
```

**方式 2: 从 Gateway 管理数据关联**
```javascript
// 查询数据库中的 Gateway 信息
const gateway = await db.gateways.findOne({
  where: { cloud_gateway_id: parsedMessage.gateway_id }
})
```

推送时附加 Gateway 信息：
```json
{
  "topic": "UWB/GW16B8_Health",
  "payload": { ... },
  "timestamp": "2025-11-12T10:30:00.000Z",
  "gateway": {
    "id": "16B8",
    "name": "GW16B8"
  }
}
```

---

### 🚀 未来改写建议

#### 建议 1: 统一消息格式
后端可以在推送前统一消息格式，简化前端处理：

```javascript
// 原始 MQTT 消息
{
  "content": "300B",
  "MAC": "AA:BB:CC:DD:EE:FF",
  "skin temp": "36.5",
  ...
}

// 后端处理后推送
{
  "type": "health_data",
  "deviceType": "smartwatch_300b",
  "deviceId": "AA:BB:CC:DD:EE:FF",
  "gatewayId": "16B8",
  "data": {
    "skinTemperature": 36.5,  // 统一命名（驼峰）
    "roomTemperature": 25.0,
    "steps": 1000,
    "batteryLevel": 80
  },
  "timestamp": "2025-11-12T10:30:00.000Z"
}
```

#### 建议 2: 数据聚合
后端可以提供聚合数据接口，减少前端计算：

```
GET /api/health/statistics?deviceId=xxx&period=1day

Response:
{
  "deviceId": "AA:BB:CC:DD:EE:FF",
  "period": "1day",
  "statistics": {
    "temperature": {
      "avg": 36.5,
      "min": 36.0,
      "max": 37.0,
      "abnormalCount": 2
    },
    "steps": {
      "total": 5000
    }
  }
}
```

#### 建议 3: 实时告警
后端可以在检测到异常数据时主动推送告警：

```json
// WebSocket 推送
{
  "type": "alert",
  "alertType": "high_temperature",
  "severity": "warning",
  "deviceId": "AA:BB:CC:DD:EE:FF",
  "data": {
    "skinTemperature": 38.5,
    "threshold": 37.5
  },
  "timestamp": "2025-11-12T10:30:00.000Z"
}
```

---

## 3. WebSocket 模式启动程序

### 📋 概述
WebSocket 模式需要启动后端服务来接收 MQTT 消息并通过 WebSocket 推送到前端。

---

### 🚀 快速启动

#### 3.1 环境配置

**后端环境变量** (`.env` 或系统环境变量)
```bash
# MQTT 配置
MQTT_URL=wss://067ec32ef1344d3bb20c4e53abdde99a.s1.eu.hivemq.cloud:8884/mqtt
MQTT_USERNAME=testweb1
MQTT_PASSWORD=Aa000000

# WebSocket 配置
WS_PORT=3002

# REST API 配置
API_PORT=3001

# 测试消息开关（可选）
ENABLE_TEST_MESSAGES=false
TEST_MESSAGE_INTERVAL=10000
```

**前端环境变量** (`.env.development`)
```bash
# WebSocket 模式开关
VITE_USE_WEBSOCKET=true

# WebSocket 服务地址
VITE_WS_URL=ws://localhost:3002

# REST API 地址
VITE_API_BASE_URL=http://localhost:3001/api

# MQTT 配置（MQTT 模式使用）
VITE_MQTT_URL=wss://067ec32ef1344d3bb20c4e53abdde99a.s1.eu.hivemq.cloud:8884/mqtt
VITE_MQTT_USERNAME=testweb1
VITE_MQTT_PASSWORD=Aa000000
```

---

#### 3.2 启动步骤

**步骤 1: 启动后端服务**
```bash
# 开发环境
node test-backend-with-db.js

# 生产环境（推荐使用 PM2）
pm2 start test-backend-with-db.js --name "senior-care-backend"
```

**启动日志示例**
```
🚀 REST API 服务器已啟動在 http://localhost:3001
🌐 WebSocket 服務器已啟動在 ws://localhost:3002
📡 MQTT 客戶端正在連接到雲端 MQTT...
✅ MQTT 客戶端已連接到雲端
🔔 已訂閱主題: UWB/#

📋 服務狀態:
   - REST API: ✅ Running on :3001
   - WebSocket: ✅ Running on :3002
   - MQTT: ✅ Connected
   - Test Messages: ⏸️ Disabled
```

**步骤 2: 启动前端服务**
```bash
npm run dev
```

**步骤 3: 验证连接**
打开浏览器开发者工具，在 Console 中应该看到：
```
📡 初始化實時數據服務 (WebSocket 模式)
🌐 正在連接 WebSocket: ws://localhost:3002
✅ WebSocket 已連接
📥 收到 WebSocket 消息: {"type":"welcome",...}
```

---

### 🛠️ 后端服务代码结构

#### 3.3 核心模块

**目前实现** (`test-backend-with-db.js`)
```javascript
// 1. REST API 服务 (Express)
const express = require('express')
const app = express()
app.listen(3001)

// 2. WebSocket 服务
const { WebSocketServer } = require('ws')
const wss = new WebSocketServer({ port: 3002 })

// 3. MQTT 客户端
const mqtt = require('mqtt')
const mqttClient = mqtt.connect(MQTT_URL, {
  username: MQTT_USERNAME,
  password: MQTT_PASSWORD
})

// 4. 消息去重
const messageDeduplication = new Map()

// 5. 消息转发
mqttClient.on('message', (topic, message) => {
  const parsedMessage = JSON.parse(message.toString())

  // 去重检查
  const messageId = generateMessageId(topic, parsedMessage)
  if (messageDeduplication.has(messageId)) return

  // 保存到数据库（可选）
  saveMqttMessage(topic, parsedMessage)

  // 推送到 WebSocket 客户端
  broadcastToClients({
    topic: topic,
    payload: parsedMessage,
    timestamp: new Date()
  })
})
```

---

#### 3.4 建议的生产环境架构

```
┌─────────────────────────────────────────────────────────────┐
│                      Nginx / Load Balancer                   │
│                   (SSL Termination, Reverse Proxy)           │
└───────────────────────┬─────────────────────────────────────┘
                        │
        ┌───────────────┴───────────────┐
        │                               │
┌───────▼───────┐              ┌────────▼────────┐
│  REST API     │              │  WebSocket      │
│  (Express)    │              │  Service        │
│  Port: 3001   │              │  Port: 3002     │
└───────┬───────┘              └────────┬────────┘
        │                               │
        └───────────────┬───────────────┘
                        │
                ┌───────▼────────┐
                │  MQTT Client   │
                │  (Subscribes   │
                │   UWB/#)       │
                └───────┬────────┘
                        │
                ┌───────▼────────┐
                │  Cloud MQTT    │
                │  Broker        │
                │  (HiveMQ)      │
                └────────────────┘
```

**推荐技术栈**
- **Web 框架**: Express.js / Fastify / NestJS
- **WebSocket**: ws / Socket.io
- **MQTT**: mqtt.js
- **数据库**: PostgreSQL (TimescaleDB) / MySQL
- **缓存**: Redis（用于消息去重）
- **进程管理**: PM2 / Docker
- **监控**: Prometheus + Grafana

---

### 🔧 控制与维护

#### 3.5 测试消息开关

**通过环境变量控制**
```bash
# 启用测试消息（每 10 秒发送一条）
ENABLE_TEST_MESSAGES=true TEST_MESSAGE_INTERVAL=10000 node test-backend-with-db.js

# 禁用测试消息
ENABLE_TEST_MESSAGES=false node test-backend-with-db.js
```

**通过代码控制** (修改 `test-backend-with-db.js` 第 17-21 行)
```javascript
// 測試消息開關（改這裡！）
const ENABLE_TEST_MESSAGES = false  // true: 啟用測試消息, false: 禁用
const TEST_MESSAGE_INTERVAL = 10000  // 測試消息間隔（毫秒）
```

---

#### 3.6 监控与调试

**查看 WebSocket 连接数**
```javascript
console.log(`📊 当前连接的 WebSocket 客户端数: ${wsClients.size}`)
```

**查看 MQTT 消息流量**
```javascript
let messageCount = 0
mqttClient.on('message', (topic, message) => {
  messageCount++
  console.log(`📨 累计收到 ${messageCount} 条 MQTT 消息`)
})
```

**API 健康检查**
```bash
# REST API
curl http://localhost:3001/api/health

# 获取历史消息
curl http://localhost:3001/api/mqtt/messages
```

---

#### 3.7 常见问题排查

**问题 1: WebSocket 连接失败**
```
❌ WebSocket 連接錯誤: Error: connect ECONNREFUSED
```
**解决方案**:
1. 检查后端服务是否启动
2. 检查端口是否被占用：`netstat -ano | findstr 3002`
3. 检查前端 `.env.development` 中的 `VITE_WS_URL`

**问题 2: MQTT 连接失败**
```
❌ MQTT 連接錯誤: Connection refused
```
**解决方案**:
1. 检查 MQTT 服务器地址和端口
2. 检查用户名和密码
3. 检查网络防火墙设置
4. 尝试使用 `mosquitto_pub` 测试连接

**问题 3: 端口被占用**
```
Error: listen EADDRINUSE: address already in use :::3002
```
**解决方案**:
```powershell
# 查找占用端口的进程
netstat -ano | findstr 3002

# 杀死进程
taskkill /PID <进程ID> /F

# 或使用提供的脚本
./kill-port-3002.ps1
```

**问题 4: 前端收不到数据**
**排查步骤**:
1. 检查后端日志，确认收到 MQTT 消息
2. 检查 WebSocket 推送日志：`📤 已推送消息到 X 個前端客戶端`
3. 检查前端控制台，确认收到 WebSocket 消息
4. 检查 Gateway 筛选逻辑，确认消息未被过滤

---

### 📦 生产环境部署建议

#### 3.8 Docker 部署

**Dockerfile**
```dockerfile
FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY . .

EXPOSE 3001 3002

CMD ["node", "test-backend-with-db.js"]
```

**docker-compose.yml**
```yaml
version: '3.8'

services:
  backend:
    build: .
    ports:
      - "3001:3001"  # REST API
      - "3002:3002"  # WebSocket
    environment:
      - MQTT_URL=${MQTT_URL}
      - MQTT_USERNAME=${MQTT_USERNAME}
      - MQTT_PASSWORD=${MQTT_PASSWORD}
      - ENABLE_TEST_MESSAGES=false
    restart: unless-stopped

  postgres:
    image: timescale/timescaledb:latest-pg15
    environment:
      - POSTGRES_PASSWORD=${DB_PASSWORD}
      - POSTGRES_DB=senior_care
    volumes:
      - db-data:/var/lib/postgresql/data
    restart: unless-stopped

volumes:
  db-data:
```

**启动**
```bash
docker-compose up -d
```

---

#### 3.9 PM2 部署

**ecosystem.config.js**
```javascript
module.exports = {
  apps: [{
    name: 'senior-care-backend',
    script: './test-backend-with-db.js',
    instances: 1,
    exec_mode: 'fork',
    watch: false,
    env: {
      NODE_ENV: 'production',
      MQTT_URL: 'wss://...',
      MQTT_USERNAME: 'testweb1',
      MQTT_PASSWORD: 'Aa000000',
      ENABLE_TEST_MESSAGES: 'false'
    }
  }]
}
```

**启动**
```bash
pm2 start ecosystem.config.js
pm2 save
pm2 startup
```

---

## 📚 附录

### A. 参考文档
- [UWB JSON 规格说明](../UWB_structured_spec_v2.md)
- [MQTT 设置指南](./mqtt-setup-guide.md)
- [LocationPage WebSocket 迁移文档](./location-page-websocket-migration.md)

### B. 测试数据
- Gateway 测试数据: `test-data/gateways.json`
- Anchor 测试数据: `test-data/anchors.json`
- MQTT 消息示例: `test-data/mqtt_messages.json`

### C. 联系方式
- 前端工程师: [Your Email]
- 技术支持: [Support Email]
- 项目仓库: [GitHub Repository]

---

**文档版本**: 1.0
**最后更新**: 2025-11-12
**下次审查**: 2025-12-12

