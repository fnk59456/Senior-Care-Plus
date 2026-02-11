# 多語言添加指南

## 概述

本文檔提供添加新語言（如印尼文、泰文、越南文等）的完整指南，重點關注：
1. **翻譯品質**：確保翻譯準確且符合當地文化
2. **字符長度控制**：避免按鈕和UI元素變形

---

## 一、架構說明

### 當前支援語言
- `zh` - 繁體中文（基準語言）
- `en` - 英文
- `jp` - 日文

### 語言資源結構
```
src/locales/{language_code}/
  ├── common.json      # 通用翻譯（按鈕、狀態、操作等）
  ├── navigation.json  # 導航欄翻譯
  ├── pages.json       # 頁面內容翻譯
  └── status.json      # 狀態相關翻譯
```

---

## 二、添加新語言步驟

### 步驟 1：創建語言資源文件夾
在 `src/locales/` 下創建新語言資料夾，例如：
- `id/` - 印尼文（Indonesian）
- `th/` - 泰文（Thai）
- `vi/` - 越南文（Vietnamese）
- `ko/` - 韓文（Korean）

### 步驟 2：複製並翻譯 JSON 文件
複製 `zh/` 資料夾下的 4 個 JSON 文件，並進行翻譯。

### 步驟 3：更新 `src/i18n.ts`
```typescript
// 新增導入（以印尼文為例）
import idCommon from './locales/id/common.json'
import idNavigation from './locales/id/navigation.json'
import idPages from './locales/id/pages.json'
import idStatus from './locales/id/status.json'

// 在 resources 物件中新增
const resources = {
    // ... 現有的 zh, en, jp
    id: {
        common: idCommon,
        navigation: idNavigation,
        pages: idPages,
        status: idStatus,
    },
}
```

### 步驟 4：更新 `src/contexts/LanguageContext.tsx`
```typescript
const getAvailableLanguages = (t: any) => [
    // ... 現有的
    { code: 'id', name: t('common:language.indonesian'), flag: '🇮🇩' },
]
```

### 步驟 5：在所有語言的 `common.json` 中新增語言名稱
```json
"language": {
    "chinese": "中文",
    "english": "English",
    "japanese": "日本語",
    "indonesian": "Bahasa Indonesia"  // 新增
}
```

---

## 三、字符長度控制指南

### ⚠️ 關鍵原則
**中文版本作為長度基準**，其他語言應盡量控制在相同或更短的字符數內，避免UI變形。

### 📏 長度參考標準

#### 1. 按鈕型設備篩選（`deviceManagement.filters`）
**位置**：`pages.json` → `deviceManagement.filters`

| 鍵值 | 中文（基準） | 英文（已簡化） | 日文（已簡化） | 建議長度 |
|------|------------|--------------|--------------|---------|
| `smartwatch300B` | 300B手錶 | 300B | 300B | ≤ 5 字符 |
| `diaperSensor` | 尿布傳感器 | Diaper | おむつ | ≤ 6 字符 |
| `pedometer` | 運動傳感器 | Motion | モーション | ≤ 7 字符 |
| `uwbTag` | 定位標籤 | Tag | タグ | ≤ 4 字符 |
| `uwbAnchor` | 定位錨點 | Anchor | アンカー | ≤ 6 字符 |
| `gateway` | UWB閘道器 | Gateway | ゲートウェイ | ≤ 8 字符 |

**簡化策略**：
- 使用縮寫或簡稱
- 移除不必要的修飾詞（如 "Smart"、"UWB"）
- 優先使用業界通用縮寫

**各語言建議**：
- **印尼文**：`Jam Tangan 300B` → `300B`、`Sensor Popok` → `Popok`、`Sensor Gerak` → `Gerak`
- **泰文**：`นาฬิกา 300B` → `300B`、`เซ็นเซอร์ผ้าอ้อม` → `ผ้าอ้อม`
- **越南文**：`Đồng hồ 300B` → `300B`、`Cảm biến tã` → `Tã`

#### 2. 健康監控頁面圖標標籤（`health.monitoringIcons`）
**位置**：`pages.json` → `health.monitoringIcons`

