# 翻譯鍵值長度參考表

本文檔列出所有需要控制字符長度的翻譯鍵值，以中文版本為基準，提供各語言的簡化建議。

---

## 📋 使用說明

1. **基準**：中文版本作為長度基準
2. **目標**：其他語言應控制在相同或更短長度
3. **優先級**：
   - 🔴 **高優先級**：按鈕、篩選器、導航等固定寬度元素
   - 🟡 **中優先級**：標籤、狀態文字
   - 🟢 **低優先級**：描述性文字、提示訊息

---

## 一、設備篩選按鈕（高優先級 🔴）

**位置**：`pages.json` → `deviceManagement.filters`

| 鍵值 | 中文 | 字符數 | 英文（已簡化） | 日文（已簡化） | 建議最大長度 |
|------|------|--------|--------------|--------------|------------|
| `smartwatch300B` | 300B手錶 | 5 | 300B | 300B | ≤ 5 |
| `diaperSensor` | 尿布傳感器 | 5 | Diaper | おむつ | ≤ 6 |
| `pedometer` | 運動傳感器 | 5 | Motion | モーション | ≤ 7 |
| `uwbTag` | 定位標籤 | 4 | Tag | タグ | ≤ 4 |
| `uwbAnchor` | 定位錨點 | 4 | Anchor | アンカー | ≤ 6 |
| `gateway` | UWB閘道器 | 6 | Gateway | ゲートウェイ | ≤ 8 |

### 各語言簡化建議

#### 🇮🇩 印尼文
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

#### 🇹🇭 泰文
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

#### 🇻🇳 越南文
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

#### 🇰🇷 韓文
```json
{
  "smartwatch300B": "300B",
  "diaperSensor": "기저귀",
  "pedometer": "동작",
  "uwbTag": "태그",
  "uwbAnchor": "앵커",
  "gateway": "게이트웨이"
}
```

---

## 二、健康監控頁面圖標標籤（高優先級 🔴）

**位置**：`pages.json` → `health.monitoringIcons`

| 鍵值 | 中文 | 字符數 | 英文 | 日文 | 建議最大長度 |
|------|------|--------|------|------|------------|
| `physiological` | 生理 | 2 | Physio | 生理 | ≤ 4 |
| `diaper` | 尿布 | 2 | Diaper | おむつ | ≤ 5 |
| `activity` | 活動 | 2 | Activity | 活動 | ≤ 5 |
| `location` | 位置 | 2 | Location | 位置 | ≤ 5 |
| `emergency` | 緊急 | 2 | Emergency | 緊急 | ≤ 5 |
| `reminders` | 提醒 | 2 | Reminders | リマイン | ≤ 6 |
| `residents` | 院友 | 2 | Residents | 居住者 | ≤ 6 |
| `devices` | 設備 | 2 | Devices | デバイス | ≤ 6 |

### 各語言簡化建議

#### 🇮🇩 印尼文
```json
{
  "physiological": "Fisiologis",
  "diaper": "Popok",
  "activity": "Aktivitas",
  "location": "Lokasi",
  "emergency": "Darurat",
  "reminders": "Pengingat",
  "residents": "Penghuni",
  "devices": "Perangkat"
}
```

#### 🇹🇭 泰文
```json
{
  "physiological": "สรีรวิทยา",
  "diaper": "ผ้าอ้อม",
  "activity": "กิจกรรม",
  "location": "ตำแหน่ง",
  "emergency": "ฉุกเฉิน",
  "reminders": "เตือน",
  "residents": "ผู้อยู่อาศัย",
  "devices": "อุปกรณ์"
}
```

#### 🇻🇳 越南文
```json
{
  "physiological": "Sinh lý",
  "diaper": "Tã",
  "activity": "Hoạt động",
  "location": "Vị trí",
  "emergency": "Khẩn cấp",
  "reminders": "Nhắc nhở",
  "residents": "Cư dân",
  "devices": "Thiết bị"
}
```

---

## 三、側邊欄導航說明文字（中優先級 🟡）

**位置**：`navigation.json` → `sidebar.items.*.description`

