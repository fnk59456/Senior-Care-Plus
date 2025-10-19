import { useEffect, useRef, useState } from "react"
// @ts-ignore
import mqtt from "mqtt"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts'
import { Heart, TrendingUp, Clock, AlertTriangle, MapPin, Baby, Activity, Watch, Settings } from "lucide-react"
import { useLocation } from "react-router-dom"
import { useUWBLocation } from "@/contexts/UWBLocationContext"
import { useDeviceManagement } from "@/contexts/DeviceManagementContext"
import { DeviceType } from "@/types/device-types"
import { useTranslation } from "react-i18next"

// 本地 MQTT 設置
const MQTT_URL = "ws://localhost:9001"
const MQTT_TOPIC = "health/data"

// 雲端 MQTT 設置
const CLOUD_MQTT_URL = `${import.meta.env.VITE_MQTT_PROTOCOL}://${import.meta.env.VITE_MQTT_BROKER}:${import.meta.env.VITE_MQTT_PORT}/mqtt`
const CLOUD_MQTT_OPTIONS = {
  username: import.meta.env.VITE_MQTT_USERNAME,
  password: import.meta.env.VITE_MQTT_PASSWORD
}

// 心率範圍
const NORMAL_HEART_RATE_MIN = 60
const NORMAL_HEART_RATE_MAX = 100
const TARGET_HEART_RATE = 75

// 血壓範圍
const NORMAL_BP_SYST_MAX = 120  // 正常收縮壓上限
const NORMAL_BP_DIAST_MAX = 80  // 正常舒張壓上限
const HIGH_BP_SYST = 140        // 高血壓收縮壓
const HIGH_BP_DIAST = 90        // 高血壓舒張壓

// 用戶列表
const USERS = [
  { id: "user001", name: "張三" },
  { id: "user002", name: "李四" },
  { id: "user003", name: "王五" },
  { id: "user004", name: "趙六" },
  { id: "user005", name: "陳七" }
]

// 根據患者名稱獲取用戶ID
const getUserIdByName = (patientName: string): string => {
  const user = USERS.find(u => u.name === patientName)
  return user ? user.id : "user001" // 默認返回張三
}

type HeartRateRecord = {
  id: string
  name: string
  heart_rate: number
  time: string
  datetime: Date
  isAbnormal: boolean
  temperature?: number
  bp_syst?: number  // 收縮壓
  bp_diast?: number // 舒張壓
}

type ChartDataPoint = {
  time: string
  hour: string
  heart_rate: number
  isAbnormal: boolean
  bp_syst?: number  // 收縮壓
  bp_diast?: number // 舒張壓
}

