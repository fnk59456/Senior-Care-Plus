import React, { useEffect, useRef, useState, useCallback } from "react"
import { useTranslation } from "react-i18next"
import { mqttBus } from "@/services/mqttBus"
import { realtimeDataService, type RealtimeMessage } from "@/services/realtimeDataService"
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
  const [cloudConnectionStatus, setCloudConnectionStatus] = useState(t('common:connection.disconnected'))

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

  // ✅ 使用 useRef 持久化消息處理狀態，避免每次重新創建
  const processedMessagesRef = useRef<Set<string>>(new Set())
  const lastProcessedTimeRef = useRef<number>(0)
  const historyLoadedRef = useRef<string>('') // 跟踪已加载历史消息的 gateway
  const lastSelectedGatewayRef = useRef<string>('') // 跟踪上一次的 selectedGateway 值
  const selectedGatewayRef = useRef<string>('') // ✅ 跟踪 selectedGateway 的最新值，解決閉包問題
  const gatewaysRef = useRef<typeof gateways>([]) // ✅ 跟踪 gateways 的最新值
  const lastOnlineStatusRef = useRef<Record<string, boolean>>({}) // ✅ 跟踪上一次的在线状态，用于优化更新

  // 根據MAC地址獲取病患資訊
  const getResidentInfoByMAC = useCallback((mac: string) => {
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
  }, [devices, getResidentForDevice])

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

  // ✅ 同步 ref 的值，解決閉包問題
  useEffect(() => {
    selectedGatewayRef.current = selectedGateway
  }, [selectedGateway])

  useEffect(() => {
    gatewaysRef.current = gateways
  }, [gateways])

  // ✅ 自动选择楼层对应的闸道器（一楼层一闸道器）
  useEffect(() => {
    // ✅ 立即更新 gatewaysRef，確保 processLocationMessage 能獲取到最新的 gateways
    gatewaysRef.current = gateways

    if (selectedFloor) {
      // ✅ 切换楼层时，总是先清空旧的设备数据
      console.log(`🔄 切換樓層，清空舊設備數據...`)
      setPatients({})
      setDeviceOnlineStatus({})
      // 清空已處理消息的記錄，以便重新加載
      processedMessagesRef.current.clear()
      historyLoadedRef.current = ''

      // 查找该楼层的在线闸道器
      const floorGateways = gateways.filter(
        gw => gw.floorId === selectedFloor && gw.status === 'online'
      )

      if (floorGateways.length > 0) {
        // 如果有多个闸道器，选择第一个
        const selectedGatewayId = floorGateways[0].id
        console.log(`✅ 自動選擇樓層 ${selectedFloor} 的閘道器:`, {
          gatewayName: floorGateways[0].name,
          gatewayId: selectedGatewayId,
          gatewayIdType: typeof selectedGatewayId,
          totalGateways: gateways.length,
          floorGatewaysCount: floorGateways.length
        })
        // ✅ 同時更新 state 和 ref，確保 processLocationMessage 能立即獲取到最新值
        selectedGatewayRef.current = selectedGatewayId
        setSelectedGateway(selectedGatewayId)
      } else {
        // 如果没有找到闸道器，清空闸道器选择
        console.log(`⚠️ 樓層 ${selectedFloor} 沒有在線的閘道器`)
        selectedGatewayRef.current = ""
        setSelectedGateway("")
      }
    } else {
      // 如果没有选择楼层，清空闸道器和设备数据
      selectedGatewayRef.current = ""
      setSelectedGateway("")
      setPatients({})
      setDeviceOnlineStatus({})
    }
  }, [selectedFloor, gateways])

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

  // ✅ 保存消息到 localStorage（持久化存儲）
  const saveMessageToLocalStorage = (message: RealtimeMessage) => {
    try {
      const storageKey = 'location_history_messages'
      const stored = localStorage.getItem(storageKey)
      const storedMessages = stored ? JSON.parse(stored) : []

      // 添加新消息
      storedMessages.push({
        topic: message.topic,
        payload: message.payload,
        timestamp: message.timestamp.toISOString(),
        gateway: message.gateway
      })

      // 只保留最近 1000 條消息
      const trimmedMessages = storedMessages
        .sort((a: any, b: any) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
        .slice(0, 1000)

      localStorage.setItem(storageKey, JSON.stringify(trimmedMessages))
    } catch (error) {
      console.error('❌ 保存消息到 localStorage 失敗:', error)
    }
  }

  // ✅ 從 localStorage 加載歷史消息（備用方案）
  const loadHistoryFromLocalStorage = () => {
    try {
      const storageKey = 'location_history_messages'
      const stored = localStorage.getItem(storageKey)

      if (!stored) {
        console.log('📚 localStorage 中沒有歷史消息')
        return
      }

      const storedMessages = JSON.parse(stored)
      console.log(`📚 從 localStorage 獲取到 ${storedMessages.length} 條歷史消息`)

      // 過濾出 location 消息
      const locationMessages = storedMessages.filter((msg: any) => {
        const topic = msg.topic || ''
        const content = msg.payload?.content || msg.message?.content || ''
        return topic.includes('_Loca') && content === 'location'
      })

      console.log(`📚 過濾後找到 ${locationMessages.length} 條 location 消息`)

      return locationMessages
    } catch (error) {
      console.error('❌ 從 localStorage 加載歷史消息失敗:', error)
      return []
    }
  }

  // ✅ 使用實時數據服務處理位置數據
  useEffect(() => {
    // 連接實時數據服務
    realtimeDataService.connect()

    const USE_WEBSOCKET = import.meta.env.VITE_USE_WEBSOCKET === 'true'

    // ✅ 獲取當前 gateway 對應的設備和網關數據（在 effect 內部獲取最新值）
    const currentDevices = devices
    const currentGateways = gateways
    const currentGetResidentForDevice = getResidentForDevice

    // 處理實時消息的通用函數，供歷史消息與實時訂閱共用
    const processLocationMessage = (message: RealtimeMessage) => {
      const data = message.payload

      if (data.content !== 'location' || !data.id || !data.position) {
        return // 只處理 location 數據
      }

      const deviceId = String(data.id)

      // ✅ 使用 ref 獲取最新的值，解決閉包問題
      const currentSelectedGateway = selectedGatewayRef.current
      const latestGateways = gatewaysRef.current

      // ✅ 關鍵修復：如果沒有選定 Gateway，跳過消息處理
      // 這確保只有在用戶選擇了樓層（自動選擇了 Gateway）後才開始處理消息
      if (!currentSelectedGateway || latestGateways.length === 0) {
        // 🔍 調試：輸出跳過原因
        if (processedMessagesRef.current.size < 3) {
          console.log(`⏭️ 跳過消息處理（未選定 Gateway 或 gateways 未加載）:`, {
            selectedGateway: currentSelectedGateway || '(empty)',
            gatewaysCount: latestGateways.length,
            deviceId: deviceId,
            msgTopic: message.topic
          })
        }
        return // 跳過此消息
      }

      // ✅ 添加 Gateway 篩選：只處理來自選定 Gateway 的位置消息
      const gateway = latestGateways.find(gw => gw.id === currentSelectedGateway)
      if (gateway) {
        // 檢查消息是否來自選定的 Gateway
        const msgGateway = message.gateway?.name || ''
        const gatewayMac = gateway.macAddress || ''

        // 提取 MAC 地址的最后4位（例如：16B8）
        const macSuffix = gatewayMac.replace(/:/g, '').slice(-4).toUpperCase()

        // 检查匹配：
        // 1. msgGateway 包含 MAC 后4位（例如：GW16B8 包含 16B8）
        // 2. 或者 msgGateway 前缀匹配 gateway.name 前缀
        const matches = (
          msgGateway.includes(macSuffix) ||
          msgGateway.toUpperCase().includes(gateway.name.split('_')[0].toUpperCase())
        )

        if (!matches) {
          // 🔍 調試：輸出跳過的消息（減少日誌量）
          if (processedMessagesRef.current.size < 5) {
            console.log(`⏭️ 跳過非選定 Gateway 的位置消息:`, {
              deviceId,
              msgGateway,
              selectedGateway: gateway.name,
              macSuffix
            })
          }
          return // 跳過此消息
        }

        // ✅ 減少日誌輸出（只在處理前幾條消息時輸出）
        if (processedMessagesRef.current.size < 5) {
          console.log(`✅ 處理選定 Gateway 的位置消息:`, {
            deviceId,
            msgGateway,
            selectedGateway: gateway.name,
            macSuffix
          })
        }
      } else {
        // 找不到對應的 Gateway，跳過
        if (processedMessagesRef.current.size < 3) {
          console.log(`⚠️ 找不到對應的 Gateway，跳過消息:`, {
            selectedGateway: currentSelectedGateway,
            deviceId
          })
        }
        return
      }

      // 獲取病患資訊
      const device = currentDevices.find(d =>
        d.hardwareId === deviceId ||
        d.deviceUid === deviceId ||
        d.deviceUid === `TAG:${deviceId}` ||
        d.deviceUid === `UWB_TAG:${deviceId}`
      )
      const residentInfo = device ? currentGetResidentForDevice(device.id) : null

      setPatients(prev => {
        // ✅ 只有當位置真正變化時才更新，減少不必要的狀態更新
        const existing = prev[deviceId]
        const newPosition = {
          x: data.position.x,
          y: data.position.y,
          quality: data.position.quality || 0,
          z: data.position.z,
        }

        // 如果位置沒有明顯變化（小於 0.1 米），且時間很近（5秒內），跳過更新
        if (existing) {
          const positionDiff = Math.sqrt(
            Math.pow(newPosition.x - existing.position.x, 2) +
            Math.pow(newPosition.y - existing.position.y, 2)
          )
          const timeDiff = message.timestamp.getTime() - existing.updatedAt

          if (positionDiff < 0.1 && timeDiff < 5000) {
            return prev // 位置變化太小，不更新
          }
        }

        return {
          ...prev,
          [deviceId]: {
            id: deviceId,
            name: residentInfo ? `${residentInfo.name} (${residentInfo.room})` : `設備-${deviceId}`,
            position: newPosition,
            updatedAt: message.timestamp.getTime(),
            gatewayId: selectedGateway,
            deviceId: device?.id,
            deviceType: device?.deviceType,
            residentId: residentInfo?.id,
            residentName: residentInfo?.name,
            residentStatus: residentInfo?.status,
            residentRoom: residentInfo?.room,
            gateway: message.gateway?.name || '',
            topic: message.topic
          },
        }
      })
    }

    // 🔧 持久化存儲：從歷史消息加載數據
    const loadHistoryMessages = async () => {
      // ✅ 檢查是否已經為當前 gateway 加載過歷史消息
      if (historyLoadedRef.current === selectedGateway) {
        console.log(`⏭️ Gateway ${selectedGateway} 的歷史消息已加載，跳過重複加載`)
        return
      }

      // ✅ 標記當前 gateway 已加載
      historyLoadedRef.current = selectedGateway || ''

      if (USE_WEBSOCKET) {
        // WebSocket 模式：從 REST API 加載歷史消息
        console.log('📚 WebSocket 模式：從 REST API 加載歷史消息')
        try {
          const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001/api'
          const response = await fetch(`${API_BASE_URL}/mqtt/messages`)

          if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`)
          }

          const allMessages = await response.json()
          console.log(`📚 從 API 獲取到 ${allMessages.length} 條歷史消息`)

          // 過濾出 location 主題消息
          const locationMessages = allMessages.filter((msg: any) => {
            const topic = msg.topic || ''
            const content = msg.message?.content || ''
            return topic.includes('_Loca') && content === 'location'
          })

          console.log(`📚 過濾後找到 ${locationMessages.length} 條 location 消息`)

          // 處理歷史消息
          let processedCount = 0
          locationMessages.forEach((msg: any) => {
            const msgTime = new Date(msg.timestamp || msg.message?.timestamp || Date.now()).getTime()
            const msgKey = `${msg.topic}-${msgTime}-${JSON.stringify(msg.message || msg.payload).substring(0, 50)}`

            if (processedMessagesRef.current.has(msgKey)) {
              return
            }

            processedMessagesRef.current.add(msgKey)

            // 🔧 從 topic 提取 Gateway 信息
            // Topic 格式：UWB/GWxxxx_Loca
            const gatewayMatch = msg.topic?.match(/GW([A-F0-9]+)/)
            const gatewayInfo = gatewayMatch ? {
              id: gatewayMatch[1],  // 例如：16B8
              name: gatewayMatch[0]  // 例如：GW16B8
            } : undefined

            // 轉換為 RealtimeMessage 格式
            const message: RealtimeMessage = {
              topic: msg.topic,
              payload: msg.message || msg.payload,
              timestamp: new Date(msg.timestamp || Date.now()),
              gateway: msg.gateway || gatewayInfo
            }

            // 處理消息
            processLocationMessage(message)
            lastProcessedTimeRef.current = Math.max(lastProcessedTimeRef.current, msgTime)
            processedCount++
          })

          console.log(`✅ 已加載 ${processedCount} 條新歷史消息（總共 ${locationMessages.length} 條）`)
        } catch (error) {
          console.error('❌ 從 REST API 加載歷史消息失敗:', error)
          // 如果 REST API 失敗，嘗試從 localStorage 加載
          const localMessages = loadHistoryFromLocalStorage()
          if (localMessages && localMessages.length > 0) {
            let processedCount = 0
            localMessages.forEach((msg: any) => {
              const msgTime = new Date(msg.timestamp || Date.now()).getTime()
              const msgKey = `${msg.topic}-${msgTime}-${JSON.stringify(msg.payload || msg.message).substring(0, 50)}`

              if (processedMessagesRef.current.has(msgKey)) {
                return
              }

              processedMessagesRef.current.add(msgKey)

              // 🔧 從 topic 提取 Gateway 信息
              const gatewayMatch = msg.topic?.match(/GW([A-F0-9]+)/)
              const gatewayInfo = gatewayMatch ? {
                id: gatewayMatch[1],
                name: gatewayMatch[0]
              } : undefined

              const message: RealtimeMessage = {
                topic: msg.topic,
                payload: msg.payload || msg.message,
                timestamp: new Date(msg.timestamp || Date.now()),
                gateway: msg.gateway || gatewayInfo
              }

              processLocationMessage(message)
              lastProcessedTimeRef.current = Math.max(lastProcessedTimeRef.current, msgTime)
              processedCount++
            })
            console.log(`✅ 從 localStorage 加載 ${processedCount} 條新歷史消息`)
          }
        }
      } else {
        // MQTT 模式：從歷史消息緩衝區加載數據
        console.log('📚 MQTT 模式：從歷史消息緩衝區加載數據')
        try {
          const recentMessages = mqttBus.getRecentMessages({
            contentType: 'location'  // 只加載 location 消息
          })

          console.log(`📚 找到 ${recentMessages.length} 條歷史消息`)

          // 處理歷史消息
          let processedCount = 0
          recentMessages.forEach(msg => {
            const msgTime = msg.timestamp.getTime()
            const msgKey = `${msg.topic}-${msgTime}-${JSON.stringify(msg.payload).substring(0, 50)}`

            if (processedMessagesRef.current.has(msgKey)) {
              return
            }

            processedMessagesRef.current.add(msgKey)

            // 轉換為 RealtimeMessage 格式
            const message: RealtimeMessage = {
              topic: msg.topic,
              payload: msg.payload,
              timestamp: msg.timestamp,
              gateway: msg.gateway
            }

            // 處理消息
            processLocationMessage(message)
            lastProcessedTimeRef.current = Math.max(lastProcessedTimeRef.current, msgTime)
            processedCount++
          })

          console.log(`✅ 已加載 ${processedCount} 條新歷史消息（總共 ${recentMessages.length} 條）`)
        } catch (error) {
          console.error('❌ 加載歷史消息失敗:', error)
        }
      }
    }

    // ✅ 只在 selectedGateway 變化時加載歷史消息
    if (selectedGateway) {
      loadHistoryMessages()
    } else {
      // 清空已加載標記
      historyLoadedRef.current = ''
    }

    // 訂閱實時消息
    let locationTopicPattern: string | RegExp
    if (selectedGateway) {
      const gateway = currentGateways.find(gw => gw.id === selectedGateway)
      if (gateway?.cloudData?.pub_topic?.location) {
        locationTopicPattern = gateway.cloudData.pub_topic.location
      } else if (gateway) {
        const gatewayName = gateway.name.replace(/\s+/g, '')
        locationTopicPattern = `UWB/GW${gatewayName}_Loca`
      } else {
        locationTopicPattern = USE_WEBSOCKET ? 'UWB/*_Loca' : /^UWB\/GW.*_Loca$/
      }
    } else {
      locationTopicPattern = USE_WEBSOCKET ? 'UWB/*_Loca' : /^UWB\/GW.*_Loca$/
    }

    console.log(`🌐 訂閱位置主題: ${locationTopicPattern} (模式: ${USE_WEBSOCKET ? 'WebSocket' : 'MQTT'})`)

    const unsubscribe = realtimeDataService.subscribe(locationTopicPattern, (message: RealtimeMessage) => {
      try {
        const msgTime = message.timestamp.getTime()
        const msgKey = `${message.topic}-${msgTime}-${JSON.stringify(message.payload).substring(0, 50)}`

        // 檢查是否為重複消息
        if (processedMessagesRef.current.has(msgKey)) {
          return // 靜默跳過，減少日誌輸出
        }

        // 標記為已處理
        processedMessagesRef.current.add(msgKey)

        // ✅ 減少日誌輸出頻率（每10條消息輸出一次）
        if (processedMessagesRef.current.size % 10 === 0) {
          console.log(`✅ 收到新位置消息: ${message.topic} at ${message.timestamp.toLocaleTimeString()} (已處理 ${processedMessagesRef.current.size} 條)`)
        }

        // 保存到 localStorage（持久化存儲）
        saveMessageToLocalStorage(message)

        // 處理消息
        processLocationMessage(message)
        lastProcessedTimeRef.current = msgTime

        // 清理過期的處理記錄（保留最近1小時）
        const oneHourAgo = Date.now() - 60 * 60 * 1000
        const keysToDelete: string[] = []
        processedMessagesRef.current.forEach((key) => {
          const keyStr = String(key)
          const timestamp = parseInt(keyStr.split('-')[1] || '0')
          if (timestamp < oneHourAgo) {
            keysToDelete.push(keyStr)
          }
        })
        keysToDelete.forEach((key: string) => processedMessagesRef.current.delete(key))
      } catch (error) {
        console.error('❌ 處理實時位置消息失敗:', error)
      }
    })

    // 清理函數：取消訂閱
    return () => {
      console.log('🔌 取消訂閱位置主題')
      unsubscribe()
    }
    // ✅ 依賴 selectedGateway 和 gateways，確保 gateways 加載完成後重新訂閱
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedGateway, gateways])

  // ✅ 監聽實時數據服務連接狀態
  useEffect(() => {
    const unsubscribe = realtimeDataService.onStatusChange((status) => {
      setCloudConnected(status === 'connected')
      setCloudConnectionStatus(
        status === 'connected' ? t('pages:location.connectionStatus.connected') :
          status === 'connecting' ? t('pages:location.connectionStatus.connecting') :
            status === 'reconnecting' ? t('pages:location.connectionStatus.reconnecting') :
              status === 'error' ? t('pages:location.connectionStatus.connectionError') :
                t('pages:location.connectionStatus.disconnected')
      )
      console.log(`📊 實時數據服務狀態變更: ${status}`)
    })

    // 初始化狀態
    const currentStatus = realtimeDataService.getStatus()
    setCloudConnected(currentStatus === 'connected')
    setCloudConnectionStatus(
      currentStatus === 'connected'
        ? t('pages:location.connectionStatus.connected')
        : t('pages:location.connectionStatus.disconnected')
    )

    return unsubscribe
  }, [t])

  // ✅ Gateway 切換時清除位置數據和處理狀態
  useEffect(() => {
    if (selectedGateway) {
      const gateway = gateways.find(gw => gw.id === selectedGateway)
      const gatewayName = gateway?.name || selectedGateway
      console.log(`🔄 Gateway 切換，開始篩選:`, {
        gatewayId: selectedGateway,
        gatewayName: gatewayName,
        gatewayMac: gateway?.macAddress || 'N/A'
      })
    } else {
      console.log(`🔄 Gateway 切換，清除舊的位置數據:`, selectedGateway)
    }
    setPatients({})
    setDeviceOnlineStatus({}) // 同時清除設備狀態緩存
    // ✅ 清除已處理消息記錄，允許重新加載歷史消息
    processedMessagesRef.current.clear()
    lastProcessedTimeRef.current = 0
    historyLoadedRef.current = '' // 重置歷史消息加載標記
  }, [selectedGateway, gateways])

  // ✅ 定時檢查設備在線狀態 - 每200ms檢查一次，確保及時檢測離線設備
  useEffect(() => {
    // 超時時間（毫秒）
    const TIMEOUT_MS = 5000
    // 檢查頻率（毫秒）- 根據設備數量動態調整
    const CHECK_INTERVAL = Object.keys(patients).length > 30 ? 500 : 200

    // 檢查在線狀態的函數
    const checkOnlineStatus = () => {
      const now = Date.now()
      const newOnlineStatus: Record<string, boolean> = {}
      let hasChange = false

      Object.values(patients).forEach(patient => {
        const isOnline = now - patient.updatedAt < TIMEOUT_MS
        const wasOnline = lastOnlineStatusRef.current[patient.id] !== false

        newOnlineStatus[patient.id] = isOnline

        // 檢測狀態是否變化
        if (isOnline !== wasOnline) {
          hasChange = true
        }
      })

      // 只在狀態變化時更新，減少不必要的重新渲染
      if (hasChange || Object.keys(newOnlineStatus).length !== Object.keys(lastOnlineStatusRef.current).length) {
        const onlineCount = Object.values(newOnlineStatus).filter(status => status).length
        const offlineCount = Object.values(newOnlineStatus).filter(status => !status).length

        // 獲取當前 Gateway 信息
        const gateway = selectedGateway ? gateways.find(gw => gw.id === selectedGateway) : null
        const gatewayName = gateway?.name || 'N/A'

        console.log(`📊 更新設備在線狀態緩存:`, {
          gatewayName: gatewayName,
          gatewayId: selectedGateway || 'N/A',
          totalDevices: Object.keys(patients).length,
          onlineDevices: onlineCount,
          offlineDevices: offlineCount,
          hasChange: hasChange
        })

        // 更新狀態和 ref
        lastOnlineStatusRef.current = newOnlineStatus
        setDeviceOnlineStatus(newOnlineStatus)
      }
    }

    // 初始化 lastOnlineStatusRef（同步當前狀態）
    lastOnlineStatusRef.current = { ...deviceOnlineStatus }

    // 立即執行一次檢查（處理初始狀態）
    checkOnlineStatus()

    // 設置定時檢查
    const interval = setInterval(checkOnlineStatus, CHECK_INTERVAL)

    // 清理函數：組件卸載時清除定時器
    return () => {
      clearInterval(interval)
    }
  }, [patients, selectedGateway, gateways]) // 只依賴 patients，避免無限循環

  // ✅ 使用緩存的設備狀態 - 避免地圖交互時重新計算
  const patientList = Object.values(patients)
  // 保留 onlinePatients 用于统计，但地图显示所有设备（包括离线）
  const onlinePatients = patientList.filter(p => deviceOnlineStatus[p.id] !== false)

  // ✅ 輸出篩選後的設備數量
  useEffect(() => {
    // 在 useEffect 內部計算 onlinePatients，確保使用最新的 deviceOnlineStatus
    const patientList = Object.values(patients)
    const onlinePatientsList = patientList.filter(p => deviceOnlineStatus[p.id] !== false)

    // 過濾所有設備（包括離線設備），用於地圖顯示
    const filtered = patientList.filter(patient => {
      const matchesSearch =
        patient.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (patient.residentRoom && patient.residentRoom.toLowerCase().includes(searchTerm.toLowerCase()))

      const matchesStatus = statusFilter === 'all' || patient.residentStatus === statusFilter

      const matchesDeviceType = deviceTypeFilter === 'all' || patient.deviceType === deviceTypeFilter

      return matchesSearch && matchesStatus && matchesDeviceType
    })

    // ✅ 直接從 selectedFloor 和 gateways 計算當前的閘道器
    // 這樣可以避免 React 狀態異步更新導致的問題
    let gatewayName = 'N/A'
    let gatewayId = 'N/A'
    let currentGateway: typeof gateways[0] | null = null

    if (selectedFloor && gateways.length > 0) {
      // 查找該樓層的在線閘道器（與自動選擇邏輯一致）
      const floorGateways = gateways.filter(
        gw => gw.floorId === selectedFloor && gw.status === 'online'
      )
      if (floorGateways.length > 0) {
        currentGateway = floorGateways[0]
        gatewayName = currentGateway.name
        gatewayId = currentGateway.id
      }
    }

    // 只有在有設備數據或有樓層選擇時才輸出日誌
    if (Object.keys(patients).length > 0 || selectedFloor) {
      console.log(`🔍 篩選後的設備數量:`, {
        gatewayName: gatewayName,
        gatewayId: gatewayId,
        selectedFloor: selectedFloor,
        selectedGatewayState: selectedGateway, // 狀態值（可能是異步的）
        totalDevices: Object.keys(patients).length,
        onlineDevices: onlinePatientsList.length,
        filteredDevices: filtered.length
      })
    }
  }, [patients, deviceOnlineStatus, searchTerm, statusFilter, deviceTypeFilter, selectedGateway, gateways, selectedFloor])

  // 過濾患者列表（包含所有設備，包括離線設備）
  const filteredPatients = patientList.filter(patient => {
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
          <div className="flex items-end gap-4">
            {/* 養老院選擇 */}
            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium">{t('pages:location.selectArea.nursingHome')}</label>
              <Select
                value={selectedHome}
                onValueChange={(value) => {
                  setSelectedHome(value)
                  setSelectedFloor("")
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

            {/* 閘道器資訊顯示（只讀） */}
            {selectedFloor && (() => {
              const floorGateways = gateways.filter(gw => gw.floorId === selectedFloor && gw.status === 'online')
              const currentGateway = floorGateways.length > 0 ? floorGateways[0] : null
              return (
                <div className="flex flex-col gap-2">
                  <label className="text-sm font-medium">{t('pages:location.selectArea.gateway')}</label>
                  <div className="h-10 px-3 py-2 border rounded-md bg-muted flex items-center gap-2 w-[200px]">
                    {currentGateway ? (
                      <>
                        <div className={`w-2 h-2 rounded-full ${currentGateway.cloudData ? 'bg-green-500' : 'bg-blue-500'}`}></div>
                        <span className="text-sm">
                          {currentGateway.name} {currentGateway.cloudData ? '' : `(${t('pages:location.selectArea.local')})`}
                        </span>
                      </>
                    ) : (
                      <span className="text-sm text-muted-foreground">
                        {t('pages:location.selectArea.noGateway')}
                      </span>
                    )}
                  </div>
                </div>
              )
            })()}

            {/* 搜索框 */}
            <div className="flex-1 flex flex-col gap-2">
              <label className="text-sm font-medium">{t('pages:location.searchFilter.title')}</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder={t('pages:location.searchFilter.searchPlaceholder')}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 地圖和設備列表並排顯示 */}
      {selectedFloorData && mapImage ? (
        <div className="flex gap-4">
          {/* 地圖區域 - 左側 */}
          <Card className="flex-1">
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
            <CardContent className="flex flex-col" style={{ minHeight: 'calc(100vh - 400px)' }}>
              <div
                className="relative border rounded-md overflow-hidden bg-gray-50 flex-1"
                style={{
                  overscrollBehavior: 'none',
                  touchAction: 'none',
                  minHeight: '600px'
                }}
              >
                {dimensions ? (
                  <div
                    ref={mapContainerRef}
                    className="relative select-none w-full h-full"
                    style={{
                      width: dimensions.width,
                      height: dimensions.height,
                      minHeight: '600px',
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
                                <Avatar className={`border-2 shadow-lg ${deviceOnlineStatus[patient.id] !== false
                                  ? 'border-blue-500'  // 在線：藍色
                                  : 'border-red-500'    // 離線：紅色
                                  }`}>
                                  <AvatarFallback className="text-xs">
                                    {patient.residentName ? patient.residentName[0] : t('common:ui.avatar.defaultFallback')}
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
                                  {patient.residentName || `${t('pages:location.unboundDeviceLabel')}-${patient.id}`}
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
                      {t('pages:location.map.controls')} | {t('pages:location.map.scrollToZoomHint')}
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
                    <div>{t('pages:location.map.totalDevices')}: {patientList.length}</div>
                    <div>{t('pages:location.map.onlineDevices')}: {onlinePatients.length}</div>
                    <div>{t('pages:location.map.filtered')}: {filteredPatients.length}</div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* 設備列表 - 右側 */}
          {filteredPatients.length > 0 && (
            <Card className="w-[400px] flex flex-col">
              <CardHeader className="flex-shrink-0">
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
              <CardContent className="flex-1 overflow-hidden flex flex-col">
                {/* 動態高度滾動容器 */}
                <div
                  className="overflow-y-auto pr-2 flex-1"
                  style={{
                    minHeight: '0'
                  }}
                >
                  {/* 垂直列表布局 */}
                  <div className="flex flex-col gap-2">
                    {filteredPatients.map(patient => {
                      const DeviceIcon = patient.deviceType ? getDeviceIcon(patient.deviceType) : MapPin
                      const statusInfo = patient.residentStatus ? getStatusInfo(patient.residentStatus) : null

                      return (
                        <div
                          key={patient.id}
                          className="flex flex-col gap-2 p-3 border rounded-lg hover:bg-muted/50 transition-colors w-full"
                        >
                          {/* 第一行：圖標、名稱、狀態 */}
                          <div className="flex items-center gap-3">
                            {/* 設備圖標 */}
                            <div className="relative flex-shrink-0">
                              <Avatar className="h-10 w-10">
                                <AvatarFallback className="text-sm">
                                  {patient.residentName ? patient.residentName[0] : t('common:ui.avatar.defaultFallback')}
                                </AvatarFallback>
                              </Avatar>

                              {/* 設備類型圖標 */}
                              <div className="absolute -top-1 -right-1 bg-white rounded-full p-1 shadow-sm">
                                <DeviceIcon className="h-3 w-3 text-blue-600" />
                              </div>
                            </div>

                            {/* 名稱和狀態徽章 */}
                            <div className="flex-1 flex items-center gap-2 min-w-0">
                              <h3 className="text-base font-semibold truncate">
                                {patient.residentName || `${t('pages:location.unboundDeviceLabel')}-${patient.id}`}
                              </h3>
                              {statusInfo && statusInfo.badge}
                            </div>

                            {/* 在線狀態指示 */}
                            <div className="flex items-center gap-1 flex-shrink-0">
                              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                              <span className="text-xs text-green-600">{t('pages:location.deviceList.online')}</span>
                            </div>
                          </div>

                          {/* 第二行：詳細信息（緊湊顯示） */}
                          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground pl-[52px]">
                            {patient.residentRoom && (
                              <div className="flex items-center gap-1">
                                <span className="font-medium">{t('pages:location.deviceList.room')}:</span>
                                <span>{patient.residentRoom}</span>
                              </div>
                            )}
                            <div className="flex items-center gap-1">
                              <span className="font-medium">{t('pages:location.deviceList.position')}:</span>
                              <span>
                                ({patient.position.x.toFixed(2)}, {patient.position.y.toFixed(2)})
                                {patient.position.z !== undefined && `, Z: ${patient.position.z.toFixed(2)}`}
                              </span>
                            </div>
                            <div className="text-xs">
                              {t('pages:location.deviceList.updated')}: {new Date(patient.updatedAt).toLocaleTimeString()}
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      ) : (
        <Card>
          <CardContent className="p-8 text-center text-muted-foreground">
            <MapPin className="mx-auto h-12 w-12 mb-3 opacity-30" />
            <p>{t('pages:location.map.selectFloor')}</p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
