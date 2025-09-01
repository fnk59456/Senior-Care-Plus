# 🚀 持久化存儲系統架構說明

## 📋 概述

本系統已實現完整的持久化存儲機制，確保用戶在 `DeviceManagementPage.tsx`、`ResidentsPage.tsx` 和 `HealthPage.tsx` 中的所有操作數據都不會因為瀏覽器關閉而丟失。

## 🏗️ 持久化架構

### 1. **三層持久化結構**

```
┌─────────────────────────────────────┐
│           UI 層持久化                │
│  (DeviceManagementPage.tsx)         │
│  (ResidentsPage.tsx)                │
│  (HealthPage.tsx)                   │
├─────────────────────────────────────┤
│         Context 層持久化             │
│  (DeviceManagementContext.tsx)       │
├─────────────────────────────────────┤
│         Storage 層持久化             │
│        (localStorage)                │
└─────────────────────────────────────┘
```

### 2. **數據存儲鍵值結構**

```javascript
// 設備管理頁面
device_mgmt_searchTerm
device_mgmt_selectedFilter
device_mgmt_newDevice
device_mgmt_version
device_mgmt_lastSave
device_mgmt_full_backup

// 院友管理頁面
residents_mgmt_searchTerm
residents_mgmt_statusFilter
residents_mgmt_showDeviceManagement
residents_mgmt_newResident
residents_mgmt_version
residents_mgmt_lastSave
residents_mgmt_full_backup

// 健康監控頁面
health_mgmt_selectedFilter
health_mgmt_version
health_mgmt_lastSave
health_mgmt_full_backup

// Context 核心數據
device_mgmt_context_devices
device_mgmt_context_residents
device_mgmt_context_bindings
device_mgmt_context_deviceData
device_mgmt_context_full_backup
```

## 🔧 核心功能

### 1. **自動保存機制**

- **觸發條件**: 任何數據變化（搜索、篩選、新增、編輯、刪除）
- **延遲機制**: 500ms 延遲，避免頻繁寫入
- **批量處理**: 一次性保存所有相關數據
- **錯誤處理**: 完善的錯誤處理和恢復機制

### 2. **數據恢復機制**

- **頁面載入時**: 自動從 localStorage 恢復用戶設定
- **Context 初始化**: 自動恢復設備、院友和綁定數據
- **默認值回退**: 當存儲數據損壞時使用默認數據

### 3. **用戶界面反饋**

```typescript
// 持久化狀態顯示
<div className="flex items-center gap-4 text-sm text-muted-foreground">
  <div className="flex items-center gap-2">
    <Database className="h-4 w-4" />
    <span>持久化狀態:</span>
    {pendingSave ? (
      <Badge variant="outline" className="text-yellow-600">
        <Save className="h-3 w-3 mr-1 animate-pulse" />
        保存中...
      </Badge>
    ) : (
      <Badge variant="outline" className="text-green-600">
        <Save className="h-3 w-3 mr-1" />
        已保存
      </Badge>
    )}
  </div>
  <div className="flex items-center gap-2">
    <span>最後保存:</span>
    <span className="font-mono">
      {lastSaveTime.toLocaleTimeString()}
    </span>
  </div>
</div>
```

### 4. **開發者工具**

#### **快捷鍵操作**
- `Ctrl + Shift + D`: 調試存儲數據
- `Ctrl + Shift + S`: 強制保存
- `Ctrl + Shift + R`: 重置所有設定

#### **操作按鈕**
- **強制保存**: 手動觸發立即保存
- **導出設定**: 導出當前頁面設定到 JSON 文件
- **導入設定**: 從 JSON 文件導入設定
- **調試存儲**: 在控制台顯示當前存儲數據

## 📊 數據流程

### 1. **數據變化流程**

```
用戶操作 → 數據變化 → 觸發 batchSave → 500ms延遲 → localStorage保存
    ↓
頁面重新載入 → useEffect初始化 → loadFromStorage → 恢復數據
```

### 2. **Context 數據流程**

```
Context 數據變化 → useEffect監聽 → batchSave → 保存到 localStorage
    ↓
應用重啟 → Context 初始化 → loadFromStorage → 恢復 Context 數據
```

## 🛡️ 數據安全保障

### 1. **版本控制**
- 每次保存都記錄版本號
- 支持數據格式升級和兼容性檢查

### 2. **完整備份**
- 每次保存都創建完整備份
- 支持從備份恢復數據

### 3. **錯誤處理**
- 完善的 try-catch 錯誤處理
- 數據損壞時自動回退到默認值

### 4. **性能優化**
- 批量保存避免頻繁寫入
- 延遲機制減少 localStorage 壓力

## 🎯 使用場景

### 1. **設備管理頁面**
- ✅ 搜索條件持久化
- ✅ 篩選狀態持久化
- ✅ 新增設備表單狀態持久化
- ✅ 設備列表數據持久化

### 2. **院友管理頁面**
- ✅ 搜索條件持久化
- ✅ 狀態篩選持久化
- ✅ 設備管理顯示狀態持久化
- ✅ 新增院友表單狀態持久化
- ✅ 院友數據和設備綁定關係持久化

### 3. **健康監控頁面**
- ✅ 狀態篩選持久化
- ✅ 病患監控設定持久化

### 4. **Context 核心數據**
- ✅ 設備數據持久化
- ✅ 院友數據持久化
- ✅ 設備綁定關係持久化
- ✅ 設備數據歷史持久化

## 🔍 調試和維護

### 1. **檢查存儲數據**

```javascript
// 在瀏覽器控制台執行
console.log('設備管理數據:', localStorage.getItem('device_mgmt_context_devices'))
console.log('院友管理數據:', localStorage.getItem('device_mgmt_context_residents'))
console.log('綁定關係數據:', localStorage.getItem('device_mgmt_context_bindings'))
```

### 2. **清除所有數據**

```javascript
// 清除所有持久化數據
localStorage.clear()
// 或使用頁面提供的重置功能
```

### 3. **導出備份**

```javascript
// 導出完整備份
const backup = {
  devices: JSON.parse(localStorage.getItem('device_mgmt_context_devices')),
  residents: JSON.parse(localStorage.getItem('device_mgmt_context_residents')),
  bindings: JSON.parse(localStorage.getItem('device_mgmt_context_bindings')),
  timestamp: new Date().toISOString()
}
console.log('完整備份:', backup)
```

## 🚀 優勢特點

1. **✅ 完全自動化**: 無需手動保存，數據自動持久化
2. **✅ 數據不丟失**: 瀏覽器關閉後重新打開，數據依然存在
3. **✅ 性能優化**: 批量保存和延遲機制避免性能問題
4. **✅ 用戶友好**: 實時狀態顯示和操作反饋
5. **✅ 開發者友好**: 完善的調試工具和快捷鍵
6. **✅ 數據安全**: 版本控制、備份和錯誤處理
7. **✅ 跨頁面同步**: Context 層確保數據一致性

## 📝 注意事項

1. **存儲限制**: localStorage 有 5-10MB 限制，注意數據量
2. **瀏覽器兼容**: 確保目標瀏覽器支持 localStorage
3. **數據格式**: 保存的數據為 JSON 格式，注意序列化/反序列化
4. **隱私安全**: 敏感數據不應存儲在 localStorage 中

## 🔮 未來擴展

1. **雲端同步**: 支持數據雲端備份和同步
2. **數據加密**: 對敏感數據進行加密存儲
3. **增量同步**: 只同步變化的數據，提高效率
4. **多設備同步**: 支持多設備間的數據同步