| 鍵值 | 中文（基準） | 英文 | 日文 | 建議長度 |
|------|------------|------|------|---------|
| `physiological` | 生理 | Physio | 生理 | ≤ 4 字符 |
| `diaper` | 尿布 | Diaper | おむつ | ≤ 5 字符 |
| `activity` | 活動 | Activity | 活動 | ≤ 5 字符 |
| `location` | 位置 | Location | 位置 | ≤ 5 字符 |
| `emergency` | 緊急 | Emergency | 緊急 | ≤ 5 字符 |
| `reminders` | 提醒 | Reminders | リマイン | ≤ 6 字符 |

**簡化策略**：
- 使用核心詞彙，移除冗長描述
- 優先使用單詞而非短語

#### 3. 側邊欄導航說明文字（`navigation.sidebar.items.*.description`）
**位置**：`navigation.json` → `sidebar.items.*.description`

| 項目 | 中文（基準） | 英文 | 日文 | 建議長度 |
|------|------------|------|------|---------|
| `health.description` | 即時監測生命體徵 | Real-time vital signs monitoring | バイタル即時監視 | ≤ 12 字符 |
| `reminders.description` | 服藥與照顧提醒 | Medication & care reminders | 服薬・ケアリマイン | ≤ 10 字符 |

**簡化策略**：
- 保留關鍵提示字即可
- 可省略 "即時"、"管理" 等修飾詞
- 使用符號連接（如 `&`、`・`）

**各語言建議**：
- **印尼文**：`Monitor kesehatan` → `Monitor`、`Pengingat obat` → `Pengingat`
- **泰文**：`ตรวจสุขภาพ` → `ตรวจ`、`เตือนยา` → `เตือน`
- **越南文**：`Giám sát sức khỏe` → `Giám sát`、`Nhắc nhở thuốc` → `Nhắc nhở`

#### 4. 操作按鈕（`common.actions`）
**位置**：`common.json` → `actions`

| 鍵值 | 中文（基準） | 英文 | 建議長度 |
|------|------------|------|---------|
| `save` | 儲存 | Save | ≤ 5 字符 |
| `cancel` | 取消 | Cancel | ≤ 6 字符 |
| `confirm` | 確認 | Confirm | ≤ 7 字符 |
| `delete` | 刪除 | Delete | ≤ 6 字符 |
| `edit` | 編輯 | Edit | ≤ 5 字符 |
| `add` | 新增 | Add | ≤ 4 字符 |

**注意**：這些按鈕通常較短，但仍需注意某些語言可能較長。

---

## 四、各語言翻譯建議

### 🇮🇩 印尼文（Indonesian）

#### 字符特點
- 單詞通常較長
- 複合詞較多
- 需要積極簡化

#### 關鍵簡化建議

**設備類型**：
```json
{
  "smartwatch300B": "300B",
  "diaperSensor": "Popok",
  "pedometer": "Gerak",
  "uwbTag": "Tag",
  "uwbAnchor": "Anchor",
  "gateway": "Gateway"
}
```

**健康監控圖標**：
```json
{
  "physiological": "Fisiologis",
  "diaper": "Popok",
  "activity": "Aktivitas",
  "location": "Lokasi",
  "emergency": "Darurat",
  "reminders": "Pengingat"
}
```

**導航說明**：
```json
{
  "health": {
    "description": "Monitor vital"
  },
  "reminders": {
    "description": "Pengingat obat"
  }
}
```

### 🇹🇭 泰文（Thai）

#### 字符特點
- 泰文字符較寬
- 單詞長度中等
- 需要適當簡化

#### 關鍵簡化建議

**設備類型**：
```json
{
  "smartwatch300B": "300B",
  "diaperSensor": "ผ้าอ้อม",
  "pedometer": "การเคลื่อนไหว",
  "uwbTag": "แท็ก",
  "uwbAnchor": "จุดยึด",
  "gateway": "เกตเวย์"
}
```

### 🇻🇳 越南文（Vietnamese）

#### 字符特點
- 使用拉丁字母，但單詞較長
- 需要積極簡化

#### 關鍵簡化建議

