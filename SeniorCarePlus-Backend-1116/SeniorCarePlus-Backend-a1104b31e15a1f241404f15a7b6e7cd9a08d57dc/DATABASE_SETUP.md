# 數據庫設置指南

## 🚀 推薦：Supabase PostgreSQL（免費）

### 步驟1：註冊Supabase
1. 前往 https://supabase.com
2. 註冊免費帳戶
3. 創建新項目（選擇離您最近的地區）

### 步驟2：獲取連接信息
1. 在項目控制台，進入 **Settings** > **Database**
2. 在 **Connection string** 部分找到 **URI** 格式的連接字符串
3. 記下以下信息：
   - Host: `db.xxxxxxx.supabase.co`
   - Database: `postgres`  
   - User: `postgres`
   - Password: 您設置的密碼

### 步驟3：設置環境變量

#### 方式1：導出環境變量（推薦）
```bash
export SUPABASE_DATABASE_URL="jdbc:postgresql://db.xxxxxxx.supabase.co:5432/postgres"
export SUPABASE_USER="postgres"
export SUPABASE_PASSWORD="your_password_here"
```

#### 方式2：修改系統環境變量
在您的 `~/.zshrc` 或 `~/.bash_profile` 中添加：
```bash
export SUPABASE_DATABASE_URL="jdbc:postgresql://db.xxxxxxx.supabase.co:5432/postgres"
export SUPABASE_USER="postgres"  
export SUPABASE_PASSWORD="your_password_here"
```

### 步驟4：重啟後端服務
```bash
cd SeniorCarePlusBackend
./gradlew run
```

## 🔧 其他選項

### Neon（無服務器PostgreSQL）
1. 註冊 https://neon.tech
2. 創建項目
3. 設置環境變量：
```bash
export DATABASE_URL="jdbc:postgresql://your-host.neon.tech:5432/your-db"
export DATABASE_USER="your_username"
export DATABASE_PASSWORD="your_password"
```

### 本地PostgreSQL
如果您本機安裝了PostgreSQL：
```bash
export DATABASE_URL="jdbc:postgresql://localhost:5432/seniorcareplus"
export DATABASE_USER="postgres"
export DATABASE_PASSWORD="password"
```

## 📊 驗證連接

啟動後端後，您應該看到以下日誌：
```
INFO  - 測試PostgreSQL連接...
INFO  - PostgreSQL連接測試成功！
INFO  - PostgreSQL數據庫連接成功 (jdbc:postgresql://...)
INFO  - PostgreSQL數據庫表格創建完成
```

如果看到這些信息，說明您的PostgreSQL配置成功！

## 🐛 常見問題

### Q: 連接失敗怎麼辦？
A: 檢查：
1. 網絡連接
2. 環境變量是否正確設置  
3. 密碼是否包含特殊字符（需要URL編碼）
4. SSL設置是否正確

### Q: 如何測試MQTT數據存儲？
A: 後端啟動後，MQTT服務會自動連接並監聽健康數據。當收到數據時會自動存儲到PostgreSQL數據庫中。 