| 項目 | 中文 | 字符數 | 英文 | 日文 | 建議最大長度 |
|------|------|--------|------|------|------------|
| `home.description` | 返回系統首頁 | 6 | Return to homepage | システムホーム | ≤ 8 |
| `emergency.description` | 快速發送緊急求助信號 | 10 | Quick emergency signal | 緊急支援信号 | ≤ 10 |
| `health.description` | 即時監測生命體徵 | 8 | Real-time vital signs | バイタル即時監視 | ≤ 12 |
| `reminders.description` | 服藥與照顧提醒 | 7 | Medication reminders | 服薬・ケアリマイン | ≤ 10 |
| `location.description` | 位置追蹤與安全區域 | 9 | Location tracking | 位置追跡・安全区域 | ≤ 10 |
| `residents.description` | 管理院友資料與記錄 | 9 | Manage residents | 居住者データ・記録 | ≤ 10 |
| `staff.description` | 護理人員和職員管理 | 9 | Staff management | スタッフ・職員 | ≤ 10 |
| `devices.description` | 照護設備管理與維護 | 9 | Device management | ケアデバイス・保守 | ≤ 10 |
| `uwbLocation.description` | UWB定位系統場域管理 | 11 | UWB field management | UWB施設管理 | ≤ 10 |

### 簡化策略
- 移除 "即時"、"管理"、"系統" 等修飾詞
- 使用核心關鍵字
- 使用符號連接（`&`、`・`）

### 各語言簡化建議

#### 🇮🇩 印尼文
```json
{
  "home": { "description": "Beranda sistem" },
  "emergency": { "description": "Sinyal darurat" },
  "health": { "description": "Monitor vital" },
  "reminders": { "description": "Pengingat obat" },
  "location": { "description": "Pelacakan lokasi" },
  "residents": { "description": "Kelola penghuni" },
  "staff": { "description": "Kelola staf" },
  "devices": { "description": "Kelola perangkat" },
  "uwbLocation": { "description": "Manajemen UWB" }
}
```

#### 🇹🇭 泰文
```json
{
  "home": { "description": "หน้าหลัก" },
  "emergency": { "description": "สัญญาณฉุกเฉิน" },
  "health": { "description": "ตรวจสุขภาพ" },
  "reminders": { "description": "เตือนยา" },
  "location": { "description": "ติดตามตำแหน่ง" },
  "residents": { "description": "จัดการผู้อยู่อาศัย" },
  "staff": { "description": "จัดการพนักงาน" },
  "devices": { "description": "จัดการอุปกรณ์" },
  "uwbLocation": { "description": "จัดการ UWB" }
}
```

---

## 四、操作按鈕（高優先級 🔴）

**位置**：`common.json` → `actions`

| 鍵值 | 中文 | 字符數 | 英文 | 建議最大長度 |
|------|------|--------|------|------------|
| `save` | 儲存 | 2 | Save | ≤ 5 |
| `cancel` | 取消 | 2 | Cancel | ≤ 6 |
| `confirm` | 確認 | 2 | Confirm | ≤ 7 |
| `delete` | 刪除 | 2 | Delete | ≤ 6 |
| `edit` | 編輯 | 2 | Edit | ≤ 5 |
| `add` | 新增 | 2 | Add | ≤ 4 |
| `remove` | 移除 | 2 | Remove | ≤ 6 |
| `close` | 關閉 | 2 | Close | ≤ 5 |
| `back` | 返回 | 2 | Back | ≤ 4 |
| `next` | 下一步 | 3 | Next | ≤ 5 |
| `previous` | 上一步 | 3 | Previous | ≤ 8 |
| `submit` | 提交 | 2 | Submit | ≤ 6 |
| `reset` | 重置 | 2 | Reset | ≤ 5 |
| `search` | 搜索 | 2 | Search | ≤ 6 |
| `filter` | 篩選 | 2 | Filter | ≤ 6 |
| `export` | 導出 | 2 | Export | ≤ 6 |
| `import` | 導入 | 2 | Import | ≤ 6 |
| `refresh` | 刷新 | 2 | Refresh | ≤ 7 |
| `view` | 查看 | 2 | View | ≤ 4 |

