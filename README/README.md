# 長者照護系統 Web 版 (Senior Care Plus Web)

這是一個使用 Next.js、React、Tailwind CSS 和 shadcn/ui 構建的長者照護系統 Web 版本。

## 技術棧

- Next.js 14
- React 18
- TypeScript
- Tailwind CSS
- shadcn/ui
- NextAuth.js
- React Query
- Recharts

## 專案結構

```
src/
├── components/          # 可重用組件
│   ├── ui/             # shadcn/ui 組件
│   ├── forms/          # 表單相關組件
│   ├── charts/         # 圖表組件
│   └── layout/         # 布局組件
├── features/           # 功能模組
│   ├── auth/          # 認證相關
│   ├── health/        # 健康監測
│   ├── reminder/      # 提醒系統
│   ├── location/      # 位置追蹤
│   └── management/    # 管理功能
├── lib/               # 工具函數和配置
├── hooks/             # 自定義 Hooks
├── types/             # TypeScript 類型定義
└── pages/             # 頁面組件
```

## 主要功能

1. 用戶管理系統
   - 登入與註冊
   - 個人資料管理
   - 多用戶類型支援

2. 健康監測功能
   - 體溫監測
   - 心率監測
   - 尿布監測

3. 提醒系統
   - 多功能提醒
   - 週期性提醒
   - 提醒通知

4. 位置追蹤功能
   - 地圖顯示
   - 安全區域設置
   - 位置歷史記錄

5. 管理功能
   - 院友管理
   - 員工管理
   - 設備管理

## 開始使用

1. 安裝依賴：
```bash
npm install
```

2. 運行開發服務器：
```bash
npm run dev
```

3. 構建生產版本：
```bash
npm run build
```

4. 運行生產版本：
```bash
npm start
```

## 環境變數

創建 `.env.local` 文件並設置以下變數：

```env
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your-secret-key
DATABASE_URL=your-database-url
```

## 開發指南

1. 組件開發
   - 使用 shadcn/ui 組件庫
   - 遵循 TypeScript 類型定義
   - 使用 Tailwind CSS 進行樣式設計

2. 狀態管理
   - 使用 React Query 進行服務器狀態管理
   - 使用 React Context 進行客戶端狀態管理

3. 路由管理
   - 使用 Next.js 的文件系統路由
   - 實現動態路由和嵌套路由

4. 認證授權
   - 使用 NextAuth.js 進行身份驗證
   - 實現角色基礎的訪問控制

## 貢獻指南

1. Fork 專案
2. 創建功能分支
3. 提交更改
4. 推送到分支
5. 創建 Pull Request

## 授權

MIT License 