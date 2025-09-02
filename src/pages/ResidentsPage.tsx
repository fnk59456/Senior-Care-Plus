import { useState, useEffect, useCallback, useRef } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
  Search,
  Phone,
  MapPin,
  Edit,
  Heart,
  AlertTriangle,
  AlertCircle,
  Info,
  Users,
  Watch,
  Baby,
  Activity,
  Link,
  Unlink,
  Plus,
  Settings,
  Battery,
  User,
  Calendar,
  X,
  Database,
  Save,
  Download,
  Upload
} from 'lucide-react'
import { useDeviceManagement } from '@/contexts/DeviceManagementContext'
import DeviceBindingModal from '@/components/DeviceBindingModal'
import { Device, DeviceType, DeviceStatus, DEVICE_TYPE_CONFIG } from '@/types/device-types'

// 使用統一的Resident接口
import { Resident } from '@/types/device-types'

export default function ResidentsPage() {
  const {
    residents,
    devices,
    addResident,
    updateResident,
    removeResident,
    getDevicesForResident,
    unbindDevice,
    getDeviceStatusSummary
  } = useDeviceManagement()

  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | 'good' | 'attention' | 'critical'>('all')
  const [selectedResident, setSelectedResident] = useState<Resident | null>(null)
  const [isEditingNotes, setIsEditingNotes] = useState(false)
  const [editedNotes, setEditedNotes] = useState('')
  const [showDeviceBinding, setShowDeviceBinding] = useState(false)
  const [selectedDevice, setSelectedDevice] = useState<Device | null>(null)
  const [showDeviceManagement, setShowDeviceManagement] = useState(false)

  // 新增病患相關狀態
  const [showAddResident, setShowAddResident] = useState(false)
  const [isEditingResident, setIsEditingResident] = useState(false)
  const [newResident, setNewResident] = useState({
    name: '',
    age: 0,
    gender: '男',
    room: '',
    status: 'good' as 'good' | 'attention' | 'critical',
    emergencyContact: {
      name: '',
      relationship: '',
      phone: ''
    },
    careNotes: '',
    avatar: ''
  })

  // 🚀 持久化系統狀態
  const [lastSaveTime, setLastSaveTime] = useState<Date>(new Date())
  const [pendingSave, setPendingSave] = useState<boolean>(false)
  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  // 📦 從 localStorage 加載數據的輔助函數
  const loadFromStorage = <T,>(key: string, defaultValue: T): T => {
    try {
      const stored = localStorage.getItem(`residents_mgmt_${key}`)
      if (!stored) {
        console.log(`📭 ${key}: 無存儲數據，使用默認值`)
        return defaultValue
      }

      console.log(`📦 ${key}: 開始解析存儲數據`)
      const data = JSON.parse(stored)
      console.log(`✅ ${key}: 數據加載完成`)
      return data
    } catch (error) {
      console.warn(`❌ 無法從 localStorage 加載 ${key}:`, error)
      return defaultValue
    }
  }

  // 💾 保存到 localStorage 的輔助函數
  const saveToStorage = <T,>(key: string, data: T) => {
    try {
      localStorage.setItem(`residents_mgmt_${key}`, JSON.stringify(data))
      console.log(`✅ 已保存 ${key} 到 localStorage`)
    } catch (error) {
      console.warn(`無法保存 ${key} 到 localStorage:`, error)
    }
  }

  // 🚀 智能批量保存函數 - 避免頻繁寫入
  const batchSave = useCallback(() => {
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current)
    }

    setPendingSave(true)
    saveTimeoutRef.current = setTimeout(() => {
      try {
        // 批量保存所有數據
        const dataToSave = {
          searchTerm,
          statusFilter,
          showDeviceManagement,
          newResident,
          version: Date.now(),
          lastSave: new Date().toISOString()
        }

        // 保存到 localStorage
        Object.entries(dataToSave).forEach(([key, value]) => {
          if (key === 'version' || key === 'lastSave') return // 跳過元數據
          saveToStorage(key, value)
        })

        // 額外保存完整備份和元數據
        saveToStorage('version', dataToSave.version)
        saveToStorage('lastSave', dataToSave.lastSave)
        localStorage.setItem('residents_mgmt_full_backup', JSON.stringify(dataToSave))

        setLastSaveTime(new Date())
        setPendingSave(false)
        console.log(`💾 院友管理自動保存完成 ${new Date().toLocaleTimeString()}`)
      } catch (error) {
        console.error('❌ 院友管理自動保存失敗:', error)
        setPendingSave(false)
      }
    }, 500) // 500ms延遲，避免頻繁保存
  }, [searchTerm, statusFilter, showDeviceManagement, newResident])

  // 手動強制保存
  const forceSave = () => {
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current)
    }
    batchSave()
    console.log('🔄 手動觸發強制保存')
  }

  // 清除所有存儲數據的函數
  const clearAllStorage = () => {
    const keys = ['searchTerm', 'statusFilter', 'showDeviceManagement', 'newResident', 'version', 'lastSave']
    keys.forEach(key => {
      localStorage.removeItem(`residents_mgmt_${key}`)
    })
    // 也清除完整備份
    localStorage.removeItem('residents_mgmt_full_backup')
    console.log('🗑️ 已清除所有院友管理 localStorage 數據和備份')

    // 重新加載頁面以重置狀態
    window.location.reload()
  }

  // 調試：檢查當前存儲數據
  const debugStorage = () => {
    console.log('🔍 當前院友管理 localStorage 數據:')
    const keys = ['searchTerm', 'statusFilter', 'showDeviceManagement', 'newResident', 'version', 'lastSave']
    keys.forEach(key => {
      const data = localStorage.getItem(`residents_mgmt_${key}`)
      if (data) {
        try {
          const parsed = JSON.parse(data)
          console.log(`- ${key}:`, parsed)
        } catch {
          console.log(`- ${key}:`, data)
        }
      } else {
        console.log(`- ${key}: 無數據`)
      }
    })
  }

  // 導出數據到 JSON 文件
  const exportData = () => {
    const data = {
      residents,
      devices,
      searchTerm,
      statusFilter,
      showDeviceManagement,
      newResident,
      exportDate: new Date().toISOString()
    }

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `residents-management-data-${new Date().toISOString().split('T')[0]}.json`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)

    console.log('📤 院友管理數據已導出')
  }

  // 導入數據從 JSON 文件
  const importData = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target?.result as string)

        // 驗證數據結構
        if (data.residents && Array.isArray(data.residents)) {
          // 注意：這裡需要通過 Context 來更新院友數據
          console.log('📥 院友數據已導入，但需要通過系統管理更新')
          alert('✅ 數據導入成功！注意：院友數據需要通過系統管理更新')
        } else {
          alert('❌ 無效的數據格式')
        }
      } catch (error) {
        console.error('導入數據失敗:', error)
        alert('❌ 導入數據失敗')
      }
    }
    reader.readAsText(file)

    // 清除文件選擇
    event.target.value = ''
  }

  // 初始化數據加載
  useEffect(() => {
    const initializeData = async () => {
      try {
        setIsLoading(true)
        setLoadError(null)

        console.log('🔄 開始加載院友管理本地存儲數據...')

        // 加載用戶設定
        const loadedSearchTerm = loadFromStorage('searchTerm', '')
        const loadedStatusFilter = loadFromStorage('statusFilter', 'all')
        const loadedShowDeviceManagement = loadFromStorage('showDeviceManagement', false)
        const loadedNewResident = loadFromStorage('newResident', {
          name: '',
          age: 0,
          gender: '男',
          room: '',
          status: 'good' as 'good' | 'attention' | 'critical',
          emergencyContact: {
            name: '',
            relationship: '',
            phone: ''
          },
          careNotes: '',
          avatar: ''
        })

        setSearchTerm(loadedSearchTerm)
        setStatusFilter(loadedStatusFilter)
        setShowDeviceManagement(loadedShowDeviceManagement)
        setNewResident(loadedNewResident)

        console.log('✅ 院友管理數據加載完成')
        setIsLoading(false)
      } catch (error) {
        console.error('❌ 院友管理數據加載失敗:', error)
        setLoadError(error instanceof Error ? error.message : '未知錯誤')
        setIsLoading(false)
      }
    }

    initializeData()
  }, [])

  // 監聽所有數據變化，觸發批量保存
  useEffect(() => {
    if (!isLoading) {
      batchSave()
    }
  }, [searchTerm, statusFilter, showDeviceManagement, newResident, batchSave, isLoading])

  // 清理定時器
  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current)
      }
    }
  }, [])

  // 🎹 開發者快捷鍵 (Ctrl+Shift+D 調試, Ctrl+Shift+S 強制保存, Ctrl+Shift+R 重置)
  useEffect(() => {
    const handleKeydown = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.shiftKey) {
        switch (e.key) {
          case 'D':
            e.preventDefault()
            debugStorage()
            break
          case 'S':
            e.preventDefault()
            forceSave()
            break
          case 'R':
            e.preventDefault()
            if (confirm('確定要重置所有院友管理設定嗎？此操作不可撤銷！')) {
              clearAllStorage()
            }
            break
        }
      }
    }

    window.addEventListener('keydown', handleKeydown)
    return () => window.removeEventListener('keydown', handleKeydown)
  }, [])

  // 篩選院友
  const filteredResidents = residents.filter(resident => {
    const matchesSearch = resident.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      resident.room.toLowerCase().includes(searchTerm.toLowerCase()) ||
      resident.id.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesStatus = statusFilter === 'all' || resident.status === statusFilter
    return matchesSearch && matchesStatus
  })

  const handleResidentClick = (resident: Resident) => {
    setSelectedResident(resident)
    setEditedNotes(resident.careNotes)
    setIsEditingNotes(false)
    setIsEditingResident(false)
  }

  const handleUpdateNotes = () => {
    if (selectedResident) {
      updateResident(selectedResident.id, { careNotes: editedNotes })
      setSelectedResident({ ...selectedResident, careNotes: editedNotes })
      setIsEditingNotes(false)
    }
  }

  // 新增病患
  const handleAddResident = () => {
    if (newResident.name && newResident.room && newResident.age > 0) {
      addResident(newResident)

      // 🚀 手動觸發院友數據保存
      setTimeout(() => {
        const currentResidents = residents
        const residentsToSave = [...currentResidents, {
          ...newResident,
          id: `R${Date.now()}`
        }]

        try {
          localStorage.setItem('device_mgmt_context_residents', JSON.stringify(residentsToSave))
          console.log('💾 院友數據已手動保存到 localStorage')
        } catch (error) {
          console.error('❌ 院友數據保存失敗:', error)
        }
      }, 100)

      setShowAddResident(false)
      setNewResident({
        name: '',
        age: 0,
        gender: '男',
        room: '',
        status: 'good',
        emergencyContact: {
          name: '',
          relationship: '',
          phone: ''
        },
        careNotes: '',
        avatar: ''
      })
    }
  }

  // 更新病患資訊
  const handleUpdateResident = () => {
    if (selectedResident) {
      console.log('🔄 開始更新院友:', selectedResident.id, newResident)
      updateResident(selectedResident.id, newResident)
      setSelectedResident({ ...selectedResident, ...newResident })
      setIsEditingResident(false)
      console.log('✅ 院友更新完成')
    } else {
      console.warn('❌ 沒有選中的院友可以更新')
    }
  }

  // 移除病患
  const handleRemoveResident = (residentId: string) => {
    if (confirm('確定要移除這個院友嗎？此操作無法復原。')) {
      removeResident(residentId)
      if (selectedResident?.id === residentId) {
        setSelectedResident(null)
      }
    }
  }

  // 設備相關處理函數
  const handleDeviceBinding = (resident: Resident, device?: Device) => {
    setSelectedResident(resident)
    setSelectedDevice(device || null)
    setShowDeviceBinding(true)
    // 確保不會進入編輯模式
    setIsEditingResident(false)
  }

  const handleUnbindDevice = (deviceId: string, residentId: string) => {
    unbindDevice(deviceId, residentId)
  }

  const getDeviceTypeIcon = (deviceType: DeviceType) => {
    switch (deviceType) {
      case DeviceType.SMARTWATCH_300B: return Watch
      case DeviceType.DIAPER_SENSOR: return Baby
      case DeviceType.PEDOMETER: return Activity
      case DeviceType.UWB_TAG: return MapPin
      default: return Settings
    }
  }

  const getDeviceStatusBadge = (status: DeviceStatus) => {
    const colors = {
      [DeviceStatus.ACTIVE]: 'bg-green-100 text-green-800',
      [DeviceStatus.INACTIVE]: 'bg-yellow-100 text-yellow-800',
      [DeviceStatus.OFFLINE]: 'bg-gray-100 text-gray-800',
      [DeviceStatus.ERROR]: 'bg-red-100 text-red-800'
    }

    const labels = {
      [DeviceStatus.ACTIVE]: '活躍',
      [DeviceStatus.INACTIVE]: '待機',
      [DeviceStatus.OFFLINE]: '離線',
      [DeviceStatus.ERROR]: '異常'
    }

    return (
      <Badge className={colors[status]}>
        {labels[status]}
      </Badge>
    )
  }

  const getStatusInfo = (status: string) => {
    switch (status) {
      case 'good':
        return {
          badge: (
            <Badge className="bg-green-100 text-green-800 hover:bg-green-100">
              <Heart className="w-3 h-3 mr-1 fill-current" />
              良好
            </Badge>
          ),
          icon: '💚',
          bgColor: 'bg-green-100'
        }
      case 'attention':
        return {
          badge: (
            <Badge className="bg-orange-100 text-orange-800 hover:bg-orange-100">
              <AlertTriangle className="w-3 h-3 mr-1" />
              需注意
            </Badge>
          ),
          icon: '⚠️',
          bgColor: 'bg-orange-100'
        }
      case 'critical':
        return {
          badge: (
            <Badge className="bg-red-100 text-red-800 hover:bg-red-100">
              <AlertCircle className="w-3 h-3 mr-1" />
              危急
            </Badge>
          ),
          icon: '🚨',
          bgColor: 'bg-red-100'
        }
      default:
        return {
          badge: <Badge>未知</Badge>,
          icon: '❓',
          bgColor: 'bg-gray-100'
        }
    }
  }

  // 統計數據
  const deviceStatusSummary = getDeviceStatusSummary()
  const unboundDevices = devices.filter(device => !device.residentId)

  return (
    <div className="p-6 space-y-6">
      {/* 頁面標題與統計 */}
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">院友管理</h1>
            <p className="text-muted-foreground">管理院友資料與設備綁定</p>
          </div>
          <div className="flex gap-2">
            <Button onClick={() => setShowAddResident(true)}>
              <Plus className="h-4 w-4 mr-2" />
              新增院友
            </Button>
            <Button onClick={() => setShowDeviceManagement(!showDeviceManagement)}>
              <Settings className="h-4 w-4 mr-2" />
              {showDeviceManagement ? '隱藏' : '顯示'}設備管理
            </Button>
          </div>
        </div>

        {/* 🚀 持久化狀態顯示 */}
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
          {loadError && (
            <div className="flex items-center gap-2 text-red-600">
              <AlertCircle className="h-4 w-4" />
              <span>加載錯誤: {loadError}</span>
            </div>
          )}
        </div>

        {/* 🛠️ 持久化操作按鈕 */}
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={forceSave}
            disabled={pendingSave}
            className="gap-2"
          >
            <Save className="h-4 w-4" />
            強制保存
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={exportData}
            className="gap-2"
          >
            <Download className="h-4 w-4" />
            導出設定
          </Button>
          <label className="cursor-pointer">
            <input
              type="file"
              accept=".json"
              onChange={importData}
              className="hidden"
            />
            <Button variant="outline" size="sm" className="gap-2">
              <Upload className="h-4 w-4" />
              導入設定
            </Button>
          </label>
          <Button
            variant="outline"
            size="sm"
            onClick={debugStorage}
            className="gap-2"
          >
            <Database className="h-4 w-4" />
            調試存儲
          </Button>
        </div>

        {/* 系統概覽統計 */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <Card className="bg-gradient-to-br from-blue-50 to-blue-100">
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-blue-700">{residents.length}</div>
              <div className="text-sm text-blue-600">總院友</div>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-green-50 to-green-100">
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-green-700">{deviceStatusSummary[DeviceStatus.ACTIVE]}</div>
              <div className="text-sm text-green-600">活躍設備</div>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-yellow-50 to-yellow-100">
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-yellow-700">{deviceStatusSummary[DeviceStatus.OFFLINE]}</div>
              <div className="text-sm text-yellow-600">離線設備</div>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-red-50 to-red-100">
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-red-700">{deviceStatusSummary[DeviceStatus.ERROR]}</div>
              <div className="text-sm text-red-600">異常設備</div>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-gray-50 to-gray-100">
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-gray-700">{unboundDevices.length}</div>
              <div className="text-sm text-gray-600">未綁定設備</div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* 搜索和篩選 */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="搜索院友姓名、編號或房間號..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <div className="flex gap-2">
              <Button
                variant={statusFilter === 'all' ? 'default' : 'outline'}
                onClick={() => setStatusFilter('all')}
                className="whitespace-nowrap"
              >
                全部
              </Button>
              <Button
                variant={statusFilter === 'good' ? 'default' : 'outline'}
                onClick={() => setStatusFilter('good')}
                className="whitespace-nowrap"
              >
                <Heart className="w-4 h-4 mr-1" />
                良好
              </Button>
              <Button
                variant={statusFilter === 'attention' ? 'default' : 'outline'}
                onClick={() => setStatusFilter('attention')}
                className="whitespace-nowrap"
              >
                <AlertTriangle className="w-4 h-4 mr-1" />
                注意
              </Button>
              <Button
                variant={statusFilter === 'critical' ? 'default' : 'outline'}
                onClick={() => setStatusFilter('critical')}
                className="whitespace-nowrap"
              >
                <AlertCircle className="w-4 h-4 mr-1" />
                危急
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 院友列表 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>院友列表</span>
            <span className="text-sm font-normal text-muted-foreground">
              共 {filteredResidents.length} 位院友
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {filteredResidents.map((resident) => {
              const statusInfo = getStatusInfo(resident.status)
              const residentDevices = getDevicesForResident(resident.id)

              return (
                <div
                  key={resident.id}
                  className="p-4 rounded-lg border hover:bg-gray-50 transition-colors"
                >
                  {/* 院友基本信息 */}
                  <div
                    onClick={() => handleResidentClick(resident)}
                    className="flex items-center justify-between cursor-pointer mb-3"
                  >
                    <div className="flex items-center space-x-4">
                      <div className={`w-12 h-12 rounded-full ${statusInfo.bgColor} flex items-center justify-center text-2xl`}>
                        {statusInfo.icon}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold text-lg">{resident.name}</h3>
                          {statusInfo.badge}
                          <Badge className="text-xs">
                            {residentDevices.length} 設備
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          編號: {resident.id}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          房間: {resident.room} • {resident.age} 歲
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation()
                          handleDeviceBinding(resident)
                        }}
                      >
                        <Link className="w-4 h-4 mr-1" />
                        管理設備
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation()
                          console.log('🔄 點擊編輯按鈕，院友:', resident)
                          setIsEditingResident(true)
                          setNewResident({
                            name: resident.name,
                            age: resident.age,
                            gender: resident.gender,
                            room: resident.room,
                            status: resident.status,
                            emergencyContact: { ...resident.emergencyContact },
                            careNotes: resident.careNotes,
                            avatar: resident.avatar || ''
                          })
                          setSelectedResident(resident)
                          console.log('✅ 編輯狀態已設置，newResident:', {
                            name: resident.name,
                            age: resident.age,
                            gender: resident.gender,
                            room: resident.room,
                            status: resident.status
                          })
                        }}
                      >
                        <Edit className="w-4 h-4 mr-1" />
                        編輯
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation()
                          handleRemoveResident(resident.id)
                        }}
                        className="text-red-600 hover:text-red-700"
                      >
                        <X className="w-4 h-4 mr-1" />
                        移除
                      </Button>
                      <Info className="w-5 h-5 text-blue-500" />
                    </div>
                  </div>

                  {/* 設備列表 */}
                  {residentDevices.length > 0 && (
                    <div className="ml-16 space-y-2">
                      <h4 className="text-sm font-medium text-gray-700">綁定設備:</h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                        {residentDevices.map((device) => {
                          const DeviceIcon = getDeviceTypeIcon(device.deviceType)
                          return (
                            <div key={device.id} className="flex items-center justify-between bg-gray-50 p-3 rounded-lg">
                              <div className="flex items-center gap-2">
                                <div className={`p-1.5 rounded ${DEVICE_TYPE_CONFIG[device.deviceType].color}`}>
                                  <DeviceIcon className="h-3 w-3" />
                                </div>
                                <div className="min-w-0 flex-1">
                                  <p className="text-sm font-medium truncate">{device.name}</p>
                                  <div className="flex items-center gap-2">
                                    {getDeviceStatusBadge(device.status)}
                                    {device.batteryLevel && (
                                      <div className="flex items-center gap-1">
                                        <Battery className={`h-3 w-3 ${device.batteryLevel > 20 ? 'text-green-500' : 'text-red-500'}`} />
                                        <span className="text-xs">{device.batteryLevel}%</span>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </div>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  handleUnbindDevice(device.id, resident.id)
                                }}
                                className="text-red-600 hover:text-red-700"
                              >
                                <Unlink className="h-3 w-3" />
                              </Button>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  )}

                  {/* 無設備提示 */}
                  {residentDevices.length === 0 && (
                    <div className="ml-16 text-sm text-gray-500">
                      尚未綁定任何設備
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>

      {/* 未綁定設備管理 */}
      {showDeviceManagement && unboundDevices.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>未綁定設備</span>
              <Badge variant="outline">{unboundDevices.length} 個設備</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {unboundDevices.map((device) => {
                const DeviceIcon = getDeviceTypeIcon(device.deviceType)
                return (
                  <div key={device.id} className="p-3 border rounded-lg hover:bg-gray-50">
                    <div className="flex items-center gap-2 mb-2">
                      <div className={`p-1.5 rounded ${DEVICE_TYPE_CONFIG[device.deviceType].color}`}>
                        <DeviceIcon className="h-4 w-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">{device.name}</p>
                        <p className="text-xs text-gray-500">{device.hardwareId}</p>
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      {getDeviceStatusBadge(device.status)}
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleDeviceBinding(residents[0], device)}
                      >
                        <Plus className="h-3 w-3 mr-1" />
                        綁定
                      </Button>
                    </div>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* 新增院友彈窗 */}
      {showAddResident && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>新增院友</CardTitle>
              <Button variant="ghost" size="sm" onClick={() => setShowAddResident(false)}>
                <X className="h-5 w-5" />
              </Button>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium mb-2 block">姓名 *</label>
                  <Input
                    placeholder="輸入院友姓名"
                    value={newResident.name}
                    onChange={(e) => setNewResident({ ...newResident, name: e.target.value })}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium mb-2 block">年齡 *</label>
                  <Input
                    type="number"
                    placeholder="輸入年齡"
                    value={newResident.age || ''}
                    onChange={(e) => setNewResident({ ...newResident, age: parseInt(e.target.value) || 0 })}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium mb-2 block">性別</label>
                  <Select value={newResident.gender} onValueChange={(value) => setNewResident({ ...newResident, gender: value })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="男">男</SelectItem>
                      <SelectItem value="女">女</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-sm font-medium mb-2 block">房間號 *</label>
                  <Input
                    placeholder="輸入房間號"
                    value={newResident.room}
                    onChange={(e) => setNewResident({ ...newResident, room: e.target.value })}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium mb-2 block">狀態</label>
                  <Select value={newResident.status} onValueChange={(value: 'good' | 'attention' | 'critical') => setNewResident({ ...newResident, status: value })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="good">良好</SelectItem>
                      <SelectItem value="attention">需注意</SelectItem>
                      <SelectItem value="critical">危急</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-sm font-medium mb-2 block">頭像</label>
                  <Input
                    placeholder="輸入表情符號或文字"
                    value={newResident.avatar}
                    onChange={(e) => setNewResident({ ...newResident, avatar: e.target.value })}
                  />
                </div>
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block">緊急聯絡人姓名</label>
                <Input
                  placeholder="輸入緊急聯絡人姓名"
                  value={newResident.emergencyContact.name}
                  onChange={(e) => setNewResident({
                    ...newResident,
                    emergencyContact: { ...newResident.emergencyContact, name: e.target.value }
                  })}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium mb-2 block">關係</label>
                  <Input
                    placeholder="輸入關係"
                    value={newResident.emergencyContact.relationship}
                    onChange={(e) => setNewResident({
                      ...newResident,
                      emergencyContact: { ...newResident.emergencyContact, relationship: e.target.value }
                    })}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium mb-2 block">電話</label>
                  <Input
                    placeholder="輸入電話號碼"
                    value={newResident.emergencyContact.phone}
                    onChange={(e) => setNewResident({
                      ...newResident,
                      emergencyContact: { ...newResident.emergencyContact, phone: e.target.value }
                    })}
                  />
                </div>
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block">照護注意事項</label>
                <Textarea
                  placeholder="輸入照護注意事項"
                  value={newResident.careNotes}
                  onChange={(e) => setNewResident({ ...newResident, careNotes: e.target.value })}
                  rows={3}
                />
              </div>

              <div className="flex gap-3 pt-4">
                <Button variant="outline" onClick={() => setShowAddResident(false)} className="flex-1">
                  取消
                </Button>
                <Button
                  onClick={handleAddResident}
                  className="flex-1"
                  disabled={!newResident.name || !newResident.room || newResident.age <= 0}
                >
                  新增院友
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* 院友詳情彈窗 */}
      {selectedResident && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <CardHeader className="text-center">
              <div className={`w-16 h-16 rounded-full ${getStatusInfo(selectedResident.status).bgColor} flex items-center justify-center text-3xl mx-auto mb-2`}>
                {getStatusInfo(selectedResident.status).icon}
              </div>
              <CardTitle className="text-xl">{selectedResident.name}</CardTitle>
              <p className="text-muted-foreground">
                {selectedResident.age} 歲, {selectedResident.gender}, 房間 {selectedResident.room}
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* 編輯院友資訊 */}
              {isEditingResident ? (
                <div className="space-y-4">
                  <h4 className="font-semibold text-blue-600">編輯院友資訊</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium mb-2 block">姓名</label>
                      <Input
                        value={newResident.name}
                        onChange={(e) => setNewResident({ ...newResident, name: e.target.value })}
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium mb-2 block">年齡</label>
                      <Input
                        type="number"
                        value={newResident.age || ''}
                        onChange={(e) => setNewResident({ ...newResident, age: parseInt(e.target.value) || 0 })}
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium mb-2 block">性別</label>
                      <Select value={newResident.gender} onValueChange={(value) => setNewResident({ ...newResident, gender: value })}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="男">男</SelectItem>
                          <SelectItem value="女">女</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <label className="text-sm font-medium mb-2 block">房間號</label>
                      <Input
                        value={newResident.room}
                        onChange={(e) => setNewResident({ ...newResident, room: e.target.value })}
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium mb-2 block">狀態</label>
                      <Select value={newResident.status} onValueChange={(value: 'good' | 'attention' | 'critical') => setNewResident({ ...newResident, status: value })}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="good">良好</SelectItem>
                          <SelectItem value="attention">需注意</SelectItem>
                          <SelectItem value="critical">危急</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <label className="text-sm font-medium mb-2 block">頭像</label>
                      <Input
                        value={newResident.avatar}
                        onChange={(e) => setNewResident({ ...newResident, avatar: e.target.value })}
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-sm font-medium mb-2 block">緊急聯絡人姓名</label>
                    <Input
                      value={newResident.emergencyContact.name}
                      onChange={(e) => setNewResident({
                        ...newResident,
                        emergencyContact: { ...newResident.emergencyContact, name: e.target.value }
                      })}
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium mb-2 block">關係</label>
                      <Input
                        value={newResident.emergencyContact.relationship}
                        onChange={(e) => setNewResident({
                          ...newResident,
                          emergencyContact: { ...newResident.emergencyContact, relationship: e.target.value }
                        })}
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium mb-2 block">電話</label>
                      <Input
                        value={newResident.emergencyContact.phone}
                        onChange={(e) => setNewResident({
                          ...newResident,
                          emergencyContact: { ...newResident.emergencyContact, phone: e.target.value }
                        })}
                      />
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <Button onClick={handleUpdateResident} size="sm">
                      儲存
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => setIsEditingResident(false)}
                      size="sm"
                    >
                      取消
                    </Button>
                  </div>
                </div>
              ) : (
                <>
                  {/* 緊急聯絡人 */}
                  <div>
                    <h4 className="font-semibold text-blue-600 mb-2">緊急聯絡人</h4>
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <Users className="w-4 h-4" />
                        <span className="text-sm">
                          {selectedResident.emergencyContact.name} ({selectedResident.emergencyContact.relationship})
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Phone className="w-4 h-4" />
                        <span className="text-sm">{selectedResident.emergencyContact.phone}</span>
                      </div>
                    </div>
                  </div>

                  {/* 照護注意事項 */}
                  <div>
                    <h4 className="font-semibold text-blue-600 mb-2">照護注意事項</h4>
                    {isEditingNotes ? (
                      <div className="space-y-2">
                        <Textarea
                          value={editedNotes}
                          onChange={(e) => setEditedNotes(e.target.value)}
                          placeholder="請輸入照護注意事項..."
                          rows={4}
                        />
                        <div className="flex gap-2">
                          <Button onClick={handleUpdateNotes} size="sm">
                            儲存
                          </Button>
                          <Button
                            variant="outline"
                            onClick={() => setIsEditingNotes(false)}
                            size="sm"
                          >
                            取消
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div className="bg-gray-50 p-3 rounded-lg">
                        <p className="text-sm whitespace-pre-wrap">
                          {selectedResident.careNotes || '暫無照護注意事項'}
                        </p>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setIsEditingNotes(true)}
                          className="mt-2 p-0 h-auto"
                        >
                          <Edit className="w-4 h-4 mr-1" />
                          編輯注意事項
                        </Button>
                      </div>
                    )}
                  </div>

                  {/* 綁定設備列表 */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-semibold text-blue-600">綁定設備</h4>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setShowDeviceBinding(true)
                          setSelectedDevice(null)
                        }}
                      >
                        <Plus className="h-4 w-4 mr-1" />
                        添加設備
                      </Button>
                    </div>
                    {getDevicesForResident(selectedResident.id).length > 0 ? (
                      <div className="space-y-2">
                        {getDevicesForResident(selectedResident.id).map((device) => {
                          const DeviceIcon = getDeviceTypeIcon(device.deviceType)
                          return (
                            <div key={device.id} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                              <div className="flex items-center gap-2">
                                <DeviceIcon className="h-4 w-4" />
                                <div>
                                  <p className="text-sm font-medium">{device.name}</p>
                                  <div className="flex items-center gap-2">
                                    {getDeviceStatusBadge(device.status)}
                                    {device.batteryLevel && (
                                      <span className="text-xs text-gray-500">{device.batteryLevel}%</span>
                                    )}
                                  </div>
                                </div>
                              </div>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => handleUnbindDevice(device.id, selectedResident.id)}
                                className="text-red-600"
                              >
                                <Unlink className="h-4 w-4" />
                              </Button>
                            </div>
                          )
                        })}
                      </div>
                    ) : (
                      <div className="text-center py-4 text-gray-500 text-sm">
                        尚未綁定任何設備
                      </div>
                    )}
                  </div>
                </>
              )}

              {/* 底部按鈕 */}
              <div className="flex gap-2 pt-4">
                <Button
                  variant="outline"
                  onClick={() => setSelectedResident(null)}
                  className="flex-1"
                >
                  關閉
                </Button>
                {!isEditingResident && (
                  <Button
                    onClick={() => {
                      setIsEditingResident(true)
                      setNewResident({
                        name: selectedResident.name,
                        age: selectedResident.age,
                        gender: selectedResident.gender,
                        room: selectedResident.room,
                        status: selectedResident.status,
                        emergencyContact: { ...selectedResident.emergencyContact },
                        careNotes: selectedResident.careNotes,
                        avatar: selectedResident.avatar || ''
                      })
                    }}
                    className="flex-1"
                  >
                    <Edit className="h-4 w-4 mr-1" />
                    編輯資訊
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* 設備綁定彈窗 */}
      <DeviceBindingModal
        isOpen={showDeviceBinding}
        onClose={() => {
          setShowDeviceBinding(false)
          setSelectedDevice(null)
          setSelectedResident(null)
        }}
        device={selectedDevice || undefined}
        resident={selectedResident || undefined}
      />
    </div>
  )
}
