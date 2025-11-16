# 🔄 GitHub + Railway CI/CD 自動部署指南

## 🎯 **目標**

設置完成後，只需要：
```bash
git add .
git commit -m "更新功能"
git push
```

Railway 就會自動部署！🚀

---

## 📋 **一次性設置步驟**

### **步驟 1：在 GitHub 創建倉庫**

1. 訪問：https://github.com/new
2. 填寫資訊：
   - **Repository name**: `SeniorCarePlusBackend`
   - **Description**: `長照機構管理系統後端 API`
   - **Visibility**: `Private`（或 Public）
3. **不要**勾選任何選項（README, .gitignore, license）
4. 點擊 **"Create repository"**

---

### **步驟 2：推送代碼到 GitHub**

複製您的 GitHub 用戶名，然後執行：

```bash
cd /Users/sam/Desktop/work/SeniorCarePlusBackend

# 添加遠程倉庫（替換 YOUR_USERNAME）
git remote add origin https://github.com/YOUR_USERNAME/SeniorCarePlusBackend.git

# 設置主分支
git branch -M main

# 推送代碼
git push -u origin main
```

**如果需要輸入密碼：**
- 用戶名：您的 GitHub 用戶名
- 密碼：使用 **Personal Access Token**（不是密碼）
  - 創建 Token：https://github.com/settings/tokens
  - 權限：選擇 `repo` (Full control of private repositories)

---

### **步驟 3：在 Railway 連接 GitHub 倉庫**

#### **方式 A：使用網頁（推薦）** ⭐

1. 打開您的 Railway 項目：
   ```
   https://railway.com/project/74ce98e3-5733-43bd-bb63-b22e4ae418fa
   ```

2. 點擊 **"+ New"** 按鈕

3. 選擇 **"GitHub Repo"**

4. 如果是第一次：
   - 點擊 **"Configure GitHub App"**
   - 授權 Railway 訪問您的 GitHub
   - 選擇倉庫訪問權限：
     - **All repositories**（所有倉庫）
     - 或 **Only select repositories** → 選擇 `SeniorCarePlusBackend`

5. 選擇 `SeniorCarePlusBackend` 倉庫

6. Railway 會自動：
   - ✅ 檢測 Dockerfile
   - ✅ 連接 PostgreSQL
   - ✅ 開始構建和部署
   - ✅ 生成公開 URL

---

#### **方式 B：使用 CLI**

```bash
cd /Users/sam/Desktop/work/SeniorCarePlusBackend

# 連接到 Railway 項目
npx @railway/cli@latest link

# 選擇您的項目和環境
# Project: test
# Environment: production

# 部署
npx @railway/cli@latest up --detach
```

---

### **步驟 4：配置環境變數（自動）**

Railway 會自動設置：
- ✅ `DATABASE_URL` - 連接到 PostgreSQL
- ✅ `PORT` - 端口號

**可選**：在 Railway 網頁添加其他環境變數：
1. 點擊您的服務
2. 點擊 **"Variables"** 標籤
3. 添加變數：
   ```
   MQTT_BROKER_URI=wss://your-broker.com:8883/mqtt
   MQTT_USER=your_user
   MQTT_PASSWORD=your_password
   ```

---

### **步驟 5：生成公開域名**

1. 在 Railway 服務頁面
2. 點擊 **"Settings"** 標籤
3. 找到 **"Networking"** 區域
4. 點擊 **"Generate Domain"**
5. 記錄域名，例如：
   ```
   https://seniorcareplus-backend-production.up.railway.app
   ```

---

## 🔄 **日常使用：自動 CI/CD**

設置完成後，每次更新只需要：

```bash
cd /Users/sam/Desktop/work/SeniorCarePlusBackend

# 1. 修改代碼...

# 2. 查看更改
git status

# 3. 添加文件
git add .

# 4. 提交
git commit -m "描述您的更改"

# 5. 推送（觸發自動部署）
git push

# Railway 會自動：
# ✅ 檢測新的推送
# ✅ 拉取代碼
# ✅ 構建 Docker 映像
# ✅ 運行測試
# ✅ 部署到生產環境
# ✅ 健康檢查
```

---

## 📊 **查看部署狀態**

### **方式 1：Railway 網頁**

1. 訪問項目頁面
2. 點擊服務
3. 點擊 **"Deployments"** 標籤
4. 查看最新部署：
   - 🔵 **Building** - 正在構建
   - 🟢 **Active** - 部署成功
   - 🔴 **Failed** - 部署失敗

### **方式 2：Railway CLI**

```bash
# 查看部署狀態
npx @railway/cli@latest status

# 查看日誌
npx @railway/cli@latest logs

# 持續監控日誌
npx @railway/cli@latest logs --follow
```

---

## 🧪 **測試部署**

