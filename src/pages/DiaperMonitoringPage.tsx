import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts'
import {
  AlertTriangle,
  User,
  Droplets,
  Clock,
  Battery,
  Thermometer,
  AlertCircle,
  Heart,
  MapPin,
  Baby,
  Activity,
  Watch,
  Settings,
  TrendingUp
} from "lucide-react"
import { useLocation } from "react-router-dom"
import { useUWBLocation } from "@/contexts/UWBLocationContext"
import { useDeviceManagement } from "@/contexts/DeviceManagementContext"
import { DeviceType } from "@/types/device-types"
import { useTranslation } from "react-i18next"
import { mqttBus } from "@/services/mqttBus"

// 尿布狀態定義
const DIAPER_STATUS = {
  DRY: { label: "乾燥", color: "bg-green-100 text-green-700", value: 0 },
  SLIGHTLY_WET: { label: "微濕", color: "bg-gray-100 text-gray-700", value: 1 },
  WET: { label: "潮濕", color: "bg-orange-100 text-orange-700", value: 2 },
  VERY_WET: { label: "非常潮濕", color: "bg-red-100 text-red-700", value: 3 },
  SOILED: { label: "髒污", color: "bg-purple-100 text-purple-700", value: 4 }
}

// 護理人員列表
const NURSES = [
  { id: "nurse_a", name: "護工A" },
  { id: "nurse_b", name: "護工B" },
  { id: "nurse_c", name: "護工C" },
  { id: "nurse_d", name: "護工D" }
]

// 模擬患者數據
const MOCK_PATIENTS = [
  {
    id: "patient_001",
    name: "張三",
    deviceMAC: "E0:0E:08:36:93:F8",
    deviceName: "DV1_3693F8",
    currentHumidity: 75.1,
    temperature: 33.5,
    batteryLevel: 86,
    lastUpdate: new Date(),
    records: [
      {
        id: "1",
        timestamp: "2024-06-23 04:02",
        status: DIAPER_STATUS.WET,
        nurse: "護工A",
        humidity: 78.2
      },
      {
        id: "2",
        timestamp: "2024-06-23 03:55",
        status: DIAPER_STATUS.DRY,
        nurse: "護工A",
        humidity: 45.1
      },
      {
        id: "3",
        timestamp: "2024-06-22 21:21",
        status: DIAPER_STATUS.WET,
        nurse: "護工B",
        humidity: 76.8
      }
    ]
  },
  {
    id: "patient_002",
    name: "李四",
    deviceMAC: "E0:0E:08:36:94:A2",
    deviceName: "DV2_3694A2",
    currentHumidity: 45.3,
    temperature: 34.1,
    batteryLevel: 92,
    lastUpdate: new Date(),
    records: [
      {
        id: "4",
        timestamp: "2024-06-23 02:15",
        status: DIAPER_STATUS.DRY,
        nurse: "護工C",
        humidity: 42.1
      }
    ]
  },
  {
    id: "patient_003",
    name: "王五",
    deviceMAC: "E0:0E:08:36:95:B3",
    deviceName: "DV3_3695B3",
    currentHumidity: 82.7,
    temperature: 33.8,
    batteryLevel: 78,
    lastUpdate: new Date(),
    records: [
      {
        id: "5",
        timestamp: "2024-06-23 01:30",
        status: DIAPER_STATUS.VERY_WET,
        nurse: "護工A",
        humidity: 85.2
      }
    ]
  }
]

interface DiaperRecord {
  id: string
  timestamp: string
  status: typeof DIAPER_STATUS[keyof typeof DIAPER_STATUS]
  nurse: string
  humidity: number
}

// 濕度趨勢圖數據點類型
type HumidityChartDataPoint = {
  time: string
  hour: string
  humidity: number
  isAbnormal: boolean
}

// 溫度趨勢圖數據點類型
type TemperatureChartDataPoint = {
  time: string
  hour: string
  temperature: number
  isAbnormal: boolean
}

interface Patient {
  id: string
  name: string
  deviceMAC: string
  deviceName: string
  currentHumidity: number
  temperature: number
  batteryLevel: number
  lastUpdate: Date
  records: DiaperRecord[]
}

// 雲端尿布設備記錄類型 - 添加病患資訊
type CloudDiaperRecord = {
  MAC: string
  deviceName: string
  name: string
  fw_ver: number
  temp: number // 溫度
  humi: number // 濕度（關鍵字段）
  button: number
  msg_idx: number
  ack: number
  battery_level: number // 電量%
  serial_no: number
  time: string
  datetime: Date
  isAbnormal: boolean // humi > 75 時為 true

  // 新增病患相關資訊
  residentId?: string
  residentName?: string
  residentRoom?: string
  residentStatus?: string
  deviceType?: DeviceType
}

// 雲端尿布設備類型 - 添加病患資訊
type CloudDiaperDevice = {
  MAC: string
  deviceName: string
  name: string
  lastSeen: Date
  recordCount: number
  currentHumidity: number
  currentTemperature: number
  currentBatteryLevel: number

  // 新增病患相關資訊
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

  // 尿布數據字段 (diaper DV1)
  name?: string
  fw_ver?: string
  temp?: string
  humi?: string
  button?: string
  msg_idx?: string
  ack?: string
  battery_level?: string
  serial_no?: string

  // 健康數據字段（其他設備）
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
}

// 根據患者名稱獲取患者ID
const getPatientIdByName = (patientName: string): string => {
  const patient = MOCK_PATIENTS.find(p => p.name === patientName)
  return patient ? patient.id : MOCK_PATIENTS[0].id // 默認返回第一個患者
}

