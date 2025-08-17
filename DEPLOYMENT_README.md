# Senior Care Plus 前端部署指南

> **部署工程師專用文檔**  
> 目標：將React前端部署到雲端，與IoT設備MQTT對接

## 📋 專案概述

### 技術棧
- **前端**: React 18 + TypeScript + Vite
- **UI框架**: Tailwind CSS + Radix UI
- **IoT通信**: MQTT.js + WebSocket Secure
- **部署目標**: 靜態網站托管 (Firebase/Vercel)

### 現有架構
```
IoT設備 → HiveMQ雲端MQTT → React前端 (直連) → 即時數據展示
```

### 核心功能模組
- `UWBLocationPage.tsx` - UWB定位追蹤 (281KB)
- `TemperaturePage.tsx` - 體溫監測 (53KB)  
- `HeartRatePage.tsx` - 心率監測 (54KB)
- `DiaperMonitoringPage.tsx` - 尿布監測 (49KB)
- `EmergencyCallPage.tsx` - 緊急通報 (20KB)

## 🔧 環境要求

### 開發環境
```bash
Node.js >= 16.0.0
npm >= 7.0.0
```

### 雲端服務需求
- **選項1**: Firebase Hosting (推薦)
- **選項2**: Vercel (替代方案)

### 現有MQTT服務
- **Broker**: `067ec32ef1344d3bb20c4e53abdde99a.s1.eu.hivemq.cloud:8883`
- **協議**: WebSocket Secure (WSS)
- **認證**: testweb1 / Aa000000

## 🚀 部署步驟

### 步驟1: 環境準備

#### 1.1 安裝依賴
```bash
cd Senior-Care-Plus-Frontend
npm install
```

#### 1.2 安裝部署工具
```bash
# Firebase CLI (推薦)
npm install -g firebase-tools

# 或 Vercel CLI (替代)
npm install -g vercel
```

### 步驟2: 雲端服務設定

#### 選項A: Firebase 設定 (推薦)

**2.1 創建Firebase專案**
```bash
# 登入Firebase
firebase login

# 初始化專案
firebase init hosting
```

**設定選項:**
- Project: 創建新專案 `senior-care-plus`
- Public directory: `dist`
- Single-page app: `Yes`
- Overwrite index.html: `No`

#### 選項B: Vercel 設定 (替代)

```bash
# 登入Vercel
vercel login

# 準備部署 (稍後執行)
```

### 步驟3: 環境變數配置

#### 3.1 創建環境檔案

**創建 `.env.production`**
```env
# MQTT 連接設定
VITE_MQTT_BROKER=067ec32ef1344d3bb20c4e53abdde99a.s1.eu.hivemq.cloud
VITE_MQTT_PORT=8883
VITE_MQTT_PROTOCOL=wss
VITE_MQTT_USERNAME=testweb1
VITE_MQTT_PASSWORD=Aa000000

# Gateway ID (需根據實際情況調整)
VITE_GATEWAY_ID=16B8

# 應用設定
VITE_APP_NAME=Senior Care Plus
VITE_APP_VERSION=1.0.0
```

#### 3.2 修改硬編碼配置

**需要修改的檔案和位置:**

1. **src/pages/DiaperMonitoringPage.tsx (第30行)**
   ```typescript
   // 修改前
   const CLOUD_MQTT_TOPIC = "UWB/GW16B8_Health"
   
   // 修改後
   const CLOUD_MQTT_TOPIC = `UWB/GW${import.meta.env.VITE_GATEWAY_ID}_Health`
   ```

2. **src/pages/LocationPage.tsx (第13行)**
   ```typescript
   // 修改前
   const MQTT_TOPICS = ["UWB/GW16B8_Loca", "UWB/GWCF18_Loca"]
   
   // 修改後
   const MQTT_TOPICS = [`UWB/GW${import.meta.env.VITE_GATEWAY_ID}_Loca`]
   ```

3. **src/pages/TemperaturePage.tsx (第18行)**
   ```typescript
   // 修改前
   const CLOUD_MQTT_TOPIC = "UWB/GW16B8_Health"
   
   // 修改後
   const CLOUD_MQTT_TOPIC = `UWB/GW${import.meta.env.VITE_GATEWAY_ID}_Health`
   ```

4. **src/pages/HeartRatePage.tsx (第18行)**
   ```typescript
   // 修改前
   const CLOUD_MQTT_TOPIC = "UWB/GW16B8_Health"
   
   // 修改後
   const CLOUD_MQTT_TOPIC = `UWB/GW${import.meta.env.VITE_GATEWAY_ID}_Health`
   ```

5. **tool/anchor_trasmitt.py (第11行)**
   ```python
   # 修改前
   MQTT_TOPIC = "UWB/GW16B8_Dwlink"
   
   # 修改後 (或改為讀取環境變數)
   MQTT_TOPIC = "UWB/GW{GATEWAY_ID}_Dwlink".format(GATEWAY_ID=os.getenv('GATEWAY_ID', '16B8'))
   ```

### 步驟4: 本地測試

#### 4.1 啟動開發伺服器
```bash
npm run dev
```

#### 4.2 驗證檢查點
- [ ] 應用在 `http://localhost:5173` 正常啟動
- [ ] 瀏覽器Console無錯誤訊息
- [ ] MQTT連接狀態顯示為"已連接"
- [ ] 能夠接收到IoT設備數據

