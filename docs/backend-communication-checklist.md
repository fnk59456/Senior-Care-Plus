# 與後端工程師溝通檢查清單

## 📋 溝通前準備

### 1. 技術文檔準備
- [ ] 技術規格文檔 (`backend-integration-spec.md`)
- [ ] API接口設計文檔
- [ ] 數據庫設計建議
- [ ] MQTT主題結構定義
- [ ] 錯誤處理規範

### 2. 測試環境準備
- [ ] 測試服務器腳本 (`test-backend-server.js`)
- [ ] 前端測試腳本 (`backendTestScript.ts`)
- [ ] 測試指南文檔 (`testing-guide.md`)
- [ ] 示例數據和測試用例

### 3. 項目信息整理
- [ ] 項目背景和目標
- [ ] 現有技術棧
- [ ] 預期功能需求
- [ ] 性能要求
- [ ] 安全要求

## 🗣️ 溝通要點

### 1. 項目概述
```
項目名稱: Senior Care Plus - 養老院管理系統
前端技術: React + TypeScript + Vite
通信方式: REST API + MQTT
數據格式: JSON
目標: 實現養老院設備管理和實時位置追蹤
```

### 2. API需求清單
```
必須實現的API:
✅ 場域管理 (homes)
  - POST /api/homes (創建)
  - GET /api/homes (列表)
  - GET /api/homes/:id (詳情)
  - PUT /api/homes/:id (更新)
  - DELETE /api/homes/:id (刪除)

✅ 樓層管理 (floors)
  - POST /api/floors (創建)
  - GET /api/homes/:homeId/floors (列表)
  - PUT /api/floors/:id (更新)
  - DELETE /api/floors/:id (刪除)

✅ 設備管理 (devices)
  - 網關 (gateways)
  - 錨點 (anchors)
  - 標籤 (tags)

✅ 認證系統
  - POST /api/auth/login
  - JWT token 驗證
  - 權限控制
```

### 3. MQTT需求清單
```
必須支持的主題:
✅ 位置數據: UWB/location/{tagId}
✅ 設備狀態: UWB/device/{deviceId}/status
✅ 設備配置: UWB/device/{deviceId}/config
✅ 網關健康: UWB/gateway/{gatewayId}/health

消息格式: JSON
QoS等級: 1 (至少一次送達)
保留消息: 設備配置需要保留
```

### 4. 數據庫設計需求
```
必須的表結構:
✅ homes (場域表)
✅ floors (樓層表)
✅ devices (設備表)
✅ users (用戶表)
✅ location_history (位置歷史表)

數據類型支持:
✅ JSON字段 (設備配置、位置數據)
✅ 時間戳字段
✅ 外鍵關聯
✅ 索引優化
```

## 📊 技術規格要求

### 1. 性能要求
- [ ] API響應時間 < 200ms
- [ ] 支持100+並發用戶
- [ ] MQTT消息延遲 < 100ms
- [ ] 數據庫查詢優化

### 2. 安全要求
- [ ] JWT token認證
- [ ] HTTPS加密
- [ ] 輸入數據驗證
- [ ] SQL注入防護
- [ ] CORS配置

### 3. 錯誤處理
- [ ] 標準HTTP狀態碼
- [ ] 統一錯誤響應格式
- [ ] 詳細錯誤信息
- [ ] 日誌記錄

## 🔄 開發流程建議

### 階段1: 基礎API (1-2週)
```
優先級: 高
內容:
- 場域CRUD操作
- 樓層CRUD操作
- 基礎認證
- 數據驗證

驗收標準:
- 所有API端點正常響應
- 數據格式正確
- 錯誤處理完善
```

### 階段2: 設備管理 (1-2週)
```
優先級: 高
內容:
- 網關管理
- 錨點管理
- 標籤管理
- 設備狀態更新

驗收標準:
- 設備CRUD操作正常
- 狀態同步準確
- 關聯關係正確
```

### 階段3: MQTT整合 (1週)
```
優先級: 中
內容:
- MQTT服務器配置
- 主題訂閱發布
- 消息格式標準化
- 實時數據處理

驗收標準:
- MQTT連接穩定
- 消息傳輸正常
- 數據格式一致
```

### 階段4: 高級功能 (1-2週)
```
優先級: 低
內容:
- 位置歷史記錄
- 數據分析API
- 報表生成
- 性能優化

驗收標準:
- 功能完整可用
- 性能達標
- 用戶體驗良好
```

## 🧪 測試和驗收

### 1. 測試環境
```
開發環境: http://localhost:3001/api
測試環境: http://test-api.seniorcare.com/api
生產環境: http://api.seniorcare.com/api

MQTT代理:
開發: ws://localhost:8083/mqtt
測試: ws://test-mqtt.seniorcare.com/mqtt
生產: wss://mqtt.seniorcare.com/mqtt
```

### 2. 測試用例
- [ ] 單元測試覆蓋率 > 80%
- [ ] 集成測試通過
- [ ] 性能測試達標
- [ ] 安全測試通過
- [ ] 用戶驗收測試

### 3. 文檔要求
- [ ] API文檔 (Swagger/OpenAPI)
- [ ] 數據庫設計文檔
- [ ] 部署指南
- [ ] 維護手冊

## 📞 溝通方式建議

### 1. 定期會議
- 週一: 需求確認會議
- 週三: 進度檢查會議
- 週五: 問題討論會議

### 2. 溝通工具
- 即時通訊: Slack/Teams
- 代碼協作: GitHub/GitLab
- 文檔共享: Notion/Confluence
- 問題追蹤: Jira/Trello

### 3. 文檔更新
- API變更及時通知
- 數據庫變更記錄
- 部署日誌維護
- 問題解決記錄

## 🎯 成功標準

### 技術標準
- [ ] 所有API端點正常運行
- [ ] MQTT通信穩定可靠
- [ ] 數據一致性保證
- [ ] 性能指標達標
- [ ] 安全要求滿足

### 業務標準
- [ ] 功能需求完整實現
- [ ] 用戶體驗良好
- [ ] 系統穩定可靠
- [ ] 維護成本合理
- [ ] 擴展性良好

## 📝 後續跟進

### 1. 開發過程
- 每日進度更新
- 問題及時反饋
- 變更需求記錄
- 測試結果分享

### 2. 上線準備
- 部署環境準備
- 監控系統配置
- 備份策略制定
- 應急預案準備

### 3. 維護支持
- 技術文檔完善
- 知識轉移培訓
- 問題處理流程
- 持續改進計劃
