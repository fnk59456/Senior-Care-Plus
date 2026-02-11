import { useState, useEffect, useCallback, useRef } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useTranslation } from 'react-i18next'
import {
  Search,
  Phone,
  MapPin,
  Edit,
  Heart,
  AlertTriangle,
  AlertCircle,
  Users,
  Watch,
  Baby,
  Activity,
  Unlink,
  Plus,
  Settings,
  X,
  Database,
  Save,
  Download,
  Upload,
  Filter,
  TestTube,
  Bug
} from 'lucide-react'
import { useDeviceManagement } from '@/contexts/DeviceManagementContext'
import { useDeviceMonitoring } from '@/contexts/DeviceMonitoringContext'
import { useUWBLocation } from '@/contexts/UWBLocationContext'
import DeviceBindingModal from '@/components/DeviceBindingModal'
import ResidentCard from '@/components/ResidentCard'
import { Device, DeviceType, DeviceStatus, DEVICE_TYPE_CONFIG, isBindableDevice } from '@/types/device-types'

// 使用統一的Resident接口
import { Resident } from '@/types/device-types'

export default function ResidentsPage() {
  const { t } = useTranslation()
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

  // 整合設備監控數據
  const { realTimeDevices } = useDeviceMonitoring()
  const { homes, floors } = useUWBLocation()

  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | 'good' | 'attention' | 'critical'>('all')
  const [selectedResident, setSelectedResident] = useState<Resident | null>(null)
  const [isEditingNotes, setIsEditingNotes] = useState(false)
  const [editedNotes, setEditedNotes] = useState('')
  const [showDeviceBinding, setShowDeviceBinding] = useState(false)
  const [selectedDevice, setSelectedDevice] = useState<Device | null>(null)
  const [showDeviceManagement, setShowDeviceManagement] = useState(false)

  // 新增：監控控制面板狀態

  // 新增病患相關狀態
  const [showAddResident, setShowAddResident] = useState(false)
  const [isEditingResident, setIsEditingResident] = useState(false)
  const [newResident, setNewResident] = useState({
    patientCode: '',
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
    avatar: '',
    expectedHome: '',
    expectedFloor: ''
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
          alert(t('pages:residents.alerts.importSuccess'))
        } else {
          alert(t('pages:residents.alerts.invalidFormat'))
        }
      } catch (error) {
        console.error('導入數據失敗:', error)
        alert(t('pages:residents.alerts.importFailed'))
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
          patientCode: '',
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
          avatar: '',
          expectedHome: '',
          expectedFloor: ''
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
            if (confirm(t('pages:residents.confirms.resetSettings'))) {
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
      resident.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (resident.patientCode || '').toLowerCase().includes(searchTerm.toLowerCase())
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
        patientCode: '',
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
        avatar: '',
        expectedHome: '',
        expectedFloor: ''
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
    if (confirm(t('pages:residents.confirms.removeResident'))) {
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

  // 處理 ResidentCard 的操作
  const handleResidentCardAction = (action: string, residentId: string, deviceId?: string) => {
    const resident = residents.find(r => r.id === residentId)
    if (!resident) return

    switch (action) {
      case 'manageDevices':
        handleDeviceBinding(resident)
        break
      case 'edit':
        setIsEditingResident(true)
        setNewResident({
          patientCode: (resident as any).patientCode || '',
          name: resident.name,
          age: resident.age,
          gender: resident.gender,
          room: resident.room,
          status: resident.status,
          emergencyContact: { ...resident.emergencyContact },
          careNotes: resident.careNotes,
          avatar: resident.avatar || '',
          expectedHome: (resident as any).expectedHome || '',
          expectedFloor: (resident as any).expectedFloor || ''
        })
        setSelectedResident(resident)
        break
      case 'remove':
        handleRemoveResident(residentId)
        break
      case 'info':
        handleResidentClick(resident)
        break
      case 'unbindDevice':
        if (deviceId) {
          handleUnbindDevice(deviceId, residentId)
        }
        break
    }
  }

  // 獲取實時數據
  const getDeviceWithRealTimeData = (device: Device) => {
    const realTimeData = realTimeDevices.get(device.id)
    return {
      ...device,
      realTimeData
    }
  }

  // 計算監控統計數據
  const getMonitoringStats = () => {
    const boundDevices = devices.filter(device => device.residentId)
    return {
      total: boundDevices.length,
      online: boundDevices.filter(device => {
        const realTimeData = realTimeDevices.get(device.id)
        return realTimeData && realTimeData.status === DeviceStatus.ACTIVE
      }).length,
      offline: boundDevices.filter(device => {
        const realTimeData = realTimeDevices.get(device.id)
        return !realTimeData || realTimeData.status === DeviceStatus.OFFLINE
      }).length,
      error: boundDevices.filter(device => {
        const realTimeData = realTimeDevices.get(device.id)
        return realTimeData && realTimeData.status === DeviceStatus.ERROR
      }).length,
      averageBattery: boundDevices.length > 0 ?
        Math.round(boundDevices.reduce((sum, device) => {
          const realTimeData = realTimeDevices.get(device.id)
          return sum + (realTimeData?.batteryLevel || device.batteryLevel || 0)
        }, 0) / boundDevices.length) : 0
    }
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
      [DeviceStatus.ACTIVE]: t('status:device.status.active'),
      [DeviceStatus.INACTIVE]: t('status:device.status.inactive'),
      [DeviceStatus.OFFLINE]: t('status:device.status.offline'),
      [DeviceStatus.ERROR]: t('status:device.status.error')
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
              {t('status:resident.status.good')}
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
              {t('status:resident.status.attention')}
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
              {t('status:resident.status.critical')}
            </Badge>
          ),
          icon: '🚨',
          bgColor: 'bg-red-100'
        }
      default:
        return {
          badge: <Badge>{t('status:resident.status.unknown', '未知')}</Badge>,
          icon: '❓',
          bgColor: 'bg-gray-100'
        }
    }
  }

  // 統計數據
  const deviceStatusSummary = getDeviceStatusSummary()
  // 未綁定設備（僅顯示可綁定的設備類型）
  const unboundDevices = devices.filter(device => 
    !device.residentId && isBindableDevice(device.deviceType)
  )

  return (
    <div className="p-6 space-y-6">
      {/* 頁面標題與統計 */}
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">{t('pages:residents.title')}</h1>
            <p className="text-muted-foreground">{t('pages:residents.subtitle')}</p>
          </div>
          <div className="flex gap-2">
            <Button onClick={() => setShowAddResident(true)}>
              <Plus className="h-4 w-4 mr-2" />
              {t('pages:residents.actions.addResident')}
            </Button>
            <Button onClick={() => setShowDeviceManagement(!showDeviceManagement)}>
              <Settings className="h-4 w-4 mr-2" />
              {showDeviceManagement ? t('pages:residents.actions.hideDeviceManagement') : t('pages:residents.actions.showDeviceManagement')}
            </Button>
          </div>
        </div>

        {/* 🚀 持久化狀態顯示 */}
        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <Database className="h-4 w-4" />
            <span>{t('status:system.persistence.status')}</span>
            {pendingSave ? (
              <Badge variant="outline" className="text-yellow-600">
                <Save className="h-3 w-3 mr-1 animate-pulse" />
                {t('status:system.persistence.saving')}
              </Badge>
            ) : (
              <Badge variant="outline" className="text-green-600">
                <Save className="h-3 w-3 mr-1" />
                {t('status:system.persistence.saved')}
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-2">
            <span>{t('status:system.persistence.lastSave')}</span>
            <span className="font-mono">
              {lastSaveTime.toLocaleTimeString()}
            </span>
          </div>
          {loadError && (
            <div className="flex items-center gap-2 text-red-600">
              <AlertCircle className="h-4 w-4" />
              <span>{t('status:system.persistence.loadError')} {loadError}</span>
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
            {t('status:system.actions.forceSave')}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={exportData}
            className="gap-2"
          >
            <Download className="h-4 w-4" />
            {t('status:system.actions.exportSettings')}
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
              {t('status:system.actions.importSettings')}
            </Button>
          </label>
          <Button
            variant="outline"
            size="sm"
            onClick={debugStorage}
            className="gap-2"
          >
            <Database className="h-4 w-4" />
            {t('status:system.actions.debugStorage')}
          </Button>
        </div>


        {/* 系統概覽統計 */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <Card className="bg-gradient-to-br from-blue-50 to-blue-100">
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-blue-700">{residents.length}</div>
              <div className="text-sm text-blue-600">{t('pages:residents.stats.totalResidents')}</div>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-green-50 to-green-100">
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-green-700">{deviceStatusSummary[DeviceStatus.ACTIVE]}</div>
              <div className="text-sm text-green-600">{t('pages:residents.stats.activeDevices')}</div>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-yellow-50 to-yellow-100">
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-yellow-700">{deviceStatusSummary[DeviceStatus.OFFLINE]}</div>
              <div className="text-sm text-yellow-600">{t('pages:residents.stats.offlineDevices')}</div>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-red-50 to-red-100">
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-red-700">{deviceStatusSummary[DeviceStatus.ERROR]}</div>
              <div className="text-sm text-red-600">{t('pages:residents.stats.errorDevices')}</div>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-gray-50 to-gray-100">
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-gray-700">{unboundDevices.length}</div>
              <div className="text-sm text-gray-600">{t('pages:residents.stats.unboundDevices')}</div>
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
                placeholder={t('pages:residents.search.placeholder')}
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
                {t('pages:residents.filters.all')}
              </Button>
              <Button
                variant={statusFilter === 'good' ? 'default' : 'outline'}
                onClick={() => setStatusFilter('good')}
                className="whitespace-nowrap"
              >
                <Heart className="w-4 h-4 mr-1" />
                {t('pages:residents.filters.good')}
              </Button>
              <Button
                variant={statusFilter === 'attention' ? 'default' : 'outline'}
                onClick={() => setStatusFilter('attention')}
                className="whitespace-nowrap"
              >
                <AlertTriangle className="w-4 h-4 mr-1" />
                {t('pages:residents.filters.attention')}
              </Button>
              <Button
                variant={statusFilter === 'critical' ? 'default' : 'outline'}
                onClick={() => setStatusFilter('critical')}
                className="whitespace-nowrap"
              >
                <AlertCircle className="w-4 h-4 mr-1" />
                {t('pages:residents.filters.critical')}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 院友列表 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>{t('pages:residents.list.title')}</span>
            <span className="text-sm font-normal text-muted-foreground">
              {t('pages:residents.list.count', { count: filteredResidents.length })}
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filteredResidents.map((resident) => {
              const residentDevices = getDevicesForResident(resident.id)
              // 為每個設備添加實時數據
              const devicesWithRealTime = residentDevices.map(device => getDeviceWithRealTimeData(device))

              return (
                <ResidentCard
                  key={resident.id}
                  resident={resident}
                  devices={devicesWithRealTime}
                  realTimeData={realTimeDevices}
                  onAction={handleResidentCardAction}
                />
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
              <span>{t('pages:residents.unboundDevices')}</span>
              <Badge variant="outline">{unboundDevices.length} {t('pages:residents.deviceCount')}</Badge>
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
                        {t('pages:residents.bindDevice')}
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
              <CardTitle>{t('pages:residents.modal.addResident')}</CardTitle>
              <Button variant="ghost" size="sm" onClick={() => setShowAddResident(false)}>
                <X className="h-5 w-5" />
              </Button>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium mb-2 block">{t('pages:residents.modal.name')} *</label>
                  <Input
                    placeholder={t('pages:residents.modal.placeholders.name')}
                    value={newResident.name}
                    onChange={(e) => setNewResident({ ...newResident, name: e.target.value })}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium mb-2 block">{t('pages:residents.id') || '院友代碼/病歷號'}</label>
                  <Input
                    placeholder={t('pages:residents.modal.placeholders.id', '院友代碼/病歷號（選填）')}
                    value={newResident.patientCode || ''}
                    onChange={(e) => setNewResident({ ...newResident, patientCode: e.target.value })}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium mb-2 block">{t('pages:residents.modal.age')} *</label>
                  <Input
                    type="number"
                    placeholder={t('pages:residents.modal.placeholders.age')}
                    value={newResident.age || ''}
                    onChange={(e) => setNewResident({ ...newResident, age: parseInt(e.target.value) || 0 })}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium mb-2 block">{t('pages:residents.modal.gender')}</label>
                  <Select value={newResident.gender} onValueChange={(value) => setNewResident({ ...newResident, gender: value })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="男">{t('pages:residents.modal.genderOptions.male')}</SelectItem>
                      <SelectItem value="女">{t('pages:residents.modal.genderOptions.female')}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-sm font-medium mb-2 block">{t('pages:residents.modal.room')} *</label>
                  <Input
                    placeholder={t('pages:residents.modal.placeholders.room')}
                    value={newResident.room}
                    onChange={(e) => setNewResident({ ...newResident, room: e.target.value })}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium mb-2 block">{t('pages:residents.modal.status')}</label>
                  <Select value={newResident.status} onValueChange={(value: 'good' | 'attention' | 'critical') => setNewResident({ ...newResident, status: value })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="good">{t('status:resident.status.good')}</SelectItem>
                      <SelectItem value="attention">{t('status:resident.status.attention')}</SelectItem>
                      <SelectItem value="critical">{t('status:resident.status.critical')}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-sm font-medium mb-2 block">{t('pages:residents.modal.avatar')}</label>
                  <Input
                    placeholder={t('pages:residents.modal.placeholders.avatar')}
                    value={newResident.avatar}
                    onChange={(e) => setNewResident({ ...newResident, avatar: e.target.value })}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium mb-2 block">{t('pages:diaperMonitoring.cloudDeviceMonitoring.selectNursingHome')}（{t('common:actions.optional') || '選填'}）</label>
                  <Select
                    value={newResident.expectedHome || 'none'}
                    onValueChange={(value) => setNewResident({
                      ...newResident,
                      expectedHome: value === 'none' ? '' : value,
                      expectedFloor: ''
                    })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={t('pages:diaperMonitoring.cloudDeviceMonitoring.selectNursingHomeFirst')} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">{t('pages:deviceManagement.filters.all')}</SelectItem>
                      {homes.map(home => (
                        <SelectItem key={home.id} value={home.id}>
                          {home.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-sm font-medium mb-2 block">{t('pages:diaperMonitoring.cloudDeviceMonitoring.selectFloor')}（{t('common:actions.optional') || '選填'}）</label>
                  <Select
                    value={newResident.expectedFloor || 'none'}
                    onValueChange={(value) => setNewResident({ ...newResident, expectedFloor: value === 'none' ? '' : value })}
                    disabled={!newResident.expectedHome}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={newResident.expectedHome ? t('pages:diaperMonitoring.cloudDeviceMonitoring.selectFloor') : t('pages:diaperMonitoring.cloudDeviceMonitoring.selectFloorFirst')} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">{t('pages:deviceManagement.filters.all')}</SelectItem>
                      {floors
                        .filter(floor => floor.homeId === newResident.expectedHome)
                        .map(floor => (
                          <SelectItem key={floor.id} value={floor.id}>
                            {floor.name}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block">{t('pages:residents.modal.emergencyContactName')}</label>
                <Input
                  placeholder={t('pages:residents.modal.placeholders.emergencyContactName')}
                  value={newResident.emergencyContact.name}
                  onChange={(e) => setNewResident({
                    ...newResident,
                    emergencyContact: { ...newResident.emergencyContact, name: e.target.value }
                  })}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium mb-2 block">{t('pages:residents.modal.relationship')}</label>
                  <Input
                    placeholder={t('pages:residents.modal.placeholders.relationship')}
                    value={newResident.emergencyContact.relationship}
                    onChange={(e) => setNewResident({
                      ...newResident,
                      emergencyContact: { ...newResident.emergencyContact, relationship: e.target.value }
                    })}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium mb-2 block">{t('pages:residents.modal.phone')}</label>
                  <Input
                    placeholder={t('pages:residents.modal.placeholders.phone')}
                    value={newResident.emergencyContact.phone}
                    onChange={(e) => setNewResident({
                      ...newResident,
                      emergencyContact: { ...newResident.emergencyContact, phone: e.target.value }
                    })}
                  />
                </div>
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block">{t('pages:residents.modal.careNotes')}</label>
                <Textarea
                  placeholder={t('pages:residents.modal.placeholders.careNotes')}
                  value={newResident.careNotes}
                  onChange={(e) => setNewResident({ ...newResident, careNotes: e.target.value })}
                  rows={3}
                />
              </div>

              <div className="flex gap-3 pt-4">
                <Button variant="outline" onClick={() => setShowAddResident(false)} className="flex-1">
                  {t('common:actions.cancel')}
                </Button>
                <Button
                  onClick={handleAddResident}
                  className="flex-1"
                  disabled={!newResident.name || !newResident.room || newResident.age <= 0}
                >
                  {t('pages:residents.modal.addResident')}
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
                  {selectedResident.age} {t('pages:residents.ageUnit')}, {selectedResident.gender}, {t('pages:residents.room')} {selectedResident.room}
                </p>
                <p className="text-sm text-muted-foreground mt-1">
                  {t('pages:residents.id')}: {(selectedResident as any).patientCode || selectedResident.id}
                </p>
                {(() => {
                  const expectedHomeId = (selectedResident as any).expectedHome || ''
                  const expectedFloorId = (selectedResident as any).expectedFloor || ''
                  const homeName = homes.find(h => h.id === expectedHomeId)?.name
                  const floorName = floors.find(f => f.id === expectedFloorId)?.name
                  const hasLocation = homeName || floorName
                  if (!hasLocation) return null
                  return (
                    <p className="text-sm text-muted-foreground mt-1">
                      {t('pages:diaperMonitoring.cloudDeviceMonitoring.selectNursingHome')}: {homeName || t('pages:deviceManagement.filters.all')}
                      {floorName && ` / ${t('pages:diaperMonitoring.cloudDeviceMonitoring.selectFloor')}: ${floorName}`}
                    </p>
                  )
                })()}
            </CardHeader>
            <CardContent className="space-y-4">
              {/* 編輯院友資訊 */}
              {isEditingResident ? (
                <div className="space-y-4">
                  <h4 className="font-semibold text-blue-600">{t('pages:residents.detailModal.editInfo')}</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium mb-2 block">{t('pages:residents.modal.name')}</label>
                      <Input
                        value={newResident.name}
                        onChange={(e) => setNewResident({ ...newResident, name: e.target.value })}
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium mb-2 block">{t('pages:residents.id') || '院友代碼/病歷號'}</label>
                      <Input
                        value={newResident.patientCode || ''}
                        onChange={(e) => setNewResident({ ...newResident, patientCode: e.target.value })}
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium mb-2 block">{t('pages:residents.modal.age')}</label>
                      <Input
                        type="number"
                        value={newResident.age || ''}
                        onChange={(e) => setNewResident({ ...newResident, age: parseInt(e.target.value) || 0 })}
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium mb-2 block">{t('pages:residents.modal.gender')}</label>
                      <Select value={newResident.gender} onValueChange={(value) => setNewResident({ ...newResident, gender: value })}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="男">{t('pages:residents.modal.genderOptions.male')}</SelectItem>
                          <SelectItem value="女">{t('pages:residents.modal.genderOptions.female')}</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <label className="text-sm font-medium mb-2 block">{t('pages:residents.modal.room')}</label>
                      <Input
                        value={newResident.room}
                        onChange={(e) => setNewResident({ ...newResident, room: e.target.value })}
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium mb-2 block">{t('pages:residents.modal.status')}</label>
                      <Select value={newResident.status} onValueChange={(value: 'good' | 'attention' | 'critical') => setNewResident({ ...newResident, status: value })}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="good">{t('status:resident.status.good')}</SelectItem>
                          <SelectItem value="attention">{t('status:resident.status.attention')}</SelectItem>
                          <SelectItem value="critical">{t('status:resident.status.critical')}</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <label className="text-sm font-medium mb-2 block">{t('pages:residents.modal.avatar')}</label>
                      <Input
                        value={newResident.avatar}
                        onChange={(e) => setNewResident({ ...newResident, avatar: e.target.value })}
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium mb-2 block">{t('pages:diaperMonitoring.cloudDeviceMonitoring.selectNursingHome')}（{t('common:actions.optional') || '選填'}）</label>
                      <Select
                        value={newResident.expectedHome || 'none'}
                        onValueChange={(value) => setNewResident({
                          ...newResident,
                          expectedHome: value === 'none' ? '' : value,
                          expectedFloor: ''
                        })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder={t('pages:diaperMonitoring.cloudDeviceMonitoring.selectNursingHomeFirst')} />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">{t('pages:deviceManagement.filters.all')}</SelectItem>
                          {homes.map(home => (
                            <SelectItem key={home.id} value={home.id}>
                              {home.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <label className="text-sm font-medium mb-2 block">{t('pages:diaperMonitoring.cloudDeviceMonitoring.selectFloor')}（{t('common:actions.optional') || '選填'}）</label>
                      <Select
                        value={newResident.expectedFloor || 'none'}
                        onValueChange={(value) => setNewResident({ ...newResident, expectedFloor: value === 'none' ? '' : value })}
                        disabled={!newResident.expectedHome}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder={newResident.expectedHome ? t('pages:diaperMonitoring.cloudDeviceMonitoring.selectFloor') : t('pages:diaperMonitoring.cloudDeviceMonitoring.selectFloorFirst')} />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">{t('pages:deviceManagement.filters.all')}</SelectItem>
                          {floors
                            .filter(floor => floor.homeId === newResident.expectedHome)
                            .map(floor => (
                              <SelectItem key={floor.id} value={floor.id}>
                                {floor.name}
                              </SelectItem>
                            ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div>
                    <label className="text-sm font-medium mb-2 block">{t('pages:residents.modal.emergencyContactName')}</label>
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
                      <label className="text-sm font-medium mb-2 block">{t('pages:residents.modal.relationship')}</label>
                      <Input
                        value={newResident.emergencyContact.relationship}
                        onChange={(e) => setNewResident({
                          ...newResident,
                          emergencyContact: { ...newResident.emergencyContact, relationship: e.target.value }
                        })}
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium mb-2 block">{t('pages:residents.modal.phone')}</label>
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
                      {t('common:actions.save')}
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => setIsEditingResident(false)}
                      size="sm"
                    >
                      {t('common:actions.cancel')}
                    </Button>
                  </div>
                </div>
              ) : (
                <>
                  {/* 緊急聯絡人 */}
                  <div>
                    <h4 className="font-semibold text-blue-600 mb-2">{t('pages:residents.detailModal.emergencyContact')}</h4>
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
                    <h4 className="font-semibold text-blue-600 mb-2">{t('pages:residents.detailModal.careNotes')}</h4>
                    {isEditingNotes ? (
                      <div className="space-y-2">
                        <Textarea
                          value={editedNotes}
                          onChange={(e) => setEditedNotes(e.target.value)}
                          placeholder={t('pages:residents.detailModal.careNotesPlaceholder')}
                          rows={4}
                        />
                        <div className="flex gap-2">
                          <Button onClick={handleUpdateNotes} size="sm">
                            {t('common:actions.save')}
                          </Button>
                          <Button
                            variant="outline"
                            onClick={() => setIsEditingNotes(false)}
                            size="sm"
                          >
                            {t('common:actions.cancel')}
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div className="bg-gray-50 p-3 rounded-lg">
                        <p className="text-sm whitespace-pre-wrap">
                          {selectedResident.careNotes || t('pages:residents.detailModal.noCareNotes')}
                        </p>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setIsEditingNotes(true)}
                          className="mt-2 p-0 h-auto"
                        >
                          <Edit className="w-4 h-4 mr-1" />
                          {t('pages:residents.detailModal.editCareNotes')}
                        </Button>
                      </div>
                    )}
                  </div>

                  {/* 綁定設備列表 */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-semibold text-blue-600">{t('pages:residents.boundDevices')}</h4>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setShowDeviceBinding(true)
                          setSelectedDevice(null)
                        }}
                      >
                        <Plus className="h-4 w-4 mr-1" />
                        {t('pages:residents.detailModal.addDevice')}
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
                        {t('pages:residents.detailModal.noDevicesBound')}
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
                  {t('pages:residents.detailModal.close')}
                </Button>
                {!isEditingResident && (
                  <Button
                    onClick={() => {
                      setIsEditingResident(true)
                      setNewResident({
                        patientCode: (selectedResident as any).patientCode || '',
                        name: selectedResident.name,
                        age: selectedResident.age,
                        gender: selectedResident.gender,
                        room: selectedResident.room,
                        status: selectedResident.status,
                        emergencyContact: { ...selectedResident.emergencyContact },
                        careNotes: selectedResident.careNotes,
                        avatar: selectedResident.avatar || '',
                        expectedHome: (selectedResident as any).expectedHome || '',
                        expectedFloor: (selectedResident as any).expectedFloor || ''
                      })
                    }}
                    className="flex-1"
                  >
                    <Edit className="h-4 w-4 mr-1" />
                    {t('pages:residents.detailModal.editInfo')}
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
