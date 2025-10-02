# API 接口規格文檔

## 概述

本文檔定義了 Senior Care Plus UWB 定位系統的 REST API 接口規格，用於前端與後端的數據交換。

## 基礎信息

- **Base URL**: `http://localhost:3001/api` (開發環境)
- **Content-Type**: `application/json`
- **認證方式**: Bearer Token (可選)

## 數據模型

### Home (場域)
```typescript
interface Home {
    id: string
    name: string
    description: string
    address: string
    createdAt: string // ISO 8601 格式
}
```

### Floor (樓層)
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
        realWidth: number // 實際寬度(米)
        realHeight: number // 實際高度(米)
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
    createdAt: string // ISO 8601 格式
}
```

## API 端點

### 1. 健康檢查

#### GET /health
檢查服務器狀態

**響應:**
```json
{
    "status": "ok",
    "timestamp": "2025-10-02T15:30:00.000Z"
}
```

### 2. 場域管理 (Homes)

#### GET /homes
獲取所有場域列表

**響應:**
```json
[
    {
        "id": "home_123",
        "name": "陽光養老院",
        "description": "主要養老院場域",
        "address": "台北市信義區信義路五段7號",
        "createdAt": "2025-10-02T15:30:00.000Z"
    }
]
```

#### POST /homes
創建新場域

**請求體:**
```json
{
    "name": "陽光養老院",
    "description": "主要養老院場域",
    "address": "台北市信義區信義路五段7號"
}
```

**響應:**
```json
{
    "id": "home_123",
    "name": "陽光養老院",
    "description": "主要養老院場域",
    "address": "台北市信義區信義路五段7號",
    "createdAt": "2025-10-02T15:30:00.000Z"
}
```

#### GET /homes/{id}
獲取指定場域詳情

**響應:**
```json
{
    "id": "home_123",
    "name": "陽光養老院",
    "description": "主要養老院場域",
    "address": "台北市信義區信義路五段7號",
    "createdAt": "2025-10-02T15:30:00.000Z"
}
```

#### PUT /homes/{id}
更新場域信息

**請求體:**
```json
{
    "name": "陽光養老院 (更新)",
    "description": "更新後的描述",
    "address": "台北市信義區信義路五段7號"
}
```

**響應:**
```json
{
    "id": "home_123",
    "name": "陽光養老院 (更新)",
    "description": "更新後的描述",
    "address": "台北市信義區信義路五段7號",
    "createdAt": "2025-10-02T15:30:00.000Z"
}
```

#### DELETE /homes/{id}
刪除場域

**響應:**
```json
{
    "message": "場域刪除成功"
}
```

### 3. 樓層管理 (Floors)

#### GET /floors
獲取所有樓層列表

**查詢參數:**
- `homeId` (可選): 篩選指定場域的樓層

**響應:**
```json
[
    {
        "id": "floor_123",
        "homeId": "home_123",
        "name": "一樓",
        "level": 1,
        "mapImage": "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQ...",
        "dimensions": {
            "width": 800,
            "height": 600,
            "realWidth": 20.0,
            "realHeight": 15.0
        },
        "calibration": {
            "originPixel": { "x": 100, "y": 200 },
            "originCoordinates": { "x": 0, "y": 0 },
            "pixelToMeterRatio": 0.025,
            "scalePoints": {
                "point1": { "x": 100, "y": 200 },
                "point2": { "x": 300, "y": 200 }
            },
            "realDistance": 5.0,
            "isCalibrated": true
        },
        "createdAt": "2025-10-02T15:30:00.000Z"
    }
]
```

#### POST /floors
創建新樓層

**請求體:**
```json
{
    "homeId": "home_123",
    "name": "一樓",
    "level": 1,
    "mapImage": "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQ...",
    "dimensions": {
        "width": 800,
        "height": 600,
        "realWidth": 20.0,
        "realHeight": 15.0
    },
    "calibration": {
        "originPixel": { "x": 0, "y": 0 },
        "pixelToMeterRatio": 0.025,
        "isCalibrated": false
    }
}
```

**響應:**
```json
{
    "id": "floor_123",
    "homeId": "home_123",
    "name": "一樓",
    "level": 1,
    "dimensions": {
        "width": 800,
        "height": 600,
        "realWidth": 20.0,
        "realHeight": 15.0
    },
    "calibration": {
        "originPixel": { "x": 0, "y": 0 },
        "pixelToMeterRatio": 0.025,
        "isCalibrated": false
    },
    "createdAt": "2025-10-02T15:30:00.000Z"
}
```

#### GET /floors/{id}
獲取指定樓層詳情

**響應:**
```json
{
    "id": "floor_123",
    "homeId": "home_123",
    "name": "一樓",
    "level": 1,
    "dimensions": {
        "width": 800,
        "height": 600,
        "realWidth": 20.0,
        "realHeight": 15.0
    },
    "calibration": {
        "originPixel": { "x": 0, "y": 0 },
        "pixelToMeterRatio": 0.025,
        "isCalibrated": true
    },
    "createdAt": "2025-10-02T15:30:00.000Z"
}
```

#### PUT /floors/{id}
更新樓層信息

**請求體:**
```json
{
    "name": "一樓 (更新)",
    "level": 1,
    "dimensions": {
        "width": 800,
        "height": 600,
        "realWidth": 20.0,
        "realHeight": 15.0
    }
}
```

**響應:**
```json
{
    "id": "floor_123",
    "homeId": "home_123",
    "name": "一樓 (更新)",
    "level": 1,
    "dimensions": {
        "width": 800,
        "height": 600,
        "realWidth": 20.0,
        "realHeight": 15.0
    },
    "calibration": {
        "originPixel": { "x": 0, "y": 0 },
        "pixelToMeterRatio": 0.025,
        "isCalibrated": true
    },
    "createdAt": "2025-10-02T15:30:00.000Z"
}
```

#### DELETE /floors/{id}
刪除樓層

**響應:**
```json
{
    "message": "樓層刪除成功"
}
```

## 錯誤處理

### 錯誤響應格式
```json
{
    "error": "錯誤類型",
    "message": "錯誤描述",
    "code": "錯誤代碼"
}
```

### 常見錯誤代碼

| HTTP 狀態碼 | 錯誤代碼 | 描述 |
|-------------|----------|------|
| 400 | BAD_REQUEST | 請求參數錯誤 |
| 404 | NOT_FOUND | 資源不存在 |
| 409 | CONFLICT | 資源衝突 |
| 500 | INTERNAL_ERROR | 服務器內部錯誤 |

### 錯誤響應示例

**400 Bad Request:**
```json
{
    "error": "VALIDATION_ERROR",
    "message": "場域名稱不能為空",
    "code": "BAD_REQUEST"
}
```

**404 Not Found:**
```json
{
    "error": "RESOURCE_NOT_FOUND",
    "message": "場域不存在",
    "code": "NOT_FOUND"
}
```

## 認證

### Bearer Token 認證
```http
Authorization: Bearer <token>
```

### 認證錯誤響應
```json
{
    "error": "UNAUTHORIZED",
    "message": "無效的認證令牌",
    "code": "UNAUTHORIZED"
}
```

## 環境變量

### 前端環境變量
```env
VITE_API_BASE_URL=http://localhost:3001/api
VITE_USE_BACKEND=true
```

### 後端環境變量
```env
PORT=3001
NODE_ENV=development
DB_CONNECTION_STRING=mongodb://localhost:27017/senior-care-plus
```

## 測試

### 使用 curl 測試

**健康檢查:**
```bash
curl -X GET http://localhost:3001/api/health
```

**創建場域:**
```bash
curl -X POST http://localhost:3001/api/homes \
  -H "Content-Type: application/json" \
  -d '{"name":"測試場域","description":"測試描述","address":"測試地址"}'
```

**獲取場域列表:**
```bash
curl -X GET http://localhost:3001/api/homes
```

## 注意事項

1. **數據驗證**: 所有輸入數據都會進行驗證
2. **錯誤處理**: 統一的錯誤響應格式
3. **日誌記錄**: 所有 API 調用都會記錄日誌
4. **CORS 支持**: 已配置跨域請求支持
5. **數據持久化**: 使用 JSON 文件存儲 (測試環境)

## 版本歷史

- **v1.0.0** (2025-10-02): 初始版本，支持場域和樓層管理
