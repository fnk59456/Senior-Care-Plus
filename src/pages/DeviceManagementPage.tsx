import React, { useState, useEffect, useCallback, useRef } from "react"
import { useTranslation } from "react-i18next"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
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
import { DeviceType, DeviceStatus, DeviceUIDGenerator, Device } from "@/types/device-types"
import { mqttBus } from "@/services/mqttBus"
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
    setSelectedGateway,
    updateGateway,
    refreshData: refreshUWBData
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

  // 閘道器更改UWB Network ID 對話框狀態
  const [showGatewayNetworkIdDialog, setShowGatewayNetworkIdDialog] = useState(false)
  const [gatewayNetworkIdValue, setGatewayNetworkIdValue] = useState<string>("")
  const [selectedGatewayDevice, setSelectedGatewayDevice] = useState<Device | null>(null)
  const [isSendingNetworkId, setIsSendingNetworkId] = useState(false)

  // 閘道器修改所屬養老院及樓層 對話框狀態
  const [showGatewayLocationDialog, setShowGatewayLocationDialog] = useState(false)
  const [gatewayLocationHomeId, setGatewayLocationHomeId] = useState<string>("")
  const [gatewayLocationFloorId, setGatewayLocationFloorId] = useState<string>("")
  const [isSavingGatewayLocation, setIsSavingGatewayLocation] = useState(false)

  // 錨點修改高度(Z坐標) 對話框狀態
  const [showAnchorHeightDialog, setShowAnchorHeightDialog] = useState(false)
  const [anchorHeightValue, setAnchorHeightValue] = useState<string>("")
  const [selectedAnchorDevice, setSelectedAnchorDevice] = useState<Device | null>(null)
  const [isSendingAnchorHeight, setIsSendingAnchorHeight] = useState(false)

  // 錨點要求資料 狀態
  const [isRequestingAnchorData, setIsRequestingAnchorData] = useState(false)

  // 標籤要求資料 狀態
  const [isRequestingTagData, setIsRequestingTagData] = useState(false)

  // 標籤修改功率 狀態
  const [showTagPowerDialog, setShowTagPowerDialog] = useState(false)
  const [tagPowerValues, setTagPowerValues] = useState({
    boostNorm: "",
    boost500: "",
    boost250: "",
    boost125: ""
  })
  const [selectedTagForPower, setSelectedTagForPower] = useState<Device | null>(null)
  const [isSendingTagPower, setIsSendingTagPower] = useState(false)

  // 標籤更改參數設定 對話框狀態
  const [showTagConfigDialog, setShowTagConfigDialog] = useState(false)
  const [tagConfigValues, setTagConfigValues] = useState({
    fwUpdate: "",
    led: "",
    ble: "",
    locationEngine: "",
    responsiveMode: "",
    stationaryDetect: "",
    nominalUdr: "",
    stationaryUdr: ""
  })
  const [selectedTagDevice, setSelectedTagDevice] = useState<Device | null>(null)
  const [isSendingTagConfig, setIsSendingTagConfig] = useState(false)

  // 錨點修改功率 對話框狀態
  const [showAnchorPowerDialog, setShowAnchorPowerDialog] = useState(false)
  const [anchorPowerValues, setAnchorPowerValues] = useState({
    boostNorm: "",
    boost500: "",
    boost250: "",
    boost125: ""
  })
  const [selectedAnchorForPower, setSelectedAnchorForPower] = useState<Device | null>(null)
  const [isSendingAnchorPower, setIsSendingAnchorPower] = useState(false)

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

  // 獲取選中設備的類型（用於動態顯示批量操作選項）
  const getSelectedDeviceTypes = (): Set<DeviceType> => {
    const selectedDevices = Array.from(selectedDeviceIds)
      .map(id => devices.find(d => d.id === id))
      .filter((d): d is Device => d !== undefined)

    return new Set(selectedDevices.map(d => d.deviceType))
  }

  // 獲取設備對應的 Gateway 和 downlink topic
  const getDeviceGatewayInfo = (device: Device): { gateway: any; downlinkTopic: string } | null => {
    if (!device.gatewayId) return null

    // 嘗試通過 gatewayId 匹配 Gateway
    const gateway = gateways.find(gw => {
      // 檢查多個可能的字段位置
      const cloudGatewayId = (gw as any).cloud_gateway_id || gw.cloudData?.gateway_id
      return String(cloudGatewayId) === String(device.gatewayId)
    })

    if (!gateway || !gateway.cloudData?.sub_topic?.downlink) {
      return null
    }

    // 檢查 downlink 是否已包含 UWB/ 前綴
    const downlinkValue = gateway.cloudData.sub_topic.downlink
    const downlinkTopic = downlinkValue.startsWith('UWB/') ? downlinkValue : `UWB/${downlinkValue}`

    return { gateway, downlinkTopic }
  }

  // 生成不重複的隨機 serial_no (0-65535)
  const generateSerialNo = (): number => {
    return Math.floor(Math.random() * 65536) // 0-65535
  }

  // 獲取閘道器設備的綁定信息（場域、樓層）
  const getGatewayLocationInfo = (device: Device): {
    home: { id: string; name: string } | null;
    floor: { id: string; name: string } | null;
    uwbGateway: any | null
  } => {
    if (device.deviceType !== DeviceType.GATEWAY || !device.gatewayId) {
      return { home: null, floor: null, uwbGateway: null }
    }

    // 通過 cloud_gateway_id 匹配 UWBLocation 中的 Gateway
    const uwbGateway = gateways.find(gw => {
      const cloudId = (gw as any).cloud_gateway_id || gw.cloudData?.gateway_id
      return cloudId && String(cloudId) === device.gatewayId
    })

    if (!uwbGateway) {
      return { home: null, floor: null, uwbGateway: null }
    }

    // 通過 floorId 獲取樓層信息
    const floor = floors.find(f => f.id === uwbGateway.floorId)
    if (!floor) {
      return { home: null, floor: null, uwbGateway }
    }

    // 通過 homeId 獲取場域信息
    const home = homes.find(h => h.id === floor.homeId)

    return {
      home: home ? { id: home.id, name: home.name } : null,
      floor: { id: floor.id, name: floor.name },
      uwbGateway
    }
  }

  // 處理閘道器修改所屬養老院及樓層
  const handleGatewayLocationChange = () => {
    // 只處理選中1個閘道器的情況
    const selectedGatewayDevices = Array.from(selectedDeviceIds)
      .map(id => devices.find(d => d.id === id))
      .filter((d): d is Device => d !== undefined && d.deviceType === DeviceType.GATEWAY)

    if (selectedGatewayDevices.length !== 1) {
      alert('請選擇1個閘道器設備')
      return
    }

    const gatewayDevice = selectedGatewayDevices[0]
    setSelectedGatewayDevice(gatewayDevice)

    // 獲取當前綁定信息
    const locationInfo = getGatewayLocationInfo(gatewayDevice)
    setGatewayLocationHomeId(locationInfo.home?.id || "")
    setGatewayLocationFloorId(locationInfo.floor?.id || "")

    setShowGatewayLocationDialog(true)
  }

  // 保存閘道器所屬養老院及樓層
  const saveGatewayLocation = async () => {
    if (!selectedGatewayDevice) return

    if (!gatewayLocationFloorId) {
      alert('請選擇樓層')
      return
    }

    // 獲取對應的 UWB Gateway
    const locationInfo = getGatewayLocationInfo(selectedGatewayDevice)
    if (!locationInfo.uwbGateway) {
      alert('找不到對應的閘道器配置，請先在「UWB定位管理」中新增閘道器')
      return
    }

    setIsSavingGatewayLocation(true)

    try {
      // 調用 updateGateway 更新 floorId
      await updateGateway(locationInfo.uwbGateway.id, {
        floorId: gatewayLocationFloorId
      })

      // 刷新數據
      await refreshUWBData()

      console.log('✅ 閘道器所屬樓層已更新:', {
        gatewayId: locationInfo.uwbGateway.id,
        newFloorId: gatewayLocationFloorId
      })

      alert('閘道器所屬養老院及樓層已更新成功！')

      // 關閉對話框並重置狀態
      setShowGatewayLocationDialog(false)
      setGatewayLocationHomeId("")
      setGatewayLocationFloorId("")
      setSelectedGatewayDevice(null)
      setSelectedDeviceIds(new Set())

    } catch (error: any) {
      console.error('❌ 更新閘道器所屬樓層失敗:', error)
      alert('更新失敗: ' + (error?.message || error))
    } finally {
      setIsSavingGatewayLocation(false)
    }
  }

  // 從設備名稱中提取錨點名稱（例如："UWB定位錨點 DW4C0B" -> "DW4C0B"）
  const extractAnchorName = (deviceName: string): string => {
    // 如果名稱包含 "UWB定位錨點 "，提取後面的部分
    const prefix = "UWB定位錨點 "
    if (deviceName.startsWith(prefix)) {
      return deviceName.substring(prefix.length)
    }
    // 如果沒有前綴，直接返回（可能是直接來自MQTT的名稱）
    return deviceName
  }

  // 處理錨點修改高度(Z坐標)
  const handleAnchorHeightChange = () => {
    // 只處理選中1個錨點的情況
    const selectedAnchorDevices = Array.from(selectedDeviceIds)
      .map(id => devices.find(d => d.id === id))
      .filter((d): d is Device => d !== undefined && d.deviceType === DeviceType.UWB_ANCHOR)

    if (selectedAnchorDevices.length !== 1) {
      alert('請選擇1個定位錨點設備')
      return
    }

    const anchorDevice = selectedAnchorDevices[0]
    setSelectedAnchorDevice(anchorDevice)

    // 從設備的 lastData 中獲取當前的 Z 坐標
    const currentZ = anchorDevice.lastData?.position?.z
    setAnchorHeightValue(currentZ !== undefined ? String(currentZ) : "")

    setShowAnchorHeightDialog(true)
  }

  // 發送錨點修改高度(Z坐標) 指令
  const sendAnchorHeightCommand = async () => {
    if (!selectedAnchorDevice) return

    // 驗證輸入
    const zValue = parseFloat(anchorHeightValue)
    if (isNaN(zValue)) {
      alert('請輸入有效的Z坐標數值')
      return
    }

    // 獲取 Gateway 信息
    const gatewayInfo = getDeviceGatewayInfo(selectedAnchorDevice)
    if (!gatewayInfo) {
      alert('找不到對應的 Gateway 或 downlink 主題')
      return
    }

    const { gateway, downlinkTopic } = gatewayInfo

    // 檢查 MQTT 連接
    if (!mqttBus.isConnected()) {
      alert('MQTT Bus 未連線，無法發送指令')
      return
    }

    // 從設備數據中提取參數
    const lastData = selectedAnchorDevice.lastData || {}
    const position = lastData.position || { x: 0, y: 0, z: 0 }

    // 提取錨點名稱
    const anchorName = extractAnchorName(selectedAnchorDevice.name)
    const anchorId = parseInt(selectedAnchorDevice.hardwareId)
    const gatewayId = gateway.cloudData?.gateway_id || parseInt(selectedAnchorDevice.gatewayId || "0")

    if (isNaN(anchorId) || isNaN(gatewayId)) {
      alert('無法獲取有效的錨點ID或閘道器ID')
      return
    }

    setIsSendingAnchorHeight(true)

    try {
      // 構建配置訊息（使用空格格式的字段名）
      const configMessage = {
        content: "configChange",
        "gateway id": gatewayId,
        node: "ANCHOR",
        name: anchorName,
        id: anchorId,
        "fw update": lastData.fw_update ?? 0,
        led: lastData.led ?? 0,
        ble: lastData.ble ?? 0,
        initiator: lastData.initiator ?? 0,
        position: {
          x: position.x ?? 0,
          y: position.y ?? 0,
          z: zValue  // 使用用戶輸入的新Z值
        },
        "serial no": generateSerialNo()
      }

      console.log(`🚀 準備發送錨點修改高度指令:`)
      console.log(`- 主題: ${downlinkTopic}`)
      console.log(`- Gateway ID: ${gatewayId}`)
      console.log(`- Anchor 名稱: ${anchorName}`)
      console.log(`- Anchor ID: ${anchorId}`)
      console.log(`- 新Z坐標: ${zValue}`)
      console.log(`- Serial No: ${configMessage["serial no"]}`)
      console.log(`- 完整訊息:`, JSON.stringify(configMessage, null, 2))

      // 發送消息
      await mqttBus.publish(downlinkTopic, configMessage, 1)

      console.log('✅ 錨點修改高度指令已成功發送')
      alert(`✅ 已成功發送修改高度指令到 ${selectedAnchorDevice.name}\n新Z坐標: ${zValue}`)

      // 關閉對話框並重置狀態
      setShowAnchorHeightDialog(false)
      setAnchorHeightValue("")
      setSelectedAnchorDevice(null)
      setSelectedDeviceIds(new Set())

    } catch (error: any) {
      console.error('❌ 發送指令失敗:', error)
      alert('發送指令失敗: ' + (error?.message || error))
    } finally {
      setIsSendingAnchorHeight(false)
    }
  }

  // 處理錨點修改功率
  const handleAnchorPowerChange = () => {
    // 只處理選中1個錨點的情況
    const selectedAnchorDevices = Array.from(selectedDeviceIds)
      .map(id => devices.find(d => d.id === id))
      .filter((d): d is Device => d !== undefined && d.deviceType === DeviceType.UWB_ANCHOR)

    if (selectedAnchorDevices.length !== 1) {
      alert('請選擇1個定位錨點設備')
      return
    }

    const anchorDevice = selectedAnchorDevices[0]
    setSelectedAnchorForPower(anchorDevice)

    // 從設備的 lastData 中獲取當前的功率值
    const txPower = anchorDevice.lastData?.['uwb tx power'] || anchorDevice.lastData?.['uwb_tx_power'] || {}

    // 支持多種字段名格式
    const getPowerValue = (key: string): string => {
      const value = txPower[key] ||
        txPower[key.replace(/[()]/g, '')] ||
        txPower[key.replace(/\s/g, '_')] ||
        txPower[key.replace(/\s/g, '').toLowerCase()]
      return value !== undefined ? String(value) : ""
    }

    setAnchorPowerValues({
      boostNorm: getPowerValue('boost norm(5.0~30.5dB)') || getPowerValue('boost_norm') || "",
      boost500: getPowerValue('boost 500(5.0~30.5dB)') || getPowerValue('boost_500') || "",
      boost250: getPowerValue('boost 250(5.0~30.5dB)') || getPowerValue('boost_250') || "",
      boost125: getPowerValue('boost 125(5.0~30.5dB)') || getPowerValue('boost_125') || ""
    })

    setShowAnchorPowerDialog(true)
  }

  // 發送錨點修改功率 指令
  const sendAnchorPowerCommand = async () => {
    if (!selectedAnchorForPower) return

    // 驗證輸入
    const boostNorm = parseFloat(anchorPowerValues.boostNorm)
    const boost500 = parseFloat(anchorPowerValues.boost500)
    const boost250 = parseFloat(anchorPowerValues.boost250)
    const boost125 = parseFloat(anchorPowerValues.boost125)

    if (isNaN(boostNorm) || isNaN(boost500) || isNaN(boost250) || isNaN(boost125)) {
      alert('請輸入所有功率值')
      return
    }

    // 驗證範圍 (5.0~30.5dB)
    if (boostNorm < 5.0 || boostNorm > 30.5 ||
      boost500 < 5.0 || boost500 > 30.5 ||
      boost250 < 5.0 || boost250 > 30.5 ||
      boost125 < 5.0 || boost125 > 30.5) {
      alert('功率值必須在 5.0~30.5 dB 範圍內')
      return
    }

    // 獲取 Gateway 信息
    const gatewayInfo = getDeviceGatewayInfo(selectedAnchorForPower)
    if (!gatewayInfo) {
      alert('找不到對應的 Gateway 或 downlink 主題')
      return
    }

    const { gateway, downlinkTopic } = gatewayInfo

    // 檢查 MQTT 連接
    if (!mqttBus.isConnected()) {
      alert('MQTT Bus 未連線，無法發送指令')
      return
    }

    const anchorId = parseInt(selectedAnchorForPower.hardwareId)
    const gatewayId = gateway.cloudData?.gateway_id || parseInt(selectedAnchorForPower.gatewayId || "0")

    if (isNaN(anchorId) || isNaN(gatewayId)) {
      alert('無法獲取有效的錨點ID或閘道器ID')
      return
    }

    setIsSendingAnchorPower(true)

    try {
      // 構建配置訊息（使用空格格式的字段名）
      const configMessage = {
        content: "tx power configChange",
        "gateway id": gatewayId,
        id: anchorId,
        "boost norm(5.0~30.5dB)": boostNorm,
        "boost 500(5.0~30.5dB)": boost500,
        "boost 250(5.0~30.5dB)": boost250,
        "boost 125(5.0~30.5dB)": boost125,
        "serial no": generateSerialNo()
      }

      console.log(`🚀 準備發送錨點修改功率指令:`)
      console.log(`- 主題: ${downlinkTopic}`)
      console.log(`- Gateway ID: ${gatewayId}`)
      console.log(`- Anchor ID: ${anchorId}`)
      console.log(`- Boost Norm: ${boostNorm} dB`)
      console.log(`- Boost 500: ${boost500} dB`)
      console.log(`- Boost 250: ${boost250} dB`)
      console.log(`- Boost 125: ${boost125} dB`)
      console.log(`- Serial No: ${configMessage["serial no"]}`)
      console.log(`- 完整訊息:`, JSON.stringify(configMessage, null, 2))

      // 發送消息
      await mqttBus.publish(downlinkTopic, configMessage, 1)

      console.log('✅ 錨點修改功率指令已成功發送')
      alert(`✅ 已成功發送修改功率指令到 ${selectedAnchorForPower.name}`)

      // 關閉對話框並重置狀態
      setShowAnchorPowerDialog(false)
      setAnchorPowerValues({ boostNorm: "", boost500: "", boost250: "", boost125: "" })
      setSelectedAnchorForPower(null)
      setSelectedDeviceIds(new Set())

    } catch (error: any) {
      console.error('❌ 發送指令失敗:', error)
      alert('發送指令失敗: ' + (error?.message || error))
    } finally {
      setIsSendingAnchorPower(false)
    }
  }

  // 從設備名稱中提取標籤名稱（例如："UWB定位標籤 DW5B35" -> "DW5B35"）
  const extractTagName = (deviceName: string): string => {
    // 如果名稱包含 "UWB定位標籤 "，提取後面的部分
    const prefix = "UWB定位標籤 "
    if (deviceName.startsWith(prefix)) {
      return deviceName.substring(prefix.length)
    }
    // 如果沒有前綴，直接返回（可能是直接來自MQTT的名稱）
    return deviceName
  }

  // 處理標籤更改參數設定
  const handleTagConfigChange = () => {
    // 只處理選中1個標籤的情況
    const selectedTagDevices = Array.from(selectedDeviceIds)
      .map(id => devices.find(d => d.id === id))
      .filter((d): d is Device => d !== undefined && d.deviceType === DeviceType.UWB_TAG)

    if (selectedTagDevices.length !== 1) {
      alert('請選擇1個定位標籤設備')
      return
    }

    const tagDevice = selectedTagDevices[0]
    setSelectedTagDevice(tagDevice)

    // 從設備的 lastData 中獲取當前的參數值
    const lastData = tagDevice.lastData || {}

    setTagConfigValues({
      fwUpdate: lastData['fw update'] !== undefined ? String(lastData['fw update']) : "",
      led: lastData.led !== undefined ? String(lastData.led) : "",
      ble: lastData.ble !== undefined ? String(lastData.ble) : "",
      locationEngine: lastData['location engine'] !== undefined ? String(lastData['location engine']) : "",
      responsiveMode: lastData['responsive mode(0=On,1=Off)'] !== undefined ? String(lastData['responsive mode(0=On,1=Off)']) : "",
      stationaryDetect: lastData['stationary detect'] !== undefined ? String(lastData['stationary detect']) : "",
      nominalUdr: lastData['nominal udr(hz)'] !== undefined ? String(lastData['nominal udr(hz)']) : "",
      stationaryUdr: lastData['stationary udr(hz)'] !== undefined ? String(lastData['stationary udr(hz)']) : ""
    })

    setShowTagConfigDialog(true)
  }

  // 發送標籤更改參數設定 指令
  const sendTagConfigCommand = async () => {
    if (!selectedTagDevice) return

    // 驗證輸入
    const fwUpdate = parseInt(tagConfigValues.fwUpdate)
    const led = parseInt(tagConfigValues.led)
    const ble = parseInt(tagConfigValues.ble)
    const locationEngine = parseInt(tagConfigValues.locationEngine)
    const responsiveMode = parseInt(tagConfigValues.responsiveMode)
    const stationaryDetect = parseInt(tagConfigValues.stationaryDetect)
    const nominalUdr = parseFloat(tagConfigValues.nominalUdr)
    const stationaryUdr = parseFloat(tagConfigValues.stationaryUdr)

    if (isNaN(fwUpdate) || isNaN(led) || isNaN(ble) || isNaN(locationEngine) ||
      isNaN(responsiveMode) || isNaN(stationaryDetect) || isNaN(nominalUdr) || isNaN(stationaryUdr)) {
      alert('請輸入所有參數值')
      return
    }

    // 獲取 Gateway 信息
    const gatewayInfo = getDeviceGatewayInfo(selectedTagDevice)
    if (!gatewayInfo) {
      alert('找不到對應的 Gateway 或 downlink 主題')
      return
    }

    const { gateway, downlinkTopic } = gatewayInfo

    // 檢查 MQTT 連接
    if (!mqttBus.isConnected()) {
      alert('MQTT Bus 未連線，無法發送指令')
      return
    }

    const tagId = parseInt(selectedTagDevice.hardwareId)
    const gatewayId = gateway.cloudData?.gateway_id || parseInt(selectedTagDevice.gatewayId || "0")
    const tagName = extractTagName(selectedTagDevice.name)

    if (isNaN(tagId) || isNaN(gatewayId)) {
      alert('無法獲取有效的標籤ID或閘道器ID')
      return
    }

    setIsSendingTagConfig(true)

    try {
      // 構建配置訊息（使用空格格式的字段名）
      const configMessage = {
        content: "configChange",
        "gateway id": gatewayId,
        node: "TAG",
        name: tagName,
        id: tagId,
        "fw update": fwUpdate,
        led: led,
        ble: ble,
        "location engine": locationEngine,
        "responsive mode(0=On,1=Off)": responsiveMode,
        "stationary detect": stationaryDetect,
        "nominal udr(hz)": nominalUdr,
        "stationary udr(hz)": stationaryUdr,
        "serial no": generateSerialNo()
      }

      console.log(`🚀 準備發送標籤更改參數設定指令:`)
      console.log(`- 主題: ${downlinkTopic}`)
      console.log(`- Gateway ID: ${gatewayId}`)
      console.log(`- Tag 名稱: ${tagName}`)
      console.log(`- Tag ID: ${tagId}`)
      console.log(`- 完整訊息:`, JSON.stringify(configMessage, null, 2))

      // 發送消息
      await mqttBus.publish(downlinkTopic, configMessage, 1)

      console.log('✅ 標籤更改參數設定指令已成功發送')
      alert(`✅ 已成功發送更改參數設定指令到 ${selectedTagDevice.name}`)

      // 關閉對話框並重置狀態
      setShowTagConfigDialog(false)
      setTagConfigValues({
        fwUpdate: "",
        led: "",
        ble: "",
        locationEngine: "",
        responsiveMode: "",
        stationaryDetect: "",
        nominalUdr: "",
        stationaryUdr: ""
      })
      setSelectedTagDevice(null)
      setSelectedDeviceIds(new Set())

    } catch (error: any) {
      console.error('❌ 發送指令失敗:', error)
      alert('發送指令失敗: ' + (error?.message || error))
    } finally {
      setIsSendingTagConfig(false)
    }
  }

  // 處理錨點要求資料（支持多選）
  const handleRequestAnchorData = async () => {
    // 獲取所有選中的錨點設備
    const selectedAnchorDevices = Array.from(selectedDeviceIds)
      .map(id => devices.find(d => d.id === id))
      .filter((d): d is Device => d !== undefined && d.deviceType === DeviceType.UWB_ANCHOR)

    if (selectedAnchorDevices.length === 0) {
      alert('請至少選擇1個定位錨點設備')
      return
    }

    // 檢查 MQTT 連接
    if (!mqttBus.isConnected()) {
      alert('MQTT Bus 未連線，無法發送指令')
      return
    }

    setIsRequestingAnchorData(true)

    try {
      let successCount = 0
      let failCount = 0
      const failedDevices: string[] = []

      // 循環處理每個選中的錨點
      for (const anchorDevice of selectedAnchorDevices) {
        try {
          // 獲取 Gateway 信息
          const gatewayInfo = getDeviceGatewayInfo(anchorDevice)
          if (!gatewayInfo) {
            console.warn(`⚠️ 找不到錨點 ${anchorDevice.name} 對應的 Gateway 或 downlink 主題`)
            failCount++
            failedDevices.push(anchorDevice.name)
            continue
          }

          const { gateway, downlinkTopic } = gatewayInfo
          const anchorId = parseInt(anchorDevice.hardwareId)
          const gatewayId = gateway.cloudData?.gateway_id || parseInt(anchorDevice.gatewayId || "0")

          if (isNaN(anchorId) || isNaN(gatewayId)) {
            console.warn(`⚠️ 錨點 ${anchorDevice.name} 的 ID 或 Gateway ID 無效`)
            failCount++
            failedDevices.push(anchorDevice.name)
            continue
          }

          // 構建請求訊息
          const requestMessage = {
            content: "node info request",
            "gateway id": gatewayId,
            id: anchorId,
            "serial no": generateSerialNo()
          }

          console.log(`🚀 準備發送錨點要求資料指令:`)
          console.log(`- 錨點: ${anchorDevice.name}`)
          console.log(`- 主題: ${downlinkTopic}`)
          console.log(`- Gateway ID: ${gatewayId}`)
          console.log(`- Anchor ID: ${anchorId}`)
          console.log(`- Serial No: ${requestMessage["serial no"]}`)
          console.log(`- 完整訊息:`, JSON.stringify(requestMessage, null, 2))

          // 發送消息
          await mqttBus.publish(downlinkTopic, requestMessage, 1)
          successCount++

          console.log(`✅ 錨點 ${anchorDevice.name} 的要求資料指令已成功發送`)

        } catch (error: any) {
          console.error(`❌ 發送錨點 ${anchorDevice.name} 的要求資料指令失敗:`, error)
          failCount++
          failedDevices.push(anchorDevice.name)
        }
      }

      // 顯示結果
      if (successCount > 0 && failCount === 0) {
        alert(`✅ 已成功發送要求資料指令到 ${successCount} 個錨點設備`)
      } else if (successCount > 0 && failCount > 0) {
        alert(`⚠️ 已成功發送 ${successCount} 個，失敗 ${failCount} 個\n失敗設備: ${failedDevices.join('、')}`)
      } else {
        alert(`❌ 所有指令發送失敗\n失敗設備: ${failedDevices.join('、')}`)
      }

      // 清空選擇
      setSelectedDeviceIds(new Set())

    } catch (error: any) {
      console.error('❌ 發送要求資料指令時發生錯誤:', error)
      alert('發送指令時發生錯誤: ' + (error?.message || error))
    } finally {
      setIsRequestingAnchorData(false)
    }
  }

  // 處理標籤修改功率
  const handleTagPowerChange = () => {
    // 只處理選中1個標籤的情況
    const selectedTagDevices = Array.from(selectedDeviceIds)
      .map(id => devices.find(d => d.id === id))
      .filter((d): d is Device => d !== undefined && d.deviceType === DeviceType.UWB_TAG)

    if (selectedTagDevices.length !== 1) {
      alert('請選擇1個定位標籤設備')
      return
    }

    const tagDevice = selectedTagDevices[0]
    setSelectedTagForPower(tagDevice)

    // 從設備的 lastData 中獲取當前的功率值
    const txPower = tagDevice.lastData?.['uwb tx power'] || tagDevice.lastData?.['uwb_tx_power'] || {}

    // 支持多種字段名格式
    const getPowerValue = (key: string): string => {
      const value = txPower[key] ||
        txPower[key.replace(/[()]/g, '')] ||
        txPower[key.replace(/\s/g, '_')] ||
        txPower[key.replace(/\s/g, '').toLowerCase()]
      return value !== undefined ? String(value) : ""
    }

    setTagPowerValues({
      boostNorm: getPowerValue('boost norm(5.0~30.5dB)') || getPowerValue('boost_norm') || "",
      boost500: getPowerValue('boost 500(5.0~30.5dB)') || getPowerValue('boost_500') || "",
      boost250: getPowerValue('boost 250(5.0~30.5dB)') || getPowerValue('boost_250') || "",
      boost125: getPowerValue('boost 125(5.0~30.5dB)') || getPowerValue('boost_125') || ""
    })

    setShowTagPowerDialog(true)
  }

  // 發送標籤修改功率 指令
  const sendTagPowerCommand = async () => {
    if (!selectedTagForPower) return

    // 驗證輸入
    const boostNorm = parseFloat(tagPowerValues.boostNorm)
    const boost500 = parseFloat(tagPowerValues.boost500)
    const boost250 = parseFloat(tagPowerValues.boost250)
    const boost125 = parseFloat(tagPowerValues.boost125)

    if (isNaN(boostNorm) || isNaN(boost500) || isNaN(boost250) || isNaN(boost125)) {
      alert('請輸入所有功率值')
      return
    }

    // 驗證範圍 (5.0~30.5dB)
    if (boostNorm < 5.0 || boostNorm > 30.5 ||
      boost500 < 5.0 || boost500 > 30.5 ||
      boost250 < 5.0 || boost250 > 30.5 ||
      boost125 < 5.0 || boost125 > 30.5) {
      alert('功率值必須在 5.0~30.5 dB 範圍內')
      return
    }

    // 獲取 Gateway 信息
    const gatewayInfo = getDeviceGatewayInfo(selectedTagForPower)
    if (!gatewayInfo) {
      alert('找不到對應的 Gateway 或 downlink 主題')
      return
    }

    const { gateway, downlinkTopic } = gatewayInfo

    // 檢查 MQTT 連接
    if (!mqttBus.isConnected()) {
      alert('MQTT Bus 未連線，無法發送指令')
      return
    }

    const tagId = parseInt(selectedTagForPower.hardwareId)
    const gatewayId = gateway.cloudData?.gateway_id || parseInt(selectedTagForPower.gatewayId || "0")

    if (isNaN(tagId) || isNaN(gatewayId)) {
      alert('無法獲取有效的標籤ID或閘道器ID')
      return
    }

    setIsSendingTagPower(true)

    try {
      // 構建配置訊息（使用空格格式的字段名）
      const configMessage = {
        content: "tx power configChange",
        "gateway id": gatewayId,
        id: tagId,
        "boost norm(5.0~30.5dB)": boostNorm,
        "boost 500(5.0~30.5dB)": boost500,
        "boost 250(5.0~30.5dB)": boost250,
        "boost 125(5.0~30.5dB)": boost125,
        "serial no": generateSerialNo()
      }

      console.log(`🚀 準備發送標籤修改功率指令:`)
      console.log(`- 主題: ${downlinkTopic}`)
      console.log(`- Gateway ID: ${gatewayId}`)
      console.log(`- Tag ID: ${tagId}`)
      console.log(`- Boost Norm: ${boostNorm} dB`)
      console.log(`- Boost 500: ${boost500} dB`)
      console.log(`- Boost 250: ${boost250} dB`)
      console.log(`- Boost 125: ${boost125} dB`)
      console.log(`- Serial No: ${configMessage["serial no"]}`)
      console.log(`- 完整訊息:`, JSON.stringify(configMessage, null, 2))

      // 發送消息
      await mqttBus.publish(downlinkTopic, configMessage, 1)

      console.log('✅ 標籤修改功率指令已成功發送')
      alert(`✅ 已成功發送修改功率指令到 ${selectedTagForPower.name}`)

      // 關閉對話框並重置狀態
      setShowTagPowerDialog(false)
      setTagPowerValues({ boostNorm: "", boost500: "", boost250: "", boost125: "" })
      setSelectedTagForPower(null)
      setSelectedDeviceIds(new Set())

    } catch (error: any) {
      console.error('❌ 發送指令失敗:', error)
      alert('發送指令失敗: ' + (error?.message || error))
    } finally {
      setIsSendingTagPower(false)
    }
  }

  // 處理標籤要求資料（支持多選）
  const handleRequestTagData = async () => {
    // 獲取所有選中的標籤設備
    const selectedTagDevices = Array.from(selectedDeviceIds)
      .map(id => devices.find(d => d.id === id))
      .filter((d): d is Device => d !== undefined && d.deviceType === DeviceType.UWB_TAG)

    if (selectedTagDevices.length === 0) {
      alert('請至少選擇1個定位標籤設備')
      return
    }

    // 檢查 MQTT 連接
    if (!mqttBus.isConnected()) {
      alert('MQTT Bus 未連線，無法發送指令')
      return
    }

    setIsRequestingTagData(true)

    try {
      let successCount = 0
      let failCount = 0
      const failedDevices: string[] = []

      // 循環處理每個選中的標籤
      for (const tagDevice of selectedTagDevices) {
        try {
          // 獲取 Gateway 信息
          const gatewayInfo = getDeviceGatewayInfo(tagDevice)
          if (!gatewayInfo) {
            console.warn(`⚠️ 找不到標籤 ${tagDevice.name} 對應的 Gateway 或 downlink 主題`)
            failCount++
            failedDevices.push(tagDevice.name)
            continue
          }

          const { gateway, downlinkTopic } = gatewayInfo
          const tagId = parseInt(tagDevice.hardwareId)
          const gatewayId = gateway.cloudData?.gateway_id || parseInt(tagDevice.gatewayId || "0")

          if (isNaN(tagId) || isNaN(gatewayId)) {
            console.warn(`⚠️ 標籤 ${tagDevice.name} 的 ID 或 Gateway ID 無效`)
            failCount++
            failedDevices.push(tagDevice.name)
            continue
          }

          // 構建請求訊息
          const requestMessage = {
            content: "node info request",
            "gateway id": gatewayId,
            id: tagId,
            "serial no": generateSerialNo()
          }

          console.log(`🚀 準備發送標籤要求資料指令:`)
          console.log(`- 標籤: ${tagDevice.name}`)
          console.log(`- 主題: ${downlinkTopic}`)
          console.log(`- Gateway ID: ${gatewayId}`)
          console.log(`- Tag ID: ${tagId}`)
          console.log(`- Serial No: ${requestMessage["serial no"]}`)
          console.log(`- 完整訊息:`, JSON.stringify(requestMessage, null, 2))

          // 發送消息
          await mqttBus.publish(downlinkTopic, requestMessage, 1)
          successCount++

          console.log(`✅ 標籤 ${tagDevice.name} 的要求資料指令已成功發送`)

        } catch (error: any) {
          console.error(`❌ 發送標籤 ${tagDevice.name} 的要求資料指令失敗:`, error)
          failCount++
          failedDevices.push(tagDevice.name)
        }
      }

      // 顯示結果
      if (successCount > 0 && failCount === 0) {
        alert(`✅ 已成功發送要求資料指令到 ${successCount} 個標籤設備`)
      } else if (successCount > 0 && failCount > 0) {
        alert(`⚠️ 已成功發送 ${successCount} 個，失敗 ${failCount} 個\n失敗設備: ${failedDevices.join('、')}`)
      } else {
        alert(`❌ 所有指令發送失敗\n失敗設備: ${failedDevices.join('、')}`)
      }

      // 清空選擇
      setSelectedDeviceIds(new Set())

    } catch (error: any) {
      console.error('❌ 發送要求資料指令時發生錯誤:', error)
      alert('發送指令時發生錯誤: ' + (error?.message || error))
    } finally {
      setIsRequestingTagData(false)
    }
  }

  // 處理閘道器更改UWB Network ID
  const handleGatewayNetworkIdChange = () => {
    // 只處理選中1個閘道器的情況
    const selectedGatewayDevices = Array.from(selectedDeviceIds)
      .map(id => devices.find(d => d.id === id))
      .filter((d): d is Device => d !== undefined && d.deviceType === DeviceType.GATEWAY)

    if (selectedGatewayDevices.length !== 1) {
      alert('請選擇1個閘道器設備')
      return
    }

    const gatewayDevice = selectedGatewayDevices[0]
    setSelectedGatewayDevice(gatewayDevice)

    // 從設備的 lastData 中獲取當前的 UWB Network ID（如果有的話）
    const currentNetworkId = gatewayDevice.lastData?.['UWB Network ID'] || gatewayDevice.lastData?.['uwb_network_id']
    setGatewayNetworkIdValue(currentNetworkId ? String(currentNetworkId) : "")

    setShowGatewayNetworkIdDialog(true)
  }

  // 發送閘道器更改UWB Network ID 指令
  const sendGatewayNetworkIdCommand = async () => {
    if (!selectedGatewayDevice) return

    // 驗證輸入
    const networkId = parseInt(gatewayNetworkIdValue)
    if (isNaN(networkId) || networkId < 1 || networkId > 65535) {
      alert('UWB Network ID 必須在 1~65535 範圍內')
      return
    }

    // 獲取 Gateway 信息
    const gatewayInfo = getDeviceGatewayInfo(selectedGatewayDevice)
    if (!gatewayInfo) {
      alert('找不到對應的 Gateway 或 downlink 主題')
      return
    }

    const { gateway, downlinkTopic } = gatewayInfo

    // 檢查 MQTT 連接
    if (!mqttBus.isConnected()) {
      alert('MQTT Bus 未連線，無法發送指令')
      return
    }

    setIsSendingNetworkId(true)

    try {
      // 構建配置訊息
      const configMessage = {
        content: "set gateway network id",
        "gateway id": gateway.cloudData.gateway_id,
        value: networkId,
        "serial no": generateSerialNo()
      }

      console.log(`🚀 準備發送閘道器更改UWB Network ID指令:`)
      console.log(`- 主題: ${downlinkTopic}`)
      console.log(`- Gateway ID: ${configMessage["gateway id"]}`)
      console.log(`- Network ID: ${networkId}`)
      console.log(`- Serial No: ${configMessage["serial no"]}`)
      console.log(`- 完整訊息:`, JSON.stringify(configMessage, null, 2))

      // 發送消息
      await mqttBus.publish(downlinkTopic, configMessage, 1)

      console.log('✅ 閘道器更改UWB Network ID指令已成功發送')
      alert(`✅ 已成功發送更改UWB Network ID指令到 ${selectedGatewayDevice.name}\nNetwork ID: ${networkId}`)

      // 關閉對話框並重置狀態
      setShowGatewayNetworkIdDialog(false)
      setGatewayNetworkIdValue("")
      setSelectedGatewayDevice(null)
      setSelectedDeviceIds(new Set())

    } catch (error: any) {
      console.error('❌ 發送指令失敗:', error)
      alert('發送指令失敗: ' + (error?.message || error))
    } finally {
      setIsSendingNetworkId(false)
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
                    <DropdownMenuContent align="end" className="w-56">
                      {/* 通用批量操作 */}
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

                      {/* 根據設備類型顯示不同的批量操作選項 */}
                      {(() => {
                        const selectedTypes = getSelectedDeviceTypes()
                        const items: React.ReactNode[] = []

                        // 閘道器批量操作（只在選中1個閘道器時顯示"更改UWB Network ID"）
                        const selectedGatewayDevices = Array.from(selectedDeviceIds)
                          .map(id => devices.find(d => d.id === id))
                          .filter((d): d is Device => d !== undefined && d.deviceType === DeviceType.GATEWAY)

                        if (selectedGatewayDevices.length > 0) {
                          items.push(
                            <DropdownMenuSeparator key="gateway-sep" />
                          )

                          // 只在選中1個閘道器時顯示這些操作
                          if (selectedGatewayDevices.length === 1) {
                            items.push(
                              <DropdownMenuItem
                                key="gateway-network-id"
                                onClick={handleGatewayNetworkIdChange}
                                className="cursor-pointer"
                              >
                                <Wifi className="h-4 w-4 mr-2" />
                                更改UWB Network ID
                              </DropdownMenuItem>,
                              <DropdownMenuSeparator key="gateway-location-sep" />,
                              <DropdownMenuItem
                                key="gateway-location"
                                onClick={handleGatewayLocationChange}
                                className="cursor-pointer"
                              >
                                <MapPin className="h-4 w-4 mr-2" />
                                修改所屬養老院及樓層
                              </DropdownMenuItem>
                            )
                          }
                        }

                        // 定位錨點批量操作
                        const selectedAnchorDevices = Array.from(selectedDeviceIds)
                          .map(id => devices.find(d => d.id === id))
                          .filter((d): d is Device => d !== undefined && d.deviceType === DeviceType.UWB_ANCHOR)

                        if (selectedAnchorDevices.length > 0) {
                          items.push(
                            <DropdownMenuSeparator key="anchor-sep" />
                          )

                          // 只在選中1個錨點時顯示這些操作
                          if (selectedAnchorDevices.length === 1) {
                            items.push(
                              <DropdownMenuItem
                                key="anchor-height"
                                onClick={handleAnchorHeightChange}
                                className="cursor-pointer"
                              >
                                <Anchor className="h-4 w-4 mr-2" />
                                修改高度(Z坐標)
                              </DropdownMenuItem>,
                              <DropdownMenuSeparator key="anchor-power-sep" />,
                              <DropdownMenuItem
                                key="anchor-power"
                                onClick={handleAnchorPowerChange}
                                className="cursor-pointer"
                              >
                                <Settings className="h-4 w-4 mr-2" />
                                修改功率
                              </DropdownMenuItem>
                            )
                          }

                          // 如果选中了锚点，添加"要求錨點資料"选项
                          if (selectedAnchorDevices.length > 0) {
                            // 如果已经有单选操作，在它们和"要求錨點資料"之间添加分隔线
                            if (selectedAnchorDevices.length === 1) {
                              items.push(
                                <DropdownMenuSeparator key="anchor-request-sep" />
                              )
                            }
                            items.push(
                              <DropdownMenuItem
                                key="anchor-request-data"
                                onClick={handleRequestAnchorData}
                                className="cursor-pointer"
                                disabled={isRequestingAnchorData}
                              >
                                <Activity className="h-4 w-4 mr-2" />
                                {isRequestingAnchorData ? '發送中...' : '要求錨點資料'}
                              </DropdownMenuItem>
                            )
                          }
                        }

                        // 定位標籤批量操作
                        const selectedTagDevices = Array.from(selectedDeviceIds)
                          .map(id => devices.find(d => d.id === id))
                          .filter((d): d is Device => d !== undefined && d.deviceType === DeviceType.UWB_TAG)

                        if (selectedTagDevices.length > 0) {
                          items.push(
                            <DropdownMenuSeparator key="tag-sep" />
                          )

                          // 只在選中1個標籤時顯示"更改參數設定"和"修改功率"
                          if (selectedTagDevices.length === 1) {
                            items.push(
                              <DropdownMenuItem
                                key="tag-config"
                                onClick={handleTagConfigChange}
                                className="cursor-pointer"
                              >
                                <Settings className="h-4 w-4 mr-2" />
                                更改參數設定
                              </DropdownMenuItem>,
                              <DropdownMenuSeparator key="tag-power-sep" />,
                              <DropdownMenuItem
                                key="tag-power"
                                onClick={handleTagPowerChange}
                                className="cursor-pointer"
                              >
                                <Settings className="h-4 w-4 mr-2" />
                                修改功率
                              </DropdownMenuItem>
                            )
                          }

                          // 如果选中了标签，添加"要求標籤資料"选项
                          if (selectedTagDevices.length > 0) {
                            // 如果已经有单选操作，在它们和"要求標籤資料"之间添加分隔线
                            if (selectedTagDevices.length === 1) {
                              items.push(
                                <DropdownMenuSeparator key="tag-request-sep" />
                              )
                            }
                            items.push(
                              <DropdownMenuItem
                                key="tag-request-data"
                                onClick={handleRequestTagData}
                                className="cursor-pointer"
                                disabled={isRequestingTagData}
                              >
                                <Activity className="h-4 w-4 mr-2" />
                                {isRequestingTagData ? '發送中...' : '要求標籤資料'}
                              </DropdownMenuItem>
                            )
                          }
                        }

                        return items
                      })()}
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
                // 獲取閘道器位置信息
                const locationInfo = device.deviceType === DeviceType.GATEWAY
                  ? (() => {
                    const info = getGatewayLocationInfo(device)
                    return {
                      homeName: info.home?.name,
                      floorName: info.floor?.name
                    }
                  })()
                  : undefined
                return (
                  <DeviceListRow
                    key={device.id}
                    device={deviceWithRealTime}
                    resident={resident}
                    onAction={handleDeviceAction}
                    showCheckbox={selectedFilter !== "all"}
                    isSelected={selectedDeviceIds.has(device.id)}
                    onSelectChange={handleSelectDevice}
                    locationInfo={locationInfo}
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
                // 獲取閘道器位置信息
                const locationInfo = device.deviceType === DeviceType.GATEWAY
                  ? (() => {
                    const info = getGatewayLocationInfo(device)
                    return {
                      homeName: info.home?.name,
                      floorName: info.floor?.name
                    }
                  })()
                  : undefined
                return (
                  <DeviceMonitorCard
                    key={device.id}
                    device={deviceWithRealTime}
                    resident={resident}
                    onAction={handleDeviceAction}
                    showCheckbox={selectedFilter !== "all"}
                    isSelected={selectedDeviceIds.has(device.id)}
                    onSelectChange={handleSelectDevice}
                    locationInfo={locationInfo}
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
                      <SelectItem value={DeviceType.UWB_ANCHOR}>{t('pages:deviceManagement.addModal.deviceTypes.uwbAnchor')}</SelectItem>
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

        {/* 閘道器更改UWB Network ID 對話框 */}
        <Dialog open={showGatewayNetworkIdDialog} onOpenChange={setShowGatewayNetworkIdDialog}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Wifi className="h-5 w-5" />
                更改UWB Network ID
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              {selectedGatewayDevice && (
                <>
                  <div>
                    <Label className="text-sm font-medium text-gray-600">閘道器名稱</Label>
                    <p className="text-sm font-semibold mt-1">{selectedGatewayDevice.name}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-gray-600">Gateway ID</Label>
                    <p className="text-sm font-mono bg-gray-100 p-2 rounded mt-1">
                      {selectedGatewayDevice.gatewayId || '未設定'}
                    </p>
                  </div>
                  <div>
                    <Label htmlFor="network-id" className="text-sm font-medium">
                      UWB Network ID <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id="network-id"
                      type="number"
                      min="1"
                      max="65535"
                      value={gatewayNetworkIdValue}
                      onChange={(e) => setGatewayNetworkIdValue(e.target.value)}
                      placeholder="1 ~ 65535"
                      className="mt-1"
                    />
                    <p className="text-xs text-gray-500 mt-1">範圍: 1 ~ 65535</p>
                  </div>
                  <div className="bg-gray-50 p-3 rounded">
                    <Label className="text-xs font-medium text-gray-600">指令資訊（僅供參考）</Label>
                    <div className="mt-2 space-y-1 text-xs">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Content:</span>
                        <span className="font-mono">set gateway network id</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Gateway ID:</span>
                        <span className="font-mono">{selectedGatewayDevice.gatewayId || 'N/A'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Serial No:</span>
                        <span className="font-mono">自動生成 (0~65535)</span>
                      </div>
                    </div>
                  </div>
                </>
              )}
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => {
                  setShowGatewayNetworkIdDialog(false)
                  setGatewayNetworkIdValue("")
                  setSelectedGatewayDevice(null)
                }}
                disabled={isSendingNetworkId}
              >
                取消
              </Button>
              <Button
                onClick={sendGatewayNetworkIdCommand}
                disabled={isSendingNetworkId || !gatewayNetworkIdValue || parseInt(gatewayNetworkIdValue) < 1 || parseInt(gatewayNetworkIdValue) > 65535}
              >
                {isSendingNetworkId ? '發送中...' : '發送指令'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* 標籤修改功率 對話框 */}
        <Dialog open={showTagPowerDialog} onOpenChange={setShowTagPowerDialog}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5" />
                修改功率
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              {selectedTagForPower && (() => {
                const tagName = extractTagName(selectedTagForPower.name)
                const gatewayInfo = getDeviceGatewayInfo(selectedTagForPower)

                return (
                  <>
                    {/* 標籤信息 - 簡潔顯示 */}
                    <div>
                      <Label className="text-sm font-medium text-gray-600">標籤名稱</Label>
                      <p className="text-sm font-semibold mt-1">{tagName}</p>
                    </div>
                    <div>
                      <Label className="text-sm font-medium text-gray-600">Tag ID</Label>
                      <p className="text-sm font-mono bg-gray-100 p-2 rounded mt-1">
                        {selectedTagForPower.hardwareId}
                      </p>
                    </div>
                    <div>
                      <Label className="text-sm font-medium text-gray-600">Gateway ID</Label>
                      <p className="text-sm font-mono bg-gray-100 p-2 rounded mt-1">
                        {gatewayInfo?.gateway.cloudData?.gateway_id || selectedTagForPower.gatewayId || '未設定'}
                      </p>
                    </div>

                    {/* 功率值輸入 */}
                    <div className="space-y-3">
                      <div>
                        <Label htmlFor="tag-boost-norm" className="text-sm font-medium">
                          boost norm(5.0~30.5dB) <span className="text-red-500">*</span>
                        </Label>
                        <Input
                          id="tag-boost-norm"
                          type="number"
                          step="0.1"
                          min="5.0"
                          max="30.5"
                          value={tagPowerValues.boostNorm}
                          onChange={(e) => setTagPowerValues({ ...tagPowerValues, boostNorm: e.target.value })}
                          placeholder="5.0 ~ 30.5"
                          className="mt-1"
                        />
                      </div>
                      <div>
                        <Label htmlFor="tag-boost-500" className="text-sm font-medium">
                          boost 500(5.0~30.5dB) <span className="text-red-500">*</span>
                        </Label>
                        <Input
                          id="tag-boost-500"
                          type="number"
                          step="0.1"
                          min="5.0"
                          max="30.5"
                          value={tagPowerValues.boost500}
                          onChange={(e) => setTagPowerValues({ ...tagPowerValues, boost500: e.target.value })}
                          placeholder="5.0 ~ 30.5"
                          className="mt-1"
                        />
                      </div>
                      <div>
                        <Label htmlFor="tag-boost-250" className="text-sm font-medium">
                          boost 250(5.0~30.5dB) <span className="text-red-500">*</span>
                        </Label>
                        <Input
                          id="tag-boost-250"
                          type="number"
                          step="0.1"
                          min="5.0"
                          max="30.5"
                          value={tagPowerValues.boost250}
                          onChange={(e) => setTagPowerValues({ ...tagPowerValues, boost250: e.target.value })}
                          placeholder="5.0 ~ 30.5"
                          className="mt-1"
                        />
                      </div>
                      <div>
                        <Label htmlFor="tag-boost-125" className="text-sm font-medium">
                          boost 125(5.0~30.5dB) <span className="text-red-500">*</span>
                        </Label>
                        <Input
                          id="tag-boost-125"
                          type="number"
                          step="0.1"
                          min="5.0"
                          max="30.5"
                          value={tagPowerValues.boost125}
                          onChange={(e) => setTagPowerValues({ ...tagPowerValues, boost125: e.target.value })}
                          placeholder="5.0 ~ 30.5"
                          className="mt-1"
                        />
                      </div>
                    </div>
                  </>
                )
              })()}
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => {
                  setShowTagPowerDialog(false)
                  setTagPowerValues({ boostNorm: "", boost500: "", boost250: "", boost125: "" })
                  setSelectedTagForPower(null)
                }}
                disabled={isSendingTagPower}
              >
                取消
              </Button>
              <Button
                onClick={sendTagPowerCommand}
                disabled={
                  isSendingTagPower ||
                  !tagPowerValues.boostNorm ||
                  !tagPowerValues.boost500 ||
                  !tagPowerValues.boost250 ||
                  !tagPowerValues.boost125 ||
                  isNaN(parseFloat(tagPowerValues.boostNorm)) ||
                  isNaN(parseFloat(tagPowerValues.boost500)) ||
                  isNaN(parseFloat(tagPowerValues.boost250)) ||
                  isNaN(parseFloat(tagPowerValues.boost125))
                }
              >
                {isSendingTagPower ? '發送中...' : '確認修改'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* 閘道器修改所屬養老院及樓層 對話框 */}
        <Dialog open={showGatewayLocationDialog} onOpenChange={setShowGatewayLocationDialog}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <MapPin className="h-5 w-5" />
                修改所屬養老院及樓層
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              {selectedGatewayDevice && (
                <>
                  {/* 閘道器信息 */}
                  <div className="bg-blue-50 p-3 rounded-lg border border-blue-200">
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div>
                        <Label className="text-xs font-medium text-gray-600">閘道器名稱</Label>
                        <p className="font-semibold text-blue-800">{selectedGatewayDevice.name}</p>
                      </div>
                      <div>
                        <Label className="text-xs font-medium text-gray-600">Gateway ID</Label>
                        <p className="font-mono text-blue-800">{selectedGatewayDevice.gatewayId || '未設定'}</p>
                      </div>
                    </div>
                    {/* 當前綁定信息 */}
                    {(() => {
                      const currentLocation = getGatewayLocationInfo(selectedGatewayDevice)
                      return (
                        <div className="mt-2 pt-2 border-t border-blue-200">
                          <Label className="text-xs font-medium text-gray-600">當前綁定</Label>
                          <p className="text-sm text-blue-700">
                            {currentLocation.home?.name || '未綁定場域'}
                            {currentLocation.floor ? ` → ${currentLocation.floor.name}` : ''}
                          </p>
                        </div>
                      )
                    })()}
                  </div>

                  {/* 場域選擇 */}
                  <div>
                    <Label className="text-sm font-medium">
                      選擇養老院 <span className="text-red-500">*</span>
                    </Label>
                    <Select
                      value={gatewayLocationHomeId}
                      onValueChange={(value) => {
                        setGatewayLocationHomeId(value)
                        setGatewayLocationFloorId("") // 重置樓層選擇
                      }}
                    >
                      <SelectTrigger className="mt-1">
                        <SelectValue placeholder="請選擇養老院" />
                      </SelectTrigger>
                      <SelectContent>
                        {homes.map(home => (
                          <SelectItem key={home.id} value={home.id}>
                            {home.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* 樓層選擇 */}
                  <div>
                    <Label className="text-sm font-medium">
                      選擇樓層 <span className="text-red-500">*</span>
                    </Label>
                    <Select
                      value={gatewayLocationFloorId}
                      onValueChange={setGatewayLocationFloorId}
                      disabled={!gatewayLocationHomeId}
                    >
                      <SelectTrigger className="mt-1">
                        <SelectValue placeholder={gatewayLocationHomeId ? "請選擇樓層" : "請先選擇養老院"} />
                      </SelectTrigger>
                      <SelectContent>
                        {floors
                          .filter(floor => floor.homeId === gatewayLocationHomeId)
                          .map(floor => (
                            <SelectItem key={floor.id} value={floor.id}>
                              {floor.name}
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                    {gatewayLocationHomeId && floors.filter(f => f.homeId === gatewayLocationHomeId).length === 0 && (
                      <p className="text-xs text-orange-600 mt-1">
                        該養老院暫無樓層，請先在「UWB定位管理」中新增樓層
                      </p>
                    )}
                  </div>

                  {/* 提示信息 */}
                  <div className="bg-gray-50 p-3 rounded text-xs text-gray-600">
                    <p>💡 修改綁定後，閘道器將歸屬於新選擇的養老院和樓層。</p>
                  </div>
                </>
              )}
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => {
                  setShowGatewayLocationDialog(false)
                  setGatewayLocationHomeId("")
                  setGatewayLocationFloorId("")
                  setSelectedGatewayDevice(null)
                }}
                disabled={isSavingGatewayLocation}
              >
                取消
              </Button>
              <Button
                onClick={saveGatewayLocation}
                disabled={isSavingGatewayLocation || !gatewayLocationFloorId}
              >
                {isSavingGatewayLocation ? '保存中...' : '確認修改'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* 錨點修改高度(Z坐標) 對話框 */}
        <Dialog open={showAnchorHeightDialog} onOpenChange={setShowAnchorHeightDialog}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Anchor className="h-5 w-5" />
                修改高度(Z坐標)
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              {selectedAnchorDevice && (() => {
                const lastData = selectedAnchorDevice.lastData || {}
                const position = lastData.position || { x: 0, y: 0, z: 0 }
                const anchorName = extractAnchorName(selectedAnchorDevice.name)
                const gatewayInfo = getDeviceGatewayInfo(selectedAnchorDevice)

                return (
                  <>
                    {/* 錨點信息 - 簡潔顯示 */}
                    <div>
                      <Label className="text-sm font-medium text-gray-600">錨點名稱</Label>
                      <p className="text-sm font-semibold mt-1">{anchorName}</p>
                    </div>
                    <div>
                      <Label className="text-sm font-medium text-gray-600">Anchor ID</Label>
                      <p className="text-sm font-mono bg-gray-100 p-2 rounded mt-1">
                        {selectedAnchorDevice.hardwareId}
                      </p>
                    </div>
                    <div>
                      <Label className="text-sm font-medium text-gray-600">Gateway ID</Label>
                      <p className="text-sm font-mono bg-gray-100 p-2 rounded mt-1">
                        {gatewayInfo?.gateway.cloudData?.gateway_id || selectedAnchorDevice.gatewayId || '未設定'}
                      </p>
                    </div>

                    {/* Z坐標輸入 */}
                    <div>
                      <Label htmlFor="anchor-z" className="text-sm font-medium">
                        Z坐標（高度） <span className="text-red-500">*</span>
                      </Label>
                      <Input
                        id="anchor-z"
                        type="number"
                        step="0.01"
                        value={anchorHeightValue}
                        onChange={(e) => setAnchorHeightValue(e.target.value)}
                        placeholder="請輸入Z坐標值"
                        className="mt-1"
                      />
                      <p className="text-xs text-gray-500 mt-1">輸入新的高度值（單位：米）</p>
                    </div>

                    {/* 指令資訊預覽 */}
                    <div className="bg-gray-50 p-3 rounded">
                      <Label className="text-sm font-medium text-gray-600">指令資訊（僅供參考）</Label>
                      <div className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
                        <div className="flex justify-between">
                          <span className="text-gray-600">Content:</span>
                          <span className="font-mono">configChange</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Gateway ID:</span>
                          <span className="font-mono">{gatewayInfo?.gateway.cloudData?.gateway_id || selectedAnchorDevice.gatewayId || 'N/A'}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Node:</span>
                          <span className="font-mono">ANCHOR</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Name:</span>
                          <span className="font-mono">{anchorName}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">ID:</span>
                          <span className="font-mono">{selectedAnchorDevice.hardwareId}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">X坐標:</span>
                          <span className="font-mono">{position.x ?? 0}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Y坐標:</span>
                          <span className="font-mono">{position.y ?? 0}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">fw update:</span>
                          <span className="font-mono">{lastData.fw_update ?? 0}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">led:</span>
                          <span className="font-mono">{lastData.led ?? 0}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">ble:</span>
                          <span className="font-mono">{lastData.ble ?? 0}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">initiator:</span>
                          <span className="font-mono">{lastData.initiator ?? 0}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Serial No:</span>
                          <span className="font-mono">0~65535</span>
                        </div>
                      </div>
                    </div>
                  </>
                )
              })()}
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => {
                  setShowAnchorHeightDialog(false)
                  setAnchorHeightValue("")
                  setSelectedAnchorDevice(null)
                }}
                disabled={isSendingAnchorHeight}
              >
                取消
              </Button>
              <Button
                onClick={sendAnchorHeightCommand}
                disabled={isSendingAnchorHeight || !anchorHeightValue || isNaN(parseFloat(anchorHeightValue))}
              >
                {isSendingAnchorHeight ? '發送中...' : '確認修改'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* 錨點修改功率 對話框 */}
        <Dialog open={showAnchorPowerDialog} onOpenChange={setShowAnchorPowerDialog}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5" />
                修改功率
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              {selectedAnchorForPower && (() => {
                const anchorName = extractAnchorName(selectedAnchorForPower.name)
                const gatewayInfo = getDeviceGatewayInfo(selectedAnchorForPower)

                return (
                  <>
                    {/* 錨點信息 - 簡潔顯示 */}
                    <div>
                      <Label className="text-sm font-medium text-gray-600">錨點名稱</Label>
                      <p className="text-sm font-semibold mt-1">{anchorName}</p>
                    </div>
                    <div>
                      <Label className="text-sm font-medium text-gray-600">Anchor ID</Label>
                      <p className="text-sm font-mono bg-gray-100 p-2 rounded mt-1">
                        {selectedAnchorForPower.hardwareId}
                      </p>
                    </div>
                    <div>
                      <Label className="text-sm font-medium text-gray-600">Gateway ID</Label>
                      <p className="text-sm font-mono bg-gray-100 p-2 rounded mt-1">
                        {gatewayInfo?.gateway.cloudData?.gateway_id || selectedAnchorForPower.gatewayId || '未設定'}
                      </p>
                    </div>

                    {/* 功率值輸入 */}
                    <div className="space-y-3">
                      <div>
                        <Label htmlFor="boost-norm" className="text-sm font-medium">
                          boost norm(5.0~30.5dB) <span className="text-red-500">*</span>
                        </Label>
                        <Input
                          id="boost-norm"
                          type="number"
                          step="0.1"
                          min="5.0"
                          max="30.5"
                          value={anchorPowerValues.boostNorm}
                          onChange={(e) => setAnchorPowerValues({ ...anchorPowerValues, boostNorm: e.target.value })}
                          placeholder="5.0 ~ 30.5"
                          className="mt-1"
                        />
                      </div>
                      <div>
                        <Label htmlFor="boost-500" className="text-sm font-medium">
                          boost 500(5.0~30.5dB) <span className="text-red-500">*</span>
                        </Label>
                        <Input
                          id="boost-500"
                          type="number"
                          step="0.1"
                          min="5.0"
                          max="30.5"
                          value={anchorPowerValues.boost500}
                          onChange={(e) => setAnchorPowerValues({ ...anchorPowerValues, boost500: e.target.value })}
                          placeholder="5.0 ~ 30.5"
                          className="mt-1"
                        />
                      </div>
                      <div>
                        <Label htmlFor="boost-250" className="text-sm font-medium">
                          boost 250(5.0~30.5dB) <span className="text-red-500">*</span>
                        </Label>
                        <Input
                          id="boost-250"
                          type="number"
                          step="0.1"
                          min="5.0"
                          max="30.5"
                          value={anchorPowerValues.boost250}
                          onChange={(e) => setAnchorPowerValues({ ...anchorPowerValues, boost250: e.target.value })}
                          placeholder="5.0 ~ 30.5"
                          className="mt-1"
                        />
                      </div>
                      <div>
                        <Label htmlFor="boost-125" className="text-sm font-medium">
                          boost 125(5.0~30.5dB) <span className="text-red-500">*</span>
                        </Label>
                        <Input
                          id="boost-125"
                          type="number"
                          step="0.1"
                          min="5.0"
                          max="30.5"
                          value={anchorPowerValues.boost125}
                          onChange={(e) => setAnchorPowerValues({ ...anchorPowerValues, boost125: e.target.value })}
                          placeholder="5.0 ~ 30.5"
                          className="mt-1"
                        />
                      </div>
                    </div>
                  </>
                )
              })()}
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => {
                  setShowAnchorPowerDialog(false)
                  setAnchorPowerValues({ boostNorm: "", boost500: "", boost250: "", boost125: "" })
                  setSelectedAnchorForPower(null)
                }}
                disabled={isSendingAnchorPower}
              >
                取消
              </Button>
              <Button
                onClick={sendAnchorPowerCommand}
                disabled={
                  isSendingAnchorPower ||
                  !anchorPowerValues.boostNorm ||
                  !anchorPowerValues.boost500 ||
                  !anchorPowerValues.boost250 ||
                  !anchorPowerValues.boost125 ||
                  isNaN(parseFloat(anchorPowerValues.boostNorm)) ||
                  isNaN(parseFloat(anchorPowerValues.boost500)) ||
                  isNaN(parseFloat(anchorPowerValues.boost250)) ||
                  isNaN(parseFloat(anchorPowerValues.boost125))
                }
              >
                {isSendingAnchorPower ? '發送中...' : '確認修改'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* 標籤更改參數設定 對話框 */}
        <Dialog open={showTagConfigDialog} onOpenChange={setShowTagConfigDialog}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5" />
                更改參數設定
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              {selectedTagDevice && (() => {
                const tagName = extractTagName(selectedTagDevice.name)
                const gatewayInfo = getDeviceGatewayInfo(selectedTagDevice)

                return (
                  <>
                    {/* 標籤信息 - 簡潔顯示 */}
                    <div>
                      <Label className="text-sm font-medium text-gray-600">標籤名稱</Label>
                      <p className="text-sm font-semibold mt-1">{tagName}</p>
                    </div>
                    <div>
                      <Label className="text-sm font-medium text-gray-600">Tag ID</Label>
                      <p className="text-sm font-mono bg-gray-100 p-2 rounded mt-1">
                        {selectedTagDevice.hardwareId}
                      </p>
                    </div>
                    <div>
                      <Label className="text-sm font-medium text-gray-600">Gateway ID</Label>
                      <p className="text-sm font-mono bg-gray-100 p-2 rounded mt-1">
                        {gatewayInfo?.gateway.cloudData?.gateway_id || selectedTagDevice.gatewayId || '未設定'}
                      </p>
                    </div>

                    {/* 參數輸入 - 兩列布局 */}
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="fw-update" className="text-sm font-medium">
                          fw update <span className="text-red-500">*</span>
                        </Label>
                        <Input
                          id="fw-update"
                          type="number"
                          value={tagConfigValues.fwUpdate}
                          onChange={(e) => setTagConfigValues({ ...tagConfigValues, fwUpdate: e.target.value })}
                          placeholder="0 或 1"
                          className="mt-1"
                        />
                      </div>
                      <div>
                        <Label htmlFor="led" className="text-sm font-medium">
                          led <span className="text-red-500">*</span>
                        </Label>
                        <Input
                          id="led"
                          type="number"
                          value={tagConfigValues.led}
                          onChange={(e) => setTagConfigValues({ ...tagConfigValues, led: e.target.value })}
                          placeholder="0 或 1"
                          className="mt-1"
                        />
                      </div>
                      <div>
                        <Label htmlFor="ble" className="text-sm font-medium">
                          ble <span className="text-red-500">*</span>
                        </Label>
                        <Input
                          id="ble"
                          type="number"
                          value={tagConfigValues.ble}
                          onChange={(e) => setTagConfigValues({ ...tagConfigValues, ble: e.target.value })}
                          placeholder="0 或 1"
                          className="mt-1"
                        />
                      </div>
                      <div>
                        <Label htmlFor="location-engine" className="text-sm font-medium">
                          location engine <span className="text-red-500">*</span>
                        </Label>
                        <Input
                          id="location-engine"
                          type="number"
                          value={tagConfigValues.locationEngine}
                          onChange={(e) => setTagConfigValues({ ...tagConfigValues, locationEngine: e.target.value })}
                          placeholder="0 或 1"
                          className="mt-1"
                        />
                      </div>
                      <div>
                        <Label htmlFor="responsive-mode" className="text-sm font-medium">
                          responsive mode <span className="text-red-500">*</span>
                        </Label>
                        <Input
                          id="responsive-mode"
                          type="number"
                          value={tagConfigValues.responsiveMode}
                          onChange={(e) => setTagConfigValues({ ...tagConfigValues, responsiveMode: e.target.value })}
                          placeholder="0 或 1"
                          className="mt-1"
                        />
                      </div>
                      <div>
                        <Label htmlFor="stationary-detect" className="text-sm font-medium">
                          stationary detect <span className="text-red-500">*</span>
                        </Label>
                        <Input
                          id="stationary-detect"
                          type="number"
                          value={tagConfigValues.stationaryDetect}
                          onChange={(e) => setTagConfigValues({ ...tagConfigValues, stationaryDetect: e.target.value })}
                          placeholder="0 或 1"
                          className="mt-1"
                        />
                      </div>
                      <div>
                        <Label htmlFor="nominal-udr" className="text-sm font-medium">
                          nominal udr(hz) <span className="text-red-500">*</span>
                        </Label>
                        <Input
                          id="nominal-udr"
                          type="number"
                          step="0.1"
                          value={tagConfigValues.nominalUdr}
                          onChange={(e) => setTagConfigValues({ ...tagConfigValues, nominalUdr: e.target.value })}
                          placeholder="請輸入數值"
                          className="mt-1"
                        />
                      </div>
                      <div>
                        <Label htmlFor="stationary-udr" className="text-sm font-medium">
                          stationary udr(hz) <span className="text-red-500">*</span>
                        </Label>
                        <Input
                          id="stationary-udr"
                          type="number"
                          step="0.1"
                          value={tagConfigValues.stationaryUdr}
                          onChange={(e) => setTagConfigValues({ ...tagConfigValues, stationaryUdr: e.target.value })}
                          placeholder="請輸入數值"
                          className="mt-1"
                        />
                      </div>
                    </div>
                  </>
                )
              })()}
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => {
                  setShowTagConfigDialog(false)
                  setTagConfigValues({
                    fwUpdate: "",
                    led: "",
                    ble: "",
                    locationEngine: "",
                    responsiveMode: "",
                    stationaryDetect: "",
                    nominalUdr: "",
                    stationaryUdr: ""
                  })
                  setSelectedTagDevice(null)
                }}
                disabled={isSendingTagConfig}
              >
                取消
              </Button>
              <Button
                onClick={sendTagConfigCommand}
                disabled={
                  isSendingTagConfig ||
                  !tagConfigValues.fwUpdate ||
                  !tagConfigValues.led ||
                  !tagConfigValues.ble ||
                  !tagConfigValues.locationEngine ||
                  !tagConfigValues.responsiveMode ||
                  !tagConfigValues.stationaryDetect ||
                  !tagConfigValues.nominalUdr ||
                  !tagConfigValues.stationaryUdr
                }
              >
                {isSendingTagConfig ? '發送中...' : '確認修改'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* 標籤修改功率 對話框 */}
        <Dialog open={showTagPowerDialog} onOpenChange={setShowTagPowerDialog}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5" />
                修改功率
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              {selectedTagForPower && (() => {
                const tagName = extractTagName(selectedTagForPower.name)
                const gatewayInfo = getDeviceGatewayInfo(selectedTagForPower)

                return (
                  <>
                    {/* 標籤信息 - 簡潔顯示 */}
                    <div>
                      <Label className="text-sm font-medium text-gray-600">標籤名稱</Label>
                      <p className="text-sm font-semibold mt-1">{tagName}</p>
                    </div>
                    <div>
                      <Label className="text-sm font-medium text-gray-600">Tag ID</Label>
                      <p className="text-sm font-mono bg-gray-100 p-2 rounded mt-1">
                        {selectedTagForPower.hardwareId}
                      </p>
                    </div>
                    <div>
                      <Label className="text-sm font-medium text-gray-600">Gateway ID</Label>
                      <p className="text-sm font-mono bg-gray-100 p-2 rounded mt-1">
                        {gatewayInfo?.gateway.cloudData?.gateway_id || selectedTagForPower.gatewayId || '未設定'}
                      </p>
                    </div>

                    {/* 功率值輸入 */}
                    <div className="space-y-3">
                      <div>
                        <Label htmlFor="tag-boost-norm" className="text-sm font-medium">
                          boost norm(5.0~30.5dB) <span className="text-red-500">*</span>
                        </Label>
                        <Input
                          id="tag-boost-norm"
                          type="number"
                          step="0.1"
                          min="5.0"
                          max="30.5"
                          value={tagPowerValues.boostNorm}
                          onChange={(e) => setTagPowerValues({ ...tagPowerValues, boostNorm: e.target.value })}
                          placeholder="5.0 ~ 30.5"
                          className="mt-1"
                        />
                      </div>
                      <div>
                        <Label htmlFor="tag-boost-500" className="text-sm font-medium">
                          boost 500(5.0~30.5dB) <span className="text-red-500">*</span>
                        </Label>
                        <Input
                          id="tag-boost-500"
                          type="number"
                          step="0.1"
                          min="5.0"
                          max="30.5"
                          value={tagPowerValues.boost500}
                          onChange={(e) => setTagPowerValues({ ...tagPowerValues, boost500: e.target.value })}
                          placeholder="5.0 ~ 30.5"
                          className="mt-1"
                        />
                      </div>
                      <div>
                        <Label htmlFor="tag-boost-250" className="text-sm font-medium">
                          boost 250(5.0~30.5dB) <span className="text-red-500">*</span>
                        </Label>
                        <Input
                          id="tag-boost-250"
                          type="number"
                          step="0.1"
                          min="5.0"
                          max="30.5"
                          value={tagPowerValues.boost250}
                          onChange={(e) => setTagPowerValues({ ...tagPowerValues, boost250: e.target.value })}
                          placeholder="5.0 ~ 30.5"
                          className="mt-1"
                        />
                      </div>
                      <div>
                        <Label htmlFor="tag-boost-125" className="text-sm font-medium">
                          boost 125(5.0~30.5dB) <span className="text-red-500">*</span>
                        </Label>
                        <Input
                          id="tag-boost-125"
                          type="number"
                          step="0.1"
                          min="5.0"
                          max="30.5"
                          value={tagPowerValues.boost125}
                          onChange={(e) => setTagPowerValues({ ...tagPowerValues, boost125: e.target.value })}
                          placeholder="5.0 ~ 30.5"
                          className="mt-1"
                        />
                      </div>
                    </div>
                  </>
                )
              })()}
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => {
                  setShowTagPowerDialog(false)
                  setTagPowerValues({ boostNorm: "", boost500: "", boost250: "", boost125: "" })
                  setSelectedTagForPower(null)
                }}
                disabled={isSendingTagPower}
              >
                取消
              </Button>
              <Button
                onClick={sendTagPowerCommand}
                disabled={
                  isSendingTagPower ||
                  !tagPowerValues.boostNorm ||
                  !tagPowerValues.boost500 ||
                  !tagPowerValues.boost250 ||
                  !tagPowerValues.boost125 ||
                  isNaN(parseFloat(tagPowerValues.boostNorm)) ||
                  isNaN(parseFloat(tagPowerValues.boost500)) ||
                  isNaN(parseFloat(tagPowerValues.boost250)) ||
                  isNaN(parseFloat(tagPowerValues.boost125))
                }
              >
                {isSendingTagPower ? '發送中...' : '確認修改'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </>
    </div>
  )
}
