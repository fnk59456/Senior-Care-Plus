# 數據同步架構優化方案

## 📋 問題分析

### 問題 1: 新增場域/樓層後，功能頁面下拉選單不會即時更新

#### 當前數據流

```
UWBLocationPage (管理頁面)
  ↓ 新增場域/樓層
  ↓ 更新自己的 state (homes, floors)
  ↓ 保存到 localStorage (batchSave)
  ↓ 觸發自定義事件 (uwb-storage-change) ❌ 可能沒有觸發
  ↓
UWBLocationContext (共享 Context)
  ↓ 監聽 localStorage 變化
  ↓ 調用 refreshData()
  ↓ 更新 Context 的 state
  ↓
功能頁面 (心率、尿布等)
  ↓ 使用 useUWBLocation()
  ↓ 獲取 Context 的 state
  ❌ 問題：Context 的 state 沒有及時更新
```

#### 根本原因

1. **數據源分離**
   - `UWBLocationPage` 有自己的 state (`homes`, `floors`)
   - `UWBLocationContext` 也有自己的 state (`homes`, `floors`)
   - 兩者不同步

2. **localStorage 同步機制不穩定**
   - `batchSave` 有 500ms 延遲
   - 自定義事件可能沒有正確觸發
   - `refreshData` 有防重複調用機制，可能被跳過

3. **時序問題**
   - 用戶操作 → 更新 state → 保存 localStorage → 觸發事件 → Context 刷新
   - 如果用戶快速切換頁面，可能還沒完成同步

---

### 問題 2: 新增/刪除 Gateway 後，MQTT Bus 需要刷新才會更新監聽

#### 當前數據流

```
UWBLocationPage (管理頁面)
  ↓ 新增/刪除 Gateway
  ↓ 更新自己的 state (gateways)
  ↓ 註冊/取消註冊到 GatewayRegistry ✅
  ↓ 保存到 localStorage (batchSave)
  ↓
UWBLocationContext (共享 Context)
  ↓ 監聽 gateways state 變化
  ↓ 註冊到 GatewayRegistry ❌ 可能重複註冊或時序問題
  ↓
GatewayRegistry
  ↓ 觸發事件 (gateway_added/removed)
  ↓
MQTT Bus
  ↓ 監聽 GatewayRegistry 事件
  ↓ 訂閱/取消訂閱 Topics ✅ 機制正常
  ❌ 問題：GatewayRegistry 的事件可能沒有正確觸發
```

#### 根本原因

1. **雙重註冊問題**
   - `UWBLocationPage` 直接註冊到 GatewayRegistry
   - `UWBLocationContext` 也註冊到 GatewayRegistry
   - 可能導致重複註冊或時序混亂

2. **Context state 未同步**
   - `UWBLocationPage` 更新了自己的 `gateways` state
   - 但 `UWBLocationContext` 的 `gateways` state 沒有同步
   - Context 的 useEffect 監聽不到變化

3. **事件觸發時序**
   - GatewayRegistry 的事件在註冊時觸發
   - 但 MQTT Bus 可能還沒連接，或連接狀態不穩定

---

## 🎯 解決方案規劃

### 方案 A: 統一數據源（推薦）⭐

#### 核心思想
- **UWBLocationPage 使用 UWBLocationContext 作為唯一數據源**
- 所有數據操作都通過 Context 進行
- 確保數據一致性

#### 架構設計

```
┌─────────────────────────────────────────┐
│  UWBLocationContext (唯一數據源)        │
│  - 管理 homes, floors, gateways state   │
│  - 提供 CRUD 操作方法                   │
│  - 處理後端 API 調用                    │
│  - 處理 localStorage 同步               │
└─────────────────────────────────────────┘
           ↑                    ↑
           │                    │
┌──────────┴─────────┐  ┌──────┴──────────────┐
│ UWBLocationPage    │  │ 功能頁面             │
│ - 使用 Context     │  │ (心率、尿布等)       │
│ - 調用 Context 方法│  │ - 使用 Context       │
│ - 不管理自己的 state│ │ - 只讀取數據         │
└────────────────────┘  └─────────────────────┘
```

#### 優點
- ✅ 數據源統一，避免不一致
- ✅ 即時同步，無需等待 localStorage
- ✅ 架構清晰，易於維護
- ✅ 符合 React Context 最佳實踐

#### 缺點
- ⚠️ 需要重構 UWBLocationPage（較大改動）
- ⚠️ 需要將 CRUD 邏輯移到 Context

---

### 方案 B: 事件驅動同步（當前改進）

#### 核心思想
- **保持現有架構，加強同步機制**
- 使用事件系統確保數據同步
- 優化時序問題

#### 架構設計