**設備類型**：
```json
{
  "smartwatch300B": "300B",
  "diaperSensor": "Tã",
  "pedometer": "Chuyển động",
  "uwbTag": "Thẻ",
  "uwbAnchor": "Điểm neo",
  "gateway": "Cổng"
}
```

---

## 五、檢查清單

### ✅ 翻譯前檢查
- [ ] 確認語言代碼（ISO 639-1）
- [ ] 確認語言名稱翻譯
- [ ] 確認國旗 emoji

### ✅ 翻譯中檢查
- [ ] 所有 JSON 文件結構一致
- [ ] 所有鍵值（key）保持不變
- [ ] 僅翻譯值（value）
- [ ] 保留插值變數（如 `{{count}}`）

### ✅ 長度控制檢查
- [ ] 設備篩選按鈕 ≤ 8 字符
- [ ] 健康監控圖標 ≤ 6 字符
- [ ] 導航說明 ≤ 12 字符
- [ ] 操作按鈕 ≤ 7 字符
- [ ] 與中文版本對比長度

### ✅ 翻譯品質檢查
- [ ] 專業術語準確
- [ ] 符合當地文化習慣
- [ ] 無語法錯誤
- [ ] 無拼寫錯誤

### ✅ 系統整合檢查
- [ ] 更新 `src/i18n.ts`
- [ ] 更新 `src/contexts/LanguageContext.tsx`
- [ ] 更新所有語言的 `common.json` 語言名稱
- [ ] 測試語言切換功能
- [ ] 測試所有頁面顯示

---

## 六、常見問題

### Q1: 如果某個翻譯無法簡化到目標長度怎麼辦？
**A**: 優先考慮：
1. 使用縮寫
2. 移除修飾詞
3. 使用符號替代
4. 如果仍無法解決，考慮調整 UI 設計（如使用圖標+文字、tooltip 等）

### Q2: 專業術語應該直譯還是意譯？
**A**: 
- 技術術語（如 "Gateway"、"Sensor"）建議保留英文或使用業界通用翻譯
- 功能描述建議意譯，符合當地語言習慣

### Q3: 如何確保翻譯品質？
**A**: 
1. 使用專業翻譯工具（如 Google Translate、DeepL）作為參考
2. 請母語人士審核
3. 參考同類產品的翻譯
4. 建立術語表統一翻譯

---

## 七、參考資源

### 語言代碼（ISO 639-1）
- `id` - Indonesian (Bahasa Indonesia)
- `th` - Thai (ไทย)
- `vi` - Vietnamese (Tiếng Việt)
- `ko` - Korean (한국어)
- `ms` - Malay (Bahasa Melayu)
- `tl` - Tagalog (Filipino)

### 翻譯工具
- Google Translate
- DeepL
- Microsoft Translator
- 專業翻譯服務（如 Gengo、OneHourTranslation）

---

## 八、範例：添加印尼文完整流程

### 1. 創建文件夾結構
```
src/locales/id/
  ├── common.json
  ├── navigation.json
  ├── pages.json
  └── status.json
```

### 2. 翻譯 `common.json`（關鍵部分）
```json
{
  "language": {
    "indonesian": "Bahasa Indonesia"
  },
  "actions": {
    "save": "Simpan",
    "cancel": "Batal",
    "confirm": "Konfirmasi",
    "delete": "Hapus",
    "edit": "Edit",
    "add": "Tambah"
  }
}
```

### 3. 翻譯 `pages.json`（設備篩選部分 - 已簡化）
```json
{
  "deviceManagement": {
    "filters": {
      "smartwatch300B": "300B",
      "diaperSensor": "Popok",
      "pedometer": "Gerak",
      "uwbTag": "Tag",
      "uwbAnchor": "Anchor",
      "gateway": "Gateway"
    }
  }
}
```

### 4. 更新配置檔案
（見步驟 3-5）

---

## 九、維護建議

1. **建立翻譯文檔**：記錄每個語言的翻譯決策和簡化原因
2. **定期審核**：隨著功能增加，定期檢查新翻譯的長度
3. **用戶反饋**：收集用戶對翻譯的意見，持續優化
4. **版本控制**：使用 Git 追蹤翻譯變更

---

**最後更新**：2024-01-29
**維護者**：開發團隊
