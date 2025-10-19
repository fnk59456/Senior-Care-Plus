# 後端串接測試指南

## 🎯 測試目標
驗證前端與後端的API和MQTT通信是否正常工作。

## 📋 測試準備

### 1. 安裝依賴
```bash
# 安裝測試服務器依賴
npm install express cors mqtt uuid

# 或使用yarn
yarn add express cors mqtt uuid
```

### 2. 啟動MQTT代理
```bash
# 使用Docker啟動MQTT代理
docker run -it -p 8083:8083 -p 1883:1883 eclipse-mosquitto:2.0

# 使用本地安裝的Mosquitto
##將本專案目錄底下的"mosquitto.conf"覆蓋安裝位置(如 C:\Program Files\mosquitto\mosquitto.conf)
mosquitto.exe -c mosquitto.conf -v
```

### 3. 啟動測試服務器
```bash
# 啟動REST API + MQTT測試服務器
node test-backend-with-db.js
```

## 🧪 測試步驟

### 步驟1: 驗證服務器連接
```bash
# 測試REST API健康檢查
curl http://localhost:3001/api/health

# 預期響應:
{
  "status": "OK",
  "timestamp": "2024-01-15T10:30:00.000Z",
  "message": "測試服務器正常運行"
}
```

### 步驟2: 測試REST API
```bash
# 創建場域
curl -X POST http://localhost:3001/api/homes \
  -H "Content-Type: application/json" \
  -d '{
    "name": "測試養老院",
    "description": "用於測試的養老院",
    "address": "台北市測試區測試路123號"
  }'

# 獲取場域列表
curl http://localhost:3001/api/homes

# 更新場域
curl -X PUT http://localhost:3001/api/homes/{home_id} \
  -H "Content-Type: application/json" \
  -d '{
    "name": "測試養老院 - 已更新",
    "description": "更新後的描述"
  }'

# 刪除場域
curl -X DELETE http://localhost:3001/api/homes/{home_id}
```

### 步驟3: 測試MQTT通信
```bash
# 使用MQTT客戶端訂閱主題
mosquitto_sub -h localhost -p 8083 -t "UWB/location/+"

# 在另一個終端發布測試消息
mosquitto_pub -h localhost -p 8083 -t "UWB/location/test_tag_001" \
  -m '{
    "tagId": "test_tag_001",
    "position": {"x": 10.5, "y": 20.3, "z": 0},
    "timestamp": "2024-01-15T10:30:00Z",
    "floorId": "floor_123"
  }'
```

### 步驟4: 運行自動化測試
```bash
# 運行前端測試腳本
npx ts-node src/test/backendTestScript.ts

# 或在瀏覽器控制台運行
const tester = new BackendIntegrationTester()
await tester.runAllTests()
```

## 📊 測試結果解讀

### REST API 測試結果
```
🧪 開始API測試...
✅ 服務器連接: 服務器正常運行
✅ 創建場域: 成功創建場域: home_123
✅ 獲取場域列表: 成功獲取 1 個場域
✅ 更新場域: 成功更新場域
✅ 刪除場域: 成功刪除場域

📊 API測試結果:
==================================================
✅ 通過: 5
❌ 失敗: 0
⏭️ 跳過: 0
📈 成功率: 100%
```

### MQTT 測試結果
```
🧪 開始MQTT測試...
✅ MQTT連接: 成功連接到MQTT代理
✅ MQTT發布: 成功發布測試消息
✅ MQTT訂閱: 成功訂閱位置主題
✅ MQTT訂閱: 成功訂閱設備狀態主題
✅ MQTT消息處理: 成功處理消息: UWB/location/test_tag_001

📊 MQTT測試結果:
==================================================
✅ 通過: 5
❌ 失敗: 0
⏭️ 跳過: 0
📈 成功率: 100%
```

## 🐛 常見問題排查

### 問題1: REST API連接失敗
**錯誤**: `連接失敗: fetch failed`
**解決方案**:
1. 確認測試服務器已啟動 (`node test-backend-server.js`)
2. 檢查端口3001是否被占用
3. 確認防火牆設置

### 問題2: MQTT連接失敗
**錯誤**: `MQTT連接失敗: Connection refused`
**解決方案**:
1. 確認MQTT代理已啟動
2. 檢查端口8083是否開放
3. 確認MQTT代理配置正確

### 問題3: CORS錯誤
**錯誤**: `CORS policy: No 'Access-Control-Allow-Origin'`
**解決方案**:
1. 確認測試服務器已啟用CORS
2. 檢查請求頭設置
3. 確認前端請求URL正確

## 📝 測試報告模板

### 測試環境
- 操作系統: Windows 10
- Node.js版本: v18.17.0
- 瀏覽器: Chrome 120.0.0.0
- MQTT代理: Eclipse Mosquitto 2.0

### 測試結果
| 測試項目 | 狀態 | 備註 |
|---------|------|------|
| REST API連接 | ✅ 通過 | 服務器正常響應 |
| 場域CRUD操作 | ✅ 通過 | 所有操作正常 |
| MQTT連接 | ✅ 通過 | 成功連接代理 |
| 消息發布訂閱 | ✅ 通過 | 消息傳輸正常 |
| 數據格式驗證 | ✅ 通過 | JSON格式正確 |

### 建議
1. 後端API接口設計符合規格
2. MQTT通信穩定可靠
3. 可以開始正式開發

## 🔧 自定義測試

### 添加新的API測試
```typescript
// 在APITester類中添加新測試
private async testCustomAPI() {
    try {
        const response = await fetch(`${this.baseURL}/custom-endpoint`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ test: 'data' })
        })

        if (response.ok) {
            this.addResult('自定義API', 'PASS', '測試成功')
        } else {
            this.addResult('自定義API', 'FAIL', `HTTP ${response.status}`)
        }
    } catch (error) {
        this.addResult('自定義API', 'FAIL', `請求失敗: ${error}`)
    }
}
```

### 添加新的MQTT測試
```typescript
// 在MQTTTester類中添加新測試
private async testCustomMQTT() {
    if (!this.client?.connected) return

    this.client.publish('custom/topic', JSON.stringify({
        message: 'test',
        timestamp: Date.now()
    }), { qos: 1 })

    this.addResult('自定義MQTT', 'PASS', '消息發布成功')
}
```

## 📞 聯繫支持
如果測試過程中遇到問題，請提供：
1. 錯誤日誌截圖
2. 測試環境信息
3. 具體的錯誤信息
4. 已嘗試的解決方案
