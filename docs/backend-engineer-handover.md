# 後端工程師交接文檔

## 項目概述

**項目名稱**: Senior Care Plus UWB 定位系統
**交接日期**: 2025-10-02
**交接人**: 前端開發工程師
**接收人**: 後端工程師

## 項目背景

Senior Care Plus 是一個基於 UWB (Ultra-Wideband) 技術的養老院定位管理系統，主要功能包括：
- 場域管理 (Homes)
- 樓層管理 (Floors)
- 設備管理 (Gateways, Anchors, Tags)
- 實時位置追蹤
- MQTT 實時數據傳輸

## 技術架構

### 前端技術棧
- **框架**: React 18 + TypeScript
- **構建工具**: Vite
- **UI 庫**: Tailwind CSS + shadcn/ui
- **狀態管理**: React Hooks
- **國際化**: react-i18next
- **MQTT 客戶端**: mqtt.js

### 後端技術棧 (待實現)
- **API 服務器**: Node.js + Express (建議)
- **數據庫**: MongoDB/PostgreSQL (建議)
- **MQTT Broker**: Mosquitto
- **認證**: JWT (建議)
- **部署**: Docker (建議)

## 當前狀態

### ✅ 已完成
1. **前端架構設計**
   - API 服務層 (`src/services/api.ts`)
   - 數據同步 Hook (`src/hooks/useDataSync.ts`)
   - MQTT 後端同步服務 (`src/services/mqttBackendSync.ts`)

2. **智能切換機制**
   - 自動檢測後端可用性
   - API 失敗時自動降級到 localStorage
   - 用戶無感知切換

3. **測試環境**
   - 本地測試服務器 (`test-backend-with-db.js`)
   - JSON 文件存儲
   - MQTT 模擬器

### 🔄 進行中
1. **場域管理整合** - 已完成
2. **樓層管理整合** - 已完成

### ⏳ 待完成
1. **設備管理整合** (Gateways, Anchors, Tags)
2. **實時位置數據處理**
3. **用戶認證系統**
4. **生產環境部署**

## 核心文件說明

### 前端核心文件

#### 1. API 服務層
**文件**: `src/services/api.ts`
**功能**: 封裝所有後端 API 調用
**重要方法**:
```typescript
export const homeAPI = {
    async getAll(): Promise<Home[]>
    async getById(id: string): Promise<Home>
    async create(homeData: Omit<Home, 'id' | 'createdAt'>): Promise<Home>
    async update(id: string, homeData: Partial<Home>): Promise<Home>
    async delete(id: string): Promise<void>
}
```

#### 2. 數據同步 Hook
**文件**: `src/hooks/useDataSync.ts`
**功能**: 管理前端與後端的數據同步
**重要方法**:
```typescript
const { syncHomes, syncFloors, syncGateways, syncAnchors, syncTags } = useDataSync({
    enableAutoSync: false,
    onError: (error) => console.error('同步失敗:', error)
})
```

#### 3. MQTT 後端同步服務
**文件**: `src/services/mqttBackendSync.ts`
**功能**: 處理 MQTT 連接和實時數據同步
**重要方法**:
```typescript
mqttBackendSync.connect()
mqttBackendSync.subscribe('UWB/location/+')
mqttBackendSync.publish('UWB/command/device', data)
```

#### 4. 主頁面組件
**文件**: `src/pages/UWBLocationPage.tsx`
**功能**: 主要業務邏輯和 UI 組件
**重要狀態**:
```typescript
const [backendAvailable, setBackendAvailable] = useState(false)
const [homes, setHomes] = useState<Home[]>([])
const [floors, setFloors] = useState<Floor[]>([])
```

### 測試環境文件

#### 1. 測試後端服務器
**文件**: `test-backend-with-db.js`
**功能**: 模擬真實後端 API
**特點**:
- Express.js 服務器
- JSON 文件存儲
- MQTT 模擬器
- CORS 支持

