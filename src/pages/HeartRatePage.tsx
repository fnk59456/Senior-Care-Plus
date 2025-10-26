import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts'
import { Heart, TrendingUp, Clock, AlertTriangle, MapPin, Baby, Activity, Watch, Settings } from "lucide-react"
import { useLocation } from "react-router-dom"
import { useUWBLocation } from "@/contexts/UWBLocationContext"
// 暫時移除未使用的 import
import { DeviceType } from "@/types/device-types"
import { useTranslation } from "react-i18next"
// 暫時移除 useHealthStore 避免無限循環
import { mqttBus } from "@/services/mqttBus"

// 心率範圍
const NORMAL_HEART_RATE_MIN = 60
const NORMAL_HEART_RATE_MAX = 100
const TARGET_HEART_RATE = 75

// 血壓範圍
const NORMAL_BP_SYST_MAX = 120  // 正常收縮壓上限
const NORMAL_BP_DIAST_MAX = 80  // 正常舒張壓上限
const HIGH_BP_SYST = 140        // 高血壓收縮壓
const HIGH_BP_DIAST = 90        // 高血壓舒張壓

// 移除未使用的 USERS 常數

// 移除未使用的函數

// 移除未使用的類型定義

export default function HeartRatePage() {
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

  // 暫時移除未使用的 devices

  // ✅ 恢復舊版本的狀態管理方式
  const [cloudDeviceRecords, setCloudDeviceRecords] = useState<any[]>([])
  const [cloudDevices, setCloudDevices] = useState<any[]>([])

  // 原始 MQTT 數據狀態
  const [cloudMqttData, setCloudMqttData] = useState<any[]>([])

  // ✅ 修復頻率問題 - 只在有新消息時更新
  useEffect(() => {
    let lastProcessedTime = 0
    let processedMessages = new Set()

    const updateMqttData = () => {
      try {
        const recentMessages = mqttBus.getRecentMessages()

        // 只處理新的消息（避免重複處理）
        const newMessages = recentMessages.filter(msg =>
          msg.timestamp.getTime() > lastProcessedTime &&
          !processedMessages.has(`${msg.topic}-${msg.timestamp.getTime()}`)
        )

        if (newMessages.length === 0) {
          return // 沒有新消息，不更新
        }

        console.log(`🔄 處理 ${newMessages.length} 條新 MQTT 消息`)

        // 更新最後處理時間
        lastProcessedTime = Math.max(...newMessages.map(msg => msg.timestamp.getTime()))

        // 標記已處理的消息
        newMessages.forEach(msg => {
          processedMessages.add(`${msg.topic}-${msg.timestamp.getTime()}`)
        })

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

        // ✅ 只顯示心率相關的 MQTT 數據
        const heartRateData = formattedData.filter(data =>
          data.content === '300B' ||
          data.topic.includes('_Health') ||
          (data.hr && data.hr !== '') ||
          (data.SpO2 && data.SpO2 !== '') ||
          (data.bp_syst && data.bp_syst !== '')
        )

        // 只添加新的心率數據
        if (heartRateData.length > 0) {
          setCloudMqttData(prev => {
            const combined = [...heartRateData, ...prev]
              .sort((a, b) => b.receivedAt.getTime() - a.receivedAt.getTime())
              .slice(0, 50) // 限制總數
            return combined
          })
        }

        // ✅ 只處理心率相關的數據 (300B 設備)
        const healthMessages = newMessages.filter(msg =>
          msg.payload?.content === '300B' && msg.payload?.MAC
        )

        healthMessages.forEach(msg => {
          const data = msg.payload
          const MAC = data.MAC || data['mac address'] || data.macAddress

          if (MAC) {
            const hr = parseFloat(data.hr) || 0
            const SpO2 = parseFloat(data.SpO2) || 0
            const bp_syst = parseFloat(data['bp syst']) || 0
            const bp_diast = parseFloat(data['bp diast']) || 0
            const skinTemp = parseFloat(data['skin temp']) || 0
            const roomTemp = parseFloat(data['room temp']) || 0
            const steps = parseInt(data.steps) || 0
            const batteryLevel = parseInt(data['battery level']) || 0

            // 創建設備記錄
            const cloudDeviceRecord = {
              MAC: MAC,
              deviceName: `設備 ${MAC.slice(-8)}`,
              hr: hr,
              SpO2: SpO2,
              bp_syst: bp_syst,
              bp_diast: bp_diast,
              skin_temp: skinTemp,
              room_temp: roomTemp,
              steps: steps,
              battery_level: batteryLevel,
              time: msg.timestamp.toISOString(),
              datetime: msg.timestamp, // 使用實際的 MQTT 時間戳
              isAbnormal: hr > 0 && (hr > NORMAL_HEART_RATE_MAX || hr < NORMAL_HEART_RATE_MIN),
              residentId: undefined,
              residentName: undefined,
              residentRoom: undefined,
              residentStatus: 'unknown',
              deviceType: DeviceType.SMARTWATCH_300B
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
                      recordCount: d.recordCount + 1
                    }
                    : d
                )
              } else {
                const newDevice = {
                  MAC: MAC,
                  deviceName: `設備 ${MAC.slice(-8)}`,
                  lastSeen: msg.timestamp, // 使用實際的 MQTT 時間戳
                  recordCount: 1,
                  residentId: undefined,
                  residentName: undefined,
                  residentRoom: undefined,
                  residentStatus: 'unknown',
                  deviceType: DeviceType.SMARTWATCH_300B
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

  // 移除未使用的 selectedUser 狀態
  const [activeTab, setActiveTab] = useState<string>("today")
  const [filteredRecords, setFilteredRecords] = useState<any[]>([])
  const [recordFilter, setRecordFilter] = useState<string>("all")
  const [timeRange, setTimeRange] = useState<string>("1day")

  // 雲端設備管理狀態
  const [selectedCloudDevice, setSelectedCloudDevice] = useState<string>("")

  // ✅ MQTT Bus 連接狀態
  const [cloudConnected, setCloudConnected] = useState(false)
  const [cloudConnectionStatus, setCloudConnectionStatus] = useState<string>("未連線")

  // 當前MQTT標籤頁狀態
  const [currentMqttTab, setCurrentMqttTab] = useState<string>("cloud")

  // 參考線顯示狀態
  const [showReferenceLines, setShowReferenceLines] = useState<boolean>(true)

  // ✅ 監聽 MQTT Bus 連接狀態
  useEffect(() => {
    const unsubscribe = mqttBus.onStatusChange((status) => {
      setCloudConnected(status === 'connected')
      setCloudConnectionStatus(status === 'connected' ? '已連線' :
        status === 'connecting' ? '連接中...' :
          status === 'reconnecting' ? '重新連接中...' :
            status === 'error' ? '連接錯誤' : '未連線')
    })

    // 初始化狀態
    const currentStatus = mqttBus.getStatus()
    setCloudConnected(currentStatus === 'connected')
    setCloudConnectionStatus(currentStatus === 'connected' ? '已連線' : '未連線')

    return unsubscribe
  }, [])

  // 動態獲取健康監控MQTT主題
  const getHealthTopic = () => {
    if (!selectedGateway) return null

    const gateway = gateways.find(gw => gw.id === selectedGateway)
    console.log("🔍 選擇的健康監控閘道器:", gateway)

    if (gateway?.cloudData?.pub_topic?.health) {
      console.log("✅ 使用雲端健康主題:", gateway.cloudData.pub_topic.health)
      return gateway.cloudData.pub_topic.health
    }

    if (gateway) {
      const gatewayName = gateway.name.replace(/\s+/g, '')
      const constructedTopic = `UWB/GW${gatewayName}_Health`
      console.log("🔧 構建本地健康主題:", constructedTopic)
      return constructedTopic
    }

    console.log("❌ 無法獲取健康監控閘道器主題")
    return null
  }

  // ✅ 恢復舊版本的數據轉換邏輯
  const currentCloudDeviceRecords = selectedCloudDevice && cloudDeviceRecords.length > 0
    ? cloudDeviceRecords
      .filter(record => record.MAC === selectedCloudDevice)
      .map(record => ({
        id: record.MAC,
        name: record.deviceName,
        heart_rate: record.hr || 0,
        time: record.time,
        datetime: record.datetime,
        isAbnormal: record.isAbnormal,
        temperature: record.skin_temp,
        bp_syst: record.bp_syst || 0,
        bp_diast: record.bp_diast || 0
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
      filtered = filtered.filter(r => r.heart_rate > NORMAL_HEART_RATE_MAX)
    } else if (recordFilter === "low") {
      filtered = filtered.filter(r => r.heart_rate < NORMAL_HEART_RATE_MIN)
    } else if (recordFilter === "highBP") {
      filtered = filtered.filter(r =>
        (r.bp_syst && r.bp_syst >= HIGH_BP_SYST) ||
        (r.bp_diast && r.bp_diast >= HIGH_BP_DIAST)
      )
    } else if (recordFilter === "lowBP") {
      filtered = filtered.filter(r =>
        (r.bp_syst && r.bp_syst < 90) ||
        (r.bp_diast && r.bp_diast < 60)
      )
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
      heart_rate: record.heart_rate,
      isAbnormal: record.isAbnormal,
      bp_syst: record.bp_syst || 0,
      bp_diast: record.bp_diast || 0
    }))

  // 移除複雜的日誌輸出

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
          <Heart className="mr-3 h-8 w-8 text-pink-500" />
          {t('pages:heartRate.title')}
        </h1>
        {patientName && (
          <div className="mb-3 p-3 bg-pink-50 border border-pink-200 rounded-lg">
            <p className="text-pink-800 text-sm font-medium">
              💗 {t('pages:heartRate.navigationFromHealth')} - {t('pages:heartRate.currentPatient')}: {patientName}
            </p>
          </div>
        )}
        <p className="text-muted-foreground mb-4">
          {t('pages:heartRate.subtitle')}
        </p>
        <div className="text-sm space-y-2 bg-gray-50 p-4 rounded-lg">
          <div className="font-semibold">{t('pages:heartRate.connectionStatus.title')}</div>
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <span>{t('pages:heartRate.connectionStatus.cloudMqtt')}:</span>
              <span className={cloudConnected ? "text-green-600 font-medium" : "text-red-500 font-medium"}>
                {cloudConnectionStatus}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* 雲端 MQTT 標籤頁 */}
      <Tabs defaultValue="cloud" className="w-full" value={currentMqttTab} onValueChange={setCurrentMqttTab}>
        <TabsList className="grid w-full grid-cols-1">
          <TabsTrigger value="cloud">{t('pages:heartRate.tabs.cloud')}</TabsTrigger>
        </TabsList>

        <TabsContent value="cloud" className="space-y-6">
          {/* 設備選擇和狀態 */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg flex items-center">
                  <AlertTriangle className="mr-3 h-5 w-5 text-pink-500" />
                  {t('pages:heartRate.cloudDeviceMonitoring.title')}
                </CardTitle>
                <div className="text-sm">
                  {cloudConnected ? (
                    <span className="text-green-600 flex items-center">
                      <div className="w-2 h-2 bg-green-500 rounded-full mr-2 animate-pulse"></div>
                      {t('pages:heartRate.cloudDeviceMonitoring.connected')}
                    </span>
                  ) : (
                    <span className="text-red-500 flex items-center">
                      <div className="w-2 h-2 bg-red-500 rounded-full mr-2"></div>
                      {cloudConnectionStatus}
                    </span>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {/* Gateway 選擇 */}
                <div className="space-y-4">
                  <div className="font-medium text-gray-900">{t('pages:heartRate.cloudDeviceMonitoring.selectArea')}</div>

                  <div className="flex flex-col sm:flex-row gap-4">
                    <div className="flex-1 space-y-2">
                      <label className="text-sm font-medium text-gray-700">{t('pages:heartRate.cloudDeviceMonitoring.selectNursingHome')}</label>
                      <Select value={selectedHome || ""} onValueChange={(value) => {
                        console.log('選擇的養老院:', value)
                        setSelectedHome(value)
                      }}>
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder={t('pages:heartRate.cloudDeviceMonitoring.selectNursingHomeFirst')} />
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

                    <div className="flex-1 space-y-2">
                      <label className="text-sm font-medium text-gray-700">{t('pages:heartRate.cloudDeviceMonitoring.selectFloor')}</label>
                      <Select value={selectedFloor || ""} onValueChange={(value) => {
                        console.log('選擇的樓層:', value)
                        setSelectedFloor(value)
                      }} disabled={!selectedHome}>
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder={selectedHome ? t('pages:heartRate.cloudDeviceMonitoring.selectFloorFirst') : t('pages:heartRate.cloudDeviceMonitoring.selectNursingHomeFirst')} />
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

                    <div className="flex-1 space-y-2">
                      <label className="text-sm font-medium text-gray-700">{t('pages:heartRate.cloudDeviceMonitoring.selectGateway')}</label>
                      <Select value={selectedGateway || ""} onValueChange={(value) => {
                        console.log('選擇的閘道器:', value)
                        setSelectedGateway(value)
                      }} disabled={!selectedFloor}>
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder={selectedFloor ? t('pages:heartRate.cloudDeviceMonitoring.selectGateway') : t('pages:heartRate.cloudDeviceMonitoring.selectFloorFirst')} />
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

                  {selectedGateway && (
                    <div className="p-3 bg-pink-50 rounded-lg border border-pink-200">
                      <div className="text-sm space-y-1">
                        <div className="font-medium text-pink-800">{t('pages:heartRate.cloudDeviceMonitoring.currentGateway')}</div>
                        <div className="text-xs text-pink-700">
                          {gateways.find(gw => gw.id === selectedGateway)?.name}
                          ({gateways.find(gw => gw.id === selectedGateway)?.macAddress})
                        </div>
                        <div className="text-xs text-pink-600">
                          {t('pages:heartRate.cloudDeviceMonitoring.listeningTopic')}: {getHealthTopic() || t('pages:heartRate.cloudDeviceMonitoring.cannotGetTopic')}
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                  <div className="bg-pink-50 p-3 rounded-lg">
                    <div className="font-medium text-pink-800">{t('pages:heartRate.cloudDeviceMonitoring.discoveredDevices')}</div>
                    <div className="text-2xl font-bold text-pink-600">{cloudDevices.length}</div>
                  </div>
                  <div className="bg-green-50 p-3 rounded-lg">
                    <div className="font-medium text-green-800">{t('pages:heartRate.cloudDeviceMonitoring.totalRecords')}</div>
                    <div className="text-2xl font-bold text-green-600">{cloudDeviceRecords.length}</div>
                  </div>
                  <div className="bg-purple-50 p-3 rounded-lg">
                    <div className="font-medium text-purple-800">MQTT 狀態</div>
                    <div className="text-2xl font-bold text-purple-600">{cloudConnected ? '已連線' : '未連線'}</div>
                  </div>
                </div>

                {cloudDevices.length > 0 ? (
                  <div className="space-y-3">
                    <div className="font-medium">{t('pages:heartRate.cloudDeviceMonitoring.selectDevice')}</div>
                    <Select value={selectedCloudDevice} onValueChange={(value) => {
                      console.log('選擇的雲端設備:', value)
                      setSelectedCloudDevice(value)
                    }}>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder={t('pages:heartRate.cloudDeviceMonitoring.selectCloudDevice')} />
                      </SelectTrigger>
                      <SelectContent>
                        {cloudDevices.map(device => {
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
                                    {device.recordCount} {t('pages:heartRate.cloudDeviceMonitoring.records')}
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
                    <p className="font-medium">{t('pages:heartRate.cloudDeviceMonitoring.noDevices')}</p>
                    <div className="text-xs space-y-1 mt-2">
                      <p>{t('pages:heartRate.cloudDeviceMonitoring.pleaseConfirm')}</p>
                      <p>1. {t('pages:heartRate.cloudDeviceMonitoring.cloudMqttSimulator')}</p>
                      <p>2. {t('pages:heartRate.cloudDeviceMonitoring.simulatorFormat')}</p>
                      <p>3. {t('pages:heartRate.cloudDeviceMonitoring.dataFields')}</p>
                    </div>
                  </div>
                )}

                {/* 最近接收到的雲端數據 */}
                {cloudMqttData.length > 0 && (
                  <div className="mt-6 space-y-2">
                    <div className="font-medium">最近接收到的 MQTT 數據</div>
                    <div className="max-h-40 overflow-y-auto space-y-1">
                      {cloudMqttData
                        .filter(data =>
                          data.content === '300B' ||
                          data.topic.includes('_Health') ||
                          (data.hr && data.hr !== '') ||
                          (data.SpO2 && data.SpO2 !== '') ||
                          (data.bp_syst && data.bp_syst !== '')
                        )
                        .slice(0, 8)
                        .map((data, index) => (
                          <div key={index} className="text-xs bg-gray-50 p-2 rounded border">
                            <div className="flex items-center justify-between">
                              <span className="font-mono font-semibold text-pink-600">{data.content}</span>
                              <span className="text-muted-foreground">
                                {data.receivedAt.toLocaleTimeString('zh-TW')}
                              </span>
                            </div>
                            {data.MAC && (
                              <div className="text-muted-foreground mt-1">
                                設備: <span className="font-mono">{data.MAC}</span>
                                {data.hr && ` | 心率: ${data.hr} BPM`}
                                {data.SpO2 && ` | 血氧: ${data.SpO2}%`}
                                {data.bp_syst && data.bp_diast && ` | 血壓: ${data.bp_syst}/${data.bp_diast}`}
                              </div>
                            )}
                            {data.content === "diaper DV1" && (
                              <div className="text-muted-foreground mt-1">
                                尿布設備 {data.name && `- ${data.name}`}
                                {data.temp && ` | 溫度: ${data.temp}°C`}
                                {data.humi && ` | 濕度: ${data.humi}%`}
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
                      🔍 查看原始MQTT數據 (調試用)
                    </summary>
                    <div className="mt-2 space-y-2 text-xs">
                      <div className="text-muted-foreground">
                        點擊下方數據可展開查看完整內容
                      </div>
                      <div className="max-h-60 overflow-y-auto space-y-2">
                        {cloudMqttData
                          .filter(data =>
                            data.content === '300B' ||
                            data.topic.includes('_Health') ||
                            (data.hr && data.hr !== '') ||
                            (data.SpO2 && data.SpO2 !== '') ||
                            (data.bp_syst && data.bp_syst !== '')
                          )
                          .slice(0, 5)
                          .map((data, index) => (
                            <details key={index} className="border rounded p-2 bg-slate-50">
                              <summary className="cursor-pointer font-mono text-xs hover:bg-slate-100 p-1 rounded">
                                [{index + 1}] {data.content} - {data.receivedAt.toLocaleString('zh-TW')}
                              </summary>
                              <pre className="mt-2 text-xs overflow-x-auto whitespace-pre-wrap bg-white p-2 rounded border">
                                {JSON.stringify({
                                  content: data.content,
                                  topic: data.topic,
                                  gateway: data.gateway,
                                  MAC: data.MAC,
                                  receivedAt: data.receivedAt,
                                  // 健康數據字段
                                  hr: data.hr,
                                  SpO2: data.SpO2,
                                  bp_syst: data.bp_syst,
                                  bp_diast: data.bp_diast,
                                  skin_temp: data.skin_temp,
                                  room_temp: data.room_temp,
                                  steps: data.steps,
                                  battery_level: data.battery_level,
                                  // 尿布數據字段
                                  name: data.name,
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
                        <div className="font-semibold mb-1">心率設備創建條件檢查:</div>
                        <div>• 必須有 content: "300B"</div>
                        <div>• 必須有 MAC 字段</div>
                        <div>• hr, SpO2, bp_syst, bp_diast 字段可以為空或0 (已放寬條件)</div>
                        <div>• 心率 &gt; 100 BPM 或 &lt; 60 BPM 時會觸發異常警告</div>
                      </div>
                    </div>
                  </details>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* 雲端設備心率數據顯示 */}
          {selectedCloudDevice && cloudDeviceRecords.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Heart className="mr-2 h-5 w-5" />
                  {t('pages:heartRate.deviceHeartRateData.title')} - {(() => {
                    const device = cloudDevices.find(d => d.MAC === selectedCloudDevice)
                    return device?.residentName
                      ? `${device.residentName} (${device.residentRoom})`
                      : device?.deviceName || t('pages:heartRate.deviceHeartRateData.unknownDevice')
                  })()}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="space-y-3 max-h-80 overflow-y-auto">
                    {cloudDeviceRecords
                      .filter(record => record.MAC === selectedCloudDevice)
                      .slice(0, 20)
                      .map((record, index) => (
                        <div key={index} className="flex items-center justify-between p-3 rounded-lg border">
                          <div className="flex items-center gap-3">
                            <div className={`p-2 rounded-full ${record.hr > NORMAL_HEART_RATE_MAX
                              ? 'bg-red-100 text-red-600'
                              : record.hr < NORMAL_HEART_RATE_MIN && record.hr > 0
                                ? 'bg-blue-100 text-blue-600'
                                : 'bg-green-100 text-green-600'
                              }`}>
                              {record.isAbnormal ? (
                                <AlertTriangle className="h-4 w-4" />
                              ) : (
                                <Heart className="h-4 w-4" />
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
                              <div className="text-sm text-muted-foreground space-y-1">
                                <div>
                                  {t('pages:heartRate.deviceHeartRateData.heartRate')}: {record.hr > 0 ? `${record.hr} BPM` : t('pages:heartRate.deviceHeartRateData.noData')}
                                  {record.SpO2 > 0 && ` | ${t('pages:heartRate.deviceHeartRateData.spo2')}: ${record.SpO2}%`}
                                </div>
                                {(record.bp_syst > 0 || record.bp_diast > 0) && (
                                  <div>
                                    {t('pages:heartRate.deviceHeartRateData.bloodPressure')}: {record.bp_syst || "-"}/{record.bp_diast || "-"} mmHg
                                    {record.skin_temp > 0 && ` | ${t('pages:heartRate.deviceHeartRateData.skinTemperature')}: ${record.skin_temp}°C`}
                                  </div>
                                )}
                                <div className="text-xs text-muted-foreground">
                                  {t('pages:heartRate.deviceHeartRateData.steps')}: {record.steps} | {t('pages:heartRate.deviceHeartRateData.battery')}: {record.battery_level}%
                                </div>
                              </div>
                            </div>
                          </div>
                          <div className={`px-3 py-1 rounded-full text-sm font-medium ${record.hr === 0
                            ? 'bg-gray-100 text-gray-700'
                            : record.hr > NORMAL_HEART_RATE_MAX
                              ? 'bg-red-100 text-red-700'
                              : record.hr < NORMAL_HEART_RATE_MIN
                                ? 'bg-blue-100 text-blue-700'
                                : 'bg-green-100 text-green-700'
                            }`}>
                            {record.hr === 0
                              ? t('pages:heartRate.deviceHeartRateData.noHeartRateData')
                              : record.hr > NORMAL_HEART_RATE_MAX
                                ? t('pages:heartRate.deviceHeartRateData.heartRateHigh')
                                : record.hr < NORMAL_HEART_RATE_MIN
                                  ? t('pages:heartRate.deviceHeartRateData.heartRateLow')
                                  : t('pages:heartRate.deviceHeartRateData.normal')}
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
          <TabsTrigger value="today">{t('pages:heartRate.dateTabs.today')}</TabsTrigger>
          <TabsTrigger value="yesterday">{t('pages:heartRate.dateTabs.yesterday')}</TabsTrigger>
          <TabsTrigger value="dayBefore">{t('pages:heartRate.dateTabs.dayBefore')}</TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab} className="space-y-6">
          {/* 心率趨勢圖 */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span className="flex items-center">
                  <TrendingUp className="mr-2 h-5 w-5" />
                  {t('pages:heartRate.heartRateChart.title')}
                  {selectedCloudDevice && (
                    <span className="ml-2 text-sm font-normal text-pink-600">
                      - {(() => {
                        const device = cloudDevices.find(d => d.MAC === selectedCloudDevice)
                        return device?.residentName
                          ? `${device.residentName} (${device.residentRoom})`
                          : device?.deviceName || t('pages:heartRate.heartRateChart.cloudDevice')
                      })()}
                    </span>
                  )}
                </span>
                <div className="flex items-center gap-3">
                  <Button
                    variant={showReferenceLines ? "default" : "outline"}
                    size="sm"
                    onClick={() => setShowReferenceLines(!showReferenceLines)}
                    className="text-xs"
                  >
                    {showReferenceLines ? t('pages:heartRate.heartRateChart.hideReferenceLines') : t('pages:heartRate.heartRateChart.showReferenceLines')}
                  </Button>
                  <span className="text-sm text-muted-foreground">{getDateString()}</span>
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {chartData.length > 0 ? (
                <div className="space-y-4">
                  <div className="flex flex-wrap gap-4 text-sm">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-0.5 bg-pink-500"></div>
                      <span className="text-pink-600 font-medium">{t('pages:heartRate.heartRateChart.legend.heartRate')}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-0.5 bg-red-500"></div>
                      <span className="text-red-600 font-medium">{t('pages:heartRate.heartRateChart.legend.systolicBP')}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-0.5 bg-blue-500"></div>
                      <span className="text-blue-600 font-medium">{t('pages:heartRate.heartRateChart.legend.diastolicBP')}</span>
                    </div>
                    {showReferenceLines && (
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <span>{t('pages:heartRate.heartRateChart.legend.referenceLinesVisible')}</span>
                      </div>
                    )}
                  </div>

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
                          yAxisId="heartRate"
                          domain={['dataMin - 5', 'dataMax + 5']}
                          tick={{ fontSize: 12 }}
                          label={{ value: t('pages:heartRate.heartRateChart.yAxisLabel'), angle: -90, position: 'insideLeft' }}
                        />
                        <YAxis
                          yAxisId="bloodPressure"
                          orientation="right"
                          domain={[50, 180]}
                          tick={{ fontSize: 12 }}
                          label={{ value: '血壓 (mmHg)', angle: 90, position: 'insideRight' }}
                        />
                        <Tooltip
                          labelFormatter={(value) => `${t('pages:heartRate.heartRateChart.time')}: ${value}`}
                          formatter={(value, name) => {
                            if (name === 'heart_rate') return [`${value} BPM`, t('pages:heartRate.heartRateChart.legend.heartRate')]
                            if (name === 'bp_syst') return [`${value} mmHg`, t('pages:heartRate.heartRateChart.legend.systolicBP')]
                            if (name === 'bp_diast') return [`${value} mmHg`, t('pages:heartRate.heartRateChart.legend.diastolicBP')]
                            return [`${value}`, name]
                          }}
                        />
                        {showReferenceLines && (
                          <>
                            <ReferenceLine yAxisId="heartRate" y={TARGET_HEART_RATE} stroke="#ec4899" strokeDasharray="5 5" label={`${t('pages:heartRate.heartRateChart.targetHeartRate')}: 75 BPM`} />
                            <ReferenceLine yAxisId="heartRate" y={NORMAL_HEART_RATE_MAX} stroke="#ef4444" strokeDasharray="5 5" label={t('pages:heartRate.heartRateChart.highHeartRateLine')} />
                            <ReferenceLine yAxisId="heartRate" y={NORMAL_HEART_RATE_MIN} stroke="#3b82f6" strokeDasharray="5 5" label={t('pages:heartRate.heartRateChart.lowHeartRateLine')} />
                          </>
                        )}
                        {showReferenceLines && (
                          <>
                            <ReferenceLine yAxisId="bloodPressure" y={NORMAL_BP_SYST_MAX} stroke="#f59e0b" strokeDasharray="3 3" label={t('pages:heartRate.heartRateChart.referenceLines.normalSystolicBP')} />
                            <ReferenceLine yAxisId="bloodPressure" y={NORMAL_BP_DIAST_MAX} stroke="#10b981" strokeDasharray="3 3" label={t('pages:heartRate.heartRateChart.referenceLines.normalDiastolicBP')} />
                            <ReferenceLine yAxisId="bloodPressure" y={HIGH_BP_SYST} stroke="#dc2626" strokeDasharray="3 3" label={t('pages:heartRate.heartRateChart.referenceLines.highSystolicBP')} />
                            <ReferenceLine yAxisId="bloodPressure" y={HIGH_BP_DIAST} stroke="#dc2626" strokeDasharray="3 3" label={t('pages:heartRate.heartRateChart.referenceLines.highDiastolicBP')} />
                          </>
                        )}
                        <Line
                          yAxisId="heartRate"
                          type="monotone"
                          dataKey="heart_rate"
                          stroke="#ec4899"
                          strokeWidth={2}
                          dot={{ fill: '#ec4899', strokeWidth: 2, r: 4 }}
                          activeDot={{ r: 6 }}
                        />
                        <Line
                          yAxisId="bloodPressure"
                          type="monotone"
                          dataKey="bp_syst"
                          stroke="#ef4444"
                          strokeWidth={2}
                          dot={{ fill: '#ef4444', strokeWidth: 2, r: 3 }}
                          activeDot={{ r: 5 }}
                        />
                        <Line
                          yAxisId="bloodPressure"
                          type="monotone"
                          dataKey="bp_diast"
                          stroke="#3b82f6"
                          strokeWidth={2}
                          dot={{ fill: '#3b82f6', strokeWidth: 2, r: 3 }}
                          activeDot={{ r: 5 }}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              ) : (
                <div className="h-80 flex items-center justify-center text-muted-foreground">
                  <div className="text-center">
                    <Heart className="mx-auto h-12 w-12 mb-4 opacity-50" />
                    <p>{t('pages:heartRate.heartRateChart.noData', { date: getDateString() })}</p>
                    <div className="text-sm space-y-1">
                      <p>{t('pages:heartRate.heartRateChart.cloudSimulatorCheck')}</p>
                      <p>{t('pages:heartRate.heartRateChart.selectValidDevice')}</p>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* 心率記錄 */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Clock className="mr-2 h-5 w-5" />
                {t('pages:heartRate.heartRateRecords.title')}
                {selectedCloudDevice && (
                  <span className="ml-2 text-sm font-normal text-pink-600">
                    - {(() => {
                      const device = cloudDevices.find(d => d.MAC === selectedCloudDevice)
                      return device?.residentName
                        ? `${device.residentName} (${device.residentRoom})`
                        : device?.deviceName || t('pages:heartRate.heartRateChart.cloudDevice')
                    })()}
                  </span>
                )}
              </CardTitle>
              <div className="flex gap-4 pt-4">
                <div className="flex gap-2">
                  <Button
                    variant={recordFilter === "all" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setRecordFilter("all")}
                  >
                    {t('pages:heartRate.heartRateRecords.filters.all')}
                  </Button>
                  <Button
                    variant={recordFilter === "high" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setRecordFilter("high")}
                    className="text-red-600 border-red-600 hover:bg-red-50"
                  >
                    {t('pages:heartRate.heartRateRecords.filters.high')}
                  </Button>
                  <Button
                    variant={recordFilter === "low" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setRecordFilter("low")}
                    className="text-blue-600 border-blue-600 hover:bg-blue-50"
                  >
                    {t('pages:heartRate.heartRateRecords.filters.low')}
                  </Button>
                  <Button
                    variant={recordFilter === "highBP" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setRecordFilter("highBP")}
                    className="text-red-600 border-red-600 hover:bg-red-50"
                  >
                    {t('pages:heartRate.heartRateRecords.filters.highBP')}
                  </Button>
                  <Button
                    variant={recordFilter === "lowBP" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setRecordFilter("lowBP")}
                    className="text-purple-600 border-purple-600 hover:bg-purple-50"
                  >
                    {t('pages:heartRate.heartRateRecords.filters.lowBP')}
                  </Button>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant={timeRange === "1day" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setTimeRange("1day")}
                  >
                    {t('pages:heartRate.heartRateRecords.timeRanges.1day')}
                  </Button>
                  <Button
                    variant={timeRange === "3day" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setTimeRange("3day")}
                  >
                    {t('pages:heartRate.heartRateRecords.timeRanges.3day')}
                  </Button>
                  <Button
                    variant={timeRange === "7day" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setTimeRange("7day")}
                  >
                    {t('pages:heartRate.heartRateRecords.timeRanges.7day')}
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
                        <div className={`p-2 rounded-full ${record.heart_rate > NORMAL_HEART_RATE_MAX
                          ? 'bg-red-100 text-red-600'
                          : record.heart_rate < NORMAL_HEART_RATE_MIN
                            ? 'bg-blue-100 text-blue-600'
                            : 'bg-green-100 text-green-600'
                          }`}>
                          {record.isAbnormal ? (
                            <AlertTriangle className="h-4 w-4" />
                          ) : (
                            <Heart className="h-4 w-4" />
                          )}
                        </div>
                        <div>
                          <div className="font-medium">{record.datetime.toLocaleString('zh-TW')}</div>
                          <div className="text-sm text-muted-foreground">
                            {record.heart_rate > 0 ? `${record.heart_rate} BPM` : t('pages:heartRate.heartRateRecords.noHeartRateData')}
                            {record.temperature && record.temperature > 0 && (
                              <span className="ml-2">| {t('pages:heartRate.heartRateRecords.temperature')}: {record.temperature}°C</span>
                            )}
                            {(record.bp_syst && record.bp_syst > 0) && (record.bp_diast && record.bp_diast > 0) && (
                              <span className="ml-2">| {t('pages:heartRate.heartRateRecords.bloodPressure')}: {record.bp_syst}/{record.bp_diast} mmHg</span>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className={`px-3 py-1 rounded-full text-sm font-medium ${record.heart_rate === 0
                        ? 'bg-gray-100 text-gray-700'
                        : record.heart_rate > NORMAL_HEART_RATE_MAX
                          ? 'bg-red-100 text-red-700'
                          : record.heart_rate < NORMAL_HEART_RATE_MIN
                            ? 'bg-blue-100 text-blue-700'
                            : 'bg-green-100 text-green-700'
                        }`}>
                        {record.heart_rate === 0
                          ? t('pages:heartRate.heartRateRecords.noHeartRateData')
                          : record.heart_rate > NORMAL_HEART_RATE_MAX
                            ? t('pages:heartRate.heartRateRecords.heartRateHigh')
                            : record.heart_rate < NORMAL_HEART_RATE_MIN
                              ? t('pages:heartRate.heartRateRecords.heartRateLow')
                              : t('pages:heartRate.heartRateRecords.normal')}
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <Clock className="mx-auto h-8 w-8 mb-2 opacity-50" />
                    <p>{t('pages:heartRate.heartRateRecords.noRecords')}</p>
                    {!selectedCloudDevice && (
                      <p className="text-sm mt-2">{t('pages:heartRate.heartRateRecords.selectCloudDeviceFirst')}</p>
                    )}
                    {selectedCloudDevice && currentCloudDeviceRecords.length === 0 && (
                      <p className="text-sm mt-2">{t('pages:heartRate.heartRateRecords.selectedDeviceNoData')}</p>
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