```
UWBLocationPage
  ↓ 新增/更新數據
  ↓ 更新自己的 state
  ↓ 保存到 localStorage
  ↓ 觸發同步事件 (立即觸發，不等待 batchSave)
  ↓
UWBLocationContext
  ↓ 監聽同步事件
  ↓ 立即調用 refreshData() (無防重複限制)
  ↓ 更新 Context state
  ↓
功能頁面
  ↓ 自動獲取最新數據
```

#### 實現要點

1. **立即同步機制**
   ```typescript
   // UWBLocationPage 中
   const handleHomeSubmit = async () => {
       // ... 創建/更新邏輯

       // 立即觸發同步事件（不等待 batchSave）
       const syncEvent = new CustomEvent('uwb-data-sync', {
           detail: { type: 'homes', data: homes }
       })
       window.dispatchEvent(syncEvent)
   }
   ```

2. **Context 監聽同步事件**
   ```typescript
   // UWBLocationContext 中
   useEffect(() => {
       const handleDataSync = (e: CustomEvent) => {
           // 立即刷新，無防重複限制
           refreshData()
       }

       window.addEventListener('uwb-data-sync', handleDataSync)
       return () => window.removeEventListener('uwb-data-sync', handleDataSync)
   }, [])
   ```

3. **Gateway 同步優化**
   ```typescript
   // UWBLocationPage 中
   const handleGatewaySubmit = async () => {
       // ... 創建/更新邏輯

       // 立即同步到 Context
       const syncEvent = new CustomEvent('uwb-gateway-sync', {
           detail: { type: 'add', gateway: newGateway }
       })
       window.dispatchEvent(syncEvent)
   }
   ```

#### 優點
- ✅ 改動較小，保持現有架構
- ✅ 即時同步，無需等待
- ✅ 向後兼容

#### 缺點
- ⚠️ 仍存在數據源分離問題
- ⚠️ 需要維護事件系統
- ⚠️ 可能仍有時序問題

---

### 方案 C: 混合方案（推薦用於過渡）⭐

#### 核心思想
- **短期：使用事件驅動同步（方案 B）**
- **長期：遷移到統一數據源（方案 A）**

#### 實施步驟

**階段 1: 立即修復（方案 B）**
1. 添加立即同步事件機制
2. 優化 Context 的 refreshData 調用
3. 修復 Gateway 同步問題

**階段 2: 逐步遷移（方案 A）**
1. 將 CRUD 邏輯移到 Context
2. UWBLocationPage 改用 Context 方法
3. 移除 UWBLocationPage 的獨立 state

---

## 🔧 具體實施方案

### 方案 B 實施細節（立即修復）

#### 1. 添加立即同步事件

**文件**: `src/pages/UWBLocationPage.tsx`

**修改點**:
- `handleHomeSubmit`: 創建/更新後立即觸發事件
- `handleFloorSubmit`: 創建/更新後立即觸發事件
- `handleGatewaySubmit`: 創建/更新後立即觸發事件
- `deleteHome`, `deleteFloor`, `deleteGateway`: 刪除後立即觸發事件

**代碼示例**:
```typescript
const handleHomeSubmit = async () => {
    // ... 現有邏輯

    if (backendAvailable) {
        const newHome = await api.home.create(homeForm)
        setHomes(prev => [...prev, newHome])

        // ✅ 立即觸發同步事件
        window.dispatchEvent(new CustomEvent('uwb-data-sync', {
            detail: { type: 'homes', action: 'create', data: newHome }
        }))
    } else {
        const newHome: Home = { ... }
        setHomes(prev => [...prev, newHome])

        // ✅ 立即觸發同步事件
        window.dispatchEvent(new CustomEvent('uwb-data-sync', {
            detail: { type: 'homes', action: 'create', data: newHome }
        }))
    }
}
```

#### 2. Context 監聽同步事件

**文件**: `src/contexts/UWBLocationContext.tsx`

**修改點**:
- 添加 `uwb-data-sync` 事件監聽器
- 添加 `uwb-gateway-sync` 事件監聽器
- 優化 refreshData 調用（針對同步事件無防重複限制）