```bash
# 替換為您的 Railway URL
export BACKEND_URL="https://your-app.up.railway.app"

# 1. 健康檢查
curl $BACKEND_URL/health

# 2. 創建養老院
curl -X POST $BACKEND_URL/api/homes \
  -H "Content-Type: application/json" \
  -d '{
    "name": "測試養老院",
    "description": "CI/CD 測試",
    "address": "台北市"
  }'

# 3. 獲取養老院列表
curl $BACKEND_URL/api/homes
```

---

## 🌿 **分支策略（可選）**

### **基礎策略：main 分支自動部署**

```bash
# 開發功能
git checkout -b feature/new-feature
# ... 修改代碼 ...
git commit -m "Add new feature"

# 合併到 main（觸發部署）
git checkout main
git merge feature/new-feature
git push
```

### **進階策略：staging + production**

1. **在 Railway 創建兩個環境**：
   - `staging` - 測試環境
   - `production` - 生產環境

2. **設置分支映射**：
   - `develop` 分支 → `staging` 環境
   - `main` 分支 → `production` 環境

```bash
# 開發功能
git checkout develop
# ... 修改代碼 ...
git push  # 部署到 staging

# 測試通過後，合併到 main
git checkout main
git merge develop
git push  # 部署到 production
```

---

## 🔧 **高級配置**

### **自定義構建命令**

在 Railway 服務設置中：

1. 點擊 **"Settings"**
2. 找到 **"Build Command"**（通常自動檢測）
3. 可以自定義：
   ```bash
   ./gradlew clean build -x test
   ```

### **健康檢查路徑**

Railway 會自動使用 Dockerfile 中的 `HEALTHCHECK`：
```dockerfile
HEALTHCHECK --interval=30s --timeout=3s \
  CMD curl -f http://localhost:8080/health || exit 1
```

---

## 📝 **Git 常用命令**

```bash
# 查看狀態
git status

# 查看更改
git diff

# 查看提交歷史
git log --oneline

# 撤銷更改（未提交）
git checkout -- <file>

# 撤銷上一次提交（保留更改）
git reset --soft HEAD~1

# 強制推送（謹慎使用）
git push --force

# 拉取最新代碼
git pull
```

---

## ❓ **常見問題**

### **Q1: 如何回滾部署？**

**方式 A：Railway 網頁**
1. 進入 Deployments 頁面
2. 找到之前的成功部署
3. 點擊 **"Redeploy"**

**方式 B：Git 回滾**
```bash
# 查看提交歷史
git log --oneline

# 回滾到指定提交
git reset --hard <commit-id>

# 強制推送
git push --force
```

---

### **Q2: 部署失敗怎麼辦？**

1. **查看構建日誌**：
   ```bash
   npx @railway/cli@latest logs
   ```

2. **常見問題**：
   - ❌ Gradle 構建失敗 → 檢查 `build.gradle.kts`
   - ❌ Docker 構建失敗 → 檢查 `Dockerfile`
   - ❌ 應用啟動失敗 → 檢查環境變數

3. **本地測試**：
   ```bash
   # 本地構建 Docker
   docker build -t backend-test .
   
   # 運行
   docker run -p 8080:8080 backend-test
   ```

---

### **Q3: 如何暫停自動部署？**

在 Railway 網頁：
1. 進入服務設置
2. 找到 **"Source"** 區域
3. 暫時斷開倉庫連接

或在 Git 中使用不同的分支：
```bash
# 推送到 dev 分支（不觸發部署）
git push origin dev
```

---

### **Q4: 如何配置 GitHub Actions？**

創建 `.github/workflows/test.yml`：

```yaml
name: Test

on:
  push:
    branches: [ main, develop ]
  pull_request:
    branches: [ main ]

jobs:
  test:
    runs-on: ubuntu-latest
    
    steps:
    - uses: actions/checkout@v3
    
    - name: Set up JDK 17
      uses: actions/setup-java@v3
      with:
        java-version: '17'
        distribution: 'temurin'
    
    - name: Run tests
      run: ./gradlew test
    
    - name: Build
      run: ./gradlew build -x test
```

---

## 🎉 **完成！**

現在您的開發流程是：

```bash
# 1. 開發
vim src/...

# 2. 提交
git add .
git commit -m "Update feature"

# 3. 推送（自動部署）
git push

# 4. 等待 Railway 自動部署（約 2-5 分鐘）

# 5. 測試
curl https://your-app.up.railway.app/health
```

**自動化程度：100%！** 🚀

---

## 📚 **下一步**

- [ ] 設置 staging 環境
- [ ] 配置 GitHub Actions 自動測試
- [ ] 添加 Slack/Discord 部署通知
- [ ] 設置監控和告警
- [ ] 配置自動備份

---

**開始您的第一次自動部署：**

```bash
# 修改 README.md
echo "# 測試 CI/CD" >> README.md

# 提交並推送
git add README.md
git commit -m "Test CI/CD pipeline"
git push

# 觀察 Railway 自動部署！
```


