import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts'
import { Thermometer, TrendingUp, Clock, AlertTriangle, MapPin, Baby, Activity, Watch, Settings } from "lucide-react"
import { useLocation } from "react-router-dom"
import { useUWBLocation } from "@/contexts/UWBLocationContext"
import { useDeviceManagement } from "@/contexts/DeviceManagementContext"
import { DeviceType } from "@/types/device-types"
import { useTranslation } from "react-i18next"
import { mqttBus } from "@/services/mqttBus"

// 體溫範圍
const NORMAL_TEMP_MIN = 36.0
const NORMAL_TEMP_MAX = 37.5

type TemperatureRecord = {
  id: string
  name: string
  temperature: number
  time: string
  datetime: Date
  isAbnormal: boolean
  room_temp?: number
}

type ChartDataPoint = {
  time: string
  hour: string
  temperature: number
  isAbnormal: boolean
}

// 雲端設備記錄類型
type CloudDeviceRecord = {
  MAC: string
  deviceName: string
  skin_temp: number
  room_temp: number
  steps: number
  light_sleep: number
  deep_sleep: number
  battery_level: number
  time: string
  datetime: Date
  isAbnormal: boolean
  // Gateway 相關資訊
  gateway?: string
  gatewayId?: string
  topic?: string
  topicGateway?: string
  // 病患相關資訊
  residentId?: string
  residentName?: string
  residentRoom?: string
  residentStatus?: string
  deviceType?: DeviceType
}

// 雲端設備類型
type CloudDevice = {
  MAC: string
  deviceName: string
  lastSeen: Date
  recordCount: number
  // Gateway 相關資訊
  gateway?: string
  gatewayId?: string
  topic?: string
  topicGateway?: string
  // 病患相關資訊
  residentId?: string
  residentName?: string
  residentRoom?: string
  residentStatus?: string
  deviceType?: DeviceType
}

// 雲端 MQTT 數據類型
type CloudMqttData = {
  content: string
  gateway_id: string
  MAC: string
  receivedAt: Date

  // 健康數據字段
  SOS?: string
  hr?: string
  SpO2?: string
  bp_syst?: string
  bp_diast?: string
  skin_temp?: string
  room_temp?: string
  steps?: string
  light_sleep?: string
  deep_sleep?: string
  wake_time?: string
  move?: string
  wear?: string
  battery_level?: string
  serial_no?: string

  // 尿布數據字段 (diaper DV1)
  name?: string
  fw_ver?: string
  temp?: string
  humi?: string
  button?: string
  msg_idx?: string
  ack?: string
}

