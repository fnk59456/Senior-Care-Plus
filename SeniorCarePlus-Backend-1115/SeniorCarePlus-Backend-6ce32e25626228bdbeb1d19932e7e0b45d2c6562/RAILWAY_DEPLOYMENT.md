# 🚂 Railway 部署指南

## 📋 部署步驟

### 1️⃣ 準備 Railway 帳戶

1. 前往 [Railway.app](https://railway.app/)
2. 使用 GitHub 帳戶登入
3. 免費方案：每月 $5 USD 額度（500 小時運行時間）

---

### 2️⃣ 創建 PostgreSQL 數據庫

1. 登入 Railway Dashboard
2. 點擊 **"New Project"**
3. 選擇 **"Provision PostgreSQL"**
4. 等待數據庫創建完成（約 1 分鐘）

5. 進入 PostgreSQL 服務，找到 **"Variables"** 標籤
6. 記錄以下變數（稍後需要）：
   ```
   DATABASE_URL=postgresql://postgres:xxx@xxx.railway.app:5432/railway
   PGHOST=xxx.railway.app
   PGPORT=5432
   PGUSER=postgres
   PGPASSWORD=xxx
   PGDATABASE=railway
   ```

---

### 3️⃣ 部署後端應用

#### 方式 A：使用 Railway CLI（推薦）⭐

```bash
# 1. 安裝 Railway CLI
npm i -g @railway/cli

# 2. 登入 Railway
railway login

# 3. 在後端目錄初始化項目
cd /Users/sam/Desktop/work/SeniorCarePlusBackend
railway init

# 4. 連接到剛才創建的 PostgreSQL 項目
railway link

# 5. 設置環境變數
railway variables set DATABASE_URL="postgresql://postgres:xxx@xxx.railway.app:5432/railway"
railway variables set PORT=8080

# 6. 部署應用
railway up
```

---

#### 方式 B：使用 GitHub（自動部署）

1. **推送代碼到 GitHub**
   ```bash
   cd /Users/sam/Desktop/work/SeniorCarePlusBackend
   git init
   git add .
   git commit -m "Initial commit for Railway deployment"
   git remote add origin https://github.com/YOUR_USERNAME/SeniorCarePlusBackend.git
   git push -u origin main
   ```

2. **在 Railway 連接 GitHub**
   - 回到 Railway Dashboard
   - 在同一個 Project 中點擊 **"New Service"**
   - 選擇 **"GitHub Repo"**
   - 選擇您的 `SeniorCarePlusBackend` 倉庫
   - Railway 會自動檢測到 Dockerfile 並開始構建

3. **設置環境變數**
   - 進入新創建的服務
   - 點擊 **"Variables"** 標籤
   - 添加以下變數：
     ```
     DATABASE_URL=${{Postgres.DATABASE_URL}}
     PORT=8080
     ```
   - Railway 會自動將 PostgreSQL 的 `DATABASE_URL` 連接到您的應用

4. **設置域名**
   - 點擊 **"Settings"** 標籤
   - 找到 **"Domains"** 區域
   - 點擊 **"Generate Domain"**
   - 記錄生成的域名，例如：`seniorcareplus-backend.up.railway.app`

---

### 4️⃣ 驗證部署

1. **檢查健康狀態**
   ```bash
   curl https://your-app.up.railway.app/health
   ```
   
   預期輸出：
   ```json
   {
     "status": "healthy",
     "service": "SeniorCarePlus Backend",
     "timestamp": 1234567890
   }
   ```

2. **測試 API**
   ```bash
   # 獲取所有場域
   curl https://your-app.up.railway.app/api/homes
   
   # 創建場域
   curl -X POST https://your-app.up.railway.app/api/homes \
     -H "Content-Type: application/json" \
     -d '{"name":"測試養老院","description":"測試用","address":"台北市"}'
   ```

---

### 5️⃣ 更新前端配置

在前端項目中創建 `.env` 文件：

```bash
cd /Users/sam/Desktop/work/Senior-Care-Plus

# 創建 .env 文件
cat > .env << EOF
VITE_API_BASE_URL=https://your-app.up.railway.app/api
EOF
```

然後重新啟動前端：
```bash
npm run dev
```

---

## 📊 成本估算

**Railway 免費方案：**
- ✅ $5 USD/月 額度（約 NT$155）
- ✅ 500 小時運行時間/月
- ✅ 512MB RAM
- ✅ 1GB 存儲空間
- ✅ PostgreSQL 數據庫（1GB）

**如果超出免費額度：**
- 💰 後端應用：~$5-10/月
- 💰 PostgreSQL：~$5-10/月
- **總計：約 $10-20/月（NT$310-620）**

---

## 🔧 常見問題

### Q1: 部署失敗，顯示 "Out of memory"
**A:** 調整 Dockerfile 中的 JVM 參數：
```dockerfile
ENV JAVA_OPTS="-Xms128m -Xmx256m -XX:+UseSerialGC"
```

### Q2: 數據庫連接失敗
**A:** 確認環境變數設置正確：
```bash
railway variables
```

### Q3: 如何查看日誌？
**A:** 
```bash
railway logs
```
或在 Railway Dashboard 的 "Deployments" 標籤查看。

### Q4: 如何重新部署？
**A:**
```bash
railway up --detach
```

---

## 📝 下一步

部署完成後：
1. ✅ 測試前端可以連接到 Railway 後端
2. ✅ 在 `FieldManagementTest` 頁面測試新增/修改養老院和樓層
3. ✅ 確認不同電腦打開網頁看到的數據是一致的
4. ✅ 未來可以遷移到 Google Cloud Run（步驟類似）