#### 2. 環境配置
**文件**: `.env.example`
**內容**:
```env
VITE_API_BASE_URL=http://localhost:3001/api
VITE_MQTT_PROTOCOL=ws
VITE_MQTT_BROKER=localhost
VITE_MQTT_PORT=8083
VITE_MQTT_USERNAME=
VITE_MQTT_PASSWORD=
```

## 數據模型

### 核心數據類型

#### Home (場域)
```typescript
interface Home {
    id: string
    name: string
    description: string
    address: string
    createdAt: Date
}
```

#### Floor (樓層)
```typescript
interface Floor {
    id: string
    homeId: string
    name: string
    level: number
    mapImage?: string // base64 圖片數據
    dimensions?: {
        width: number
        height: number
        realWidth: number
        realHeight: number
    }
    calibration?: {
        originPixel: { x: number, y: number } // 原點像素座標
        originCoordinates?: { x: number, y: number } // 原點實際座標
        pixelToMeterRatio: number // 像素/米比例
        scalePoints?: { // 比例標定的兩個點
            point1: { x: number, y: number } | null
            point2: { x: number, y: number } | null
        }
        realDistance?: number // 兩點之間的實際距離(米)
        isCalibrated: boolean // 是否已校準
    }
    createdAt: Date
}
```

#### Gateway (閘道器)
```typescript
interface Gateway {
    id: string
    floorId: string
    name: string
    macAddress: string
    ipAddress: string
    status: 'online' | 'offline' | 'error'
    lastSeen?: Date
    createdAt: Date
}
```

## API 規格

### 基礎信息
- **Base URL**: `http://localhost:3001/api` (開發)
- **Content-Type**: `application/json`
- **認證**: Bearer Token (可選)

### 主要端點

#### 場域管理
- `GET /homes` - 獲取場域列表
- `POST /homes` - 創建場域
- `GET /homes/{id}` - 獲取場域詳情
- `PUT /homes/{id}` - 更新場域
- `DELETE /homes/{id}` - 刪除場域

#### 樓層管理
- `GET /floors` - 獲取樓層列表
- `POST /floors` - 創建樓層
- `GET /floors/{id}` - 獲取樓層詳情
- `PUT /floors/{id}` - 更新樓層
- `DELETE /floors/{id}` - 刪除樓層

詳細 API 規格請參考: `docs/api-specification.md`

## MQTT 配置