### 各語言簡化建議

#### 🇮🇩 印尼文
```json
{
  "save": "Simpan",
  "cancel": "Batal",
  "confirm": "Konfirmasi",
  "delete": "Hapus",
  "edit": "Edit",
  "add": "Tambah",
  "remove": "Hapus",
  "close": "Tutup",
  "back": "Kembali",
  "next": "Lanjut",
  "previous": "Sebelumnya",
  "submit": "Kirim",
  "reset": "Reset",
  "search": "Cari",
  "filter": "Filter",
  "export": "Ekspor",
  "import": "Impor",
  "refresh": "Refresh",
  "view": "Lihat"
}
```

---

## 五、狀態標籤（中優先級 🟡）

**位置**：`common.json` → `status` 或 `status.json`

| 鍵值 | 中文 | 字符數 | 英文 | 建議最大長度 |
|------|------|--------|------|------------|
| `active` | 活躍 | 2 | Active | ≤ 6 |
| `inactive` | 待機 | 2 | Inactive | ≤ 8 |
| `offline` | 離線 | 2 | Offline | ≤ 7 |
| `error` | 異常 | 2 | Error | ≤ 5 |
| `good` | 良好 | 2 | Good | ≤ 5 |
| `attention` | 需注意 | 3 | Attention | ≤ 8 |
| `critical` | 危急 | 2 | Critical | ≤ 8 |
| `unknown` | 未知 | 2 | Unknown | ≤ 7 |

---

## 六、頁面標題和副標題（低優先級 🟢）

**位置**：`pages.json` → `{page}.title` / `{page}.subtitle`

這些文字通常有較多空間，但仍需注意過長的情況。

| 頁面 | 標題（中文） | 字符數 | 建議最大長度 |
|------|------------|--------|------------|
| `home.title` | 歡迎使用長者照護系統 | 11 | ≤ 15 |
| `deviceManagement.title` | 設備管理 | 4 | ≤ 8 |
| `health.title` | 病患監控 | 4 | ≤ 8 |
| `emergencyCall.title` | 緊急呼叫 | 4 | ≤ 8 |

---

## 七、批量操作相關（高優先級 🔴）

**位置**：`pages.json` → `deviceManagement.batchActions`

| 鍵值 | 中文 | 字符數 | 英文 | 建議最大長度 |
|------|------|--------|------|------------|
| `batchActions` | 一括操作 | 4 | Batch Actions | ≤ 12 |
| `selectedCount` | 選擇済み | 4 | Selected | ≤ 8 |
| `selectAll` | すべて選択 | 4 | Select All | ≤ 9 |
| `deselectAll` | 選択解除 | 4 | Deselect All | ≤ 12 |
| `batchUnbind` | 一括バインド解除 | 7 | Batch Unbind | ≤ 12 |
| `batchRemove` | 一括削除 | 4 | Batch Remove | ≤ 12 |

---

## 八、檢查工具

### 字符計數方法
- **中文**：每個漢字 = 1 字符
- **英文**：每個字母/空格 = 1 字符
- **日文**：每個假名/漢字 = 1 字符
- **泰文/韓文**：每個字符 = 1 字符

### 測試建議
1. 在瀏覽器中切換語言測試
2. 檢查按鈕是否變形
3. 檢查文字是否換行
4. 檢查是否被截斷

---

## 九、快速參考：各語言字符特點

| 語言 | 字符特點 | 簡化難度 | 注意事項 |
|------|---------|---------|---------|
| 中文 | 簡潔，字符數少 | ⭐ | 作為基準 |
| 英文 | 單詞較長 | ⭐⭐ | 積極使用縮寫 |
| 日文 | 假名+漢字混合 | ⭐⭐ | 已部分簡化 |
| 印尼文 | 單詞很長 | ⭐⭐⭐ | 必須簡化 |
| 泰文 | 字符較寬 | ⭐⭐ | 注意顯示寬度 |
| 越南文 | 單詞較長 | ⭐⭐⭐ | 積極簡化 |
| 韓文 | 字符中等 | ⭐⭐ | 適度簡化 |

---

**最後更新**：2024-01-29