#### 4.3 MQTT連接測試
打開瀏覽器開發者工具，確認Console顯示:
```
✅ MQTT連接成功
📡 已訂閱主題: UWB/+/Message
📡 已訂閱主題: UWB/+/Loca
📡 已訂閱主題: UWB/+/Health
📨 收到消息 [UWB/GW16B8_Message]: {...}
```

### 步驟5: 建置和部署

#### 5.1 建置專案
```bash
npm run build
```

**驗證建置成功:**
- [ ] `dist/` 目錄已生成
- [ ] 建置過程無錯誤
- [ ] `dist/index.html` 存在

#### 5.2 部署到雲端

**Firebase 部署:**
```bash
firebase deploy
```

**Vercel 部署:**
```bash
vercel --prod
```

#### 5.3 雲端環境變數設定

**Firebase:**
1. 無需額外設定 (環境變數已在建置時包含)

**Vercel:**
1. 登入 [Vercel Dashboard](https://vercel.com/dashboard)
2. 選擇專案 → Settings → Environment Variables
3. 添加所有 `VITE_` 開頭的變數
4. 重新部署: `vercel --prod`

## ✅ 部署後驗證

### 功能測試清單

#### 基本功能
- [ ] 網站可正常訪問 (HTTPS)
- [ ] 首頁載入時間 < 3秒
- [ ] 響應式設計在手機端正常

#### MQTT連接測試
- [ ] MQTT連接狀態顯示"已連接"
- [ ] 能夠收到即時IoT數據
- [ ] 數據更新延遲 < 2秒

#### 核心頁面測試
- [ ] UWB定位頁面: 顯示anchor位置和TAG定位
- [ ] 健康監測頁面: 顯示體溫、心率數據
- [ ] 緊急通報頁面: 按鈕功能正常
- [ ] 設備管理頁面: 列表顯示正常

### 效能指標
- **首頁載入**: < 3秒
- **MQTT連接**: < 5秒  
- **數據更新**: < 2秒延遲
- **Lighthouse分數**: > 90

## 🔧 故障排除

### 常見問題

#### 1. MQTT連接失敗
**症狀**: Console顯示 "❌ MQTT連接錯誤"

**檢查項目:**
- [ ] 環境變數 `VITE_MQTT_*` 設定正確
- [ ] 網站使用 HTTPS (WSS要求)
- [ ] 防火牆未阻擋8883端口

**解決方案:**
```javascript
// 檢查連接URL格式
console.log(`連接URL: wss://${MQTT_CONFIG.broker}:${MQTT_CONFIG.port}/mqtt`);
```

#### 2. 無法接收IoT數據
**症狀**: MQTT已連接但無數據

**檢查項目:**
- [ ] Gateway ID是否正確
- [ ] IoT設備是否在線
- [ ] 主題名稱格式是否匹配

**除錯方法:**
```bash
# 使用tool/anchor_recieve.py測試
cd tool
python anchor_recieve.py
```

#### 3. 建置失敗
**症狀**: `npm run build` 出錯

**常見原因:**
- TypeScript 類型錯誤
- 缺少環境變數
- 依賴版本衝突

**解決方案:**
```bash
# 清除快取重新安裝
rm -rf node_modules package-lock.json
npm install
npm run build
```

#### 4. 部署後環境變數無效
**症狀**: 雲端環境無法連接MQTT

**Vercel解決方案:**
1. 確認環境變數已添加到Vercel Dashboard
2. 變數名稱必須以 `VITE_` 開頭
3. 重新部署專案

**Firebase解決方案:**
1. 確認 `.env.production` 存在於專案根目錄
2. 重新執行 `npm run build && firebase deploy`

## 📊 監控和維護

### 效能監控
```bash
# 安裝Lighthouse CLI
npm install -g @lhci/cli

# 執行效能測試
lhci autorun --upload.target=temporary-public-storage
```

### 日誌監控
- **Firebase**: Firebase Console → Hosting → 使用情況
- **Vercel**: Vercel Dashboard → Functions → 日誌

### 定期檢查項目
- [ ] SSL憑證狀態 (自動更新)
- [ ] MQTT連接穩定性
- [ ] IoT設備在線狀態
- [ ] 網站載入效能

## 📞 支援資訊

### 重要聯絡人
- **IoT設備負責人**: [聯絡資訊]
- **前端開發團隊**: [聯絡資訊]

### 相關文檔
- [HiveMQ文檔](https://www.hivemq.com/docs/)
- [Firebase Hosting指南](https://firebase.google.com/docs/hosting)
- [Vercel部署指南](https://vercel.com/docs)

### 緊急處理
1. **服務中斷**: 檢查雲端服務狀態頁面
2. **MQTT中斷**: 聯絡IoT設備負責人
3. **數據異常**: 查看瀏覽器Console錯誤

---

**部署完成檢查列表:**
- [ ] 雲端網站可正常訪問
- [ ] MQTT連接正常
- [ ] IoT數據即時更新
- [ ] 所有功能頁面正常
- [ ] 監控設定完成
- [ ] 文檔交接完成

**預估部署時間**: 2-4小時  
**技術難度**: 中等  
**維護頻率**: 週檢查

---
*最後更新: 2025年1月*  
*版本: v1.0* 