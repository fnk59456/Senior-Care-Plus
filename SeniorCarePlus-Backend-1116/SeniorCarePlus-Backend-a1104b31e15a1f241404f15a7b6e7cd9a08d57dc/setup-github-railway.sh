#!/bin/bash

echo "🚀 GitHub + Railway CI/CD 設置腳本"
echo "===================================="
echo ""

# 檢查是否已經初始化 Git
if [ ! -d ".git" ]; then
    echo "❌ Git 未初始化"
    echo "請先運行: git init"
    exit 1
fi

echo "✅ Git 已初始化"
echo ""

# 檢查是否有未提交的更改
if [[ -n $(git status -s) ]]; then
    echo "⚠️  檢測到未提交的更改"
    git status -s
    echo ""
    read -p "是否要提交這些更改？ (y/n): " -n 1 -r
    echo ""
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        git add .
        read -p "輸入提交訊息: " commit_msg
        git commit -m "$commit_msg"
        echo "✅ 更改已提交"
    fi
fi

echo ""
echo "📝 請輸入您的 GitHub 信息："
echo ""

# 獲取 GitHub 用戶名
read -p "GitHub 用戶名: " github_username

if [ -z "$github_username" ]; then
    echo "❌ 用戶名不能為空"
    exit 1
fi

echo ""
echo "📋 設置步驟："
echo ""
echo "1️⃣  在 GitHub 創建倉庫"
echo "   訪問: https://github.com/new"
echo "   倉庫名稱: SeniorCarePlusBackend"
echo "   設置為 Private（推薦）"
echo "   不要勾選任何選項"
echo ""

read -p "完成後按 Enter 繼續..."

# 檢查是否已有 remote
if git remote | grep -q "origin"; then
    echo "⚠️  已存在 origin remote"
    echo "當前 remote URL:"
    git remote get-url origin
    echo ""
    read -p "是否要更新 remote URL？ (y/n): " -n 1 -r
    echo ""
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        git remote set-url origin "https://github.com/$github_username/SeniorCarePlusBackend.git"
        echo "✅ Remote URL 已更新"
    fi
else
    # 添加 remote
    git remote add origin "https://github.com/$github_username/SeniorCarePlusBackend.git"
    echo "✅ 已添加 remote: origin"
fi

echo ""

# 設置主分支
git branch -M main
echo "✅ 主分支設置為: main"

echo ""
echo "2️⃣  推送代碼到 GitHub..."
echo ""

# 推送代碼
if git push -u origin main; then
    echo ""
    echo "✅ 代碼已成功推送到 GitHub！"
    echo ""
    echo "📦 倉庫 URL:"
    echo "   https://github.com/$github_username/SeniorCarePlusBackend"
else
    echo ""
    echo "❌ 推送失敗"
    echo ""
    echo "💡 常見原因："
    echo "1. 需要 Personal Access Token（不是密碼）"
    echo "   創建 Token: https://github.com/settings/tokens"
    echo "   權限: 選擇 'repo'"
    echo ""
    echo "2. 倉庫尚未創建"
    echo "   訪問: https://github.com/new"
    echo ""
    exit 1
fi

echo ""
echo "3️⃣  在 Railway 連接 GitHub 倉庫"
echo ""
echo "請執行以下步驟："
echo ""
echo "1. 打開 Railway 項目:"
echo "   https://railway.com/project/74ce98e3-5733-43bd-bb63-b22e4ae418fa"
echo ""
echo "2. 點擊 '+ New' 按鈕"
echo ""
echo "3. 選擇 'GitHub Repo'"
echo ""
echo "4. 如果是第一次:"
echo "   - 點擊 'Configure GitHub App'"
echo "   - 授權 Railway 訪問您的 GitHub"
echo "   - 選擇 'SeniorCarePlusBackend' 倉庫"
echo ""
echo "5. 選擇 SeniorCarePlusBackend 倉庫"
echo ""
echo "6. Railway 會自動部署！"
echo ""

read -p "完成後按 Enter 繼續..."

echo ""
echo "🎉 設置完成！"
echo ""
echo "📋 下一步："
echo ""
echo "1. 等待 Railway 完成首次部署（約 3-5 分鐘）"
echo ""
echo "2. 在 Railway 生成公開域名:"
echo "   - 點擊服務"
echo "   - Settings → Networking → Generate Domain"
echo ""
echo "3. 測試 API:"
echo "   curl https://your-app.up.railway.app/health"
echo ""
echo "4. 更新前端 .env 文件:"
echo "   VITE_API_BASE_URL=https://your-app.up.railway.app/api"
echo ""
echo "🔄 未來更新只需要:"
echo ""
echo "   git add ."
echo "   git commit -m \"更新功能\""
echo "   git push"
echo ""
echo "   Railway 會自動部署！🚀"
echo ""


