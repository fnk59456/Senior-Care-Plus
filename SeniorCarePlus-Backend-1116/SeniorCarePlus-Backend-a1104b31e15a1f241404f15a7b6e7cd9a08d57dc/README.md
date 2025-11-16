# 🏥 SeniorCarePlus Backend

長照機構管理系統後端 API

## 🚀 技術棧

- **框架**: Ktor + Kotlin
- **數據庫**: PostgreSQL (生產環境) / H2 (開發環境)
- **MQTT**: Eclipse Paho
- **容器**: Docker

## 📦 部署到 Railway

### 自動部署（推薦）

每次推送到 `main` 分支，Railway 會自動部署：

```bash
git add .
git commit -m "Update backend"
git push origin main
```

### 環境變數

Railway 會自動設置：
- `DATABASE_URL` - PostgreSQL 連接 URL
- `PORT` - 應用端口（默認 8080）

可選環境變數：
- `MQTT_BROKER_URI` - MQTT Broker 地址
- `MQTT_USER` - MQTT 用戶名
- `MQTT_PASSWORD` - MQTT 密碼

## 🧪 本地開發

```bash
# 構建
./gradlew clean build

# 運行
./gradlew run

# 測試
./gradlew test
```

## 📡 API 端點

### 健康檢查
```
GET /health
```

### 場域管理
```
GET    /api/homes          - 獲取所有場域
POST   /api/homes          - 創建場域
GET    /api/homes/{id}     - 獲取單個場域
PUT    /api/homes/{id}     - 更新場域
```

### 樓層管理
```
GET    /api/floors             - 獲取所有樓層
POST   /api/floors             - 創建樓層
GET    /api/floors/{id}        - 獲取單個樓層
PUT    /api/floors/{id}        - 更新樓層
GET    /api/homes/{id}/floors  - 獲取場域的樓層列表
```

## 📄 授權

MIT License