// 雲端設備記錄類型
type CloudDeviceRecord = {
  MAC: string
  deviceName: string
  hr: number // 心率
  SpO2: number // 血氧
  bp_syst: number // 收縮壓
  bp_diast: number // 舒張壓
  skin_temp: number // 皮膚溫度
  room_temp: number // 室內溫度
  steps: number // 步數
  light_sleep: number // 淺眠時間
  deep_sleep: number // 深眠時間
  battery_level: number // 電量
  time: string
  datetime: Date
  isAbnormal: boolean
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

  const [selectedUser, setSelectedUser] = useState<string>(() => {
    // 如果從HealthPage傳遞了患者名稱，則使用該患者，否則默認選擇張三
    return patientName ? getUserIdByName(patientName) : "user001"
  })
  const [activeTab, setActiveTab] = useState<string>("today")
  const [heartRateRecords, setHeartRateRecords] = useState<HeartRateRecord[]>([])
  const [connected, setConnected] = useState(false)
  const [filteredRecords, setFilteredRecords] = useState<HeartRateRecord[]>([])
  const [recordFilter, setRecordFilter] = useState<string>("all")
  const [timeRange, setTimeRange] = useState<string>("1day")
  const clientRef = useRef<mqtt.MqttClient | null>(null)

  // 雲端 MQTT 相關狀態
  const [cloudConnected, setCloudConnected] = useState(false)
  const [cloudMqttData, setCloudMqttData] = useState<CloudMqttData[]>([])
  const cloudClientRef = useRef<mqtt.MqttClient | null>(null)

  // 雲端設備管理狀態
  const [cloudDevices, setCloudDevices] = useState<CloudDevice[]>([])
  const [cloudDeviceRecords, setCloudDeviceRecords] = useState<CloudDeviceRecord[]>([])
  const [selectedCloudDevice, setSelectedCloudDevice] = useState<string>("")

  // 連線狀態和錯誤信息
  const [localConnectionStatus, setLocalConnectionStatus] = useState<string>("未連線")
  const [cloudConnectionStatus, setCloudConnectionStatus] = useState<string>("未連線")
  const [localError, setLocalError] = useState<string>("")
  const [cloudError, setCloudError] = useState<string>("")
  const [reconnectAttempts, setReconnectAttempts] = useState(0)
  const [cloudReconnectAttempts, setCloudReconnectAttempts] = useState(0)

  // 當前MQTT標籤頁狀態
  const connectionTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const [currentMqttTab, setCurrentMqttTab] = useState<string>("local")

  // 參考線顯示狀態
  const [showReferenceLines, setShowReferenceLines] = useState<boolean>(true)

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

  // 本地 MQTT 連接
  useEffect(() => {
    setLocalConnectionStatus("連接中...")
    setLocalError("")

    const client = mqtt.connect(MQTT_URL, {
      reconnectPeriod: 3000,
      connectTimeout: 10000,
      keepalive: 60
    })
    clientRef.current = client

    client.on("connect", () => {
      console.log("本地 MQTT 已連接")
      setConnected(true)
      setLocalConnectionStatus("已連線")
      setLocalError("")
      setReconnectAttempts(0)
    })

    client.on("reconnect", () => {
      console.log("本地 MQTT 重新連接中...")
      setConnected(false)
      setReconnectAttempts(prev => prev + 1)
      setLocalConnectionStatus(`重新連接中... (第${reconnectAttempts + 1}次嘗試)`)
    })

    client.on("close", () => {
      console.log("本地 MQTT 連接關閉")
      setConnected(false)
      setLocalConnectionStatus("連接已關閉")
    })

    client.on("error", (error) => {
      console.error("本地 MQTT 連接錯誤:", error)
      setConnected(false)
      setLocalError(error.message || "連接錯誤")
      setLocalConnectionStatus("連接錯誤")
    })

    client.on("offline", () => {
      console.log("本地 MQTT 離線")
      setConnected(false)
      setLocalConnectionStatus("離線")
    })

    client.subscribe(MQTT_TOPIC, (err) => {
      if (err) {
        console.error("訂閱失敗:", err)
      } else {
        console.log("已訂閱主題:", MQTT_TOPIC)
      }
    })

    client.on("message", (topic: string, payload: Uint8Array) => {
      if (topic !== MQTT_TOPIC) return
      try {
        const msg = JSON.parse(new TextDecoder().decode(payload))
        console.log("收到MQTT消息:", msg) // 添加調試日誌

        if (msg.type === "health" && msg.id && msg.heart_rate) {
          // 修復時間解析問題
          let datetime: Date
          try {
            // 嘗試解析不同的時間格式
            if (msg.time) {
              // 將空格替換為T，確保ISO格式兼容性
              const isoTime = msg.time.replace(' ', 'T')
              datetime = new Date(isoTime)

              // 如果解析失敗，嘗試其他方法
              if (isNaN(datetime.getTime())) {
                datetime = new Date(msg.time)
              }

              // 如果還是失敗，使用當前時間
              if (isNaN(datetime.getTime())) {
                console.warn("時間解析失敗，使用當前時間:", msg.time)
                datetime = new Date()
              }
            } else {
              datetime = new Date()
            }
          } catch (e) {
            console.error("時間解析錯誤:", e, "原始時間:", msg.time)
            datetime = new Date()
          }

          const record: HeartRateRecord = {
            id: msg.id,
            name: msg.name || msg.id,
            heart_rate: msg.heart_rate,
            time: msg.time,
            datetime: datetime,
            isAbnormal: msg.heart_rate > NORMAL_HEART_RATE_MAX || msg.heart_rate < NORMAL_HEART_RATE_MIN,
            temperature: msg.temperature,
            bp_syst: msg.bp_syst || msg["bp syst"],
            bp_diast: msg.bp_diast || msg["bp diast"]
          }

          console.log("處理的心率記錄:", record) // 添加調試日誌
          console.log("記錄時間:", datetime, "是否有效:", !isNaN(datetime.getTime()))

          setHeartRateRecords(prev => {
            // 避免重複記錄
            const existing = prev.find(r => r.id === record.id && r.time === record.time)
            if (existing) {
              console.log("記錄已存在，跳過")
              return prev
            }

            // 添加新記錄並按時間排序
            const newRecords = [...prev, record].sort((a, b) => b.datetime.getTime() - a.datetime.getTime())

            console.log("添加新記錄，總記錄數:", newRecords.length)

            // 限制記錄數量（保留最近1000條）
            return newRecords.slice(0, 1000)
          })
        } else {
          console.log("消息格式不符合心率數據要求:", msg)
        }
      } catch (e) {
        console.error("MQTT message parse error:", e)
      }
    })

    return () => {
      console.log("清理本地MQTT連接")
      client.end()
    }
  }, [])

  // 雲端 MQTT 連接
  useEffect(() => {
    // 清理之前的超時
    if (connectionTimeoutRef.current) {
      clearTimeout(connectionTimeoutRef.current)
    }

    // 如果沒有選擇閘道器，不建立連接
    if (!selectedGateway) {
      if (cloudClientRef.current) {
        console.log("清理雲端MQTT連接 - 未選擇閘道器")
        cloudClientRef.current.end(true)
        cloudClientRef.current = null
      }
      setCloudConnected(false)
      setCloudConnectionStatus("未選擇閘道器")
      return
    }

    // 防抖：延遲500ms再建立連接，避免頻繁切換
    connectionTimeoutRef.current = setTimeout(() => {
      setCloudConnectionStatus("連接中...")
      setCloudError("")

      // 如果已有連接，先清理
      if (cloudClientRef.current) {
        console.log("清理舊的雲端MQTT連接 - 準備重新連接")
        cloudClientRef.current.end(true)
        cloudClientRef.current = null
      }

      const cloudClient = mqtt.connect(CLOUD_MQTT_URL, {
        ...CLOUD_MQTT_OPTIONS,
        reconnectPeriod: 5000,
        connectTimeout: 15000,
        keepalive: 60,
        clean: true,
        clientId: `web-heart-client-${Math.random().toString(16).slice(2, 8)}`
      })
      cloudClientRef.current = cloudClient

      cloudClient.on("connect", () => {
        console.log("雲端 MQTT 已連接，Client ID:", cloudClient.options.clientId)
        setCloudConnected(true)
        setCloudConnectionStatus("已連線")
        setCloudError("")
        setCloudReconnectAttempts(0)
      })

      cloudClient.on("reconnect", () => {
        console.log("雲端 MQTT 重新連接中...")
        setCloudConnected(false)
        setCloudReconnectAttempts(prev => prev + 1)
        setCloudConnectionStatus(`重新連接中... (第${cloudReconnectAttempts + 1}次嘗試)`)
      })

      cloudClient.on("close", () => {
        console.log("雲端 MQTT 連接關閉")
        setCloudConnected(false)
        setCloudConnectionStatus("連接已關閉")
      })

      cloudClient.on("error", (error) => {
        console.error("雲端 MQTT 連接錯誤:", error)
        setCloudConnected(false)
        setCloudError(error.message || "連接錯誤")
        setCloudConnectionStatus("連接錯誤")
      })

      cloudClient.on("offline", () => {
        console.log("雲端 MQTT 離線")
        setCloudConnected(false)
        setCloudConnectionStatus("離線")
      })

      // 獲取健康監控主題
      const healthTopic = getHealthTopic()
      if (!healthTopic) {
        console.error("無法獲取健康監控主題，跳過訂閱")
        return
      }

      cloudClient.subscribe(healthTopic, (err) => {
        if (err) {
          console.error("雲端 MQTT 訂閱失敗:", err)
        } else {
          console.log("已訂閱雲端主題:", healthTopic)
        }
      })

      cloudClient.on("message", (topic: string, payload: Uint8Array) => {
        const healthTopic = getHealthTopic()
        if (!healthTopic || topic !== healthTopic) return
        try {
          const rawMessage = new TextDecoder().decode(payload)
          const msg = JSON.parse(rawMessage)
          console.log("收到雲端 MQTT 心率消息:", msg)

          // 處理雲端 MQTT 數據
          const cloudData: CloudMqttData = {
            content: msg.content || "",
            gateway_id: msg["gateway id"] || "",
            MAC: msg.MAC || "",
            receivedAt: new Date()
          }

          // 添加詳細的調試信息
          console.log("==== 雲端MQTT心率數據解析 ====")
          console.log("原始數據:", msg)
          console.log("Content:", msg.content)
          console.log("MAC:", msg.MAC)
          console.log("Heart Rate (hr):", msg.hr)
          console.log("SpO2:", msg.SpO2)
          console.log("Blood Pressure:", { syst: msg["bp syst"], diast: msg["bp diast"] })

          // 根據 content 判斷數據類型並提取相應字段
          if (msg.content === "300B") {
            console.log("處理300B心率數據...")
            // 體溫心率數據處理
            cloudData.SOS = msg.SOS || ""
            cloudData.hr = msg.hr || ""
            cloudData.SpO2 = msg.SpO2 || ""
            cloudData.bp_syst = msg["bp syst"] || ""
            cloudData.bp_diast = msg["bp diast"] || ""
            cloudData.skin_temp = msg["skin temp"] || ""
            cloudData.room_temp = msg["room temp"] || ""
            cloudData.steps = msg.steps || ""
            cloudData.light_sleep = msg["light sleep (min)"] || ""
            cloudData.deep_sleep = msg["deep sleep (min)"] || ""
            cloudData.wake_time = msg["wake time"] || ""
            cloudData.move = msg.move || ""
            cloudData.wear = msg.wear || ""
            cloudData.battery_level = msg["battery level"] || ""
            cloudData.serial_no = msg["serial no"] || ""

            // 檢查設備記錄創建條件
            console.log("檢查心率設備記錄創建條件:")
            console.log("- MAC存在:", !!msg.MAC)
            console.log("- hr存在:", !!msg.hr)
            console.log("- hr值:", msg.hr)

            // 放寬條件：只要有MAC就創建設備記錄
            if (msg.MAC) {
              const hr = parseFloat(msg.hr) || 0
              const SpO2 = parseFloat(msg.SpO2) || 0
              const bp_syst = parseFloat(msg["bp syst"]) || 0
              const bp_diast = parseFloat(msg["bp diast"]) || 0
              const skinTemp = parseFloat(msg["skin temp"]) || 0
              const roomTemp = parseFloat(msg["room temp"]) || 0
              const steps = parseInt(msg.steps) || 0
              const lightSleep = parseInt(msg["light sleep (min)"]) || 0
              const deepSleep = parseInt(msg["deep sleep (min)"]) || 0
              const batteryLevel = parseInt(msg["battery level"]) || 0

              // 獲取病患資訊
              const residentInfo = getResidentInfoByMAC(msg.MAC)

              console.log("創建心率設備記錄:")
              console.log("- MAC:", msg.MAC)
              console.log("- 心率:", hr, "BPM")
              console.log("- 血氧:", SpO2, "%")
              console.log("- 血壓:", bp_syst, "/", bp_diast, "mmHg")
              console.log("- 病患資訊:", residentInfo)

              const cloudDeviceRecord: CloudDeviceRecord = {
                MAC: msg.MAC,
                deviceName: residentInfo?.residentName ? `${residentInfo.residentName} (${residentInfo.residentRoom})` : `設備 ${msg.MAC.slice(-8)}`,
                hr: hr,
                SpO2: SpO2,
                bp_syst: bp_syst,
                bp_diast: bp_diast,
                skin_temp: skinTemp,
                room_temp: roomTemp,
                steps: steps,
                light_sleep: lightSleep,
                deep_sleep: deepSleep,
                battery_level: batteryLevel,
                time: new Date().toISOString(),
                datetime: new Date(),
                isAbnormal: hr > 0 && (hr > NORMAL_HEART_RATE_MAX || hr < NORMAL_HEART_RATE_MIN),
                // 添加病患資訊
                ...residentInfo
              }

              console.log("心率設備記錄:", cloudDeviceRecord)

              // 更新雲端設備記錄
              setCloudDeviceRecords(prev => {
                const newRecords = [cloudDeviceRecord, ...prev]
                  .sort((a, b) => b.datetime.getTime() - a.datetime.getTime())
                  .slice(0, 1000)
                console.log("更新後的心率設備記錄數量:", newRecords.length)
                return newRecords
              })

              // 更新設備列表
              setCloudDevices(prev => {
                const existingDevice = prev.find(d => d.MAC === msg.MAC)
                console.log("現有心率設備:", existingDevice)

                if (existingDevice) {
                  const updatedDevices = prev.map(d =>
                    d.MAC === msg.MAC
                      ? {
                        ...d,
                        lastSeen: new Date(),
                        recordCount: d.recordCount + 1,
                        // 更新病患資訊
                        ...residentInfo
                      }
                      : d
                  )
                  console.log("更新現有心率設備，總設備數:", updatedDevices.length)
                  return updatedDevices
                } else {
                  const newDevice: CloudDevice = {
                    MAC: msg.MAC,
                    deviceName: residentInfo?.residentName ? `${residentInfo.residentName} (${residentInfo.residentRoom})` : `設備 ${msg.MAC.slice(-8)}`,
                    lastSeen: new Date(),
                    recordCount: 1,
                    // 添加病患資訊
                    ...residentInfo
                  }
                  const updatedDevices = [...prev, newDevice]
                  console.log("添加新心率設備:", newDevice)
                  console.log("更新後總設備數:", updatedDevices.length)
                  return updatedDevices
                }
              })

              // 如果還沒有選擇設備，自動選擇第一個
              setSelectedCloudDevice(prev => {
                if (!prev) {
                  console.log("自動選擇心率設備:", msg.MAC)
                  return msg.MAC
                }
                return prev
              })
            } else {
              console.log("⚠️ 300B數據缺少MAC字段，無法創建心率設備記錄")
            }
          } else if (msg.content === "diaper DV1") {
            // 尿布數據處理
            cloudData.name = msg.name || ""
            cloudData.fw_ver = msg["fw ver"] || ""
            cloudData.temp = msg.temp || ""
            cloudData.humi = msg.humi || ""
            cloudData.button = msg.button || ""
            cloudData.msg_idx = msg["msg idx"] || ""
            cloudData.ack = msg.ack || ""
            cloudData.battery_level = msg["battery level"] || ""
            cloudData.serial_no = msg["serial no"] || ""
          } else {
            // 其他類型數據，提取所有可能的字段
            cloudData.SOS = msg.SOS || ""
            cloudData.hr = msg.hr || ""
            cloudData.SpO2 = msg.SpO2 || ""
            cloudData.bp_syst = msg["bp syst"] || ""
            cloudData.bp_diast = msg["bp diast"] || ""
            cloudData.skin_temp = msg["skin temp"] || ""
            cloudData.room_temp = msg["room temp"] || ""
            cloudData.steps = msg.steps || ""
            cloudData.light_sleep = msg["light sleep (min)"] || ""
            cloudData.deep_sleep = msg["deep sleep (min)"] || ""
            cloudData.wake_time = msg["wake time"] || ""
            cloudData.move = msg.move || ""
            cloudData.wear = msg.wear || ""
            cloudData.battery_level = msg["battery level"] || ""
            cloudData.serial_no = msg["serial no"] || ""
            cloudData.name = msg.name || ""
            cloudData.fw_ver = msg["fw ver"] || ""
            cloudData.temp = msg.temp || ""
            cloudData.humi = msg.humi || ""
            cloudData.button = msg.button || ""
            cloudData.msg_idx = msg["msg idx"] || ""
            cloudData.ack = msg.ack || ""
          }

          setCloudMqttData(prev => {
            const newData = [cloudData, ...prev].slice(0, 50)
            return newData
          })

        } catch (error) {
          console.error('雲端 MQTT 心率訊息解析錯誤:', error)
        }
      })
    }, 500) // 500ms防抖延遲

    // 清理函數
    return () => {
      if (connectionTimeoutRef.current) {
        clearTimeout(connectionTimeoutRef.current)
      }
      if (cloudClientRef.current) {
        console.log("清理雲端 MQTT 連接")
        cloudClientRef.current.end(true)
        cloudClientRef.current = null
      }
    }
  }, [selectedGateway, CLOUD_MQTT_URL, CLOUD_MQTT_OPTIONS, devices, residents, getResidentForDevice])

  // 獲取當前用戶的記錄（本地MQTT）
  const currentUserRecords = heartRateRecords.filter(record => record.id === selectedUser)

  // 獲取當前雲端設備的記錄，轉換為HeartRateRecord格式
  const currentCloudDeviceRecords: HeartRateRecord[] = selectedCloudDevice && cloudDeviceRecords.length > 0
    ? cloudDeviceRecords
      .filter(record => record.MAC === selectedCloudDevice)
      .map(record => ({
        id: record.MAC,
        name: record.deviceName,
        heart_rate: record.hr || 0, // 如果沒有心率，使用0
        time: record.time,
        datetime: record.datetime,
        isAbnormal: record.isAbnormal,
        temperature: record.skin_temp,
        bp_syst: record.bp_syst || 0,
        bp_diast: record.bp_diast || 0
      }))
    : []

  console.log("當前選中用戶:", selectedUser)
  console.log("本地MQTT心率記錄數:", heartRateRecords.length)
  console.log("當前用戶記錄數:", currentUserRecords.length)
  console.log("當前雲端設備:", selectedCloudDevice)
  console.log("雲端設備記錄數:", currentCloudDeviceRecords.length)

  // 打印每個用戶的記錄數量
  const userRecordCounts = USERS.map(user => {
    const count = heartRateRecords.filter(r => r.id === user.id).length
    return `${user.name}(${user.id}): ${count}筆`
  }).join(", ")
  console.log("各用戶記錄數:", userRecordCounts)

  // 根據選中的日期過濾記錄
  const getFilteredByDate = (records: HeartRateRecord[]) => {
    console.log("開始日期過濾，原始記錄數:", records.length)
    console.log("當前選中的日期標籤:", activeTab)
    console.log("當前MQTT標籤頁:", currentMqttTab)

    const now = new Date()
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000)
    const dayBeforeYesterday = new Date(today.getTime() - 2 * 24 * 60 * 60 * 1000)

    console.log("日期參考點:")
    console.log("今天:", today.toLocaleDateString())
    console.log("昨天:", yesterday.toLocaleDateString())
    console.log("前天:", dayBeforeYesterday.toLocaleDateString())

    let filtered: HeartRateRecord[] = []

    // 放寬條件：過濾掉心率為0或無效的記錄（但保留有效心率記錄）
    const validRecords = records.filter(r => {
      // 對於雲端數據，允許心率為0（因為可能沒有心率感應器）
      // 對於本地數據，要求有有效心率
      if (currentMqttTab === "cloud") {
        return true // 雲端數據全部保留
      }
      return r.heart_rate > 0 // 本地數據要求有效心率
    })

    console.log("有效記錄數（過濾後）:", validRecords.length)

    // 由於模擬器數據可能是歷史數據，我們需要更靈活的過濾
    if (activeTab === "today") {
      // 如果沒有今天的數據，顯示最新的一天數據
      filtered = validRecords.filter(r => {
        const recordDate = new Date(r.datetime.getFullYear(), r.datetime.getMonth(), r.datetime.getDate())
        return recordDate.getTime() === today.getTime()
      })

      // 如果今天沒有數據，取最新一天的數據
      if (filtered.length === 0 && validRecords.length > 0) {
        const latestRecord = validRecords[0] // 已按時間排序
        const latestDate = new Date(latestRecord.datetime.getFullYear(), latestRecord.datetime.getMonth(), latestRecord.datetime.getDate())
        filtered = validRecords.filter(r => {
          const recordDate = new Date(r.datetime.getFullYear(), r.datetime.getMonth(), r.datetime.getDate())
          return recordDate.getTime() === latestDate.getTime()
        })
        console.log("今天無數據，使用最新日期:", latestDate.toLocaleDateString(), "記錄數:", filtered.length)
      }
    } else if (activeTab === "yesterday") {
      filtered = validRecords.filter(r => {
        const recordDate = new Date(r.datetime.getFullYear(), r.datetime.getMonth(), r.datetime.getDate())
        return recordDate.getTime() === yesterday.getTime()
      })

      // 如果昨天沒有數據，取第二新的一天數據
      if (filtered.length === 0 && validRecords.length > 0) {
        const uniqueDates = [...new Set(validRecords.map(r => {
          const d = new Date(r.datetime.getFullYear(), r.datetime.getMonth(), r.datetime.getDate())
          return d.getTime()
        }))].sort((a, b) => b - a)

        if (uniqueDates.length > 1) {
          const secondLatestDate = uniqueDates[1]
          filtered = validRecords.filter(r => {
            const recordDate = new Date(r.datetime.getFullYear(), r.datetime.getMonth(), r.datetime.getDate())
            return recordDate.getTime() === secondLatestDate
          })
          console.log("昨天無數據，使用第二新日期:", new Date(secondLatestDate).toLocaleDateString(), "記錄數:", filtered.length)
        }
      }
    } else if (activeTab === "dayBefore") {
      filtered = validRecords.filter(r => {
        const recordDate = new Date(r.datetime.getFullYear(), r.datetime.getMonth(), r.datetime.getDate())
        return recordDate.getTime() === dayBeforeYesterday.getTime()
      })

      // 如果前天沒有數據，取第三新的一天數據
      if (filtered.length === 0 && validRecords.length > 0) {
        const uniqueDates = [...new Set(validRecords.map(r => {
          const d = new Date(r.datetime.getFullYear(), r.datetime.getMonth(), r.datetime.getDate())
          return d.getTime()
        }))].sort((a, b) => b - a)

        if (uniqueDates.length > 2) {
          const thirdLatestDate = uniqueDates[2]
          filtered = validRecords.filter(r => {
            const recordDate = new Date(r.datetime.getFullYear(), r.datetime.getMonth(), r.datetime.getDate())
            return recordDate.getTime() === thirdLatestDate
          })
          console.log("前天無數據，使用第三新日期:", new Date(thirdLatestDate).toLocaleDateString(), "記錄數:", filtered.length)
        }
      }
    } else {
      filtered = validRecords.filter(r => r.datetime >= today)
    }

    console.log("過濾後記錄數:", filtered.length)
    if (filtered.length > 0) {
      console.log("第一筆記錄時間:", filtered[0].datetime.toLocaleString())
      console.log("最後一筆記錄時間:", filtered[filtered.length - 1].datetime.toLocaleString())
    }

    return filtered
  }

  // 根據當前MQTT標籤頁選擇數據源
  const currentRecords = currentMqttTab === "cloud" ? currentCloudDeviceRecords : currentUserRecords
  const dateFilteredRecords = getFilteredByDate(currentRecords)

  // 根據時間範圍和狀態過濾記錄
  useEffect(() => {
    let filtered = [...dateFilteredRecords]

    // 根據時間範圍過濾
    if (timeRange !== "1day") {
      const now = new Date()
      const days = timeRange === "3day" ? 3 : 7
      const cutoff = new Date(now.getTime() - days * 24 * 60 * 60 * 1000)
      filtered = filtered.filter(r => r.datetime >= cutoff)
    }

    // 根據狀態過濾
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
  }, [dateFilteredRecords, recordFilter, timeRange])

  // 準備圖表數據
  const chartData: ChartDataPoint[] = dateFilteredRecords
    .slice(0, 144) // 24小時 * 6個點/小時 = 144個數據點
    .reverse()
    .map(record => ({
      time: record.time,
      hour: record.datetime.toLocaleTimeString('zh-TW', { hour: '2-digit', minute: '2-digit' }),
      heart_rate: record.heart_rate,
      isAbnormal: record.isAbnormal,
      bp_syst: record.bp_syst || 0,
      bp_diast: record.bp_diast || 0
    }))

  console.log("心率圖表數據準備:")
  console.log("- 使用的數據源:", currentMqttTab)
  console.log("- 日期過濾後記錄數:", dateFilteredRecords.length)
  console.log("- 圖表數據點數:", chartData.length)
  if (chartData.length > 0) {
    console.log("- 心率範圍:", Math.min(...chartData.map(d => d.heart_rate)), "至", Math.max(...chartData.map(d => d.heart_rate)), "BPM")
  }

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
              <span>{t('pages:heartRate.connectionStatus.localMqtt')} ({MQTT_URL}):</span>
              <span className={connected ? "text-green-600 font-medium" : "text-red-500 font-medium"}>
                {localConnectionStatus}
              </span>
            </div>
            {localError && (
              <div className="text-xs text-red-500 ml-4">
                {t('pages:heartRate.connectionStatus.error')}: {localError}
              </div>
            )}
            <div className="flex items-center justify-between">
              <span>{t('pages:heartRate.connectionStatus.cloudMqtt')} ({CLOUD_MQTT_URL.split('.')[0]}...):</span>
              <span className={cloudConnected ? "text-green-600 font-medium" : "text-red-500 font-medium"}>
                {cloudConnectionStatus}
              </span>
            </div>
            {cloudError && (
              <div className="text-xs text-red-500 ml-4">
                {t('pages:heartRate.connectionStatus.error')}: {cloudError}
              </div>
            )}
          </div>
          <div className="flex items-center justify-between mt-3">
            <div className="text-xs text-gray-500">
              {t('pages:heartRate.connectionStatus.hint')}
            </div>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  if (clientRef.current) {
                    console.log("手動重連本地MQTT...")
                    setLocalConnectionStatus("手動重連中...")
                    clientRef.current.reconnect()
                  }
                }}
                disabled={connected}
              >
                {t('pages:heartRate.reconnectLocal')}
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  if (cloudClientRef.current) {
                    console.log("手動重連雲端MQTT...")
                    setCloudConnectionStatus("手動重連中...")
                    cloudClientRef.current.reconnect()
                  }
                }}
                disabled={cloudConnected}
              >
                {t('pages:heartRate.reconnectCloud')}
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* 主要功能標籤頁 */}
      <Tabs defaultValue="local" className="w-full" value={currentMqttTab} onValueChange={setCurrentMqttTab}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="local">{t('pages:heartRate.tabs.local')}</TabsTrigger>
          <TabsTrigger value="cloud">{t('pages:heartRate.tabs.cloud')}</TabsTrigger>
        </TabsList>

        {/* 本地 MQTT 標籤頁 */}
        <TabsContent value="local" className="space-y-6">
          {/* 患者選擇 */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg flex items-center">
                  <Avatar className="mr-3 h-8 w-8">
                    <AvatarFallback>{USERS.find(u => u.id === selectedUser)?.name[0] || "?"}</AvatarFallback>
                  </Avatar>
                  {t('pages:heartRate.patientSelection.title')}
                </CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <Select value={selectedUser} onValueChange={setSelectedUser}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder={t('pages:heartRate.patientSelection.selectPatient')} />
                </SelectTrigger>
                <SelectContent>
                  {USERS.map(user => (
                    <SelectItem key={user.id} value={user.id}>
                      {t('pages:heartRate.patientSelection.patient')}：{user.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 雲端 MQTT 標籤頁 */}
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

                  {/* 橫排選擇器 */}
                  <div className="flex flex-col sm:flex-row gap-4">
                    {/* 養老院選擇 */}
                    <div className="flex-1 space-y-2">
                      <label className="text-sm font-medium text-gray-700">{t('pages:heartRate.cloudDeviceMonitoring.selectNursingHome')}</label>
                      <Select value={selectedHome} onValueChange={setSelectedHome}>
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

                    {/* 樓層選擇 */}
                    <div className="flex-1 space-y-2">
                      <label className="text-sm font-medium text-gray-700">{t('pages:heartRate.cloudDeviceMonitoring.selectFloor')}</label>
                      <Select value={selectedFloor} onValueChange={setSelectedFloor} disabled={!selectedHome}>
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

                    {/* 閘道器選擇 */}
                    <div className="flex-1 space-y-2">
                      <label className="text-sm font-medium text-gray-700">{t('pages:heartRate.cloudDeviceMonitoring.selectGateway')}</label>
                      <Select value={selectedGateway} onValueChange={setSelectedGateway} disabled={!selectedFloor}>
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

                  {/* 當前選擇的閘道器信息 */}
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
                    <div className="font-medium text-purple-800">{t('pages:heartRate.cloudDeviceMonitoring.mqttMessages')}</div>
                    <div className="text-2xl font-bold text-purple-600">{cloudMqttData.length}</div>
                  </div>
                </div>

                {cloudDevices.length > 0 ? (
                  <div className="space-y-3">
                    <div className="font-medium">{t('pages:heartRate.cloudDeviceMonitoring.selectDevice')}</div>
                    <Select value={selectedCloudDevice} onValueChange={setSelectedCloudDevice}>
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
                    <div className="font-medium">{t('pages:heartRate.cloudDeviceMonitoring.recentData')}</div>
                    <div className="max-h-40 overflow-y-auto space-y-1">
                      {cloudMqttData.slice(0, 8).map((data, index) => (
                        <div key={index} className="text-xs bg-gray-50 p-2 rounded border">
                          <div className="flex items-center justify-between">
                            <span className="font-mono font-semibold text-pink-600">{data.content}</span>
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
                                    {t('pages:heartRate.cloudDeviceMonitoring.device')}: <span className="font-mono">{data.MAC}</span>
                                    {residentInfo?.residentName && (
                                      <span className="text-blue-600 font-medium">
                                        {' '}→ {residentInfo.residentName} ({residentInfo.residentRoom})
                                      </span>
                                    )}
                                    {data.hr && ` | ${t('pages:heartRate.cloudDeviceMonitoring.heartRate')}: ${data.hr} BPM`}
                                    {data.SpO2 && ` | ${t('pages:heartRate.cloudDeviceMonitoring.spo2')}: ${data.SpO2}%`}
                                    {data.bp_syst && data.bp_diast && ` | ${t('pages:heartRate.cloudDeviceMonitoring.bloodPressure')}: ${data.bp_syst}/${data.bp_diast}`}
                                  </>
                                )
                              })()}
                            </div>
                          )}
                          {data.content === "diaper DV1" && (
                            <div className="text-muted-foreground mt-1">
                              {t('pages:heartRate.cloudDeviceMonitoring.diaperDevice')} {data.name && `- ${data.name}`}
                              {data.temp && ` | ${t('pages:heartRate.cloudDeviceMonitoring.temperature')}: ${data.temp}°C`}
                              {data.humi && ` | ${t('pages:heartRate.cloudDeviceMonitoring.humidity')}: ${data.humi}%`}
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
                      🔍 {t('pages:heartRate.cloudDeviceMonitoring.viewRawData')}
                    </summary>
                    <div className="mt-2 space-y-2 text-xs">
                      <div className="text-muted-foreground">
                        {t('pages:heartRate.cloudDeviceMonitoring.clickToExpand')}
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
                        <div className="font-semibold mb-1">{t('pages:heartRate.cloudDeviceMonitoring.deviceCreationConditions')}</div>
                        <div>• {t('pages:heartRate.cloudDeviceMonitoring.condition1')}</div>
                        <div>• {t('pages:heartRate.cloudDeviceMonitoring.condition2')}</div>
                        <div>• {t('pages:heartRate.cloudDeviceMonitoring.condition3')}</div>
                        <div>• {t('pages:heartRate.cloudDeviceMonitoring.condition4')}</div>
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
                  {/* 設備記錄列表 */}
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
                  {currentMqttTab === "cloud" && selectedCloudDevice && (
                    <span className="ml-2 text-sm font-normal text-pink-600">
                      - {(() => {
                        const device = cloudDevices.find(d => d.MAC === selectedCloudDevice)
                        return device?.residentName
                          ? `${device.residentName} (${device.residentRoom})`
                          : device?.deviceName || t('pages:heartRate.heartRateChart.cloudDevice')
                      })()}
                    </span>
                  )}
                  {currentMqttTab === "local" && (
                    <span className="ml-2 text-sm font-normal text-green-600">
                      - {USERS.find(u => u.id === selectedUser)?.name || t('pages:heartRate.heartRateChart.localUser')}
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
                  {/* 圖例說明 */}
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
                        {/* 心率Y軸 (左側) */}
                        <YAxis
                          yAxisId="heartRate"
                          domain={currentMqttTab === "cloud" ? ['dataMin - 5', 'dataMax + 5'] : [40, 120]}
                          tick={{ fontSize: 12 }}
                          label={{ value: t('pages:heartRate.heartRateChart.yAxisLabel'), angle: -90, position: 'insideLeft' }}
                        />
                        {/* 血壓Y軸 (右側) */}
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
                        {/* 心率參考線 - 條件顯示 */}
                        {showReferenceLines && (
                          <>
                            <ReferenceLine yAxisId="heartRate" y={TARGET_HEART_RATE} stroke="#ec4899" strokeDasharray="5 5" label={`${t('pages:heartRate.heartRateChart.targetHeartRate')}: 75 BPM`} />
                            <ReferenceLine yAxisId="heartRate" y={NORMAL_HEART_RATE_MAX} stroke="#ef4444" strokeDasharray="5 5" label={t('pages:heartRate.heartRateChart.highHeartRateLine')} />
                            <ReferenceLine yAxisId="heartRate" y={NORMAL_HEART_RATE_MIN} stroke="#3b82f6" strokeDasharray="5 5" label={t('pages:heartRate.heartRateChart.lowHeartRateLine')} />
                          </>
                        )}
                        {/* 血壓參考線 - 條件顯示 */}
                        {showReferenceLines && (
                          <>
                            <ReferenceLine yAxisId="bloodPressure" y={NORMAL_BP_SYST_MAX} stroke="#f59e0b" strokeDasharray="3 3" label={t('pages:heartRate.heartRateChart.referenceLines.normalSystolicBP')} />
                            <ReferenceLine yAxisId="bloodPressure" y={NORMAL_BP_DIAST_MAX} stroke="#10b981" strokeDasharray="3 3" label={t('pages:heartRate.heartRateChart.referenceLines.normalDiastolicBP')} />
                            <ReferenceLine yAxisId="bloodPressure" y={HIGH_BP_SYST} stroke="#dc2626" strokeDasharray="3 3" label={t('pages:heartRate.heartRateChart.referenceLines.highSystolicBP')} />
                            <ReferenceLine yAxisId="bloodPressure" y={HIGH_BP_DIAST} stroke="#dc2626" strokeDasharray="3 3" label={t('pages:heartRate.heartRateChart.referenceLines.highDiastolicBP')} />
                          </>
                        )}
                        {/* 心率線 */}
                        <Line
                          yAxisId="heartRate"
                          type="monotone"
                          dataKey="heart_rate"
                          stroke="#ec4899"
                          strokeWidth={2}
                          dot={{ fill: '#ec4899', strokeWidth: 2, r: 4 }}
                          activeDot={{ r: 6 }}
                        />
                        {/* 收縮壓線 */}
                        <Line
                          yAxisId="bloodPressure"
                          type="monotone"
                          dataKey="bp_syst"
                          stroke="#ef4444"
                          strokeWidth={2}
                          dot={{ fill: '#ef4444', strokeWidth: 2, r: 3 }}
                          activeDot={{ r: 5 }}
                        />
                        {/* 舒張壓線 */}
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
                    {currentMqttTab === "cloud" ? (
                      <div className="text-sm space-y-1">
                        <p>{t('pages:heartRate.heartRateChart.cloudSimulatorCheck')}</p>
                        <p>{t('pages:heartRate.heartRateChart.selectValidDevice')}</p>
                      </div>
                    ) : (
                      <p className="text-sm">{t('pages:heartRate.heartRateChart.localSimulatorCheck')}</p>
                    )}
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
                {currentMqttTab === "cloud" && selectedCloudDevice && (
                  <span className="ml-2 text-sm font-normal text-pink-600">
                    - {(() => {
                      const device = cloudDevices.find(d => d.MAC === selectedCloudDevice)
                      return device?.residentName
                        ? `${device.residentName} (${device.residentRoom})`
                        : device?.deviceName || t('pages:heartRate.heartRateChart.cloudDevice')
                    })()}
                  </span>
                )}
                {currentMqttTab === "local" && (
                  <span className="ml-2 text-sm font-normal text-green-600">
                    - {USERS.find(u => u.id === selectedUser)?.name || t('pages:heartRate.heartRateChart.localUser')}
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
                    {currentMqttTab === "cloud" && !selectedCloudDevice && (
                      <p className="text-sm mt-2">{t('pages:heartRate.heartRateRecords.selectCloudDeviceFirst')}</p>
                    )}
                    {currentMqttTab === "cloud" && selectedCloudDevice && currentCloudDeviceRecords.length === 0 && (
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