export default function DiaperMonitoringPage() {
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

  // 使用 DeviceManagementContext 獲取病患和設備資訊
  const {
    devices,
    getResidentForDevice
  } = useDeviceManagement()

  // ✅ 恢復舊版本的狀態管理方式
  const [cloudDiaperDevices, setCloudDiaperDevices] = useState<any[]>([])
  const [cloudDiaperRecords, setCloudDiaperRecords] = useState<any[]>([])

  // 原始 MQTT 數據狀態
  const [cloudMqttData, setCloudMqttData] = useState<any[]>([])

  // 保留原有的患者和記錄功能
  const [patients, setPatients] = useState<Patient[]>(MOCK_PATIENTS)
  const [selectedPatient] = useState<string>(() => {
    return patientName ? getPatientIdByName(patientName) : MOCK_PATIENTS[0].id
  })
  const [selectedTab, setSelectedTab] = useState("today")
  const [autoNotification, setAutoNotification] = useState(true)
  const [showRecordModal, setShowRecordModal] = useState(false)
  const [recordForm, setRecordForm] = useState({
    status: DIAPER_STATUS.DRY.value,
    nurse: "nurse_a"
  })

  // 雲端設備管理狀態
  const [selectedCloudDevice, setSelectedCloudDevice] = useState<string>("")

  // ✅ MQTT Bus 連接狀態
  const [cloudConnected, setCloudConnected] = useState(false)
  const [cloudConnectionStatus, setCloudConnectionStatus] = useState<string>(t('common:connection.disconnected'))

  // 參考線顯示狀態
  const [showReferenceLines, setShowReferenceLines] = useState<boolean>(true)

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

  // 根據MAC地址查找對應的病患資訊
  const getResidentInfoByMAC = (mac: string) => {
    // 查找設備
    const device = devices.find(d => {
      // 檢查hardwareId是否匹配MAC
      if (d.hardwareId === mac) {
        return true
      }
      // 檢查deviceUid是否包含MAC
      if (d.deviceUid.includes(mac)) {
        return true
      }
      return false
    })

    if (device) {
      // 獲取綁定的病患資訊
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

  // 獲取設備類型圖標
  const getDeviceTypeIcon = (deviceType?: DeviceType) => {
    if (!deviceType) return Settings
    switch (deviceType) {
      case DeviceType.SMARTWATCH_300B: return Watch
      case DeviceType.DIAPER_SENSOR: return Baby
      case DeviceType.PEDOMETER: return Activity
      case DeviceType.UWB_TAG: return MapPin
      default: return Settings
    }
  }

  // 獲取病患狀態資訊
  const getStatusInfo = (status?: string) => {
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

  // ✅ 修復頻率問題 - 只在有新消息時更新
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
          // 尿布數據字段
          name: msg.payload?.name || '',
          fw_ver: msg.payload?.['fw ver'] || '',
          temp: msg.payload?.temp || '',
          humi: msg.payload?.humi || '',
          button: msg.payload?.button || '',
          msg_idx: msg.payload?.['msg idx'] || '',
          ack: msg.payload?.ack || '',
          battery_level: msg.payload?.['battery level'] || '',
          serial_no: msg.payload?.['serial no'] || '',
          // 健康數據字段（其他設備）
          SOS: msg.payload?.SOS || '',
          hr: msg.payload?.hr || '',
          SpO2: msg.payload?.SpO2 || '',
          bp_syst: msg.payload?.['bp syst'] || '',
          bp_diast: msg.payload?.['bp diast'] || '',
          skin_temp: msg.payload?.['skin temp'] || '',
          room_temp: msg.payload?.['room temp'] || '',
          steps: msg.payload?.steps || '',
          light_sleep: msg.payload?.['light sleep (min)'] || '',
          deep_sleep: msg.payload?.['deep sleep (min)'] || '',
          wake_time: msg.payload?.['wake time'] || '',
          move: msg.payload?.move || '',
          wear: msg.payload?.wear || ''
        }))

        // ✅ 只顯示尿布相關的 MQTT 數據 (僅 diaper DV1 設備)
        const diaperData = formattedData.filter(data =>
          data.content === 'diaper DV1'
        )

        // 只添加新的尿布數據
        if (diaperData.length > 0) {
          setCloudMqttData(prev => {
            const combined = [...diaperData, ...prev]
              .sort((a, b) => b.receivedAt.getTime() - a.receivedAt.getTime())
              .slice(0, 50) // 限制總數
            return combined
          })
        }

        // ✅ 只處理尿布相關的數據 (diaper DV1 設備)
        const diaperMessages = newMessages.filter(msg => {
          const isDiaperMessage = msg.payload?.content === 'diaper DV1' && msg.payload?.MAC
          if (isDiaperMessage) {
            console.log('✅ 處理 diaper DV1 尿布消息:', {
              MAC: msg.payload?.MAC,
              topic: msg.topic,
              gateway: msg.gateway?.name
            })
          } else {
            console.log('⏭️ 跳過非尿布消息:', {
              content: msg.payload?.content,
              MAC: msg.payload?.MAC,
              topic: msg.topic
            })
          }
          return isDiaperMessage
        })

        diaperMessages.forEach(msg => {
          const data = msg.payload
          const MAC = data.MAC || data['mac address'] || data.macAddress

          if (MAC) {
            const humi = parseFloat(data.humi) || 0
            const temp = parseFloat(data.temp) || 0
            const fw_ver = parseFloat(data['fw ver']) || 0
            const button = parseInt(data.button) || 0
            const msg_idx = parseInt(data['msg idx']) || 0
            const ack = parseInt(data.ack) || 0
            const battery_level = parseInt(data['battery level']) || 0
            const serial_no = parseInt(data['serial no']) || 0

            // 獲取病患資訊
            const residentInfo = getResidentInfoByMAC(MAC)

            // 創建設備記錄
            const cloudDiaperRecord = {
              MAC: MAC,
              deviceName: data.name || `設備 ${MAC.slice(-8)}`,
              name: data.name || "",
              fw_ver: fw_ver,
              temp: temp,
              humi: humi,
              button: button,
              msg_idx: msg_idx,
              ack: ack,
              battery_level: battery_level,
              serial_no: serial_no,
              time: msg.timestamp.toISOString(),
              datetime: msg.timestamp, // 使用實際的 MQTT 時間戳
              isAbnormal: humi > 65, // 關鍵邏輯：濕度 > 65 時需要更換
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
            setCloudDiaperRecords(prev => {
              const newRecords = [cloudDiaperRecord, ...prev]
                .sort((a, b) => b.datetime.getTime() - a.datetime.getTime())
                .slice(0, 1000)
              return newRecords
            })

            // 更新設備列表
            setCloudDiaperDevices(prev => {
              const existingDevice = prev.find(d => d.MAC === MAC)

              if (existingDevice) {
                return prev.map(d =>
                  d.MAC === MAC
                    ? {
                      ...d,
                      lastSeen: msg.timestamp, // 使用實際的 MQTT 時間戳
                      recordCount: d.recordCount + 1,
                      currentHumidity: humi,
                      currentTemperature: temp,
                      currentBatteryLevel: battery_level,
                      // 更新病患資訊
                      ...residentInfo
                    }
                    : d
                )
              } else {
                const newDevice = {
                  MAC: MAC,
                  deviceName: data.name || `設備 ${MAC.slice(-8)}`,
                  name: data.name || "",
                  lastSeen: msg.timestamp, // 使用實際的 MQTT 時間戳
                  recordCount: 1,
                  currentHumidity: humi,
                  currentTemperature: temp,
                  currentBatteryLevel: battery_level,
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
      setCloudConnectionStatus(status === 'connected' ? t('pages:diaperMonitoring.connectionStatus.connected') :
        status === 'connecting' ? t('pages:diaperMonitoring.connectionStatus.connecting') :
          status === 'reconnecting' ? t('pages:diaperMonitoring.connectionStatus.reconnecting') :
            status === 'error' ? t('pages:diaperMonitoring.connectionStatus.connectionError') : t('pages:diaperMonitoring.connectionStatus.disconnected'))
    })

    // 初始化狀態
    const currentStatus = mqttBus.getStatus()
    setCloudConnected(currentStatus === 'connected')
    setCloudConnectionStatus(currentStatus === 'connected' ? t('pages:diaperMonitoring.connectionStatus.connected') : t('pages:diaperMonitoring.connectionStatus.disconnected'))

    return unsubscribe
  }, [])

  // ✅ Gateway 切換時清除設備選擇
  useEffect(() => {
    setSelectedCloudDevice('')
  }, [selectedGateway])

  const currentPatient = patients.find(p => p.id === selectedPatient) || patients[0]

  // 獲取當前雲端設備的狀態，用於判斷是否需要換尿布
  const currentCloudDevice = selectedCloudDevice && cloudDiaperDevices.length > 0
    ? cloudDiaperDevices.find(device => device.MAC === selectedCloudDevice)
    : null

  // ✅ 簡化：只使用雲端數據判斷是否需要更換尿布
  const needsChange = currentCloudDevice ? currentCloudDevice.currentHumidity > 75 : false

  // ✅ 簡化：只使用雲端設備的濕度記錄
  const currentCloudHumidityRecords: HumidityChartDataPoint[] = selectedCloudDevice && cloudDiaperRecords.length > 0
    ? cloudDiaperRecords
      .filter(record => record.MAC === selectedCloudDevice)
      .map(record => ({
        time: record.time,
        hour: record.datetime.toLocaleTimeString('zh-TW', { hour: '2-digit', minute: '2-digit' }),
        humidity: record.humi || 0,
        isAbnormal: record.humi > 75
      }))
    : []

  // 準備濕度趨勢圖數據
  const humidityChartData: HumidityChartDataPoint[] = currentCloudHumidityRecords
    .slice(0, 144) // 24小時 * 6個點/小時 = 144個數據點
    .reverse()
    .map(record => ({
      time: record.time,
      hour: record.hour,
      humidity: record.humidity,
      isAbnormal: record.humidity > 75
    }))

  // ✅ 簡化：只使用雲端設備的溫度記錄
  const currentCloudTemperatureRecords: TemperatureChartDataPoint[] = selectedCloudDevice && cloudDiaperRecords.length > 0
    ? cloudDiaperRecords
      .filter(record => record.MAC === selectedCloudDevice)
      .map(record => ({
        time: record.time,
        hour: record.datetime.toLocaleTimeString('zh-TW', { hour: '2-digit', minute: '2-digit' }),
        temperature: record.temp || 0,
        isAbnormal: record.temp > 40 || record.temp < 30 // 溫度異常範圍：30-40°C
      }))
    : []

  // 準備溫度趨勢圖數據
  const temperatureChartData: TemperatureChartDataPoint[] = currentCloudTemperatureRecords
    .slice(0, 144) // 24小時 * 6個點/小時 = 144個數據點
    .reverse()
    .map(record => ({
      time: record.time,
      hour: record.hour,
      temperature: record.temperature,
      isAbnormal: record.temperature > 40 || record.temperature < 30
    }))



  // 處理記錄尿布更換
  const handleRecordChange = () => {
    const selectedStatus = Object.values(DIAPER_STATUS).find(s => s.value === recordForm.status) || DIAPER_STATUS.DRY
    const selectedNurse = NURSES.find(n => n.id === recordForm.nurse) || NURSES[0]

    const newRecord: DiaperRecord = {
      id: Date.now().toString(),
      timestamp: new Date().toLocaleString('zh-TW', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
      }).replace(/\//g, '-'),
      status: selectedStatus,
      nurse: selectedNurse.name,
      humidity: currentPatient.currentHumidity
    }

    setPatients(prev => prev.map(p =>
      p.id === selectedPatient
        ? { ...p, records: [newRecord, ...p.records] }
        : p
    ))

    setShowRecordModal(false)
    setRecordForm({ status: DIAPER_STATUS.DRY.value, nurse: "nurse_a" })
  }

  // 計算時間差
  const getTimeDifference = (lastUpdate: Date) => {
    const now = new Date()
    const diffMs = now.getTime() - lastUpdate.getTime()
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
    const diffMinutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60))
    return `${diffHours} 小時 ${diffMinutes} 分鐘前`
  }

  // 獲取選中日期的字符串
  const getDateString = () => {
    const now = new Date()
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())

    switch (selectedTab) {
      case "today":
        return today.toLocaleDateString('zh-TW')
      case "week":
        const weekStart = new Date(today.getTime() - (today.getDay() * 24 * 60 * 60 * 1000))
        return `${weekStart.toLocaleDateString('zh-TW')} - ${today.toLocaleDateString('zh-TW')}`
      case "month":
        const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
        return `${monthStart.toLocaleDateString('zh-TW')} - ${today.toLocaleDateString('zh-TW')}`
      default:
        return today.toLocaleDateString('zh-TW')
    }
  }

  return (
    <div className="space-y-6">
      {/* 頁面標題 */}
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold flex items-center">
          <Droplets className="mr-3 h-8 w-8 text-blue-500" />
          {t('pages:diaperMonitoring.title')}
        </h1>
        {patientName && (
          <div className="mb-3 p-3 bg-purple-50 border border-purple-200 rounded-lg">
            <p className="text-purple-800 text-sm font-medium">
              👶 {t('pages:diaperMonitoring.navigationFromHealth')} - {t('pages:diaperMonitoring.currentPatient')}: {patientName}
            </p>
          </div>
        )}
        <p className="text-muted-foreground">
          {t('pages:diaperMonitoring.subtitle')}
        </p>
        <div className="text-sm space-y-2 bg-gray-50 p-4 rounded-lg">
          <div className="font-semibold">{t('pages:diaperMonitoring.connectionStatus.title')}</div>
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <span>{t('pages:diaperMonitoring.connectionStatus.cloudMqtt')}:</span>
              <span className={cloudConnected ? "text-green-600 font-medium" : "text-red-500 font-medium"}>
                {cloudConnected ? t('pages:diaperMonitoring.connectionStatus.connected') : t('pages:diaperMonitoring.connectionStatus.disconnected')}
              </span>
            </div>
          </div>
          <div className="text-xs text-gray-500">
            {t('pages:diaperMonitoring.connectionStatus.hint')}
          </div>
        </div>
      </div>

      {/* ✅ 簡化：直接顯示雲端設備監控，移除標籤頁 */}
      {/* 設備選擇和狀態 */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg flex items-center">
              <Droplets className="mr-3 h-5 w-5 text-blue-500" />
              {t('pages:diaperMonitoring.cloudDeviceMonitoring.title')}
            </CardTitle>
            <div className="text-sm">
              {cloudConnected ? (
                <span className="text-green-600 flex items-center">
                  <div className="w-2 h-2 bg-green-500 rounded-full mr-2 animate-pulse"></div>
                  {t('pages:diaperMonitoring.cloudDeviceMonitoring.connected')}
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
              <div className="font-medium text-gray-900">{t('pages:diaperMonitoring.cloudDeviceMonitoring.selectArea')}</div>

              {/* 橫排選擇器 */}
              <div className="flex flex-col sm:flex-row gap-4">
                {/* 養老院選擇 */}
                <div className="flex-1 space-y-2">
                  <label className="text-sm font-medium text-gray-700">{t('pages:diaperMonitoring.cloudDeviceMonitoring.selectNursingHome')}</label>
                  <Select value={selectedHome} onValueChange={setSelectedHome}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder={t('pages:diaperMonitoring.cloudDeviceMonitoring.selectNursingHomeFirst')} />
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
                  <label className="text-sm font-medium text-gray-700">{t('pages:diaperMonitoring.cloudDeviceMonitoring.selectFloor')}</label>
                  <Select value={selectedFloor} onValueChange={setSelectedFloor} disabled={!selectedHome}>
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
                  <label className="text-sm font-medium text-gray-700">{t('pages:diaperMonitoring.cloudDeviceMonitoring.selectGateway')}</label>
                  <Select value={selectedGateway} onValueChange={setSelectedGateway} disabled={!selectedFloor}>
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

              {/* 當前選擇的閘道器信息 */}
              {selectedGateway && (
                <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                  <div className="text-sm space-y-1">
                    <div className="font-medium text-blue-800">{t('pages:diaperMonitoring.cloudDeviceMonitoring.currentGateway')}</div>
                    <div className="text-xs text-blue-700">
                      {gateways.find(gw => gw.id === selectedGateway)?.name}
                      ({gateways.find(gw => gw.id === selectedGateway)?.macAddress})
                    </div>
                    <div className="text-xs text-blue-600">
                      {t('pages:diaperMonitoring.cloudDeviceMonitoring.listeningTopic')}: {getHealthTopic() || t('pages:diaperMonitoring.cloudDeviceMonitoring.cannotGetTopic')}
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
              <div className="bg-blue-50 p-3 rounded-lg">
                <div className="font-medium text-blue-800">{t('pages:diaperMonitoring.cloudDeviceMonitoring.discoveredDevices')}</div>
                <div className="text-2xl font-bold text-blue-600">{cloudDiaperDevices.length}</div>
              </div>
              <div className="bg-green-50 p-3 rounded-lg">
                <div className="font-medium text-green-800">{t('pages:diaperMonitoring.cloudDeviceMonitoring.totalRecords')}</div>
                <div className="text-2xl font-bold text-green-600">{cloudDiaperRecords.length}</div>
              </div>
              <div className="bg-purple-50 p-3 rounded-lg">
                <div className="font-medium text-purple-800">{t('pages:diaperMonitoring.cloudDeviceMonitoring.mqttMessages')}</div>
                <div className="text-2xl font-bold text-purple-600">{cloudMqttData.length}</div>
              </div>
            </div>

            {cloudDiaperDevices.length > 0 ? (
              <div className="space-y-3">
                <div className="font-medium">{t('pages:diaperMonitoring.cloudDeviceMonitoring.selectDevice')}</div>
                <div className="border rounded-lg divide-y max-h-[520px] overflow-y-auto">
                  {cloudDiaperDevices
                    .filter(device => {
                      // ✅ 如果選擇了 Gateway，只顯示該 Gateway 的設備
                      if (selectedGateway) {
                        const gateway = gateways.find(gw => gw.id === selectedGateway)
                        if (gateway) {
                          const deviceRecords = cloudDiaperRecords.filter(record => record.MAC === device.MAC)
                          // 🎯 使用與 HeartRatePage 相同的篩選邏輯：前綴匹配
                          const hasMatchingRecord = deviceRecords.some(record => {
                            const recordGatewayPrefix = record.gateway?.split('_')[0] || ''
                            const selectedGatewayPrefix = gateway.name?.split('_')[0] || ''
                            return recordGatewayPrefix && selectedGatewayPrefix && recordGatewayPrefix === selectedGatewayPrefix
                          })
                          return hasMatchingRecord
                        }
                      }
                      // 如果沒有選擇 Gateway，顯示所有設備
                      return true
                    })
                    .map(device => {
                      const DeviceIcon = getDeviceTypeIcon(device.deviceType)
                      const statusInfo = getStatusInfo(device.residentStatus)
                      const isSelected = selectedCloudDevice === device.MAC
                      return (
                        <button
                          key={device.MAC}
                          onClick={() => setSelectedCloudDevice(device.MAC)}
                          className={`w-full text-left px-3 py-2 flex items-center justify-between hover:bg-blue-50 transition ${isSelected ? 'bg-blue-50 border-l-4 border-blue-400' : ''}`}
                          aria-pressed={isSelected}
                        >
                          <div className="flex items-center gap-2">
                            <DeviceIcon className="h-4 w-4" />
                            <span>{device.residentName ? device.residentName : device.deviceName}</span>
                            {device.residentRoom && (
                              <span className="text-xs text-muted-foreground">
                                ({device.residentRoom})
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            {statusInfo.badge}
                            <span className="text-xs text-muted-foreground">
                              {t('pages:diaperMonitoring.cloudDeviceMonitoring.humidity')}: {device.currentHumidity}%
                            </span>
                          </div>
                        </button>
                      )
                    })}
                </div>
                <div className="text-xs text-muted-foreground">{t('common:actions.scrollForMore') || t('common:actions.view')}</div>
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <Droplets className="mx-auto h-8 w-8 mb-2 opacity-50" />
                <p className="font-medium">{t('pages:diaperMonitoring.cloudDeviceMonitoring.noDevices')}</p>
                <div className="text-xs space-y-1 mt-2">
                  <p>{t('pages:diaperMonitoring.cloudDeviceMonitoring.pleaseConfirm')}</p>
                  <p>1. {t('pages:diaperMonitoring.cloudDeviceMonitoring.cloudMqttSimulator')}</p>
                  <p>2. {t('pages:diaperMonitoring.cloudDeviceMonitoring.simulatorFormat')}</p>
                  <p>3. {t('pages:diaperMonitoring.cloudDeviceMonitoring.dataFields')}</p>
                </div>
              </div>
            )}

            {/* 最近接收到的雲端數據 */}
            {cloudMqttData.length > 0 && (
              <div className="mt-6 space-y-2">
                <div className="font-medium">{t('pages:diaperMonitoring.cloudDeviceMonitoring.recentData')}</div>
                <div className="max-h-40 overflow-y-auto space-y-1">
                  {cloudMqttData.slice(0, 8).map((data, index) => {
                    const residentInfo = getResidentInfoByMAC(data.MAC)

                    return (
                      <div key={index} className="text-xs bg-gray-50 p-2 rounded border">
                        <div className="flex items-center justify-between">
                          <span className="font-mono font-semibold text-blue-600">{data.content}</span>
                          <span className="text-muted-foreground">
                            {data.receivedAt.toLocaleTimeString('zh-TW')}
                          </span>
                        </div>
                        {data.MAC && data.content === "diaper DV1" && (
                          <div className="text-muted-foreground mt-1">
                            <div className="flex items-center gap-2">
                              <span>{t('pages:diaperMonitoring.cloudDeviceMonitoring.device')}: <span className="font-mono">{data.MAC}</span></span>
                              {residentInfo && (
                                <span className="text-green-600 font-medium">
                                  → {residentInfo.residentName} ({residentInfo.residentRoom})
                                </span>
                              )}
                            </div>
                            {data.name && `${t('pages:diaperMonitoring.cloudDeviceMonitoring.deviceName')}: ${data.name}`}
                            {data.humi && ` | ${t('pages:diaperMonitoring.cloudDeviceMonitoring.humidity')}: ${data.humi}%`}
                            {data.temp && ` | ${t('pages:diaperMonitoring.cloudDeviceMonitoring.temperature')}: ${data.temp}°C`}
                            {data.battery_level && ` | ${t('pages:diaperMonitoring.cloudDeviceMonitoring.battery')}: ${data.battery_level}%`}
                          </div>
                        )}
                        {data.content !== "diaper DV1" && (
                          <div className="text-muted-foreground mt-1">
                            其他設備數據 - MAC: {data.MAC || "無"}
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {/* 原始數據檢視器 - 用於調試 */}
            <div className="mt-6">
              <details className="group">
                <summary className="cursor-pointer font-medium text-sm text-muted-foreground hover:text-foreground">
                  🔍 {t('pages:diaperMonitoring.cloudDeviceMonitoring.viewRawData')}
                </summary>
                <div className="mt-2 space-y-2 text-xs">
                  <div className="text-muted-foreground">
                    {t('pages:diaperMonitoring.cloudDeviceMonitoring.clickToExpand')}
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
                            name: data.name,
                            fw_ver: data.fw_ver,
                            temp: data.temp,
                            humi: data.humi,
                            button: data.button,
                            msg_idx: data.msg_idx,
                            ack: data.ack,
                            battery_level: data.battery_level,
                            serial_no: data.serial_no,
                            // 其他設備字段
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
                            wear: data.wear
                          }, null, 2)}
                        </pre>
                      </details>
                    ))}
                  </div>
                  <div className="text-xs text-amber-600 bg-amber-50 p-2 rounded border border-amber-200">
                    <div className="font-semibold mb-1">{t('pages:diaperMonitoring.cloudDeviceMonitoring.deviceCreationConditions')}</div>
                    <div>• {t('pages:diaperMonitoring.cloudDeviceMonitoring.condition1')}</div>
                    <div>• {t('pages:diaperMonitoring.cloudDeviceMonitoring.condition2')}</div>
                    <div>• {t('pages:diaperMonitoring.cloudDeviceMonitoring.condition3')}</div>
                    <div>• {t('pages:diaperMonitoring.cloudDeviceMonitoring.condition4')}</div>
                  </div>
                </div>
              </details>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 雲端設備詳細記錄 */}
      {selectedCloudDevice && cloudDiaperRecords.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Clock className="mr-2 h-5 w-5" />
              {t('pages:diaperMonitoring.deviceDiaperData.title')} - {(() => {
                const device = cloudDiaperDevices.find(d => d.MAC === selectedCloudDevice)
                return device?.residentName ? `${device.residentName} (${device.residentRoom})` : device?.deviceName || t('pages:diaperMonitoring.deviceDiaperData.unknownDevice')
              })()}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {/* 設備記錄列表 */}
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {cloudDiaperRecords
                  .filter(record => record.MAC === selectedCloudDevice)
                  .slice(0, 20)
                  .map((record, index) => {
                    const DeviceIcon = getDeviceTypeIcon(record.deviceType)
                    const statusInfo = getStatusInfo(record.residentStatus)

                    return (
                      <div key={index} className="flex items-center justify-between p-3 rounded-lg border">
                        <div className="flex items-center gap-3">
                          <div className={`p-2 rounded-full ${record.humi > 75
                            ? 'bg-red-100 text-red-600'
                            : record.humi > 50
                              ? 'bg-orange-100 text-orange-600'
                              : 'bg-green-100 text-green-600'
                            }`}>
                            {record.isAbnormal ? (
                              <AlertTriangle className="h-4 w-4" />
                            ) : (
                              <Droplets className="h-4 w-4" />
                            )}
                          </div>
                          <div>
                            <div className="font-medium">
                              {record.datetime.toLocaleString('zh-TW')}
                            </div>
                            <div className="text-sm text-muted-foreground space-y-1">
                              <div className="flex items-center gap-2">
                                <DeviceIcon className="h-3 w-3" />
                                <span>
                                  {record.residentName ? record.residentName : record.deviceName}
                                </span>
                                {record.residentRoom && (
                                  <span className="text-xs text-muted-foreground">
                                    ({record.residentRoom})
                                  </span>
                                )}
                                {statusInfo.badge}
                              </div>
                              <div>
                                {t('pages:diaperMonitoring.deviceDiaperData.humidity')}: {record.humi > 0 ? `${record.humi}%` : t('pages:diaperMonitoring.deviceDiaperData.noData')}
                                {record.temp > 0 && ` | ${t('pages:diaperMonitoring.deviceDiaperData.temperature')}: ${record.temp}°C`}
                              </div>
                              <div className="text-xs text-muted-foreground">
                                {t('pages:diaperMonitoring.deviceDiaperData.battery')}: {record.battery_level}% |
                                固件版本: {record.fw_ver} |
                                序列號: {record.serial_no}
                              </div>
                            </div>
                          </div>
                        </div>
                        <div className={`px-3 py-1 rounded-full text-sm font-medium ${record.humi === 0
                          ? 'bg-gray-100 text-gray-700'
                          : record.humi > 75
                            ? 'bg-red-100 text-red-700'
                            : record.humi > 50
                              ? 'bg-orange-100 text-orange-700'
                              : 'bg-green-100 text-green-700'
                          }`}>
                          {record.humi === 0
                            ? t('pages:diaperMonitoring.deviceDiaperData.noHumidityData')
                            : record.humi > 75
                              ? t('pages:diaperMonitoring.deviceDiaperData.needsChange')
                              : record.humi > 50
                                ? t('pages:diaperMonitoring.deviceDiaperData.wet')
                                : t('pages:diaperMonitoring.deviceDiaperData.normal')}
                        </div>
                      </div>
                    )
                  })}
              </div>

              {/* 顯示雲端設備統計信息 */}
              {currentCloudDevice && (
                <div className="mt-4 p-4 bg-blue-50 rounded-lg">
                  <div className="text-sm space-y-2">
                    <div className="font-semibold text-blue-800">{t('pages:diaperMonitoring.deviceDiaperData.deviceStats')}</div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
                      <div>
                        <span className="text-muted-foreground">{t('pages:diaperMonitoring.deviceDiaperData.deviceMAC')}:</span>
                        <div className="font-mono">{currentCloudDevice.MAC}</div>
                      </div>
                      <div>
                        <span className="text-muted-foreground">{t('pages:diaperMonitoring.deviceDiaperData.patientInfo')}:</span>
                        <div>
                          {currentCloudDevice.residentName ?
                            `${currentCloudDevice.residentName} (${currentCloudDevice.residentRoom})` :
                            t('pages:diaperMonitoring.deviceDiaperData.unboundPatient')
                          }
                        </div>
                      </div>
                      <div>
                        <span className="text-muted-foreground">{t('pages:diaperMonitoring.deviceDiaperData.lastConnection')}:</span>
                        <div>{currentCloudDevice.lastSeen.toLocaleString('zh-TW')}</div>
                      </div>
                      <div>
                        <span className="text-muted-foreground">{t('pages:diaperMonitoring.deviceDiaperData.totalRecords')}:</span>
                        <div>{currentCloudDevice.recordCount} 筆</div>
                      </div>
                    </div>
                    <div className="mt-2">
                      <span className="text-muted-foreground">{t('pages:diaperMonitoring.deviceDiaperData.currentStatus')}:</span>
                      <div className={currentCloudDevice.currentHumidity > 75 ? "text-red-600 font-medium" : "text-green-600"}>
                        {currentCloudDevice.currentHumidity > 75 ? t('pages:diaperMonitoring.deviceDiaperData.needsAttention') : t('pages:diaperMonitoring.deviceDiaperData.normal')}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* 時間範圍標籤 */}
      <Tabs value={selectedTab} onValueChange={setSelectedTab}>
        <TabsList>
          <TabsTrigger value="today">{t('pages:diaperMonitoring.dateTabs.today')}</TabsTrigger>
          <TabsTrigger value="week">{t('pages:diaperMonitoring.dateTabs.week')}</TabsTrigger>
          <TabsTrigger value="month">{t('pages:diaperMonitoring.dateTabs.month')}</TabsTrigger>
        </TabsList>

        <TabsContent value={selectedTab} className="mt-6 space-y-6">
          {/* 濕度趨勢圖 */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span className="flex items-center">
                  <TrendingUp className="mr-2 h-5 w-5" />
                  {t('pages:diaperMonitoring.humidityChart.title')}
                  {selectedCloudDevice && (
                    <span className="ml-2 text-sm font-normal text-blue-600">
                      - {(() => {
                        const device = cloudDiaperDevices.find(d => d.MAC === selectedCloudDevice)
                        return device?.residentName
                          ? `${device.residentName} (${device.residentRoom})`
                          : device?.deviceName || t('pages:diaperMonitoring.humidityChart.cloudDevice')
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
              {humidityChartData.length > 0 ? (
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={humidityChartData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis
                        dataKey="hour"
                        tick={{ fontSize: 12 }}
                        interval="preserveStartEnd"
                      />
                      <YAxis
                        domain={[0, 100]}
                        tick={{ fontSize: 12 }}
                        label={{ value: t('pages:diaperMonitoring.humidityChart.yAxisLabel'), angle: -90, position: 'insideLeft' }}
                      />
                      <Tooltip
                        labelFormatter={(value) => `${t('pages:diaperMonitoring.humidityChart.time')}: ${value}`}
                        formatter={(value) => [`${value}%`, t('pages:diaperMonitoring.humidityChart.humidity')]}
                      />
                      {showReferenceLines && (
                        <>
                          <ReferenceLine y={75} stroke="#ef4444" strokeDasharray="5 5" label={t('pages:diaperMonitoring.humidityChart.changeAlertLine')} />
                          <ReferenceLine y={50} stroke="#f59e0b" strokeDasharray="5 5" label={t('pages:diaperMonitoring.humidityChart.attentionLine')} />
                          <ReferenceLine y={25} stroke="#10b981" strokeDasharray="5 5" label={t('pages:diaperMonitoring.humidityChart.normalLine')} />
                        </>
                      )}
                      <Line
                        type="monotone"
                        dataKey="humidity"
                        stroke="#3b82f6"
                        strokeWidth={2}
                        dot={{ fill: '#3b82f6', strokeWidth: 2, r: 4 }}
                        activeDot={{ r: 6 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="h-80 flex items-center justify-center text-muted-foreground">
                  <div className="text-center">
                    <Droplets className="mx-auto h-12 w-12 mb-4 opacity-50" />
                    <p>{t('pages:diaperMonitoring.humidityChart.noData', { date: getDateString() })}</p>
                    <div className="text-sm space-y-1">
                      <p>{t('pages:diaperMonitoring.humidityChart.cloudSimulatorCheck')}</p>
                      <p>{t('pages:diaperMonitoring.humidityChart.selectValidDevice')}</p>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* 溫度趨勢圖 */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span className="flex items-center">
                  <Thermometer className="mr-2 h-5 w-5" />
                  {t('pages:diaperMonitoring.temperatureChart.title')}
                  {selectedCloudDevice && (
                    <span className="ml-2 text-sm font-normal text-orange-600">
                      - {(() => {
                        const device = cloudDiaperDevices.find(d => d.MAC === selectedCloudDevice)
                        return device?.residentName
                          ? `${device.residentName} (${device.residentRoom})`
                          : device?.deviceName || t('pages:diaperMonitoring.temperatureChart.cloudDevice')
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
              {temperatureChartData.length > 0 ? (
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={temperatureChartData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis
                        dataKey="hour"
                        tick={{ fontSize: 12 }}
                        interval="preserveStartEnd"
                      />
                      <YAxis
                        domain={[20, 50]}
                        tick={{ fontSize: 12 }}
                        label={{ value: t('pages:diaperMonitoring.temperatureChart.yAxisLabel'), angle: -90, position: 'insideLeft' }}
                      />
                      <Tooltip
                        labelFormatter={(value) => `${t('pages:diaperMonitoring.temperatureChart.time')}: ${value}`}
                        formatter={(value) => [`${value}°C`, t('pages:diaperMonitoring.temperatureChart.temperature')]}
                      />
                      {showReferenceLines && (
                        <>
                          <ReferenceLine y={40} stroke="#ef4444" strokeDasharray="5 5" label={t('pages:diaperMonitoring.temperatureChart.highTempLine')} />
                          <ReferenceLine y={35} stroke="#f59e0b" strokeDasharray="5 5" label={t('pages:diaperMonitoring.temperatureChart.warmLine')} />
                          <ReferenceLine y={30} stroke="#10b981" strokeDasharray="5 5" label={t('pages:diaperMonitoring.temperatureChart.normalLine')} />
                          <ReferenceLine y={25} stroke="#3b82f6" strokeDasharray="5 5" label={t('pages:diaperMonitoring.temperatureChart.coolLine')} />
                        </>
                      )}
                      <Line
                        type="monotone"
                        dataKey="temperature"
                        stroke="#f97316"
                        strokeWidth={2}
                        dot={{ fill: '#f97316', strokeWidth: 2, r: 4 }}
                        activeDot={{ r: 6 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="h-80 flex items-center justify-center text-muted-foreground">
                  <div className="text-center">
                    <Thermometer className="mx-auto h-12 w-12 mb-4 opacity-50" />
                    <p>{t('pages:diaperMonitoring.temperatureChart.noData', { date: getDateString() })}</p>
                    <div className="text-sm space-y-1">
                      <p>{t('pages:diaperMonitoring.temperatureChart.cloudSimulatorCheck')}</p>
                      <p>{t('pages:diaperMonitoring.temperatureChart.selectValidDevice')}</p>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* 當前尿布狀態 */}
          {needsChange && (
            <Card className="border-red-200 bg-red-50 dark:bg-red-900/20">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{t('pages:diaperMonitoring.currentDiaperStatus.title')}</span>
                    <div className="flex items-center gap-2">
                      <span>{t('pages:diaperMonitoring.currentDiaperStatus.autoNotification')}</span>
                      <Switch
                        checked={autoNotification}
                        onCheckedChange={setAutoNotification}
                      />
                    </div>
                  </div>
                </div>

                <div className="bg-white dark:bg-gray-800 rounded-lg p-4 space-y-4">
                  <div className="flex items-center gap-4">
                    <div className="bg-red-100 dark:bg-red-900/30 rounded-full p-3">
                      <AlertTriangle className="h-6 w-6 text-red-600" />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-red-600 mb-2">
                        {t('pages:diaperMonitoring.currentDiaperStatus.needsChange')}
                      </h3>
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <span className="text-sm">{t('pages:diaperMonitoring.currentDiaperStatus.humidity')}:</span>
                          <Progress
                            value={currentCloudDevice ? currentCloudDevice.currentHumidity : 0}
                            className="flex-1 max-w-[200px]"
                          />
                          <span className="text-sm font-medium">
                            {currentCloudDevice ? `${currentCloudDevice.currentHumidity}%` : t('pages:diaperMonitoring.currentDiaperStatus.noData')}
                          </span>
                        </div>
                        <div className="text-sm text-muted-foreground space-y-1">
                          <p>
                            {t('pages:diaperMonitoring.currentDiaperStatus.device')}: {currentCloudDevice ?
                              (currentCloudDevice.residentName ?
                                `${currentCloudDevice.residentName} (${currentCloudDevice.residentRoom})` :
                                currentCloudDevice.deviceName
                              ) : "未選擇設備"}
                          </p>
                          {currentCloudDevice && (
                            <p>MAC: {currentCloudDevice.MAC}</p>
                          )}
                          <p>
                            {t('pages:diaperMonitoring.currentDiaperStatus.lastChangeTime')}: {currentPatient.records.length > 0 ?
                              `${currentPatient.records[0].timestamp} (${getTimeDifference(currentPatient.lastUpdate)})` :
                              t('pages:diaperMonitoring.currentDiaperStatus.noRecords')
                            }
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>

                  <Button
                    onClick={() => setShowRecordModal(true)}
                    className="w-full"
                    size="lg"
                  >
                    {t('pages:diaperMonitoring.currentDiaperStatus.recordChange')}
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* 設備狀態信息 */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <Droplets className="h-5 w-5 text-blue-500" />
                  <div>
                    <p className="text-sm text-muted-foreground">{t('pages:diaperMonitoring.deviceStatus.humidity')}</p>
                    <p className="text-2xl font-bold">
                      {currentCloudDevice ? `${currentCloudDevice.currentHumidity}%` : t('pages:diaperMonitoring.deviceStatus.noData')}
                    </p>
                    {currentCloudDevice && currentCloudDevice.currentHumidity > 75 && (
                      <Badge className="bg-red-100 text-red-700 mt-1">{t('pages:diaperMonitoring.deviceStatus.needsChange')}</Badge>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <Thermometer className="h-5 w-5 text-orange-500" />
                  <div>
                    <p className="text-sm text-muted-foreground">{t('pages:diaperMonitoring.deviceStatus.temperature')}</p>
                    <p className="text-2xl font-bold">
                      {currentCloudDevice ? `${currentCloudDevice.currentTemperature}°C` : t('pages:diaperMonitoring.deviceStatus.noData')}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <Battery className="h-5 w-5 text-green-500" />
                  <div>
                    <p className="text-sm text-muted-foreground">{t('pages:diaperMonitoring.deviceStatus.battery')}</p>
                    <p className="text-2xl font-bold">
                      {currentCloudDevice ? `${currentCloudDevice.currentBatteryLevel}%` : t('pages:diaperMonitoring.deviceStatus.noData')}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* 尿布更換記錄 */}
          <Card>
            <CardHeader>
              <CardTitle>{t('pages:diaperMonitoring.diaperRecords.title')}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {currentPatient.records.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">{t('pages:diaperMonitoring.diaperRecords.noRecords')}</p>
                ) : (
                  currentPatient.records.map((record) => (
                    <div key={record.id} className="flex items-center gap-4 p-4 border rounded-lg">
                      <div className="bg-blue-100 dark:bg-blue-900/30 rounded-full p-2">
                        <User className="h-4 w-4 text-blue-600" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-sm font-medium">{record.timestamp}</span>
                          <Badge className={record.status.color}>
                            {t('pages:diaperMonitoring.diaperRecords.status')}: {record.status.label}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {t('pages:diaperMonitoring.diaperRecords.nurse')}: {record.nurse}
                        </p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* 記錄更換彈出視窗 */}
      {showRecordModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle>{t('pages:diaperMonitoring.recordModal.title')}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <label className="text-sm font-medium mb-3 block">{t('pages:diaperMonitoring.recordModal.diaperStatus')}</label>
                <div className="space-y-2">
                  {Object.values(DIAPER_STATUS).map((status) => (
                    <label key={status.value} className="flex items-center gap-3 cursor-pointer">
                      <input
                        type="radio"
                        name="status"
                        value={status.value}
                        checked={recordForm.status === status.value}
                        onChange={(e) => setRecordForm(prev => ({ ...prev, status: parseInt(e.target.value) }))}
                        className="w-4 h-4"
                      />
                      <span className={`px-2 py-1 rounded text-sm ${status.color}`}>
                        {status.label}
                      </span>
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-sm font-medium mb-3 block">{t('pages:diaperMonitoring.recordModal.nurse')}</label>
                <div className="space-y-2">
                  {NURSES.map((nurse) => (
                    <label key={nurse.id} className="flex items-center gap-3 cursor-pointer">
                      <input
                        type="radio"
                        name="nurse"
                        value={nurse.id}
                        checked={recordForm.nurse === nurse.id}
                        onChange={(e) => setRecordForm(prev => ({ ...prev, nurse: e.target.value }))}
                        className="w-4 h-4"
                      />
                      <span className="text-sm">{nurse.name}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <Button
                  variant="outline"
                  onClick={() => setShowRecordModal(false)}
                  className="flex-1"
                >
                  {t('pages:diaperMonitoring.recordModal.cancel')}
                </Button>
                <Button
                  onClick={handleRecordChange}
                  className="flex-1"
                >
                  {t('pages:diaperMonitoring.recordModal.confirm')}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}