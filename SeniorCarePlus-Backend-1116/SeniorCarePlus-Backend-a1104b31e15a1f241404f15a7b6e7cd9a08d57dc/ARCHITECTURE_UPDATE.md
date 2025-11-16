# 🚀 SeniorCarePlus 架構重大更新

## 📋 **更新概述**

本次更新將系統架構從 **直連模式** 升級為 **後端代理模式**，實現更安全、可控的數據流管理。

---

## 🔄 **架構轉換對比**

### **🔴 原架構 (Before)**
```
遠端MQTT服務器 → App直接接收
     ↓
  數據缺乏處理
  無統一管理
  無歷史記錄
```

### **🟢 新架構 (After)** 
```
遠端MQTT → 後端接收 → 數據庫存儲 → 後端MQTT發布 → App接收
                ↓              ↓
           數據處理與驗證    統一數據管理
           警報生成        歷史記錄
           多設備聚合      實時分析
```

---

## 🏗️ **新架構組件**

### **🔧 後端MQTT服務 (雙向)**

#### **接收端 (Receiver)**
- **服務器**: `wss://067ec32ef1344d3bb20c4e53abdde99a.s1.eu.hivemq.cloud:8884/mqtt`
- **用戶**: `testweb1` / `Aa000000`
- **主題**: 
  - `UWB/GW16B8_Loca` (位置數據)
  - `health/heart_rate/+` (心率數據)
  - `health/temperature/+` (體溫數據)
  - `health/diaper/+` (尿布數據)
  - `health/alert/+` (警報數據)

#### **發布端 (Publisher)**
- **服務器**: `wss://067ec32ef1344d3bb20c4e53abdde99a.s1.eu.hivemq.cloud:8884/mqtt`
- **用戶**: `backend_server` / `Backend123`
- **主題**:
  - `backend/location` (處理後的位置數據)
  - `backend/heart_rate` (處理後的心率數據)
  - `backend/temperature` (處理後的體溫數據)
  - `backend/diaper` (處理後的尿布數據)
  - `backend/alert` (警報通知)
  - `backend/health_status` (健康狀態匯總)

### **📱 App MQTT配置更新**

#### **新配置選項**
```kotlin
// 配置選擇：優先使用後端處理的數據
var USE_BACKEND_SERVER = true
var USE_REMOTE_SERVER = false

// 後端服務器配置
const val MQTT_BACKEND_SERVER_URI = "wss://067ec32ef1344d3bb20c4e53abdde99a.s1.eu.hivemq.cloud:8884/mqtt"
const val MQTT_BACKEND_USER = "backend_server"
const val MQTT_BACKEND_PASSWORD = "Backend123"
```

#### **智能主題訂閱**
App現在訂閱多個後端主題，根據數據類型自動處理：
- ✅ 位置追蹤數據
- ✅ 心率監測數據
- ✅ 體溫監測數據
- ✅ 尿布狀態數據
- ✅ 實時警報通知
- ✅ 健康狀態匯總

---

## 🔧 **核心功能增強**

### **🎯 數據處理流程**

1. **接收原始數據** 
   - 從各IoT設備接收MQTT數據
   - 支援UWB位置、心率、體溫、尿布感測器

2. **數據解析與驗證**
   - JSON格式解析與驗證
   - UWB標籤ID到患者ID的智能映射
   - 數據品質檢查

3. **數據庫存儲**
   - 持久化存儲到H2數據庫
   - 結構化健康記錄管理
   - 位置追蹤歷史記錄

4. **智能警報生成**
   ```kotlin
   // 體溫警報邏輯
   when {
       temp >= 39.0 -> "high_fever" (緊急)
       temp >= 38.0 -> "fever" (警告)
       temp <= 35.0 -> "hypothermia" (警告)
   }
   
   // 尿布警報
   if (status == "wet" || status == "soiled") {
       createAlert("diaper", "需要更換")
   }
   ```

5. **數據轉發給App**
   - 標準化數據格式
   - 實時MQTT推送
   - 多主題分類發送

### **📊 定期狀態推送**

後端每30秒自動發送健康狀態匯總：
```json
{
  "timestamp": 1640995200,
  "status": "active", 
  "patients": [
    {
      "patientId": "device_001",
      "name": "患者姓名",
      "room": "房間號",
      "lastUpdate": "2025-01-20T10:30:00"
    }
  ],
  "totalPatients": 2
}
```

---

## 📁 **修改文件列表**

### **🔧 後端修改**
```
SeniorCarePlusBackend/
├── src/main/kotlin/com/seniorcareplus/services/MqttService.kt
│   ├── ✅ 雙MQTT客戶端 (接收+發布)
│   ├── ✅ 多主題數據處理
│   ├── ✅ 智能警報生成
│   ├── ✅ 定期健康狀態發布
│   └── ✅ App數據轉發功能
```

### **📱 App修改**
```
SeniorCarePlus/app/src/main/java/com/seniorcareplus/app/mqtt/
├── MqttConstants.kt
│   ├── ✅ 後端服務器配置
│   ├── ✅ 多主題定義
│   └── ✅ 智能配置切換
├── MqttService.kt
│   ├── ✅ 後端主題訂閱
│   ├── ✅ 多數據類型處理
│   ├── ✅ 後端數據解析
│   └── ✅ 新數據類定義
```

---

## 🌟 **新功能亮點**

### **🔍 實時監控能力**
- ✅ **UWB位置追蹤**: 6天累積129MB數據
- ✅ **心率監測**: 實時心率數據處理
- ✅ **體溫監控**: 自動發燒/低溫警報
- ✅ **尿布狀態**: 智能更換提醒

### **🚨 智能警報系統**
- ✅ **體溫異常**: 發燒/低溫自動檢測
- ✅ **尿布提醒**: 濕潤/污染狀態警報
- ✅ **多級警報**: emergency/warning/info
- ✅ **即時推送**: 警報立即發送到App

### **📈 數據管理優勢**
- ✅ **歷史記錄**: 完整的健康數據歷史
- ✅ **數據聚合**: 多設備數據統一管理
- ✅ **品質控制**: 數據驗證與過濾
- ✅ **離線緩存**: 網絡中斷時數據不丟失

---

## 🚀 **部署與測試**

### **🔧 啟動後端**
```bash
cd SeniorCarePlusBackend
./gradlew run
```

### **📱 配置App**
```kotlin
// 在 MqttConstants.kt 中
MqttConstants.USE_BACKEND_SERVER = true
```

### **✅ 驗證連接**
```bash
# 檢查後端MQTT連接
curl http://localhost:8080/health

# 查看日誌
tail -f logs/seniorcareplus.log
```

---

## 🔮 **未來擴展**

### **短期計劃**
- [ ] PostgreSQL雲端數據庫遷移
- [ ] WebSocket實時數據流
- [ ] REST API完善
- [ ] 更多IoT設備集成

### **中期目標**
- [ ] AI健康預測分析
- [ ] 多租戶支持
- [ ] 家屬通知系統
- [ ] 醫護人員儀表板

---

## 📞 **技術支援**

- **GitHub**: https://github.com/sam9407287/SeniorCarePlus-Backend
- **架構更新日期**: 2025/01/20
- **版本**: v1.1.0 (MQTT代理模式)

---

**🎉 恭喜！您的老人照護系統現在具備了企業級的數據管理能力！** 