# Ack 功能升级计划

## 📋 图片中定义的所有 Ack 类型

### TAG 相关 (node: "TAG")
1. **TagConfig Ack** - `command: "configChange"`
2. **TagCommand Ack** - `command: "downlink alert"`
3. **TagMessage Ack** - `command: "message"`
4. **TagQRcode Ack** - `command: "qr code"`
5. **TagImage Ack** - `command: "image"`

### ANCHOR 相关 (node: "ANCHOR")
6. **AnchorConfig Ack** - `command: "configChange"`

### GATEWAY 相关 (node: "GW")
7. **NewFirmware Ack** - `command: "new fw notify"` + `response: "OK"/"NACK"` ⚠️ **特殊字段**
8. **QoS Ack** - `command: "QoS request"`
9. **TagCfgRequest Ack** - `command: "tag cfg request"`
10. **GwResetRequest Ack** - `command: "gateway reset request"`
11. **GwSetDiscardIOTDataTimeRequest Ack** - `command: "discard IOT data time(0.1s)"`

---

## 🔍 当前实现问题分析

### ❌ 问题 1: Command 字段提取错误
**位置**: `src/stores/ackStore.ts:105`
```typescript
command: String(ack.message || ack.status || 'ACK'),  // ❌ 错误
```
**问题**: 应该从 `ack.raw?.command` 获取，而不是从 `message` 或 `status`

### ❌ 问题 2: 缺少 Response 字段支持
**位置**: `src/components/AckNotification.tsx`
**问题**: NewFirmware Ack 有 `response: "OK"/"NACK"` 字段，但当前接口和 UI 都不支持显示

### ❌ 问题 3: 缺少 Serial No 字段显示
**位置**: `src/components/AckNotification.tsx`
**问题**: 所有 ack 都有 `serial no` 字段（0-65535），但 UI 中没有显示

### ❌ 问题 4: DeviceId 提取逻辑错误
**位置**: `src/stores/ackStore.ts:35`
```typescript
deviceId: data.node || data.id || data.MAC || undefined,  // ❌ node 是节点类型，不是设备ID
```
**问题**: `data.node` 是节点类型（"TAG"/"ANCHOR"/"GW"），不应该作为 deviceId

### ❌ 问题 5: UI 颜色支持不完整
**位置**: `src/components/AckNotification.tsx:47-58`
**问题**: 只支持 3 种 command 类型颜色，缺少：
- "downlink alert"
- "message"
- "qr code"
- "image"
- "new fw notify"
- "QoS request"
- "tag cfg request"
- "gateway reset request"
- "discard IOT data time(0.1s)"

### ❌ 问题 6: Gateway ID 提取可能不完整
**位置**: `src/stores/ackStore.ts:103-104`
**问题**: 应该优先从 `ack.raw?.['gateway id']` 或 `ack.raw?.gateway_id` 获取

---

## ✅ 升级计划

### 阶段 1: 修复核心数据提取问题

#### 1.1 修复 `ackStore.ts` 中的字段提取
- ✅ 修复 `command` 字段：从 `ack.raw?.command` 获取
- ✅ 修复 `deviceId` 字段：从 `ack.raw?.id` 获取（不是 node）
- ✅ 修复 `gatewayId` 字段：优先从 `ack.raw?.['gateway id']` 或 `ack.raw?.gateway_id` 获取
- ✅ 添加 `serialNo` 字段提取：从 `ack.raw?.['serial no']` 或 `ack.raw?.serial_no` 获取
- ✅ 添加 `response` 字段提取：从 `ack.raw?.response` 获取（用于 NewFirmware Ack）

#### 1.2 更新 `AckNotificationData` 接口
- ✅ 添加 `response?: string` 字段（可选，仅 NewFirmware Ack 有）
- ✅ 添加 `serialNo?: string` 字段（可选，所有 ack 都有）

### 阶段 2: 增强 UI 显示

#### 2.1 更新 `AckNotification.tsx` 组件
- ✅ 添加 `response` 字段显示（如果有值）
- ✅ 添加 `serialNo` 字段显示
- ✅ 扩展 `getCommandColor` 函数，支持所有 command 类型：
  - "configChange" → 蓝色（已支持）
  - "downlink alert" → 橙色
  - "message" → 绿色
  - "qr code" → 紫色
  - "image" → 青色
  - "new fw notify" → 红色（重要）
  - "QoS request" → 黄色
  - "tag cfg request" → 蓝色
  - "gateway reset request" → 红色（警告）
  - "discard IOT data time(0.1s)" → 灰色

#### 2.2 优化显示逻辑
- ✅ 当 `response` 存在时，显示响应状态（OK/NACK）
- ✅ 当 `serialNo` 存在时，显示序列号

### 阶段 3: 测试验证

#### 3.1 验证所有 Ack 类型
- ✅ 测试所有 11 种 ack 类型是否能正确解析和显示
- ✅ 验证 NewFirmware Ack 的 response 字段显示
- ✅ 验证 serial no 字段显示
- ✅ 验证 command 颜色是否正确

---

## 📝 修改文件清单

1. **src/stores/ackStore.ts**
   - 修复字段提取逻辑
   - 更新 `AckNotificationData` 构建逻辑

2. **src/components/AckNotification.tsx**
   - 更新 `AckNotificationData` 接口
   - 扩展 `getCommandColor` 函数
   - 添加 `response` 和 `serialNo` 显示

---

## 🎯 预期效果

升级后，系统将能够：
- ✅ 正确解析所有 11 种 ack 类型
- ✅ 正确显示 command 字段（不再显示为 "ACK"）
- ✅ 显示 response 字段（NewFirmware Ack）
- ✅ 显示 serial no 字段
- ✅ 为不同 command 类型显示不同颜色
- ✅ 正确提取和显示 gateway ID 和 device ID

---

## ⚠️ 注意事项

1. **向后兼容**: 确保旧格式的 ack 消息仍能正常处理
2. **字段可选**: `response` 和 `serialNo` 应该是可选字段
3. **错误处理**: 添加适当的错误处理，避免字段缺失导致崩溃
4. **测试**: 建议使用测试数据验证所有类型

