import React, { useState, useEffect, useCallback, useRef } from "react"
import { useTranslation } from "react-i18next"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Search,
  Watch,
  AlertCircle,
  Settings,
  Plus,
  MapPin,
  Baby,
  X,
  Database,
  Save,
  Download,
  Upload,
  Wifi,
  Filter,
  Activity,
  Anchor,
  Unlink,
  Trash2,
  LayoutGrid,
  List,
  ChevronDown,
  MoreVertical
} from "lucide-react"
import { useDeviceManagement } from "@/contexts/DeviceManagementContext"
import { useDeviceDiscovery } from "@/contexts/DeviceDiscoveryContext"
import { useUWBLocation } from "@/contexts/UWBLocationContext"
import { useDeviceMonitoring } from "@/contexts/DeviceMonitoringContext"
import { DeviceType, DeviceStatus, DeviceUIDGenerator } from "@/types/device-types"
import DeviceBindingModal from "@/components/DeviceBindingModal"
import DeviceDiscoveryModal from "@/components/DeviceDiscoveryModal"
import DeviceMonitorCard from "@/components/DeviceMonitorCard"
import DeviceListRow from "@/components/DeviceListRow"
import DeviceInfoModal from "@/components/DeviceInfoModal"

export default function DeviceManagementPage() {
  const { t } = useTranslation()
  const {
    devices,
    residents,
    addDevice,
    removeDevice,
    unbindDevice,
    getDeviceTypeSummary,
    getDeviceStatusSummary,
    autoAddDevices,
    setAutoAddDevices
  } = useDeviceManagement()

  // 保留 useDeviceDiscovery 導入但不再使用（代碼備用）
  // const { startDiscovery } = useDeviceDiscovery()
  const {
    homes,
    floors,
    gateways,
    selectedHome,
    setSelectedHome,
    selectedFloor,
    setSelectedFloor,
    selectedGateway,
    setSelectedGateway
  } = useUWBLocation()
  const { realTimeDevices, isMonitoring } = useDeviceMonitoring()

  const [searchTerm, setSearchTerm] = useState("")
  const [selectedFilter, setSelectedFilter] = useState<DeviceType | "all">("all")
  const [showAddModal, setShowAddModal] = useState(false)

  // 新增：綁定模態框狀態
  const [showBindingModal, setShowBindingModal] = useState(false)
  const [bindingDevice, setBindingDevice] = useState<any>(null)
  // 新增：設備資訊模態框狀態
  const [showDeviceInfoModal, setShowDeviceInfoModal] = useState(false)
  const [selectedDeviceInfo, setSelectedDeviceInfo] = useState<any>(null)

  // 批量操作状态
  const [selectedDeviceIds, setSelectedDeviceIds] = useState<Set<string>>(new Set())
  const [showBatchActions, setShowBatchActions] = useState(false)

  // 视图模式状态：'list' 或 'grid'
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list')

  // 新增設備的狀態
  const [newDevice, setNewDevice] = useState({
    deviceType: DeviceType.SMARTWATCH_300B,
    name: "",
    hardwareId: "",
    mac: "",
    deviceId: "",
    gatewayId: ""
  })

  // 移除本地的 MQTT 處理邏輯，直接使用全局狀態
  // ... (原有的 updateMqttData 邏輯已移至 DeviceMonitoringContext)

  // 🚀 持久化系統狀態
  const [lastSaveTime, setLastSaveTime] = useState<Date>(new Date())
  const [pendingSave, setPendingSave] = useState<boolean>(false)
  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  // 📦 從 localStorage 加載數據的輔助函數
  const loadFromStorage = <T,>(key: string, defaultValue: T): T => {
    try {
      const stored = localStorage.getItem(`device_mgmt_${key}`)
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
      localStorage.setItem(`device_mgmt_${key}`, JSON.stringify(data))
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
          selectedFilter,
          newDevice,
          viewMode,
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
        localStorage.setItem('device_mgmt_full_backup', JSON.stringify(dataToSave))

        setLastSaveTime(new Date())
        setPendingSave(false)
        console.log(`💾 設備管理自動保存完成 ${new Date().toLocaleTimeString()}`)
      } catch (error) {
        console.error('❌ 設備管理自動保存失敗:', error)
        setPendingSave(false)
      }
    }, 500) // 500ms延遲，避免頻繁保存
  }, [searchTerm, selectedFilter, newDevice, viewMode])

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
    const keys = ['searchTerm', 'selectedFilter', 'newDevice', 'viewMode', 'version', 'lastSave']
    keys.forEach(key => {
      localStorage.removeItem(`device_mgmt_${key}`)
    })
    // 也清除完整備份
    localStorage.removeItem('device_mgmt_full_backup')
    console.log('🗑️ 已清除所有設備管理 localStorage 數據和備份')

    // 重新加載頁面以重置狀態
    window.location.reload()
  }

  // 調試：檢查當前存儲數據
  const debugStorage = () => {
    console.log('🔍 當前設備管理 localStorage 數據:')
    const keys = ['searchTerm', 'selectedFilter', 'newDevice', 'viewMode', 'version', 'lastSave']
    keys.forEach(key => {
      const data = localStorage.getItem(`device_mgmt_${key}`)
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
      devices,
      searchTerm,
      selectedFilter,
      newDevice,
      exportDate: new Date().toISOString()
    }

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `device-management-data-${new Date().toISOString().split('T')[0]}.json`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)

    console.log('📤 設備管理數據已導出')
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
        if (data.devices && Array.isArray(data.devices)) {
          // 注意：這裡需要通過 Context 來更新設備數據
          // 因為 devices 是從 Context 管理的
          console.log('📥 設備數據已導入，但需要通過系統管理更新')
          alert(t('pages:deviceManagement.alerts.importSuccess'))
        } else {
          alert(t('pages:deviceManagement.alerts.invalidFormat'))
        }
      } catch (error) {
        console.error('導入數據失敗:', error)
        alert(t('pages:deviceManagement.alerts.importFailed'))
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

        console.log('🔄 開始加載設備管理本地存儲數據...')

        // 加載用戶設定
        const loadedSearchTerm = loadFromStorage('searchTerm', '')
        const loadedSelectedFilter = loadFromStorage('selectedFilter', 'all')
        const loadedViewMode = loadFromStorage<'list' | 'grid'>('viewMode', 'list')
        const loadedNewDevice = loadFromStorage('newDevice', {
          deviceType: DeviceType.SMARTWATCH_300B,
          name: "",
          hardwareId: "",
          mac: "",
          deviceId: "",
          gatewayId: ""
        })

        setSearchTerm(loadedSearchTerm)
        setSelectedFilter(loadedSelectedFilter)
        setViewMode(loadedViewMode)
        setNewDevice(loadedNewDevice)

        console.log('✅ 設備管理數據加載完成')
        setIsLoading(false)
      } catch (error) {
        console.error('❌ 設備管理數據加載失敗:', error)
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
  }, [searchTerm, selectedFilter, newDevice, viewMode, batchSave, isLoading])

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
            if (confirm(t('pages:deviceManagement.confirms.resetSettings'))) {
              clearAllStorage()
            }
            break
        }
      }
    }

    window.addEventListener('keydown', handleKeydown)
    return () => window.removeEventListener('keydown', handleKeydown)
  }, [])

  // 輔助函數：檢查設備是否匹配閘道器（使用 cloud_gateway_id 進行匹配）
  const deviceMatchesGateway = (device: any, gateway: any): boolean => {
    if (!device.gatewayId) return false

    // 設備的 gatewayId 可能是 cloud_gateway_id（數字或字符串）
    const deviceGatewayId = String(device.gatewayId)

    // 閘道器的 cloud_gateway_id 可能在不同位置
    const gatewayCloudId = gateway.cloud_gateway_id || gateway.cloudData?.gateway_id

    if (gatewayCloudId) {
      return deviceGatewayId === String(gatewayCloudId)
    }

    // 備用：直接比較 gateway.id
    return deviceGatewayId === gateway.id
  }

  // 篩選設備
  const filteredDevices = devices.filter(device => {
    const matchesSearch =
      device.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      device.hardwareId.toLowerCase().includes(searchTerm.toLowerCase()) ||
      device.deviceUid.toLowerCase().includes(searchTerm.toLowerCase())

    const matchesFilter =
      selectedFilter === "all" || device.deviceType === selectedFilter

    // 根據選擇的區域篩選設備（閘道器 > 樓層 > 養老院）
    let matchesArea = true

    if (selectedGateway && selectedGateway !== "") {
      // 如果選擇了特定閘道器，只顯示該閘道器的設備
      const gateway = gateways.find(gw => gw.id === selectedGateway)
      matchesArea = gateway ? deviceMatchesGateway(device, gateway) : false
    } else if (selectedFloor && selectedFloor !== "") {
      // 如果選擇了樓層，顯示該樓層所有閘道器的設備
      const floorGateways = gateways.filter(gateway => gateway.floorId === selectedFloor)
      matchesArea = device.gatewayId ? floorGateways.some(gateway => deviceMatchesGateway(device, gateway)) : false
    } else if (selectedHome && selectedHome !== "") {
      // 如果選擇了養老院，顯示該養老院所有樓層所有閘道器的設備
      const homeFloors = floors.filter(floor => floor.homeId === selectedHome)
      const homeGateways = gateways.filter(gateway =>
        homeFloors.some(floor => floor.id === gateway.floorId)
      )
      matchesArea = device.gatewayId ? homeGateways.some(gateway => deviceMatchesGateway(device, gateway)) : false
    }
    // 如果沒有選擇任何區域，顯示所有設備

    return matchesSearch && matchesFilter && matchesArea
  })



  // 處理新增設備
  const handleAddDevice = () => {
    let deviceUid: string

    // 根據設備類型生成UID
    if (newDevice.deviceType === DeviceType.SMARTWATCH_300B) {
      deviceUid = DeviceUIDGenerator.generate300B(newDevice.mac)
    } else if (newDevice.deviceType === DeviceType.DIAPER_SENSOR) {
      deviceUid = DeviceUIDGenerator.generateDiaper(newDevice.mac)
    } else if (newDevice.deviceType === DeviceType.PEDOMETER) {
      deviceUid = DeviceUIDGenerator.generatePedo(newDevice.deviceId)
    } else if (newDevice.deviceType === DeviceType.UWB_TAG) {
      deviceUid = DeviceUIDGenerator.generateTag(newDevice.deviceId)
    } else if (newDevice.deviceType === DeviceType.UWB_ANCHOR) {
      deviceUid = DeviceUIDGenerator.generateAnchor(newDevice.deviceId)
    } else if (newDevice.deviceType === DeviceType.GATEWAY) {
      deviceUid = DeviceUIDGenerator.generateGateway(newDevice.deviceId || newDevice.gatewayId || '')
    } else {
      deviceUid = DeviceUIDGenerator.generateTag(newDevice.deviceId)
    }

    const deviceData = {
      deviceUid: deviceUid as any,
      deviceType: newDevice.deviceType,
      name: newDevice.name,
      hardwareId: newDevice.hardwareId,
      status: DeviceStatus.ACTIVE,
      gatewayId: newDevice.gatewayId || undefined
    }

    addDevice(deviceData)

    // 🚀 手動觸發設備數據保存
    setTimeout(() => {
      const currentDevices = devices
      const devicesToSave = [...currentDevices, {
        ...deviceData,
        id: `D${Date.now()}`,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }]

      try {
        localStorage.setItem('device_mgmt_context_devices', JSON.stringify(devicesToSave))
        console.log('💾 設備數據已手動保存到 localStorage')
      } catch (error) {
        console.error('❌ 設備數據保存失敗:', error)
      }
    }, 100)

    setShowAddModal(false)
    setNewDevice({
      deviceType: DeviceType.SMARTWATCH_300B,
      name: "",
      hardwareId: "",
      mac: "",
      deviceId: "",
      gatewayId: ""
    })
  }





  // 批量选择处理
  const handleSelectDevice = (deviceId: string, checked: boolean) => {
    setSelectedDeviceIds(prev => {
      const newSet = new Set(prev)
      if (checked) {
        newSet.add(deviceId)
      } else {
        newSet.delete(deviceId)
      }
      return newSet
    })
  }

  // 全选/取消全选
  const handleSelectAll = () => {
    if (selectedDeviceIds.size === filteredDevices.length) {
      setSelectedDeviceIds(new Set())
    } else {
      setSelectedDeviceIds(new Set(filteredDevices.map(d => d.id)))
    }
  }

  // 批量解除绑定
  const handleBatchUnbind = () => {
    const devicesToUnbind = Array.from(selectedDeviceIds)
      .map(id => devices.find(d => d.id === id))
      .filter(d => d && d.residentId)

    if (devicesToUnbind.length === 0) {
      alert(t('pages:deviceManagement.batchActions.noBindableDevices'))
      return
    }

    const deviceNames = devicesToUnbind.map(d => d!.name).join('、')
    if (confirm(t('pages:deviceManagement.batchActions.confirmUnbind', {
      count: devicesToUnbind.length,
      devices: deviceNames
    }))) {
      devicesToUnbind.forEach(device => {
        if (device && device.residentId) {
          unbindDevice(device.id, device.residentId)
        }
      })
      setSelectedDeviceIds(new Set())
      alert(t('pages:deviceManagement.batchActions.unbindSuccess', { count: devicesToUnbind.length }))
    }
  }

  // 批量移除设备
  const handleBatchRemove = () => {
    const devicesToRemove = Array.from(selectedDeviceIds)
      .map(id => devices.find(d => d.id === id))
      .filter(d => d)

    if (devicesToRemove.length === 0) {
      alert(t('pages:deviceManagement.batchActions.noDevicesSelected'))
      return
    }

    const deviceNames = devicesToRemove.map(d => d!.name).join('、')
    if (confirm(t('pages:deviceManagement.batchActions.confirmRemove', {
      count: devicesToRemove.length,
      devices: deviceNames
    }))) {
      devicesToRemove.forEach(device => {
        if (device) {
          removeDevice(device.id)
        }
      })
      setSelectedDeviceIds(new Set())
      alert(t('pages:deviceManagement.batchActions.removeSuccess', { count: devicesToRemove.length }))
    }
  }

  // 新增：處理設備操作
  const handleDeviceAction = (action: string, deviceId: string) => {
    console.log(`執行操作: ${action} 設備ID: ${deviceId}`)

    switch (action) {
      case 'deviceInfo':
        // 實現設備資訊顯示邏輯
        const device = devices.find(d => d.id === deviceId)
        if (device) {
          setSelectedDeviceInfo(device)
          setShowDeviceInfoModal(true)
        } else {
          alert('找不到設備資訊')
        }
        break
      case 'bindDevice':
        // 實現設備綁定邏輯
        const deviceToBind = devices.find(d => d.id === deviceId)
        if (deviceToBind) {
          setBindingDevice(deviceToBind)
          setShowBindingModal(true)
        } else {
          alert('找不到設備資訊')
        }
        break
      case 'deviceData':
        // 實現設備數據查看邏輯
        alert('設備數據功能開發中...')
        break
      case 'qrcode':
        // QR Code 功能占位
        alert('QR Code 功能开发中...')
        break
      case 'unbind':
        // 實現解除綁定邏輯
        if (confirm('確定要解除設備綁定嗎？')) {
          const device = devices.find(d => d.id === deviceId)
          if (device && device.residentId) {
            unbindDevice(device.id, device.residentId)
            console.log('解除綁定設備:', deviceId)
          }
        }
        break
      case 'remove':
        // 實現移除設備邏輯
        if (confirm('確定要移除這個設備嗎？此操作無法復原。')) {
          try {
            removeDevice(deviceId)
            console.log('設備已移除:', deviceId)
          } catch (error) {
            console.error('移除設備失敗:', error)
            alert('移除設備失敗')
          }
        }
        break
      default:
        console.log('未知操作:', action)
    }
  }




  // 獲取實時數據
  const getDeviceWithRealTimeData = (device: any) => {
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

  // 獲取設備綁定的院友信息
  const getResidentForDevice = (deviceId: string) => {
    const device = devices.find(d => d.id === deviceId)
    if (!device || !device.residentId) return undefined

    // 從院友列表中獲取院友信息
    const resident = residents.find(r => r.id === device.residentId)

    if (!resident) return undefined

    return {
      id: resident.id,
      name: resident.name,
      age: resident.age,
      gender: resident.gender,
      room: resident.room,
      status: resident.status,
      emergencyContact: resident.emergencyContact,
      careNotes: resident.careNotes
    }
  }

  // 統計數據
  const deviceTypeSummary = getDeviceTypeSummary()
  const deviceStatusSummary = getDeviceStatusSummary()
  const totalDevices = devices.length
  const activeDevices = deviceStatusSummary[DeviceStatus.ACTIVE]

  return (
    <div className="space-y-6">
      {/* 頁面標題和模式切換 */}
      <div className="flex flex-col gap-4">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold">{t('pages:deviceManagement.title')}</h1>
            <p className="text-muted-foreground">
              {t('pages:deviceManagement.subtitle')}
            </p>
          </div>

        </div>

        {/* 🚀 持久化狀態顯示 */}
        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <Database className="h-4 w-4" />
            <span>{t('status:system.persistence.status')}:</span>
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
            <span>{t('status:system.persistence.lastSave')}:</span>
            <span className="font-mono">
              {lastSaveTime.toLocaleTimeString()}
            </span>
          </div>
          {loadError && (
            <div className="flex items-center gap-2 text-red-600">
              <AlertCircle className="h-4 w-4" />
              <span>{t('status:system.persistence.loadError')}: {loadError}</span>
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
            {t('pages:deviceManagement.actions.forceSave')}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={exportData}
            className="gap-2"
          >
            <Download className="h-4 w-4" />
            {t('pages:deviceManagement.actions.exportSettings')}
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
              {t('pages:deviceManagement.actions.importSettings')}
            </Button>
          </label>
          <Button
            variant="outline"
            size="sm"
            onClick={debugStorage}
            className="gap-2"
          >
            <Database className="h-4 w-4" />
            {t('pages:deviceManagement.actions.debugStorage')}
          </Button>
        </div>
      </div>

      {/* 設備管理內容 */}
      <>
        {/* 監控狀態顯示 */}
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold">{t('pages:deviceManagement.monitoring.title')}</h3>
            <div className="flex items-center gap-2">
              {isMonitoring ? (
                <Badge className="bg-green-100 text-green-800 hover:bg-green-100">
                  <Activity className="w-3 h-3 mr-1 animate-pulse" />
                  {t('pages:diaperMonitoring.connectionStatus.connected')}
                </Badge>
              ) : (
                <Badge variant="outline" className="text-gray-500">
                  <Wifi className="w-3 h-3 mr-1" />
                  {t('pages:diaperMonitoring.connectionStatus.disconnected')}
                </Badge>
              )}
            </div>
          </div>

        </div>

        {/* 搜尋框和養老院選擇 */}
        <Card>
          <CardContent className="pt-6">
            <div className="space-y-4">
              {/* 搜尋框 */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder={t('pages:deviceManagement.searchPlaceholder')}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>

              {/* 區域選擇器 - 橫排 */}
              <div className="flex flex-col sm:flex-row gap-4">
                {/* 養老院選擇 */}
                <div className="flex-1 space-y-2">
                  <label className="text-sm font-medium text-gray-700">
                    {t('pages:diaperMonitoring.cloudDeviceMonitoring.selectNursingHome')}
                  </label>
                  <Select
                    value={selectedHome || "__all__"}
                    onValueChange={(value) => {
                      if (value === "__all__") {
                        setSelectedHome("")
                        setSelectedFloor("")
                        setSelectedGateway("")
                      } else {
                        setSelectedHome(value)
                      }
                    }}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder={t('pages:diaperMonitoring.cloudDeviceMonitoring.selectNursingHomeFirst')} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__all__">
                        {t('pages:deviceManagement.filters.all')}
                      </SelectItem>
                      {homes.map(home => (
                        <SelectItem key={home.id} value={home.id}>
                          {home.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* 樓層選擇 */}
                <div className="flex-1 space-y-2">
                  <label className="text-sm font-medium text-gray-700">
                    {t('pages:diaperMonitoring.cloudDeviceMonitoring.selectFloor')}
                  </label>
                  <Select
                    value={selectedFloor}
                    onValueChange={setSelectedFloor}
                    disabled={!selectedHome}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder={selectedHome ? t('pages:diaperMonitoring.cloudDeviceMonitoring.selectFloor') : t('pages:diaperMonitoring.cloudDeviceMonitoring.selectFloorFirst')} />
                    </SelectTrigger>
                    <SelectContent>
                      {floors
                        .filter(floor => floor.homeId === selectedHome)
                        .map(floor => (
                          <SelectItem key={floor.id} value={floor.id}>
                            {floor.name}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* 閘道器選擇 */}
                <div className="flex-1 space-y-2">
                  <label className="text-sm font-medium text-gray-700">
                    {t('pages:diaperMonitoring.cloudDeviceMonitoring.selectGateway')}
                  </label>
                  <Select
                    value={selectedGateway}
                    onValueChange={setSelectedGateway}
                    disabled={!selectedFloor}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder={selectedFloor ? t('pages:diaperMonitoring.cloudDeviceMonitoring.selectGateway') : t('pages:diaperMonitoring.cloudDeviceMonitoring.selectGatewayFirst')} />
                    </SelectTrigger>
                    <SelectContent>
                      {gateways
                        .filter(gateway => gateway.floorId === selectedFloor)
                        .map(gateway => (
                          <SelectItem key={gateway.id} value={gateway.id}>
                            <div className="flex items-center justify-between w-full">
                              <span>{gateway.name}</span>
                              <span className="text-xs text-muted-foreground ml-2">
                                {gateway.macAddress}
                              </span>
                            </div>
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 篩選標籤和操作按鈕 */}
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div className="flex gap-2 flex-wrap">
            <Button
              variant={selectedFilter === "all" ? "default" : "outline"}
              onClick={() => setSelectedFilter("all")}
              className="gap-2"
            >
              <Settings className="h-4 w-4" />
              {t('pages:deviceManagement.filters.all')}
            </Button>
            <Button
              variant={selectedFilter === DeviceType.SMARTWATCH_300B ? "default" : "outline"}
              onClick={() => setSelectedFilter(DeviceType.SMARTWATCH_300B)}
              className="gap-2"
            >
              <Watch className="h-4 w-4" />
              {t('pages:deviceManagement.filters.smartwatch300B')}
            </Button>
            <Button
              variant={selectedFilter === DeviceType.DIAPER_SENSOR ? "default" : "outline"}
              onClick={() => setSelectedFilter(DeviceType.DIAPER_SENSOR)}
              className="gap-2"
            >
              <Baby className="h-4 w-4" />
              {t('pages:deviceManagement.filters.diaperSensor')}
            </Button>
            <Button
              variant={selectedFilter === DeviceType.PEDOMETER ? "default" : "outline"}
              onClick={() => setSelectedFilter(DeviceType.PEDOMETER)}
              className="gap-2"
            >
              <Settings className="h-4 w-4" />
              {t('pages:deviceManagement.filters.pedometer')}
            </Button>
            <Button
              variant={selectedFilter === DeviceType.UWB_TAG ? "default" : "outline"}
              onClick={() => setSelectedFilter(DeviceType.UWB_TAG)}
              className="gap-2"
            >
              <MapPin className="h-4 w-4" />
              {t('pages:deviceManagement.filters.uwbTag')}
            </Button>
            <Button
              variant={selectedFilter === DeviceType.UWB_ANCHOR ? "default" : "outline"}
              onClick={() => setSelectedFilter(DeviceType.UWB_ANCHOR)}
              className="gap-2"
            >
              <Anchor className="h-4 w-4" />
              {t('pages:deviceManagement.filters.uwbAnchor') || '定位錨點'}
            </Button>
            <Button
              variant={selectedFilter === DeviceType.GATEWAY ? "default" : "outline"}
              onClick={() => setSelectedFilter(DeviceType.GATEWAY)}
              className="gap-2"
            >
              <Wifi className="h-4 w-4" />
              {t('pages:deviceManagement.filters.gateway')}
            </Button>
          </div>

          <div className="flex items-center gap-2">
            {/* 自動加入設備開關 */}
            <div className="flex items-center gap-2 px-3 py-2 border rounded-md bg-white">
              <Switch
                checked={autoAddDevices}
                onCheckedChange={setAutoAddDevices}
              />
              <label className="text-sm font-medium cursor-pointer" onClick={() => setAutoAddDevices(!autoAddDevices)}>
                {autoAddDevices ? t('pages:deviceManagement.autoAdd.enabled') : t('pages:deviceManagement.autoAdd.disabled')}
              </label>
            </div>

            <Button onClick={() => setShowAddModal(true)}>
              <Plus className="h-4 w-4 mr-2" />
              {t('pages:deviceManagement.actions.addDevice')}
            </Button>
          </div>
        </div>

        {/* 統計資訊 */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <p className="text-2xl font-bold">{totalDevices}</p>
                <p className="text-sm text-muted-foreground">{t('pages:deviceManagement.stats.totalDevices')}</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <p className="text-2xl font-bold text-green-600">{activeDevices}</p>
                <p className="text-sm text-muted-foreground">{t('pages:deviceManagement.stats.activeDevices')}</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <p className="text-2xl font-bold text-blue-600">{deviceTypeSummary[DeviceType.SMARTWATCH_300B]}</p>
                <p className="text-sm text-muted-foreground">{t('pages:deviceManagement.stats.smartwatch300B')}</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <p className="text-2xl font-bold text-purple-600">{deviceTypeSummary[DeviceType.DIAPER_SENSOR]}</p>
                <p className="text-sm text-muted-foreground">{t('pages:deviceManagement.stats.diaperSensor')}</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <p className="text-2xl font-bold text-orange-600">{deviceTypeSummary[DeviceType.UWB_TAG] + deviceTypeSummary[DeviceType.PEDOMETER] + deviceTypeSummary[DeviceType.UWB_ANCHOR]}</p>
                <p className="text-sm text-muted-foreground">{t('pages:deviceManagement.stats.otherDevices')}</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* 批量操作工具栏 - 仅在选择特定设备类型时显示 */}
        {selectedFilter !== "all" && filteredDevices.length > 0 && (
          <Card className="bg-blue-50 border-blue-200">
            <CardContent className="py-3">
              <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
                <div className="flex items-center gap-2 md:gap-4">
                  <span className="text-sm font-medium text-gray-700">
                    {t('pages:deviceManagement.batchActions.selectedCount')} <span className="text-blue-600 font-bold">{selectedDeviceIds.size}</span> {t('pages:deviceManagement.batchActions.devices')}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleSelectAll}
                    className="gap-2"
                  >
                    {selectedDeviceIds.size === filteredDevices.length
                      ? t('pages:deviceManagement.batchActions.deselectAll')
                      : t('pages:deviceManagement.batchActions.selectAll')}
                  </Button>
                </div>

                {/* 批量操作下拉菜单 */}
                {selectedDeviceIds.size > 0 && (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="outline"
                        size="sm"
                        className="gap-2"
                      >
                        <span>{t('pages:deviceManagement.batchActions.batchActions')}</span>
                        <ChevronDown className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-48">
                      <DropdownMenuItem
                        onClick={handleBatchUnbind}
                        className="text-orange-600 focus:text-orange-700 focus:bg-orange-50 cursor-pointer"
                      >
                        <Unlink className="h-4 w-4 mr-2" />
                        {t('pages:deviceManagement.batchActions.batchUnbind')}
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        onClick={handleBatchRemove}
                        className="text-red-600 focus:text-red-700 focus:bg-red-50 cursor-pointer"
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        {t('pages:deviceManagement.batchActions.batchRemove')}
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* 設備監控卡片網格 */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold">{t('pages:deviceManagement.monitoring.title')}</h3>
            <div className="flex items-center gap-3">
              {/* 视图切换按钮 */}
              <div className="flex items-center gap-1 bg-gray-100 rounded-md p-1">
                <Button
                  variant={viewMode === 'list' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setViewMode('list')}
                  className="h-8 w-8 p-0"
                  title="列表视图"
                >
                  <List className="h-4 w-4" />
                </Button>
                <Button
                  variant={viewMode === 'grid' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setViewMode('grid')}
                  className="h-8 w-8 p-0"
                  title="卡片视图"
                >
                  <LayoutGrid className="h-4 w-4" />
                </Button>
              </div>
              <Badge variant="outline" className="gap-1">
                <Filter className="h-3 w-3" />
                {filteredDevices.length} {t('pages:deviceManagement.monitoring.deviceCount')}
              </Badge>
            </div>
          </div>

          {filteredDevices.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center">
                <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">
                  {devices.length === 0
                    ? t('pages:deviceManagement.monitoring.noDevices')
                    : t('pages:deviceManagement.monitoring.noMatchingDevices')
                  }
                </p>
              </CardContent>
            </Card>
          ) : viewMode === 'list' ? (
            // 列表视图 - 横条布局
            <div className="space-y-3">
              {filteredDevices.map(device => {
                const resident = getResidentForDevice(device.id)
                const deviceWithRealTime = getDeviceWithRealTimeData(device)
                return (
                  <DeviceListRow
                    key={device.id}
                    device={deviceWithRealTime}
                    resident={resident}
                    onAction={handleDeviceAction}
                    showCheckbox={selectedFilter !== "all"}
                    isSelected={selectedDeviceIds.has(device.id)}
                    onSelectChange={handleSelectDevice}
                  />
                )
              })}
            </div>
          ) : (
            // 卡片视图 - 原有网格布局，也支持批量操作
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredDevices.map(device => {
                const resident = getResidentForDevice(device.id)
                const deviceWithRealTime = getDeviceWithRealTimeData(device)
                return (
                  <DeviceMonitorCard
                    key={device.id}
                    device={deviceWithRealTime}
                    resident={resident}
                    onAction={handleDeviceAction}
                    showCheckbox={selectedFilter !== "all"}
                    isSelected={selectedDeviceIds.has(device.id)}
                    onSelectChange={handleSelectDevice}
                  />
                )
              })}
            </div>
          )}
        </div>

        {/* 新增設備彈出視窗 */}
        {showAddModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <Card className="w-full max-w-md">
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>{t('pages:deviceManagement.addModal.title')}</CardTitle>
                <Button variant="ghost" size="sm" onClick={() => setShowAddModal(false)}>
                  <X className="h-5 w-5" />
                </Button>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="text-sm font-medium mb-2 block">{t('pages:deviceManagement.addModal.deviceType')}</label>
                  <Select
                    value={newDevice.deviceType}
                    onValueChange={(value: DeviceType) => setNewDevice({ ...newDevice, deviceType: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={DeviceType.SMARTWATCH_300B}>{t('pages:deviceManagement.addModal.deviceTypes.smartwatch300B')}</SelectItem>
                      <SelectItem value={DeviceType.DIAPER_SENSOR}>{t('pages:deviceManagement.addModal.deviceTypes.diaperSensor')}</SelectItem>
                      <SelectItem value={DeviceType.PEDOMETER}>{t('pages:deviceManagement.addModal.deviceTypes.pedometer')}</SelectItem>
                      <SelectItem value={DeviceType.UWB_TAG}>{t('pages:deviceManagement.addModal.deviceTypes.uwbTag')}</SelectItem>
                      <SelectItem value={DeviceType.UWB_ANCHOR}>{t('pages:deviceManagement.addModal.deviceTypes.uwbAnchor') || 'UWB定位錨點'}</SelectItem>
                      <SelectItem value={DeviceType.GATEWAY}>{t('pages:deviceManagement.addModal.deviceTypes.gateway')}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="text-sm font-medium mb-2 block">{t('pages:deviceManagement.addModal.deviceName')}</label>
                  <Input
                    placeholder={t('pages:deviceManagement.addModal.placeholders.deviceName')}
                    value={newDevice.name}
                    onChange={(e) => setNewDevice({ ...newDevice, name: e.target.value })}
                  />
                </div>

                <div>
                  <label className="text-sm font-medium mb-2 block">{t('pages:deviceManagement.addModal.hardwareId')}</label>
                  <Input
                    placeholder={t('pages:deviceManagement.addModal.placeholders.hardwareId')}
                    value={newDevice.hardwareId}
                    onChange={(e) => setNewDevice({ ...newDevice, hardwareId: e.target.value })}
                  />
                </div>

                {/* 根據設備類型顯示不同的識別欄位 */}
                {(newDevice.deviceType === DeviceType.SMARTWATCH_300B || newDevice.deviceType === DeviceType.DIAPER_SENSOR) && (
                  <div>
                    <label className="text-sm font-medium mb-2 block">{t('pages:deviceManagement.addModal.macAddress')}</label>
                    <Input
                      placeholder={t('pages:deviceManagement.addModal.placeholders.macAddress')}
                      value={newDevice.mac}
                      onChange={(e) => setNewDevice({ ...newDevice, mac: e.target.value })}
                    />
                  </div>
                )}

                {(newDevice.deviceType === DeviceType.PEDOMETER || newDevice.deviceType === DeviceType.UWB_TAG || newDevice.deviceType === DeviceType.UWB_ANCHOR || newDevice.deviceType === DeviceType.GATEWAY) && (
                  <div>
                    <label className="text-sm font-medium mb-2 block">{t('pages:deviceManagement.addModal.deviceId')}</label>
                    <Input
                      placeholder={t('pages:deviceManagement.addModal.placeholders.deviceId')}
                      value={newDevice.deviceId}
                      onChange={(e) => setNewDevice({ ...newDevice, deviceId: e.target.value })}
                    />
                  </div>
                )}

                <div>
                  <label className="text-sm font-medium mb-2 block">{t('pages:deviceManagement.addModal.gatewayId')}</label>
                  <Input
                    placeholder={t('pages:deviceManagement.addModal.placeholders.gatewayId')}
                    value={newDevice.gatewayId}
                    onChange={(e) => setNewDevice({ ...newDevice, gatewayId: e.target.value })}
                  />
                </div>

                <div className="flex gap-3 pt-4">
                  <Button
                    variant="outline"
                    onClick={() => setShowAddModal(false)}
                    className="flex-1"
                  >
                    {t('common:actions.cancel')}
                  </Button>
                  <Button
                    onClick={handleAddDevice}
                    className="flex-1"
                    disabled={!newDevice.name || !newDevice.hardwareId ||
                      ((newDevice.deviceType === DeviceType.SMARTWATCH_300B || newDevice.deviceType === DeviceType.DIAPER_SENSOR) && !newDevice.mac) ||
                      ((newDevice.deviceType === DeviceType.PEDOMETER || newDevice.deviceType === DeviceType.UWB_TAG || newDevice.deviceType === DeviceType.UWB_ANCHOR || newDevice.deviceType === DeviceType.GATEWAY) && !newDevice.deviceId)
                    }
                  >
                    {t('pages:deviceManagement.actions.addDevice')}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}



        {/* 設備綁定模態框 */}
        <DeviceBindingModal
          isOpen={showBindingModal}
          onClose={() => {
            setShowBindingModal(false)
            setBindingDevice(null)
          }}
          device={bindingDevice || undefined}
        />

        {/* 設備發現模態框 */}
        <DeviceDiscoveryModal />

        {/* 設備資訊模態框 */}
        <DeviceInfoModal
          isOpen={showDeviceInfoModal}
          onClose={() => {
            setShowDeviceInfoModal(false)
            setSelectedDeviceInfo(null)
          }}
          device={selectedDeviceInfo}
        />
      </>
    </div>
  )
}
