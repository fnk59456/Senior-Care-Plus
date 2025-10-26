import React, { useEffect, useRef, useState, useCallback } from "react"
import { useTranslation } from "react-i18next"
import { mqttBus } from "@/services/mqttBus"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { useUWBLocation } from "@/contexts/UWBLocationContext"
import { useDeviceManagement } from "@/contexts/DeviceManagementContext"
import { DeviceType, DEVICE_TYPE_CONFIG } from "@/types/device-types"
import {
  MapPin,
  Wifi,
  Signal,
  AlertCircle,
  CheckCircle2,
  RotateCcw,
  ZoomIn,
  ZoomOut,
  RefreshCw,
  Search,
  Heart,
  AlertTriangle,
  Watch,
  Baby,
  Activity,
  Eye,
  EyeOff
} from "lucide-react"

// 類型定義
interface Patient {
  id: string
  name: string
  position: { x: number; y: number; quality?: number; z?: number }
  updatedAt: number
  gatewayId: string
  deviceId?: string
  deviceType?: DeviceType
  residentId?: string
  residentName?: string
  residentStatus?: 'good' | 'attention' | 'critical'
  residentRoom?: string
}

export default function LocationPage() {
  const { t } = useTranslation()

  // 從Context獲取共享狀態
  const {
    homes,
    floors,
    gateways,
    selectedHome,
    selectedFloor,
    selectedGateway,
    setSelectedHome,
    setSelectedFloor,
    setSelectedGateway,
    refreshData
  } = useUWBLocation()

  // 從設備管理Context獲取數據
  const {
    devices,
    getResidentForDevice
  } = useDeviceManagement()

  // 本地狀態
  const [patients, setPatients] = useState<Record<string, Patient>>({})
  const [cloudConnected, setCloudConnected] = useState(false)
  const [cloudConnectionStatus, setCloudConnectionStatus] = useState("未連線")

  // ✅ 方案一：設備狀態緩存 - 避免地圖交互時重新計算過期狀態
  const [deviceOnlineStatus, setDeviceOnlineStatus] = useState<Record<string, boolean>>({})

  // ✅ 地圖標記信息顯示控制
  const [showMarkerInfo, setShowMarkerInfo] = useState(true)

  // 新增過濾和搜索狀態
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState<'all' | 'good' | 'attention' | 'critical'>('all')
  const [deviceTypeFilter, setDeviceTypeFilter] = useState<DeviceType | 'all'>('all')

  // 地图缩放功能状态
  const [mapTransform, setMapTransform] = useState({
    scale: 1,
    translateX: 0,
    translateY: 0,
    minScale: 0.5,
    maxScale: 3,
  })

  // 拖拽状态
  const [isDragging, setIsDragging] = useState(false)
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 })
  const [lastTransform, setLastTransform] = useState({ translateX: 0, translateY: 0 })

  const mapContainerRef = useRef<HTMLDivElement>(null)
  const mapImageRef = useRef<HTMLImageElement>(null)

  // 根據MAC地址獲取病患資訊
  const getResidentInfoByMAC = (mac: string) => {
    // 查找設備：先嘗試hardwareId，再嘗試deviceUid
    const device = devices.find(d =>
      d.hardwareId === mac ||
      d.deviceUid === mac ||
      d.deviceUid === `TAG:${mac}` ||
      d.deviceUid === `UWB_TAG:${mac}`
    )

    if (device) {
      const resident = getResidentForDevice(device.id)
      if (resident) {
        return {
          residentId: resident.id,
          residentName: resident.name,
          residentRoom: resident.room,
          residentStatus: resident.status,
          deviceType: device.deviceType
        }
      }
    }

    return null
  }

  // 簡化的座標轉換函數 - 只計算基礎座標，讓CSS變換處理縮放和平移
  const convertRealToDisplayCoords = (x: number, y: number, floor: any, imgElement: HTMLImageElement) => {
    if (!floor?.calibration?.isCalibrated || !imgElement) return null

    const { originPixel, originCoordinates, pixelToMeterRatio } = floor.calibration

    // 計算相對於原點的實際距離（米）
    const deltaX = x - (originCoordinates?.x || 0)
    const deltaY = y - (originCoordinates?.y || 0)

    // 轉換為像素距離
    const pixelX = originPixel.x + (deltaX * pixelToMeterRatio)
    const pixelY = originPixel.y - (deltaY * pixelToMeterRatio) // Y軸反向

    // 轉換為基礎顯示座標（不考慮變換）
    const displayX = (pixelX / imgElement.naturalWidth) * imgElement.width
    const displayY = (pixelY / imgElement.naturalHeight) * imgElement.height

    return { x: displayX, y: displayY }
  }

  // 獲取設備圖標
  const getDeviceIcon = (deviceType: DeviceType) => {
    switch (deviceType) {
      case DeviceType.SMARTWATCH_300B: return Watch
      case DeviceType.DIAPER_SENSOR: return Baby
      case DeviceType.PEDOMETER: return Activity
      case DeviceType.UWB_TAG: return MapPin
      default: return MapPin
    }
  }

  // 獲取院友狀態信息
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
          badge: <Badge>{t('status:resident.status.unknown')}</Badge>,
          icon: '❓',
          bgColor: 'bg-gray-100'
        }
    }
  }

  // 地图缩放控制函数
  const handleZoomIn = useCallback(() => {
    setMapTransform(prev => ({
      ...prev,
      scale: Math.min(prev.maxScale, prev.scale * 1.2)
    }))
  }, [])

  const handleZoomOut = useCallback(() => {
    setMapTransform(prev => ({
      ...prev,
      scale: Math.max(prev.minScale, prev.scale / 1.2)
    }))
  }, [])

  // 重置地图视图
  const resetMapView = useCallback(() => {
    setMapTransform({
      scale: 1,
      translateX: 0,
      translateY: 0,
      minScale: 0.5,
      maxScale: 3,
    })
  }, [])

  // 鼠标滚轮缩放 - 使用原生事件避免被動監聽器問題
  const handleWheel = useCallback((e: WheelEvent) => {
    e.preventDefault()
    e.stopPropagation()

    const delta = e.deltaY > 0 ? 0.9 : 1.1
    const newScale = Math.max(
      mapTransform.minScale,
      Math.min(mapTransform.maxScale, mapTransform.scale * delta)
    )

    if (newScale === mapTransform.scale) return

    // 计算鼠标位置相对于地图容器的偏移
    const rect = (e.target as HTMLElement).getBoundingClientRect()
    const mouseX = e.clientX - rect.left
    const mouseY = e.clientY - rect.top

    // 以鼠标位置为中心进行缩放
    const scaleRatio = newScale / mapTransform.scale
    const newTranslateX = mouseX - (mouseX - mapTransform.translateX) * scaleRatio
    const newTranslateY = mouseY - (mouseY - mapTransform.translateY) * scaleRatio

    setMapTransform(prev => ({
      ...prev,
      scale: newScale,
      translateX: newTranslateX,
      translateY: newTranslateY
    }))
  }, [mapTransform])

  // 鼠标拖拽事件
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.button !== 0) return // 只处理左键

    setIsDragging(true)
    setDragStart({ x: e.clientX, y: e.clientY })
    setLastTransform({ translateX: mapTransform.translateX, translateY: mapTransform.translateY })

    // 阻止图片拖拽
    e.preventDefault()
  }, [mapTransform])

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isDragging) return

    const deltaX = e.clientX - dragStart.x
    const deltaY = e.clientY - dragStart.y

    setMapTransform(prev => ({
      ...prev,
      translateX: lastTransform.translateX + deltaX,
      translateY: lastTransform.translateY + deltaY
    }))
  }, [isDragging, dragStart, lastTransform])

  const handleMouseUp = useCallback(() => {
    setIsDragging(false)
  }, [])

  // 触摸事件支持
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (e.touches.length === 1) {
      // 单指拖拽
      const touch = e.touches[0]
      setIsDragging(true)
      setDragStart({ x: touch.clientX, y: touch.clientY })
      setLastTransform({ translateX: mapTransform.translateX, translateY: mapTransform.translateY })
    }
  }, [mapTransform])

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (e.touches.length === 1 && isDragging) {
      e.preventDefault()
      const touch = e.touches[0]

      const deltaX = touch.clientX - dragStart.x
      const deltaY = touch.clientY - dragStart.y

      setMapTransform(prev => ({
        ...prev,
        translateX: lastTransform.translateX + deltaX,
        translateY: lastTransform.translateY + deltaY
      }))
    }
  }, [isDragging, dragStart, lastTransform])

  const handleTouchEnd = useCallback(() => {
    setIsDragging(false)
  }, [])

  // 地圖容器滑鼠進入/離開事件
  const handleMapMouseEnter = useCallback(() => {
    // 地圖容器獲得焦點時，可以進行縮放操作
    if (mapContainerRef.current) {
      mapContainerRef.current.style.cursor = 'grab'
    }
  }, [])

  const handleMapMouseLeave = useCallback(() => {
    // 地圖容器失去焦點時，恢復正常游標
    if (mapContainerRef.current) {
      mapContainerRef.current.style.cursor = isDragging ? 'grabbing' : 'grab'
    }
  }, [isDragging])

  // 当选择的楼层变化时重置地图视图
  useEffect(() => {
    resetMapView()
  }, [selectedFloor, resetMapView])

  // 設置原生滾輪事件監聽器
  useEffect(() => {
    const mapContainer = mapContainerRef.current
    if (mapContainer) {
      // 使用原生事件監聽器，設置為非被動模式
      mapContainer.addEventListener('wheel', handleWheel, { passive: false })

      return () => {
        mapContainer.removeEventListener('wheel', handleWheel)
      }
    }
  }, [handleWheel])

  // ✅ 使用 MQTT Bus 處理位置數據
  useEffect(() => {
    let lastProcessedTime = 0
    let processedMessages = new Set()
    let lastUpdateTime = 0

    const updateLocationData = () => {
      // 🔧 頻率控制：確保至少間隔2秒才更新
      const now = Date.now()
      if (now - lastUpdateTime < 2000) {
        return
      }

      try {
        const recentMessages = mqttBus.getRecentMessages()

        // 只處理新的位置消息
        const newMessages = recentMessages.filter(msg => {
          const msgTime = msg.timestamp.getTime()
          const msgKey = `${msg.topic}-${msgTime}`
          const isNew = msgTime > lastProcessedTime && !processedMessages.has(msgKey)
          return isNew && msg.payload?.content === "location" && msg.payload?.id && msg.payload?.position
        })

        if (newMessages.length === 0) {
          return
        }

        // 更新最後處理時間
        lastProcessedTime = Math.max(...newMessages.map(msg => msg.timestamp.getTime()))

        // 標記已處理的消息
        newMessages.forEach(msg => {
          const msgKey = `${msg.topic}-${msg.timestamp.getTime()}`
          processedMessages.add(msgKey)
        })

        // 清理過期的處理記錄（保留最近1小時）
        const oneHourAgo = Date.now() - 60 * 60 * 1000
        const keysToDelete: string[] = []
        processedMessages.forEach((key) => {
          const keyStr = String(key)
          const timestamp = parseInt(keyStr.split('-').pop() || '0')
          if (timestamp < oneHourAgo) {
            keysToDelete.push(keyStr)
          }
        })
        keysToDelete.forEach((key: string) => processedMessages.delete(key))

        // 處理位置消息
        newMessages.forEach(msg => {
          const data = msg.payload
          const deviceId = String(data.id)

          // ✅ 添加 Gateway 篩選：只處理來自選定 Gateway 的位置消息
          if (selectedGateway) {
            const gateway = gateways.find(gw => gw.id === selectedGateway)
            if (gateway) {
              // 檢查消息是否來自選定的 Gateway
              const msgGateway = msg.gateway?.name || ''
              const msgTopicGateway = msg.topic?.match(/GW[A-F0-9]+/)?.[0] || ''

              // 使用前綴匹配邏輯（類似 HeartRatePage）
              const msgGatewayPrefix = msgGateway?.split('_')[0] || ''
              const selectedGatewayPrefix = gateway.name?.split('_')[0] || ''

              const isFromSelectedGateway = msgGatewayPrefix &&
                selectedGatewayPrefix &&
                msgGatewayPrefix === selectedGatewayPrefix

              if (!isFromSelectedGateway) {
                console.log(`⏭️ 跳過非選定 Gateway 的位置消息:`, {
                  deviceId,
                  msgGateway,
                  msgTopicGateway,
                  selectedGateway: gateway.name,
                  msgGatewayPrefix,
                  selectedGatewayPrefix
                })
                return // 跳過此消息
              }

              console.log(`✅ 處理選定 Gateway 的位置消息:`, {
                deviceId,
                msgGateway,
                selectedGateway: gateway.name,
                msgGatewayPrefix,
                selectedGatewayPrefix
              })
            }
          }

          // 獲取病患資訊
          const residentInfo = getResidentInfoByMAC(deviceId)

          setPatients(prev => ({
            ...prev,
            [deviceId]: {
              id: deviceId,
              name: residentInfo?.residentName ? `${residentInfo.residentName} (${residentInfo.residentRoom})` : `設備-${deviceId}`,
              position: {
                x: data.position.x,
                y: data.position.y,
                quality: data.position.quality || 0,
                z: data.position.z,
              },
              updatedAt: msg.timestamp.getTime(),
              gatewayId: selectedGateway,
              deviceId: residentInfo?.deviceType ? devices.find(d => d.hardwareId === deviceId)?.id : undefined,
              deviceType: residentInfo?.deviceType,
              residentId: residentInfo?.residentId,
              residentName: residentInfo?.residentName,
              residentStatus: residentInfo?.residentStatus,
              residentRoom: residentInfo?.residentRoom,
              // 添加 Gateway 資訊用於調試
              gateway: msg.gateway?.name || '',
              topic: msg.topic
            },
          }))
        })

        // 更新最後更新時間
        lastUpdateTime = Date.now()
      } catch (error) {
        console.error('Error processing location data:', error)
      }
    }

    // 初始載入
    updateLocationData()

    // 每5秒檢查一次新消息
    const interval = setInterval(updateLocationData, 5000)

    return () => clearInterval(interval)
  }, [selectedGateway, devices, getResidentForDevice])

  // ✅ 監聽 MQTT Bus 連接狀態
  useEffect(() => {
    const unsubscribe = mqttBus.onStatusChange((status) => {
      setCloudConnected(status === 'connected')
      setCloudConnectionStatus(status === 'connected' ? t('pages:location.connectionStatus.connected') :
        status === 'connecting' ? t('pages:location.connectionStatus.connecting') :
          status === 'reconnecting' ? t('pages:location.connectionStatus.reconnecting') :
            status === 'error' ? t('pages:location.connectionStatus.connectionError') : t('pages:location.connectionStatus.disconnected'))
    })

    // 初始化狀態
    const currentStatus = mqttBus.getStatus()
    setCloudConnected(currentStatus === 'connected')
    setCloudConnectionStatus(currentStatus === 'connected' ? t('pages:location.connectionStatus.connected') : t('pages:location.connectionStatus.disconnected'))

    return unsubscribe
  }, [])

  // ✅ Gateway 切換時清除位置數據
  useEffect(() => {
    console.log(`🔄 Gateway 切換，清除舊的位置數據:`, selectedGateway)
    setPatients({})
    setDeviceOnlineStatus({}) // 同時清除設備狀態緩存
  }, [selectedGateway])

  // ✅ 方案一：設備狀態緩存更新 - 只在 patients 變化時重新計算在線狀態
  useEffect(() => {
    const now = Date.now()
    const newOnlineStatus: Record<string, boolean> = {}

    Object.values(patients).forEach(patient => {
      newOnlineStatus[patient.id] = now - patient.updatedAt < 5000
    })

    console.log(`📊 更新設備在線狀態緩存:`, {
      totalDevices: Object.keys(patients).length,
      onlineDevices: Object.values(newOnlineStatus).filter(status => status).length,
      offlineDevices: Object.values(newOnlineStatus).filter(status => !status).length
    })

    setDeviceOnlineStatus(newOnlineStatus)
  }, [patients]) // 只在 patients 變化時更新

  // ✅ 方案一：使用緩存的設備狀態 - 避免地圖交互時重新計算
  const patientList = Object.values(patients)
  const onlinePatients = patientList.filter(p => deviceOnlineStatus[p.id] !== false)

  // 過濾患者列表
  const filteredPatients = onlinePatients.filter(patient => {
    const matchesSearch =
      patient.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (patient.residentRoom && patient.residentRoom.toLowerCase().includes(searchTerm.toLowerCase()))

    const matchesStatus = statusFilter === 'all' || patient.residentStatus === statusFilter

    const matchesDeviceType = deviceTypeFilter === 'all' || patient.deviceType === deviceTypeFilter

    return matchesSearch && matchesStatus && matchesDeviceType
  })

  // 獲取當前選擇的樓層數據
  const selectedFloorData = floors.find(f => f.id === selectedFloor)
  const mapImage = selectedFloorData?.mapImage
  const calibration = selectedFloorData?.calibration
  const dimensions = selectedFloorData?.dimensions

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold mb-4">{t('pages:location.title')}</h1>
        <p className="text-muted-foreground mb-4">
          {t('pages:location.subtitle')}
        </p>
      </div>

      {/* 巢狀結構選單 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <MapPin className="mr-2 h-5 w-5" />
            {t('pages:location.selectArea.title')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            {/* 養老院選擇 */}
            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium">{t('pages:location.selectArea.nursingHome')}</label>
              <Select
                value={selectedHome}
                onValueChange={(value) => {
                  setSelectedHome(value)
                  setSelectedFloor("")
                  setSelectedGateway("")
                }}
              >
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder={t('pages:location.selectArea.selectNursingHome')} />
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
            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium">{t('pages:location.selectArea.floor')}</label>
              <Select
                value={selectedFloor}
                onValueChange={(value) => {
                  setSelectedFloor(value)
                  setSelectedGateway("")
                }}
                disabled={!selectedHome}
              >
                <SelectTrigger className="w-[150px]">
                  <SelectValue placeholder={t('pages:location.selectArea.selectFloor')} />
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

            {/* Gateway選擇 */}
            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium">{t('pages:location.selectArea.gateway')}</label>
              <Select
                value={selectedGateway}
                onValueChange={setSelectedGateway}
                disabled={!selectedFloor}
              >
                <SelectTrigger className="w-[200px]">
                  <SelectValue placeholder={t('pages:location.selectArea.selectGateway')} />
                </SelectTrigger>
                <SelectContent>
                  {gateways
                    .filter(gw => gw.floorId === selectedFloor && gw.status === 'online')
                    .map(gateway => (
                      <SelectItem key={gateway.id} value={gateway.id}>
                        <div className="flex items-center gap-2">
                          <div className={`w-2 h-2 rounded-full ${gateway.cloudData ? 'bg-green-500' : 'bg-blue-500'}`}></div>
                          {gateway.name} {gateway.cloudData ? '' : `(${t('pages:location.selectArea.local')})`}
                        </div>
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 連接狀態 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center">
              <Wifi className="mr-2 h-5 w-5" />
              {t('pages:location.mqttStatus.title')}
            </div>
            <Button
              onClick={refreshData}
              variant="outline"
              size="sm"
              title={t('pages:location.mqttStatus.refreshTitle')}
            >
              <RefreshCw className="mr-2 h-4 w-4" />
              {t('pages:location.mqttStatus.refreshData')}
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">{t('pages:location.mqttStatus.status')}:</span>
              <Badge variant={cloudConnected ? "default" : "secondary"}>
                {cloudConnected ? (
                  <CheckCircle2 className="mr-1 h-3 w-3" />
                ) : (
                  <AlertCircle className="mr-1 h-3 w-3" />
                )}
                {cloudConnectionStatus}
              </Badge>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">{t('pages:location.mqttStatus.topic')}:</span>
              <span className="text-sm font-mono">{selectedGateway ? t('pages:location.mqttStatus.mqttBus') : t('pages:location.mqttStatus.none')}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">{t('pages:location.mqttStatus.deviceCount')}:</span>
              <span className="text-sm">{onlinePatients.length}</span>
            </div>
          </div>
        </CardContent>
      </Card>



      {/* 搜索和過濾 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Search className="mr-2 h-5 w-5" />
            {t('pages:location.searchFilter.title')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col md:flex-row gap-4">
            {/* 搜索框 */}
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder={t('pages:location.searchFilter.searchPlaceholder')}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>

            {/* 院友狀態過濾 */}
            <div className="flex gap-2">
              <Button
                variant={statusFilter === 'all' ? 'default' : 'outline'}
                onClick={() => setStatusFilter('all')}
                className="whitespace-nowrap"
              >
                {t('pages:location.searchFilter.allStatus')}
              </Button>
              <Button
                variant={statusFilter === 'good' ? 'default' : 'outline'}
                onClick={() => setStatusFilter('good')}
                className="whitespace-nowrap"
              >
                <Heart className="w-4 h-4 mr-1" />
                {t('status:resident.status.good')}
              </Button>
              <Button
                variant={statusFilter === 'attention' ? 'default' : 'outline'}
                onClick={() => setStatusFilter('attention')}
                className="whitespace-nowrap"
              >
                <AlertTriangle className="w-4 h-4 mr-1" />
                {t('status:resident.status.attention')}
              </Button>
              <Button
                variant={statusFilter === 'critical' ? 'default' : 'outline'}
                onClick={() => setStatusFilter('critical')}
                className="whitespace-nowrap"
              >
                <AlertCircle className="w-4 h-4 mr-1" />
                {t('status:resident.status.critical')}
              </Button>
            </div>

            {/* 設備類型過濾 */}
            <div className="flex gap-2">
              <Button
                variant={deviceTypeFilter === 'all' ? 'default' : 'outline'}
                onClick={() => setDeviceTypeFilter('all')}
                className="whitespace-nowrap"
              >
                {t('pages:location.searchFilter.allDevices')}
              </Button>
              <Button
                variant={deviceTypeFilter === DeviceType.SMARTWATCH_300B ? 'default' : 'outline'}
                onClick={() => setDeviceTypeFilter(DeviceType.SMARTWATCH_300B)}
                className="whitespace-nowrap"
              >
                <Watch className="w-4 h-4 mr-1" />
                {t('pages:location.searchFilter.watch')}
              </Button>
              <Button
                variant={deviceTypeFilter === DeviceType.UWB_TAG ? 'default' : 'outline'}
                onClick={() => setDeviceTypeFilter(DeviceType.UWB_TAG)}
                className="whitespace-nowrap"
              >
                <MapPin className="w-4 h-4 mr-1" />
                {t('pages:location.searchFilter.uwbTag')}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 地圖顯示 */}
      {selectedFloorData && mapImage ? (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center">
                <MapPin className="mr-2 h-5 w-5" />
                {selectedFloorData.name} - {t('pages:location.map.realtimeMap')}
              </div>
              <div className="text-sm text-muted-foreground">
                {t('pages:location.map.showDevices', { count: filteredPatients.length })}
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div
              className="relative border rounded-md overflow-hidden bg-gray-50"
              style={{
                overscrollBehavior: 'none',
                touchAction: 'none'
              }}
            >
              {dimensions ? (
                <div
                  ref={mapContainerRef}
                  className="relative select-none"
                  style={{
                    width: dimensions.width,
                    height: dimensions.height,
                    cursor: isDragging ? 'grabbing' : 'grab',
                    touchAction: 'none', // 阻止觸控滾動
                    overscrollBehavior: 'none' // 阻止過度滾動
                  }}
                  onMouseDown={handleMouseDown}
                  onMouseMove={handleMouseMove}
                  onMouseUp={handleMouseUp}
                  onMouseEnter={handleMapMouseEnter}
                  onMouseLeave={() => {
                    handleMouseUp()
                    handleMapMouseLeave()
                  }}
                  onTouchStart={handleTouchStart}
                  onTouchMove={handleTouchMove}
                  onTouchEnd={handleTouchEnd}
                >
                  {/* 整体变换容器 - 包含地图和所有设备标记 */}
                  <div
                    className="relative origin-top-left"
                    style={{
                      transform: `translate(${mapTransform.translateX}px, ${mapTransform.translateY}px) scale(${mapTransform.scale})`,
                      transformOrigin: '0 0',
                      transition: isDragging ? 'none' : 'transform 0.1s ease-out'
                    }}
                  >
                    {/* 地图图片 */}
                    <img
                      ref={mapImageRef}
                      src={mapImage}
                      alt={`${selectedFloorData.name}地圖`}
                      className="w-full h-full object-contain"
                      style={{ maxWidth: '100%', maxHeight: '100%' }}
                      draggable={false}
                    />

                    {/* 设备标记 - 使用简化的坐标转换，让CSS变换处理缩放和平移 */}
                    {filteredPatients.map(patient => {
                      if (!calibration?.isCalibrated) return null

                      // 使用简化的坐标转换函数
                      const displayCoords = convertRealToDisplayCoords(
                        patient.position.x,
                        patient.position.y,
                        selectedFloorData,
                        mapImageRef.current as HTMLImageElement
                      )

                      if (!displayCoords) return null

                      const DeviceIcon = patient.deviceType ? getDeviceIcon(patient.deviceType) : MapPin
                      const statusInfo = patient.residentStatus ? getStatusInfo(patient.residentStatus) : null

                      return (
                        <React.Fragment key={patient.id}>
                          {/* 設備圖標 - 獨立定位 */}
                          <div
                            className="absolute transform -translate-x-1/2 -translate-y-1/2 pointer-events-none"
                            style={{
                              left: displayCoords.x,
                              top: displayCoords.y
                            }}
                          >
                            <div className="relative">
                              <Avatar className="border-2 border-blue-500 shadow-lg">
                                <AvatarFallback className="text-xs">
                                  {patient.residentName ? patient.residentName[0] : '設'}
                                </AvatarFallback>
                              </Avatar>

                              {/* 設備類型圖標 */}
                              <div className="absolute -top-1 -right-1 bg-white rounded-full p-1 shadow-md">
                                <DeviceIcon className="h-3 w-3 text-blue-600" />
                              </div>
                            </div>
                          </div>

                          {/* 信息標籤 - 獨立定位，在設備圖標下方 */}
                          {showMarkerInfo && (
                            <div
                              className="absolute transform -translate-x-1/2 pointer-events-none text-xs bg-white/90 rounded px-2 py-1 text-center whitespace-nowrap shadow-md min-w-[80px]"
                              style={{
                                left: displayCoords.x,
                                top: displayCoords.y + 24  // 設備圖標下方（Avatar 高度 40px / 2 + 邊距 4px）
                              }}
                            >
                              <div className="font-medium">
                                {patient.residentName || `設備-${patient.id}`}
                              </div>
                              {patient.residentRoom && (
                                <div className="text-gray-600 text-[10px]">
                                  {t('pages:location.deviceList.room')}: {patient.residentRoom}
                                </div>
                              )}
                              {patient.position.z !== undefined && (
                                <div className="text-gray-600 text-[10px]">
                                  Z: {patient.position.z.toFixed(2)}
                                </div>
                              )}
                              {statusInfo && (
                                <div className="mt-1">
                                  {statusInfo.badge}
                                </div>
                              )}
                            </div>
                          )}
                        </React.Fragment>
                      )
                    })}

                    {/* 无人在线提示 */}
                    {filteredPatients.length === 0 && (
                      <div className="absolute inset-0 flex items-center justify-center text-lg text-muted-foreground bg-white/70 pointer-events-none">
                        {cloudConnected ? t('pages:location.map.noDevices') : t('pages:location.map.selectGateway')}
                      </div>
                    )}
                  </div>

                  {/* 缩放控制按钮 */}
                  <div className="absolute top-4 right-4 flex flex-col gap-2 bg-white/90 p-2 rounded-lg shadow-lg z-10">
                    <Button
                      size="sm"
                      onClick={handleZoomIn}
                      disabled={mapTransform.scale >= mapTransform.maxScale}
                      className="w-8 h-8 p-0"
                      title={t('pages:location.map.zoomIn')}
                    >
                      <ZoomIn className="h-4 w-4" />
                    </Button>
                    <Button
                      size="sm"
                      onClick={handleZoomOut}
                      disabled={mapTransform.scale <= mapTransform.minScale}
                      className="w-8 h-8 p-0"
                      title={t('pages:location.map.zoomOut')}
                    >
                      <ZoomOut className="h-4 w-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={resetMapView}
                      className="w-8 h-8 p-0"
                      title={t('pages:location.map.resetView')}
                    >
                      <RotateCcw className="h-4 w-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant={showMarkerInfo ? "default" : "outline"}
                      onClick={() => setShowMarkerInfo(!showMarkerInfo)}
                      className="w-8 h-8 p-0"
                      title={showMarkerInfo ? t('pages:location.map.hideMarkerInfo') : t('pages:location.map.showMarkerInfo')}
                    >
                      {showMarkerInfo ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                  </div>

                  {/* 缩放比例显示 */}
                  <div className="absolute bottom-4 left-4 bg-white/90 px-3 py-1 rounded-lg shadow-lg text-sm z-10">
                    {t('pages:location.map.zoom')}: {(mapTransform.scale * 100).toFixed(0)}%
                  </div>

                  {/* 操作提示 */}
                  <div className="absolute top-4 left-4 bg-blue-600/90 text-white px-3 py-1 rounded-lg shadow-lg text-sm z-10">
                    {t('pages:location.map.controls')} | 滑鼠在地圖上滾動縮放
                  </div>
                </div>
              ) : (
                <div className="p-8 text-center text-muted-foreground">
                  <MapPin className="mx-auto h-12 w-12 mb-3 opacity-30" />
                  <p>{t('pages:location.map.noDimensions')}</p>
                </div>
              )}
            </div>

            {/* 地圖資訊 */}
            {calibration && (
              <div className="mt-4 text-sm text-muted-foreground">
                <div>{t('pages:location.map.mapStatus')}: {calibration.isCalibrated ? t('pages:location.map.calibrated') : t('pages:location.map.notCalibrated')}</div>
                {calibration.isCalibrated && (
                  <div>{t('pages:location.map.ratio')}: {calibration.pixelToMeterRatio.toFixed(2)} {t('pages:location.map.pixelsPerMeter')}</div>
                )}
                <div className="flex items-center gap-4 mt-2">
                  <div>{t('pages:location.map.zoom')}: {(mapTransform.scale * 100).toFixed(0)}%</div>
                  <div>{t('pages:location.map.translate')}: ({mapTransform.translateX.toFixed(0)}, {mapTransform.translateY.toFixed(0)})</div>
                  <div>{t('pages:location.map.onlineDevices')}: {onlinePatients.length}</div>
                  <div>{t('pages:location.map.filtered')}: {filteredPatients.length}</div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-8 text-center text-muted-foreground">
            <MapPin className="mx-auto h-12 w-12 mb-3 opacity-30" />
            <p>{t('pages:location.map.selectFloor')}</p>
          </CardContent>
        </Card>
      )}

      {/* 設備列表 */}
      {filteredPatients.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center">
                <Signal className="mr-2 h-5 w-5" />
                {t('pages:location.deviceList.onlineDevices', { count: filteredPatients.length })}
              </div>
              <div className="text-sm text-muted-foreground">
                {t('pages:location.deviceList.totalDevices', { count: onlinePatients.length })}
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredPatients.map(patient => {
                const DeviceIcon = patient.deviceType ? getDeviceIcon(patient.deviceType) : MapPin
                const statusInfo = patient.residentStatus ? getStatusInfo(patient.residentStatus) : null

                return (
                  <div key={patient.id} className="flex items-center gap-3 p-3 border rounded-lg hover:bg-muted/50 transition-colors">
                    {/* 設備圖標 */}
                    <div className="relative">
                      <Avatar className="h-10 w-10">
                        <AvatarFallback className="text-sm">
                          {patient.residentName ? patient.residentName[0] : '設'}
                        </AvatarFallback>
                      </Avatar>

                      {/* 設備類型圖標 */}
                      <div className="absolute -top-1 -right-1 bg-white rounded-full p-1 shadow-sm">
                        <DeviceIcon className="h-3 w-3 text-blue-600" />
                      </div>
                    </div>

                    {/* 設備資訊 */}
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="text-base font-semibold">
                          {patient.residentName || `設備-${patient.id}`}
                        </h3>
                        {statusInfo && statusInfo.badge}
                      </div>

                      <div className="text-sm text-muted-foreground space-y-1">
                        {patient.residentRoom && (
                          <div>{t('pages:location.deviceList.room')}: {patient.residentRoom}</div>
                        )}
                        <div>
                          {t('pages:location.deviceList.position')}: ({patient.position.x.toFixed(2)}, {patient.position.y.toFixed(2)})
                          {patient.position.z !== undefined && `, Z: ${patient.position.z.toFixed(2)}`}
                        </div>
                        {patient.deviceType && (
                          <div className="flex items-center gap-1">
                            <DeviceIcon className="h-3 w-3" />
                            <span>{DEVICE_TYPE_CONFIG[patient.deviceType].label}</span>
                          </div>
                        )}
                        <div className="text-xs text-muted-foreground">
                          {t('pages:location.deviceList.updated')}: {new Date(patient.updatedAt).toLocaleTimeString()}
                        </div>
                      </div>
                    </div>

                    {/* 狀態指示 */}
                    <div className="flex items-center gap-1">
                      <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                      <span className="text-xs text-green-600">{t('pages:location.deviceList.online')}</span>
                    </div>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