**代碼示例**:
```typescript
// 監聽數據同步事件
useEffect(() => {
    const handleDataSync = (e: CustomEvent) => {
        const { type, action, data } = e.detail

        console.log(`🔄 收到數據同步事件: ${type} ${action}`)

        if (type === 'homes') {
            // 立即刷新 homes
            if (backendAvailable) {
                syncHomes().then(homes => setHomes(homes))
            } else {
                const homes = loadFromStorage<Home[]>('uwb_homes', [])
                setHomes(homes)
            }
        } else if (type === 'floors') {
            // 立即刷新 floors
            if (backendAvailable && selectedHome) {
                syncFloors(selectedHome).then(floors => setFloors(floors))
            } else {
                const floors = loadFromStorage<Floor[]>('uwb_floors', [])
                setFloors(floors)
            }
        } else if (type === 'gateways') {
            // 立即刷新 gateways
            if (backendAvailable && selectedHome) {
                // 需要先獲取 floors
                syncFloors(selectedHome).then(floors => {
                    if (floors.length > 0) {
                        syncGateways(floors[0].id).then(gateways => setGateways(gateways))
                    }
                })
            } else {
                const gateways = loadFromStorage<Gateway[]>('uwb_gateways', [])
                setGateways(gateways)
            }
        }
    }

    const handleGatewaySync = (e: CustomEvent) => {
        const { action, gateway } = e.detail

        console.log(`🔄 收到 Gateway 同步事件: ${action}`)

        if (action === 'add' || action === 'update') {
            // 立即註冊到 GatewayRegistry
            gatewayRegistry.registerGateway(gateway)
            // 更新 state
            setGateways(prev => {
                const existing = prev.find(g => g.id === gateway.id)
                if (existing) {
                    return prev.map(g => g.id === gateway.id ? gateway : g)
                } else {
                    return [...prev, gateway]
                }
            })
        } else if (action === 'remove') {
            // 立即取消註冊
            gatewayRegistry.unregisterGateway(gateway.id)
            // 更新 state
            setGateways(prev => prev.filter(g => g.id !== gateway.id))
        }
    }

    window.addEventListener('uwb-data-sync', handleDataSync as EventListener)
    window.addEventListener('uwb-gateway-sync', handleGatewaySync as EventListener)

    return () => {
        window.removeEventListener('uwb-data-sync', handleDataSync as EventListener)
        window.removeEventListener('uwb-gateway-sync', handleGatewaySync as EventListener)
    }
}, [backendAvailable, selectedHome, syncHomes, syncFloors, syncGateways])
```

#### 3. Gateway 同步優化

**文件**: `src/pages/UWBLocationPage.tsx`

**修改點**:
- `handleGatewaySubmit`: 創建/更新後立即觸發 Gateway 同步事件
- `deleteGateway`: 刪除後立即觸發 Gateway 同步事件

**代碼示例**:
```typescript
const handleGatewaySubmit = async () => {
    // ... 現有邏輯

    if (backendAvailable) {
        const newGateway = await api.gateway.create({...})
        setGateways(prev => [...prev, newGateway])

        // ✅ 立即註冊到 GatewayRegistry
        gatewayRegistry.registerGateway(newGateway)

        // ✅ 立即觸發同步事件
        window.dispatchEvent(new CustomEvent('uwb-gateway-sync', {
            detail: { action: 'add', gateway: newGateway }
        }))
    }
}

const deleteGateway = async (id: string) => {
    // ... 現有邏輯

    if (backendAvailable) {
        await api.gateway.delete(id)

        // ✅ 立即取消註冊
        gatewayRegistry.unregisterGateway(id)

        // ✅ 立即觸發同步事件
        window.dispatchEvent(new CustomEvent('uwb-gateway-sync', {
            detail: { action: 'remove', gateway: { id } }
        }))
    }
}
```

---

### 方案 A 實施細節（長期方案）

#### 1. 將 CRUD 邏輯移到 Context

**文件**: `src/contexts/UWBLocationContext.tsx`

**新增方法**:
```typescript
interface UWBLocationState {
    // ... 現有屬性

    // 新增 CRUD 方法
    createHome: (homeData: Omit<Home, 'id' | 'createdAt'>) => Promise<Home>
    updateHome: (id: string, homeData: Partial<Home>) => Promise<Home>
    deleteHome: (id: string) => Promise<void>

    createFloor: (floorData: Omit<Floor, 'id' | 'createdAt'>) => Promise<Floor>
    updateFloor: (id: string, floorData: Partial<Floor>) => Promise<Floor>
    deleteFloor: (id: string) => Promise<void>

    createGateway: (gatewayData: Omit<Gateway, 'id' | 'createdAt'>) => Promise<Gateway>
    updateGateway: (id: string, gatewayData: Partial<Gateway>) => Promise<Gateway>
    deleteGateway: (id: string) => Promise<void>
}
```

#### 2. UWBLocationPage 改用 Context 方法

**文件**: `src/pages/UWBLocationPage.tsx`

**修改點**:
- 移除自己的 `homes`, `floors`, `gateways` state
- 使用 Context 提供的數據和方法
- 簡化代碼邏輯

