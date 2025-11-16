#!/bin/bash

echo "🚂 Railway 部署腳本"
echo "===================="
echo ""

# 檢查 Railway CLI 是否安裝
if ! command -v railway &> /dev/null; then
    echo "❌ Railway CLI 未安裝"
    echo ""
    echo "請執行以下命令安裝："
    echo "  npm install -g @railway/cli"
    echo ""
    echo "或使用 npx："
    echo "  npx @railway/cli login"
    exit 1
fi

echo "✅ Railway CLI 已安裝"
echo ""

# 檢查是否已登入
echo "🔑 檢查 Railway 登入狀態..."
if ! railway whoami &> /dev/null; then
    echo "❌ 未登入 Railway"
    echo ""
    echo "請執行以下命令登入："
    echo "  railway login"
    exit 1
fi

echo "✅ 已登入 Railway"
echo ""

# 確認當前目錄
echo "📁 當前目錄: $(pwd)"
echo ""

# 檢查是否已初始化項目
if [ ! -f "railway.toml" ] && [ ! -d ".railway" ]; then
    echo "⚠️  未檢測到 Railway 項目配置"
    echo ""
    read -p "是否要初始化新項目？ (y/n): " -n 1 -r
    echo ""
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        echo "🚀 初始化 Railway 項目..."
        railway init
        echo ""
        
        echo "🗄️  添加 PostgreSQL 數據庫..."
        railway add --database postgres
        echo ""
    else
        echo "❌ 取消部署"
        exit 1
    fi
fi

# 構建應用
echo "🔨 構建應用..."
./gradlew clean build -x test --no-daemon

if [ $? -ne 0 ]; then
    echo "❌ 構建失敗"
    exit 1
fi

echo "✅ 構建成功"
echo ""

# 部署到 Railway
echo "🚀 部署到 Railway..."
railway up --detach

if [ $? -ne 0 ]; then
    echo "❌ 部署失敗"
    exit 1
fi

echo ""
echo "✅ 部署成功！"
echo ""

# 獲取應用 URL
echo "🌐 獲取應用 URL..."
RAILWAY_URL=$(railway domain 2>&1 | grep -o 'https://[^ ]*' | head -1)

if [ -z "$RAILWAY_URL" ]; then
    echo "⚠️  未找到域名，請手動生成："
    echo "   railway domain"
    echo ""
    echo "📋 查看部署狀態："
    echo "   railway logs"
else
    echo "✅ 應用 URL: $RAILWAY_URL"
    echo ""
    echo "📊 測試健康檢查："
    echo "   curl $RAILWAY_URL/health"
    echo ""
    echo "📋 查看日誌："
    echo "   railway logs"
    echo ""
    echo "🧪 測試 API："
    echo "   curl $RAILWAY_URL/api/homes"
fi

echo ""
echo "🎉 完成！"