export default function TemperaturePage() {
  const { t } = useTranslation()
  const location = useLocation()
  const patientName = location.state?.patientName

  // 使用 UWBLocationContext
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

  // 使用 DeviceManagementContext
  const { devices, residents, getResidentForDevice } = useDeviceManagement()

  // 根據MAC地址獲取病患資訊
  const getResidentInfoByMAC = (mac: string) => {
    // 查找設備：先嘗試hardwareId，再嘗試deviceUid
    const device = devices.find(d =>
      d.hardwareId === mac ||
      d.deviceUid === mac ||
      d.deviceUid === `300B:${mac}` ||
      d.deviceUid === `SMARTWATCH_300B:${mac}`
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

  // 根據設備類型獲取圖標
  const getDeviceTypeIcon = (deviceType?: DeviceType) => {
    switch (deviceType) {
      case DeviceType.SMARTWATCH_300B:
        return <Watch className="h-4 w-4" />
      case DeviceType.DIAPER_SENSOR:
        return <Baby className="h-4 w-4" />
      case DeviceType.PEDOMETER:
        return <Activity className="h-4 w-4" />
      case DeviceType.UWB_TAG:
        return <MapPin className="h-4 w-4" />
      default:
        return <Settings className="h-4 w-4" />
    }
  }

  // 根據狀態獲取資訊
  const getStatusInfo = (status?: string) => {
    switch (status) {
      case 'active':
        return { badge: t('status:device.status.active'), icon: '🟢', bgColor: 'bg-green-50' }
      case 'inactive':
        return { badge: t('status:device.status.inactive'), icon: '🔴', bgColor: 'bg-red-50' }
      case 'warning':
        return { badge: t('status:device.status.error'), icon: '🟡', bgColor: 'bg-yellow-50' }
      default:
        return { badge: t('status:device.status.offline'), icon: '⚪', bgColor: 'bg-gray-50' }
    }
  }

  const [activeTab, setActiveTab] = useState<string>("today")
  const [filteredRecords, setFilteredRecords] = useState<TemperatureRecord[]>([])
  const [recordFilter, setRecordFilter] = useState<string>("all")
  const [timeRange, setTimeRange] = useState<string>("1day")

  // 雲端設備管理狀態
  const [cloudDevices, setCloudDevices] = useState<CloudDevice[]>([])
  const [cloudDeviceRecords, setCloudDeviceRecords] = useState<CloudDeviceRecord[]>([])
  const [selectedCloudDevice, setSelectedCloudDevice] = useState<string>("")

  // ✅ MQTT Bus 連接狀態
  const [cloudConnected, setCloudConnected] = useState(false)
  const [cloudConnectionStatus, setCloudConnectionStatus] = useState<string>("未連線")

  // 原始 MQTT 數據狀態
  const [cloudMqttData, setCloudMqttData] = useState<CloudMqttData[]>([])

  // 動態獲取健康監控MQTT主題
  const getHealthTopic = () => {
    if (!selectedGateway) return null

    // 檢查是否有雲端數據
    const gateway = gateways.find(gw => gw.id === selectedGateway)
    console.log("🔍 選擇的健康監控閘道器:", gateway)

    if (gateway?.cloudData?.pub_topic?.health) {
      console.log("✅ 使用雲端健康主題:", gateway.cloudData.pub_topic.health)
      return gateway.cloudData.pub_topic.health
    }

    // 如果沒有雲端數據，構建主題名稱
    if (gateway) {
      const gatewayName = gateway.name.replace(/\s+/g, '')
      const constructedTopic = `UWB/GW${gatewayName}_Health`
      console.log("🔧 構建本地健康主題:", constructedTopic)
      return constructedTopic
    }

    console.log("❌ 無法獲取健康監控閘道器主題")
    return null
  }

  // ✅ 修復頻率問題 - 只在有新消息時更新（參考 HeartRatePage）
  useEffect(() => {
    let lastProcessedTime = 0
    let processedMessages = new Set()
    let lastUpdateTime = 0

    const updateMqttData = () => {
      // 🔧 額外頻率控制：確保至少間隔5秒才更新
      const now = Date.now()
      if (now - lastUpdateTime < 5000) {
        console.log(`⏰ 頻率控制：距離上次更新不足5秒，跳過`)
        return
      }
      try {
        const recentMessages = mqttBus.getRecentMessages()
        console.log(`🔍 檢查 MQTT 消息: 總數 ${recentMessages.length}, 最後處理時間: ${new Date(lastProcessedTime).toLocaleTimeString()}`)

        // 只處理新的消息（避免重複處理）
        const newMessages = recentMessages.filter(msg => {
          const msgTime = msg.timestamp.getTime()
          const msgKey = `${msg.topic}-${msgTime}`
          const isNew = msgTime > lastProcessedTime && !processedMessages.has(msgKey)

          if (isNew) {
            console.log(`✅ 新消息: ${msg.topic} at ${msg.timestamp.toLocaleTimeString()}`)
          }

          return isNew
        })

        if (newMessages.length === 0) {
          console.log(`⏭️ 沒有新消息，跳過更新`)
          return // 沒有新消息，不更新
        }

        console.log(`🔄 處理 ${newMessages.length} 條新 MQTT 消息`)

        // 更新最後處理時間
        lastProcessedTime = Math.max(...newMessages.map(msg => msg.timestamp.getTime()))

        // 標記已處理的消息
        newMessages.forEach(msg => {
          const msgKey = `${msg.topic}-${msg.timestamp.getTime()}`
          processedMessages.add(msgKey)
          console.log(`📝 標記已處理: ${msgKey}`)
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

        const formattedData = newMessages.map(msg => ({
          content: msg.payload?.content || 'unknown',
          MAC: msg.payload?.MAC || msg.payload?.['mac address'] || '',
          receivedAt: msg.timestamp,
          topic: msg.topic,
          gateway: msg.gateway?.name || '',
          // 健康數據字段
          hr: msg.payload?.hr || '',
          SpO2: msg.payload?.SpO2 || '',
          bp_syst: msg.payload?.['bp syst'] || '',
          bp_diast: msg.payload?.['bp diast'] || '',
          skin_temp: msg.payload?.['skin temp'] || '',
          room_temp: msg.payload?.['room temp'] || '',
          steps: msg.payload?.steps || '',
          battery_level: msg.payload?.['battery level'] || '',
          // 尿布數據字段
          name: msg.payload?.name || '',
          temp: msg.payload?.temp || '',
          humi: msg.payload?.humi || '',
          button: msg.payload?.button || '',
          msg_idx: msg.payload?.['msg idx'] || '',
          ack: msg.payload?.ack || ''
        }))

        // ✅ 只顯示體溫相關的 MQTT 數據 (僅 300B 設備)
        const temperatureData = formattedData.filter(data =>
          data.content === '300B'
        )

        // 只添加新的體溫數據
        if (temperatureData.length > 0) {
          setCloudMqttData(prev => {
            const combined = [...temperatureData, ...prev]
              .sort((a, b) => b.receivedAt.getTime() - a.receivedAt.getTime())
              .slice(0, 50) // 限制總數
            return combined
          })
        }

        // ✅ 只處理體溫相關的數據 (300B 設備)
        const healthMessages = newMessages.filter(msg => {
          const isHealthMessage = msg.payload?.content === '300B' && msg.payload?.MAC
          if (isHealthMessage) {
            console.log('✅ 處理 300B 體溫消息:', {
              MAC: msg.payload?.MAC,
              topic: msg.topic,
              gateway: msg.gateway?.name
            })
          } else {
            console.log('⏭️ 跳過非體溫消息:', {
              content: msg.payload?.content,
              MAC: msg.payload?.MAC,
              topic: msg.topic
            })
          }
          return isHealthMessage
        })

        healthMessages.forEach(msg => {
          const data = msg.payload
          const MAC = data.MAC || data['mac address'] || data.macAddress

          if (MAC) {
            const skinTemp = parseFloat(data['skin temp']) || 0
            const roomTemp = parseFloat(data['room temp']) || 0
            const steps = parseInt(data.steps) || 0
            const lightSleep = parseInt(data['light sleep (min)']) || 0
            const deepSleep = parseInt(data['deep sleep (min)']) || 0
            const batteryLevel = parseInt(data['battery level']) || 0

            // 獲取病患資訊
            const residentInfo = getResidentInfoByMAC(MAC)

            // 創建設備記錄
            const cloudDeviceRecord: CloudDeviceRecord = {
              MAC: MAC,
              deviceName: residentInfo?.residentName ? `${residentInfo.residentName} (${residentInfo.residentRoom})` : `設備 ${MAC.slice(-8)}`,
              skin_temp: skinTemp,
              room_temp: roomTemp,
              steps: steps,
              light_sleep: lightSleep,
              deep_sleep: deepSleep,
              battery_level: batteryLevel,
              time: msg.timestamp.toISOString(),
              datetime: msg.timestamp, // 使用實際的 MQTT 時間戳
              isAbnormal: skinTemp > 0 && (skinTemp > NORMAL_TEMP_MAX || skinTemp < NORMAL_TEMP_MIN),
              // 添加 Gateway 資訊
              gateway: msg.gateway?.name || '',
              gatewayId: msg.gateway?.id || '',
              topic: msg.topic,
              // 🔧 從 topic 中提取 Gateway 識別符作為備用
              topicGateway: msg.topic?.match(/GW[A-F0-9]+/)?.[0] || '',
              // 添加病患資訊
              ...residentInfo
            }

            // 更新設備記錄
            setCloudDeviceRecords(prev => {
              const newRecords = [cloudDeviceRecord, ...prev]
                .sort((a, b) => b.datetime.getTime() - a.datetime.getTime())
                .slice(0, 1000)
              return newRecords
            })

            // 更新設備列表
            setCloudDevices(prev => {
              const existingDevice = prev.find(d => d.MAC === MAC)

              if (existingDevice) {
                return prev.map(d =>
                  d.MAC === MAC
                    ? {
                      ...d,
                      lastSeen: msg.timestamp, // 使用實際的 MQTT 時間戳
                      recordCount: d.recordCount + 1,
                      // 更新病患資訊
                      ...residentInfo
                    }
                    : d
                )
              } else {
                const newDevice = {
                  MAC: MAC,
                  deviceName: residentInfo?.residentName ? `${residentInfo.residentName} (${residentInfo.residentRoom})` : `設備 ${MAC.slice(-8)}`,
                  lastSeen: msg.timestamp, // 使用實際的 MQTT 時間戳
                  recordCount: 1,
                  // 添加 Gateway 資訊
                  gateway: msg.gateway?.name || '',
                  gatewayId: msg.gateway?.id || '',
                  topic: msg.topic,
                  // 🔧 從 topic 中提取 Gateway 識別符作為備用
                  topicGateway: msg.topic?.match(/GW[A-F0-9]+/)?.[0] || '',
                  // 添加病患資訊
                  ...residentInfo
                }
                return [...prev, newDevice]
              }
            })

            // 自動選擇第一個設備
            setSelectedCloudDevice(prev => {
              if (!prev) {
                return MAC
              }
              return prev
            })
          }
        })

        // 更新最後更新時間
        lastUpdateTime = Date.now()
        console.log(`✅ 更新完成，下次更新時間: ${new Date(lastUpdateTime + 5000).toLocaleTimeString()}`)
      } catch (error) {
        console.error('Error processing MQTT data:', error)
      }
    }

    // 初始載入
    updateMqttData()

    // 降低更新頻率到 10 秒
    const interval = setInterval(updateMqttData, 10000)

    return () => clearInterval(interval)
  }, [])

  // ✅ 監聽 MQTT Bus 連接狀態
  useEffect(() => {
    const unsubscribe = mqttBus.onStatusChange((status) => {
      setCloudConnected(status === 'connected')
      setCloudConnectionStatus(status === 'connected' ? t('pages:temperature.connectionStatus.connected') :
        status === 'connecting' ? t('pages:temperature.connectionStatus.connecting') :
          status === 'reconnecting' ? t('pages:temperature.connectionStatus.reconnecting') :
            status === 'error' ? t('pages:temperature.connectionStatus.connectionError') : t('pages:temperature.connectionStatus.disconnected'))
    })

    // 初始化狀態
    const currentStatus = mqttBus.getStatus()
    setCloudConnected(currentStatus === 'connected')
    setCloudConnectionStatus(currentStatus === 'connected' ? t('pages:temperature.connectionStatus.connected') : t('pages:temperature.connectionStatus.disconnected'))

    return unsubscribe
  }, [t])

  // ✅ Gateway 切換時清除設備選擇
  useEffect(() => {
    setSelectedCloudDevice('')
  }, [selectedGateway])

  // ✅ 恢復舊版本的數據轉換邏輯
  const currentCloudDeviceRecords = selectedCloudDevice && cloudDeviceRecords.length > 0
    ? cloudDeviceRecords
      .filter(record => record.MAC === selectedCloudDevice)
      .map(record => ({
        id: record.MAC,
        name: record.residentName ? `${record.residentName} (${record.residentRoom})` : record.deviceName,
        temperature: record.skin_temp || 0,
        time: record.time,
        datetime: record.datetime,
        isAbnormal: record.isAbnormal,
        room_temp: record.room_temp
      }))
    : []

  // 根據時間範圍和狀態過濾記錄
  useEffect(() => {
    let filtered = [...currentCloudDeviceRecords]

    // 時間範圍過濾
    if (timeRange !== "1day") {
      const now = new Date()
      const days = timeRange === "3day" ? 3 : 7
      const cutoff = new Date(now.getTime() - days * 24 * 60 * 60 * 1000)
      filtered = filtered.filter(r => r.datetime >= cutoff)
    }

    // 狀態過濾
    if (recordFilter === "high") {
      filtered = filtered.filter(r => r.temperature > NORMAL_TEMP_MAX)
    } else if (recordFilter === "low") {
      filtered = filtered.filter(r => r.temperature < NORMAL_TEMP_MIN)
    }

    setFilteredRecords(filtered)
  }, [currentCloudDeviceRecords, recordFilter, timeRange])

  // 準備圖表數據
  const chartData = currentCloudDeviceRecords
    .slice(0, 144)
    .reverse()
    .map(record => ({
      time: record.time,
      hour: record.datetime.toLocaleTimeString('zh-TW', { hour: '2-digit', minute: '2-digit' }),
      temperature: record.temperature,
      isAbnormal: record.isAbnormal
    }))

  // 獲取選中日期的字符串
  const getDateString = () => {
    const now = new Date()
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())

    switch (activeTab) {
      case "today":
        return today.toLocaleDateString('zh-TW')
      case "yesterday":
        const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000)
        return yesterday.toLocaleDateString('zh-TW')
      case "dayBefore":
        const dayBefore = new Date(today.getTime() - 2 * 24 * 60 * 60 * 1000)
        return dayBefore.toLocaleDateString('zh-TW')
      default:
        return today.toLocaleDateString('zh-TW')
    }
  }

  return (
    <div className="space-y-6">
      {/* 標題 */}
      <div>
        <h1 className="text-3xl font-bold mb-4 flex items-center">
          <Thermometer className="mr-3 h-8 w-8 text-red-500" />
          {t('pages:temperature.title')}
        </h1>
        {patientName && (
          <div className="mb-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-blue-800 text-sm font-medium">
              📋 {t('pages:temperature.navigationFromHealth')} - {t('pages:temperature.currentPatient')}: {patientName}
            </p>
          </div>
        )}
        <p className="text-muted-foreground mb-4">
          {t('pages:temperature.subtitle')}
        </p>
        <div className="text-sm space-y-2 bg-gray-50 p-4 rounded-lg">
          <div className="font-semibold">{t('pages:temperature.connectionStatus.title')}</div>
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <span>{t('pages:temperature.connectionStatus.cloudMqtt')}:</span>
              <span className={cloudConnected ? "text-green-600 font-medium" : "text-red-500 font-medium"}>
                {cloudConnectionStatus}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* 雲端 MQTT 標籤頁 */}
      <Tabs defaultValue="cloud" className="w-full">
        <TabsList className="grid w-full grid-cols-1">
          <TabsTrigger value="cloud">{t('pages:temperature.tabs.cloud')}</TabsTrigger>
        </TabsList>

        <TabsContent value="cloud" className="space-y-6">
          {/* 設備選擇和狀態 */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg flex items-center">
                  <AlertTriangle className="mr-3 h-5 w-5 text-blue-500" />
                  {t('pages:temperature.cloudDeviceMonitoring.title')}
                </CardTitle>
                <div className="text-sm">
                  {cloudConnected ? (
                    <span className="text-green-600 flex items-center">
                      <div className="w-2 h-2 bg-green-500 rounded-full mr-2 animate-pulse"></div>
                      {t('pages:temperature.cloudDeviceMonitoring.connected')}
                    </span>
                  ) : (
                    <span className="text-red-500 flex items-center">
                      <div className="w-2 h-2 bg-red-500 rounded-full mr-2"></div>
                      {t(`pages:temperature.cloudDeviceMonitoring.${cloudConnectionStatus}`)}
                    </span>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {/* Gateway 選擇 */}
                <div className="space-y-4">
                  <div className="font-medium text-gray-900">{t('pages:temperature.cloudDeviceMonitoring.selectArea')}</div>

                  {/* 橫排選擇器 */}
                  <div className="flex flex-col sm:flex-row gap-4">
                    {/* 養老院選擇 */}
                    <div className="flex-1 space-y-2">
                      <label className="text-sm font-medium text-gray-700">{t('pages:location.selectArea.nursingHome')}</label>
                      <Select value={selectedHome} onValueChange={setSelectedHome}>
                        <SelectTrigger className="w-full">
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
                    <div className="flex-1 space-y-2">
                      <label className="text-sm font-medium text-gray-700">{t('pages:location.selectArea.floor')}</label>
                      <Select value={selectedFloor} onValueChange={setSelectedFloor} disabled={!selectedHome}>
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder={selectedHome ? t('pages:location.selectArea.selectFloor') : t('pages:temperature.cloudDeviceMonitoring.selectNursingHomeFirst')} />
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
                      <label className="text-sm font-medium text-gray-700">{t('pages:location.selectArea.gateway')}</label>
                      <Select value={selectedGateway} onValueChange={setSelectedGateway} disabled={!selectedFloor}>
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder={selectedFloor ? t('pages:location.selectArea.selectGateway') : t('pages:temperature.cloudDeviceMonitoring.selectFloorFirst')} />
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

                  {/* 當前選擇的閘道器信息 */}
                  {selectedGateway && (
                    <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                      <div className="text-sm space-y-1">
                        <div className="font-medium text-blue-800">{t('pages:temperature.cloudDeviceMonitoring.currentGateway')}</div>
                        <div className="text-xs text-blue-700">
                          {gateways.find(gw => gw.id === selectedGateway)?.name}
                          ({gateways.find(gw => gw.id === selectedGateway)?.macAddress})
                        </div>
                        <div className="text-xs text-blue-600">
                          {t('pages:temperature.cloudDeviceMonitoring.listeningTopic')}: {getHealthTopic() || t('pages:temperature.cloudDeviceMonitoring.cannotGetTopic')}
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                  <div className="bg-blue-50 p-3 rounded-lg">
                    <div className="font-medium text-blue-800">{t('pages:temperature.cloudDeviceMonitoring.discoveredDevices')}</div>
                    <div className="text-2xl font-bold text-blue-600">{cloudDevices.length}</div>
                  </div>
                  <div className="bg-green-50 p-3 rounded-lg">
                    <div className="font-medium text-green-800">{t('pages:temperature.cloudDeviceMonitoring.totalRecords')}</div>
                    <div className="text-2xl font-bold text-green-600">{cloudDeviceRecords.length}</div>
                  </div>
                  <div className="bg-purple-50 p-3 rounded-lg">
                    <div className="font-medium text-purple-800">{t('pages:temperature.cloudDeviceMonitoring.mqttMessages')}</div>
                    <div className="text-2xl font-bold text-purple-600">{cloudMqttData.length}</div>
                  </div>
                </div>

                {cloudDevices.length > 0 ? (
                  <div className="space-y-3">
                    <div className="font-medium">{t('pages:temperature.cloudDeviceMonitoring.selectDevice')}</div>
                    <Select value={selectedCloudDevice} onValueChange={setSelectedCloudDevice}>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder={t('pages:temperature.cloudDeviceMonitoring.selectCloudDevice')} />
                      </SelectTrigger>
                      <SelectContent>
                        {cloudDevices
                          .filter(device => {
                            // ✅ 如果選擇了 Gateway，只顯示該 Gateway 的設備
                            if (selectedGateway) {
                              const gateway = gateways.find(gw => gw.id === selectedGateway)
                              if (gateway) {
                                // 檢查設備的所有記錄，只要有一條記錄來自選定的 Gateway 就顯示該設備
                                const deviceRecords = cloudDeviceRecords.filter(record => record.MAC === device.MAC)

                                // 🎯 簡化篩選邏輯：直接使用 MQTT 數據中的 gateway 字段
                                const hasMatchingRecord = deviceRecords.some(record => {
                                  // 主要匹配：record.gateway（來自 MQTT 的 gateway 字段）包含選定 Gateway 的名稱
                                  // 例如：record.gateway = "GwF9E516B8_142", gateway.name = "GwF9E516B8_176"
                                  // 匹配邏輯：檢查前綴是否相同（去掉最後的數字部分）
                                  const recordGatewayPrefix = record.gateway?.split('_')[0] || ''
                                  const selectedGatewayPrefix = gateway.name?.split('_')[0] || ''

                                  const matches = recordGatewayPrefix &&
                                    selectedGatewayPrefix &&
                                    recordGatewayPrefix === selectedGatewayPrefix

                                  return matches
                                })

                                return hasMatchingRecord
                              }
                            }
                            // 如果沒有選擇 Gateway，顯示所有設備
                            return true
                          })
                          .map(device => {
                            const statusInfo = getStatusInfo(device.residentStatus)
                            return (
                              <SelectItem key={device.MAC} value={device.MAC}>
                                <div className="flex items-center justify-between w-full">
                                  <div className="flex items-center gap-2">
                                    {getDeviceTypeIcon(device.deviceType)}
                                    <span>{device.residentName || device.deviceName}</span>
                                    {device.residentRoom && (
                                      <span className="text-xs text-muted-foreground">
                                        ({device.residentRoom})
                                      </span>
                                    )}
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <span className={`px-2 py-1 rounded-full text-xs ${statusInfo.bgColor}`}>
                                      {statusInfo.badge}
                                    </span>
                                    <span className="text-xs text-muted-foreground">
                                      {device.recordCount} {t('pages:temperature.cloudDeviceMonitoring.records')}
                                    </span>
                                  </div>
                                </div>
                              </SelectItem>
                            )
                          })}
                      </SelectContent>
                    </Select>
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <AlertTriangle className="mx-auto h-8 w-8 mb-2 opacity-50" />
                    <p className="font-medium">{t('pages:temperature.cloudDeviceMonitoring.noDevices')}</p>
                    <div className="text-xs space-y-1 mt-2">
                      <p>{t('pages:temperature.cloudDeviceMonitoring.pleaseConfirm')}</p>
                      <p>1. {t('pages:temperature.cloudDeviceMonitoring.cloudMqttSimulator')}</p>
                      <p>2. {t('pages:temperature.cloudDeviceMonitoring.simulatorFormat')}</p>
                      <p>3. {t('pages:temperature.cloudDeviceMonitoring.dataFields')}</p>
                    </div>
                  </div>
                )}

                {/* 最近接收到的雲端數據 */}
                {cloudMqttData.length > 0 && (
                  <div className="mt-6 space-y-2">
                    <div className="font-medium">{t('pages:temperature.cloudDeviceMonitoring.recentData')}</div>
                    <div className="max-h-40 overflow-y-auto space-y-1">
                      {cloudMqttData.slice(0, 8).map((data, index) => (
                        <div key={index} className="text-xs bg-gray-50 p-2 rounded border">
                          <div className="flex items-center justify-between">
                            <span className="font-mono font-semibold text-blue-600">{data.content}</span>
                            <span className="text-muted-foreground">
                              {data.receivedAt.toLocaleTimeString('zh-TW')}
                            </span>
                          </div>
                          {data.MAC && (
                            <div className="text-muted-foreground mt-1">
                              {(() => {
                                const residentInfo = getResidentInfoByMAC(data.MAC)
                                return (
                                  <>
                                    {t('pages:temperature.cloudDeviceMonitoring.device')}: <span className="font-mono">{data.MAC}</span>
                                    {residentInfo?.residentName && (
                                      <span className="text-blue-600 font-medium">
                                        {' '}→ {residentInfo.residentName} ({residentInfo.residentRoom})
                                      </span>
                                    )}
                                    {data.skin_temp && ` | ${t('pages:temperature.cloudDeviceMonitoring.temperature')}: ${data.skin_temp}°C`}
                                    {data.room_temp && ` | ${t('pages:temperature.cloudDeviceMonitoring.roomTemperature')}: ${data.room_temp}°C`}
                                    {data.battery_level && ` | ${t('pages:temperature.cloudDeviceMonitoring.battery')}: ${data.battery_level}%`}
                                  </>
                                )
                              })()}
                            </div>
                          )}
                          {data.content === "diaper DV1" && (
                            <div className="text-muted-foreground mt-1">
                              {t('pages:temperature.cloudDeviceMonitoring.diaperDevice')} {data.name && `- ${data.name}`}
                              {data.temp && ` | ${t('pages:temperature.cloudDeviceMonitoring.temperature')}: ${data.temp}°C`}
                              {data.humi && ` | ${t('pages:temperature.cloudDeviceMonitoring.humidity')}: ${data.humi}%`}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* 原始數據檢視器 - 用於調試 */}
                <div className="mt-6">
                  <details className="group">
                    <summary className="cursor-pointer font-medium text-sm text-muted-foreground hover:text-foreground">
                      🔍 {t('pages:temperature.cloudDeviceMonitoring.viewRawData')}
                    </summary>
                    <div className="mt-2 space-y-2 text-xs">
                      <div className="text-muted-foreground">
                        {t('pages:temperature.cloudDeviceMonitoring.clickToExpand')}
                      </div>
                      <div className="max-h-60 overflow-y-auto space-y-2">
                        {cloudMqttData.slice(0, 5).map((data, index) => (
                          <details key={index} className="border rounded p-2 bg-slate-50">
                            <summary className="cursor-pointer font-mono text-xs hover:bg-slate-100 p-1 rounded">
                              [{index + 1}] {data.content} - {data.receivedAt.toLocaleString('zh-TW')}
                            </summary>
                            <pre className="mt-2 text-xs overflow-x-auto whitespace-pre-wrap bg-white p-2 rounded border">
                              {JSON.stringify({
                                content: data.content,
                                gateway_id: data.gateway_id,
                                MAC: data.MAC,
                                SOS: data.SOS,
                                hr: data.hr,
                                SpO2: data.SpO2,
                                bp_syst: data.bp_syst,
                                bp_diast: data.bp_diast,
                                skin_temp: data.skin_temp,
                                room_temp: data.room_temp,
                                steps: data.steps,
                                light_sleep: data.light_sleep,
                                deep_sleep: data.deep_sleep,
                                wake_time: data.wake_time,
                                move: data.move,
                                wear: data.wear,
                                battery_level: data.battery_level,
                                serial_no: data.serial_no,
                                name: data.name,
                                fw_ver: data.fw_ver,
                                temp: data.temp,
                                humi: data.humi,
                                button: data.button,
                                msg_idx: data.msg_idx,
                                ack: data.ack
                              }, null, 2)}
                            </pre>
                          </details>
                        ))}
                      </div>
                      <div className="text-xs text-amber-600 bg-amber-50 p-2 rounded border border-amber-200">
                        <div className="font-semibold mb-1">{t('pages:temperature.cloudDeviceMonitoring.deviceCreationConditions')}</div>
                        <div>• {t('pages:temperature.cloudDeviceMonitoring.condition1')}</div>
                        <div>• {t('pages:temperature.cloudDeviceMonitoring.condition2')}</div>
                        <div>• {t('pages:temperature.cloudDeviceMonitoring.condition3')}</div>
                        <div>• {t('pages:temperature.cloudDeviceMonitoring.condition4')}</div>
                      </div>
                    </div>
                  </details>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* 雲端設備體溫數據顯示 */}
          {selectedCloudDevice && cloudDeviceRecords.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Thermometer className="mr-2 h-5 w-5" />
                  {t('pages:temperature.deviceTemperatureData.title')} - {(() => {
                    const device = cloudDevices.find(d => d.MAC === selectedCloudDevice)
                    return device?.residentName
                      ? `${device.residentName} (${device.residentRoom})`
                      : device?.deviceName || t('pages:temperature.deviceTemperatureData.unknownDevice')
                  })()}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {/* 設備記錄列表 */}
                  <div className="space-y-3 max-h-80 overflow-y-auto">
                    {cloudDeviceRecords
                      .filter(record => record.MAC === selectedCloudDevice)
                      .slice(0, 20)
                      .map((record, index) => (
                        <div key={index} className="flex items-center justify-between p-3 rounded-lg border">
                          <div className="flex items-center gap-3">
                            <div className={`p-2 rounded-full ${record.skin_temp > NORMAL_TEMP_MAX
                              ? 'bg-red-100 text-red-600'
                              : record.skin_temp < NORMAL_TEMP_MIN
                                ? 'bg-blue-100 text-blue-600'
                                : 'bg-green-100 text-green-600'
                              }`}>
                              {record.isAbnormal ? (
                                <AlertTriangle className="h-4 w-4" />
                              ) : (
                                <Thermometer className="h-4 w-4" />
                              )}
                            </div>
                            <div>
                              <div className="font-medium flex items-center gap-2">
                                {getDeviceTypeIcon(record.deviceType)}
                                {record.residentName ? `${record.residentName} (${record.residentRoom})` : record.deviceName}
                                {record.residentStatus && (
                                  <span className={`px-2 py-1 rounded-full text-xs ${getStatusInfo(record.residentStatus).bgColor}`}>
                                    {getStatusInfo(record.residentStatus).badge}
                                  </span>
                                )}
                              </div>
                              <div className="text-sm text-muted-foreground">
                                {t('pages:temperature.deviceTemperatureData.skinTemperature')}: {record.skin_temp}°C | {t('pages:temperature.deviceTemperatureData.roomTemperature')}: {record.room_temp}°C
                              </div>
                              <div className="text-xs text-muted-foreground">
                                {t('pages:temperature.deviceTemperatureData.steps')}: {record.steps} | {t('pages:temperature.deviceTemperatureData.battery')}: {record.battery_level}%
                              </div>
                            </div>
                          </div>
                          <div className={`px-3 py-1 rounded-full text-sm font-medium ${record.skin_temp > NORMAL_TEMP_MAX
                            ? 'bg-red-100 text-red-700'
                            : record.skin_temp < NORMAL_TEMP_MIN
                              ? 'bg-blue-100 text-blue-700'
                              : 'bg-green-100 text-green-700'
                            }`}>
                            {record.skin_temp > NORMAL_TEMP_MAX
                              ? t('pages:temperature.deviceTemperatureData.temperatureHigh')
                              : record.skin_temp < NORMAL_TEMP_MIN
                                ? t('pages:temperature.deviceTemperatureData.temperatureLow')
                                : t('pages:temperature.deviceTemperatureData.normal')}
                          </div>
                        </div>
                      ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      {/* 日期選擇標籤 */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="today">{t('pages:temperature.dateTabs.today')}</TabsTrigger>
          <TabsTrigger value="yesterday">{t('pages:temperature.dateTabs.yesterday')}</TabsTrigger>
          <TabsTrigger value="dayBefore">{t('pages:temperature.dateTabs.dayBefore')}</TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab} className="space-y-6">
          {/* 體溫趨勢圖 */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span className="flex items-center">
                  <TrendingUp className="mr-2 h-5 w-5" />
                  {t('pages:temperature.temperatureChart.title')}
                  {selectedCloudDevice && (
                    <span className="ml-2 text-sm font-normal text-blue-600">
                      - {(() => {
                        const device = cloudDevices.find(d => d.MAC === selectedCloudDevice)
                        return device?.residentName
                          ? `${device.residentName} (${device.residentRoom})`
                          : device?.deviceName || t('pages:temperature.temperatureChart.cloudDevice')
                      })()}
                    </span>
                  )}
                </span>
                <span className="text-sm text-muted-foreground">{getDateString()}</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {chartData.length > 0 ? (
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis
                        dataKey="hour"
                        tick={{ fontSize: 12 }}
                        interval="preserveStartEnd"
                      />
                      <YAxis
                        domain={['dataMin - 1', 'dataMax + 1']}
                        tick={{ fontSize: 12 }}
                        label={{ value: t('pages:temperature.temperatureChart.yAxisLabel'), angle: -90, position: 'insideLeft' }}
                      />
                      <Tooltip
                        labelFormatter={(value) => `${t('pages:temperature.temperatureChart.time')}: ${value}`}
                        formatter={(value) => [`${value}°C`, t('pages:temperature.temperatureChart.temperature')]}
                      />
                      <ReferenceLine y={37.5} stroke="#ef4444" strokeDasharray="5 5" label={t('pages:temperature.temperatureChart.highTempLine')} />
                      <ReferenceLine y={36.0} stroke="#3b82f6" strokeDasharray="5 5" label={t('pages:temperature.temperatureChart.lowTempLine')} />
                      <Line
                        type="monotone"
                        dataKey="temperature"
                        stroke="#8884d8"
                        strokeWidth={2}
                        dot={{ fill: '#8884d8', strokeWidth: 2, r: 4 }}
                        activeDot={{ r: 6 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="h-80 flex items-center justify-center text-muted-foreground">
                  <div className="text-center">
                    <Thermometer className="mx-auto h-12 w-12 mb-4 opacity-50" />
                    <p>{t('pages:temperature.temperatureChart.noData', { date: getDateString() })}</p>
                    <div className="text-sm space-y-1">
                      <p>{t('pages:temperature.temperatureChart.cloudSimulatorCheck')}</p>
                      <p>{t('pages:temperature.temperatureChart.selectValidDevice')}</p>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* 體溫記錄 */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Clock className="mr-2 h-5 w-5" />
                {t('pages:temperature.temperatureRecords.title')}
                {selectedCloudDevice && (
                  <span className="ml-2 text-sm font-normal text-blue-600">
                    - {(() => {
                      const device = cloudDevices.find(d => d.MAC === selectedCloudDevice)
                      return device?.residentName
                        ? `${device.residentName} (${device.residentRoom})`
                        : device?.deviceName || t('pages:temperature.temperatureChart.cloudDevice')
                    })()}
                  </span>
                )}
              </CardTitle>
              {/* 篩選選項 */}
              <div className="flex gap-4 pt-4">
                <div className="flex gap-2">
                  <Button
                    variant={recordFilter === "all" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setRecordFilter("all")}
                  >
                    {t('pages:temperature.temperatureRecords.filters.all')}
                  </Button>
                  <Button
                    variant={recordFilter === "high" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setRecordFilter("high")}
                    className="text-red-600 border-red-600 hover:bg-red-50"
                  >
                    {t('pages:temperature.temperatureRecords.filters.high')}
                  </Button>
                  <Button
                    variant={recordFilter === "low" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setRecordFilter("low")}
                    className="text-blue-600 border-blue-600 hover:bg-blue-50"
                  >
                    {t('pages:temperature.temperatureRecords.filters.low')}
                  </Button>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant={timeRange === "1day" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setTimeRange("1day")}
                  >
                    {t('pages:temperature.temperatureRecords.timeRanges.1day')}
                  </Button>
                  <Button
                    variant={timeRange === "3day" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setTimeRange("3day")}
                  >
                    {t('pages:temperature.temperatureRecords.timeRanges.3day')}
                  </Button>
                  <Button
                    variant={timeRange === "7day" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setTimeRange("7day")}
                  >
                    {t('pages:temperature.temperatureRecords.timeRanges.7day')}
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {filteredRecords.length > 0 ? (
                  filteredRecords.map((record, index) => (
                    <div key={index} className="flex items-center justify-between p-3 rounded-lg border">
                      <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-full ${record.temperature > NORMAL_TEMP_MAX
                          ? 'bg-red-100 text-red-600'
                          : record.temperature < NORMAL_TEMP_MIN
                            ? 'bg-blue-100 text-blue-600'
                            : 'bg-green-100 text-green-600'
                          }`}>
                          {record.isAbnormal ? (
                            <AlertTriangle className="h-4 w-4" />
                          ) : (
                            <Thermometer className="h-4 w-4" />
                          )}
                        </div>
                        <div>
                          <div className="font-medium">{record.datetime.toLocaleString('zh-TW')}</div>
                          <div className="text-sm text-muted-foreground">
                            {record.temperature > 0 ? `${record.temperature}°C` : t('pages:temperature.temperatureRecords.noTemperatureData')}
                            {record.room_temp && record.room_temp > 0 && (
                              <span className="ml-2">| {t('pages:temperature.temperatureRecords.roomTemperature')}: {record.room_temp}°C</span>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className={`px-3 py-1 rounded-full text-sm font-medium ${record.temperature === 0
                        ? 'bg-gray-100 text-gray-700'
                        : record.temperature > NORMAL_TEMP_MAX
                          ? 'bg-red-100 text-red-700'
                          : record.temperature < NORMAL_TEMP_MIN
                            ? 'bg-blue-100 text-blue-700'
                            : 'bg-green-100 text-green-700'
                        }`}>
                        {record.temperature === 0
                          ? t('pages:temperature.temperatureRecords.noTemperatureData')
                          : record.temperature > NORMAL_TEMP_MAX
                            ? t('pages:temperature.temperatureRecords.temperatureHigh')
                            : record.temperature < NORMAL_TEMP_MIN
                              ? t('pages:temperature.temperatureRecords.temperatureLow')
                              : t('pages:temperature.temperatureRecords.normal')}
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <Clock className="mx-auto h-8 w-8 mb-2 opacity-50" />
                    <p>{t('pages:temperature.temperatureRecords.noRecords')}</p>
                    {!selectedCloudDevice && (
                      <p className="text-sm mt-2">{t('pages:temperature.temperatureRecords.selectCloudDeviceFirst')}</p>
                    )}
                    {selectedCloudDevice && currentCloudDeviceRecords.length === 0 && (
                      <p className="text-sm mt-2">{t('pages:temperature.temperatureRecords.selectedDeviceNoData')}</p>
                    )}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}