**代碼示例**:
```typescript
export default function UWBLocationPage() {
    const {
        homes,
        floors,
        gateways,
        selectedHome,
        setSelectedHome,
        createHome,
        updateHome,
        deleteHome,
        createFloor,
        updateFloor,
        deleteFloor,
        createGateway,
        updateGateway,
        deleteGateway
    } = useUWBLocation()

    const handleHomeSubmit = async () => {
        if (editingItem) {
            await updateHome(editingItem.id, homeForm)
        } else {
            await createHome(homeForm)
        }
    }
}
```

---

## 📊 方案對比

| 特性 | 方案 A (統一數據源) | 方案 B (事件驅動) | 方案 C (混合) |
|------|-------------------|------------------|--------------|
| **改動規模** | 大 | 小 | 中 |
| **數據一致性** | ✅ 完美 | ⚠️ 良好 | ✅ 完美 |
| **即時同步** | ✅ 是 | ✅ 是 | ✅ 是 |
| **架構清晰度** | ✅ 優秀 | ⚠️ 一般 | ✅ 優秀 |
| **維護成本** | ✅ 低 | ⚠️ 中 | ✅ 低 |
| **實施時間** | 長 | 短 | 中 |
| **風險** | 低 | 中 | 低 |

---

## 🎯 推薦方案

### 短期（立即修復）
**推薦方案 B（事件驅動同步）**
- 改動小，風險低
- 可以立即解決問題
- 向後兼容

### 長期（架構優化）
**推薦方案 A（統一數據源）**
- 架構更清晰
- 數據一致性更好
- 易於維護

### 實施策略
**推薦方案 C（混合方案）**
1. **第一階段**：實施方案 B，立即修復問題
2. **第二階段**：逐步遷移到方案 A，優化架構

---

## 🔍 業界最佳實踐

### 1. React Context 數據管理
- ✅ **單一數據源原則**：所有相關數據應該由一個 Context 管理
- ✅ **操作封裝**：CRUD 操作應該封裝在 Context 中
- ✅ **狀態提升**：共享狀態應該提升到 Context

### 2. 數據同步策略
- ✅ **事件驅動**：使用事件系統實現跨組件通信
- ✅ **樂觀更新**：先更新 UI，再同步後端
- ✅ **錯誤回滾**：同步失敗時回滾 UI 狀態

### 3. MQTT 連接管理
- ✅ **單例模式**：MQTT 連接應該使用單例
- ✅ **事件監聽**：通過事件系統通知連接狀態變化
- ✅ **自動重連**：連接斷開時自動重連

---

## 📝 實施檢查清單

### 方案 B 實施（立即修復）

- [ ] 在 `handleHomeSubmit` 中添加立即同步事件
- [ ] 在 `handleFloorSubmit` 中添加立即同步事件
- [ ] 在 `handleGatewaySubmit` 中添加立即同步事件
- [ ] 在 `deleteHome` 中添加立即同步事件
- [ ] 在 `deleteFloor` 中添加立即同步事件
- [ ] 在 `deleteGateway` 中添加立即同步事件
- [ ] 在 `UWBLocationContext` 中添加事件監聽器
- [ ] 優化 `refreshData` 調用邏輯
- [ ] 測試場域/樓層創建後功能頁面即時更新
- [ ] 測試 Gateway 創建/刪除後 MQTT Bus 即時更新

### 方案 A 實施（長期優化）

- [ ] 將 CRUD 邏輯移到 `UWBLocationContext`
- [ ] 移除 `UWBLocationPage` 的獨立 state
- [ ] 更新 `UWBLocationPage` 使用 Context 方法
- [ ] 測試所有功能正常運作
- [ ] 移除事件同步機制（不再需要）

---

## ⚠️ 注意事項

### 1. 事件命名規範
- 使用明確的事件名稱：`uwb-data-sync`, `uwb-gateway-sync`
- 事件數據結構要一致
- 避免事件名稱衝突

### 2. 性能考慮
- 事件監聽器要正確清理
- 避免過度頻繁的事件觸發
- 考慮使用防抖機制

### 3. 錯誤處理
- 同步失敗時要有錯誤提示
- 考慮重試機制
- 記錄錯誤日誌

---

## 🔄 遷移路徑

### 從方案 B 到方案 A

1. **保持方案 B 運行**
2. **逐步遷移 CRUD 邏輯**
   - 先遷移 Home CRUD
   - 再遷移 Floor CRUD
   - 最後遷移 Gateway CRUD
3. **移除事件同步機制**
4. **測試驗證**

---

## 📚 參考資料

- [React Context 最佳實踐](https://react.dev/reference/react/useContext)
- [事件驅動架構](https://martinfowler.com/articles/201701-event-driven.html)
- [狀態管理模式](https://kentcdodds.com/blog/application-state-management-with-react)