### 連接配置
- **協議**: WebSocket (ws://)
- **端口**: 8083
- **認證**: 可選

### 主題結構
```
UWB/location/{tagId}          # 位置數據
UWB/device/{deviceId}/status  # 設備狀態
UWB/gateway/{gatewayId}/health # 閘道器健康檢查
```

### 消息格式
```json
{
    "tagId": "tag_123",
    "position": { "x": 10.5, "y": 20.3, "z": 0 },
    "floorId": "floor_123",
    "timestamp": "2025-10-02T15:30:00.000Z",
    "signalStrength": -65.5,
    "batteryLevel": 85.2
}
```

詳細 MQTT 配置請參考: `docs/mqtt-setup-guide.md`

## 開發環境設置

### 1. 克隆項目
```bash
git clone <repository-url>
cd Senior-Care-Plus
```

### 2. 安裝依賴
```bash
npm install
```

### 3. 配置環境變量
```bash
cp .env.example .env
# 編輯 .env 文件
```

### 4. 啟動測試後端
```bash
node test-backend-with-db.js
```

### 5. 啟動前端
```bash
npm run dev
```

### 6. 啟動 MQTT Broker
```bash
# 使用 Docker
docker run -it -d --name mosquitto-broker \
  -p 1883:1883 -p 8083:8083 \
  eclipse-mosquitto:latest

# 或使用原生安裝
mosquitto.exe -c mosquitto.conf -v
```

## 測試指南

### 1. API 測試
```bash
# 健康檢查
curl http://localhost:3001/api/health

# 創建場域
curl -X POST http://localhost:3001/api/homes \
  -H "Content-Type: application/json" \
  -d '{"name":"測試場域","description":"測試","address":"測試地址"}'
```

### 2. MQTT 測試
```bash
# 發布測試消息
mosquitto_pub -h localhost -t "UWB/location/test" -m '{"tagId":"test","position":{"x":10,"y":20,"z":0}}'

# 訂閱主題
mosquitto_sub -h localhost -t "UWB/location/+"
```

### 3. 前端測試
1. 訪問 `http://localhost:5173`
2. 檢查存儲模式指示器
3. 測試場域和樓層管理功能
4. 驗證數據同步

## 部署建議

### 開發環境
- 使用 `test-backend-with-db.js`
- JSON 文件存儲
- 本地 MQTT Broker

### 生產環境
- 使用真實數據庫 (MongoDB/PostgreSQL)
- 雲端 MQTT Broker
- Docker 容器化部署
- HTTPS/WSS 加密

### 環境變量配置
```env
# 開發環境
VITE_API_BASE_URL=http://localhost:3001/api
VITE_MQTT_BROKER=localhost

# 生產環境
VITE_API_BASE_URL=https://api.seniorcare.com/api
VITE_MQTT_BROKER=mqtt.seniorcare.com
```

## 重要注意事項

### 1. 數據一致性
- 前端使用樂觀更新策略
- API 失敗時自動降級到 localStorage
- 需要實現衝突解決機制

### 2. 地圖標定功能
- **地圖圖片**: 支持 base64 格式存儲
- **標定數據**: 包含原點、比例尺、校準點等
- **座標轉換**: 像素座標與實際座標的轉換
- **數據驗證**: 確保標定數據的完整性和正確性

### 3. 錯誤處理
- 統一的錯誤響應格式
- 用戶友好的錯誤提示
- 自動重試機制

### 4. 性能優化
- 實現數據分頁
- 添加緩存機制
- 優化 MQTT 消息頻率

### 5. 安全考慮
- 實現用戶認證
- 數據驗證和清理
- CORS 配置
- 速率限制

## 後續開發計劃

### 階段 1: 基礎後端 (1-2 週)
- [ ] 實現 REST API 端點
- [ ] 設置數據庫
- [ ] 實現基本 CRUD 操作
- [ ] 添加數據驗證
- [ ] 支持地圖圖片上傳 (base64 格式)
- [ ] 實現地圖標定數據存儲

### 階段 2: 實時功能 (1-2 週)
- [ ] 集成 MQTT Broker
- [ ] 實現實時數據處理
- [ ] 添加 WebSocket 支持
- [ ] 優化消息傳輸

### 階段 3: 高級功能 (2-3 週)
- [ ] 實現用戶認證
- [ ] 添加權限管理
- [ ] 實現數據同步
- [ ] 添加監控和日誌

### 階段 4: 部署和優化 (1-2 週)
- [ ] 容器化部署
- [ ] 性能優化
- [ ] 安全加固
- [ ] 監控設置

## 聯繫信息

**前端開發工程師**: [您的姓名]
**郵箱**: [您的郵箱]
**電話**: [您的電話]

**項目倉庫**: [GitHub 鏈接]
**文檔目錄**: `docs/`
**測試目錄**: `test-data/`

## 附錄

### 相關文檔
- [API 接口規格](api-specification.md)
- [MQTT 環境建置手順](mqtt-setup-guide.md)
- [測試指南](testing-guide.md)
- [後端整合規格](backend-integration-spec.md)

### 技術參考
- [Express.js 官方文檔](https://expressjs.com/)
- [Mosquitto MQTT Broker](https://mosquitto.org/)
- [MongoDB 官方文檔](https://docs.mongodb.com/)
- [Docker 官方文檔](https://docs.docker.com/)

---

**交接完成確認**

- [ ] 代碼審查完成
- [ ] 文檔閱讀完成
- [ ] 測試環境設置完成
- [ ] 問題解答完成
- [ ] 後續計劃確認

**交接人簽名**: _________________ **日期**: ___________
**接收人簽名**: _________________ **日期**: ___________
