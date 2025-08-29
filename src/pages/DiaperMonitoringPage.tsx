import React, { useEffect, useRef, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Progress } from "@/components/ui/progress"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import {
  AlertTriangle,
  User,
  Droplets,
  Clock,
  Battery,
  Thermometer,
  Bell,
  CheckCircle2,
  AlertCircle
} from "lucide-react"
// @ts-ignore
import mqtt from "mqtt"
import { useLocation } from "react-router-dom"
import { useUWBLocation } from "@/contexts/UWBLocationContext"

// 本地 MQTT 設置
const MQTT_URL = "ws://localhost:9001"
const MQTT_TOPIC = "diaper/monitoring"

// 雲端 MQTT 設置
const CLOUD_MQTT_URL = `${import.meta.env.VITE_MQTT_PROTOCOL}://${import.meta.env.VITE_MQTT_BROKER}:${import.meta.env.VITE_MQTT_PORT}/mqtt`
const CLOUD_MQTT_OPTIONS = {
  username: import.meta.env.VITE_MQTT_USERNAME,
  password: import.meta.env.VITE_MQTT_PASSWORD
}

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

// 雲端尿布設備記錄類型
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
}

// 雲端尿布設備類型
type CloudDiaperDevice = {
  MAC: string
  deviceName: string
  name: string
  lastSeen: Date
  recordCount: number
  currentHumidity: number
  currentTemperature: number
  currentBatteryLevel: number
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

  const [patients, setPatients] = useState<Patient[]>(MOCK_PATIENTS)
  const [selectedPatient, setSelectedPatient] = useState<string>(() => {
    // 如果從HealthPage傳遞了患者名稱，則使用該患者，否則默認選擇第一個
    return patientName ? getPatientIdByName(patientName) : MOCK_PATIENTS[0].id
  })
  const [selectedTab, setSelectedTab] = useState("today")
  const [autoNotification, setAutoNotification] = useState(true)
  const [showRecordModal, setShowRecordModal] = useState(false)
  const [recordForm, setRecordForm] = useState({
    status: DIAPER_STATUS.DRY.value,
    nurse: "nurse_a"
  })
  const [connected, setConnected] = useState(false)
  const clientRef = useRef<mqtt.MqttClient | null>(null)

  // 雲端 MQTT 相關狀態
  const [cloudConnected, setCloudConnected] = useState(false)
  const [cloudMqttData, setCloudMqttData] = useState<CloudMqttData[]>([])
  const cloudClientRef = useRef<mqtt.MqttClient | null>(null)

  // 雲端尿布設備管理狀態
  const [cloudDiaperDevices, setCloudDiaperDevices] = useState<CloudDiaperDevice[]>([])
  const [cloudDiaperRecords, setCloudDiaperRecords] = useState<CloudDiaperRecord[]>([])
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
  const [currentMqttTab, setCurrentMqttTab] = useState<string>("local")

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
        console.error("本地 MQTT 訂閱失敗:", err)
      } else {
        console.log("已訂閱本地主題:", MQTT_TOPIC)
      }
    })

    // 本地MQTT消息處理可在此添加
    client.on("message", (topic: string, payload: Uint8Array) => {
      if (topic !== MQTT_TOPIC) return
      try {
        const msg = JSON.parse(new TextDecoder().decode(payload))
        console.log("收到本地 MQTT 尿布消息:", msg)
        // 處理本地尿布數據...
      } catch (error) {
        console.error('本地 MQTT 尿布訊息解析錯誤:', error)
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
        clientId: `web-diaper-client-${Math.random().toString(16).slice(2, 8)}`
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
          console.log("收到雲端 MQTT 尿布消息:", msg)

          // 處理雲端 MQTT 數據
          const cloudData: CloudMqttData = {
            content: msg.content || "",
            gateway_id: msg["gateway id"] || "",
            MAC: msg.MAC || "",
            receivedAt: new Date()
          }

          // 添加詳細的調試信息
          console.log("==== 雲端MQTT尿布數據解析 ====")
          console.log("原始數據:", msg)
          console.log("Content:", msg.content)
          console.log("MAC:", msg.MAC)
          console.log("Humidity (humi):", msg.humi)
          console.log("Temperature (temp):", msg.temp)
          console.log("Battery Level:", msg["battery level"])

          // 根據 content 判斷數據類型並提取相應字段
          if (msg.content === "diaper DV1") {
            console.log("處理 diaper DV1 數據...")
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

            // 檢查尿布設備記錄創建條件
            console.log("檢查尿布設備記錄創建條件:")
            console.log("- MAC存在:", !!msg.MAC)
            console.log("- humi存在:", !!msg.humi)
            console.log("- humi值:", msg.humi)
            console.log("- temp值:", msg.temp)

            // 只要有MAC就創建尿布設備記錄
            if (msg.MAC) {
              const humi = parseFloat(msg.humi) || 0
              const temp = parseFloat(msg.temp) || 0
              const fw_ver = parseFloat(msg["fw ver"]) || 0
              const button = parseInt(msg.button) || 0
              const msg_idx = parseInt(msg["msg idx"]) || 0
              const ack = parseInt(msg.ack) || 0
              const battery_level = parseInt(msg["battery level"]) || 0
              const serial_no = parseInt(msg["serial no"]) || 0

              console.log("創建尿布設備記錄:")
              console.log("- MAC:", msg.MAC)
              console.log("- 設備名稱:", msg.name)
              console.log("- 濕度:", humi, "%")
              console.log("- 溫度:", temp, "°C")
              console.log("- 電量:", battery_level, "%")

              const cloudDiaperRecord: CloudDiaperRecord = {
                MAC: msg.MAC,
                deviceName: msg.name || `設備 ${msg.MAC.slice(-8)}`,
                name: msg.name || "",
                fw_ver: fw_ver,
                temp: temp,
                humi: humi,
                button: button,
                msg_idx: msg_idx,
                ack: ack,
                battery_level: battery_level,
                serial_no: serial_no,
                time: new Date().toISOString(),
                datetime: new Date(),
                isAbnormal: humi > 65 // 關鍵邏輯：濕度 > 75 時需要更換
              }

              console.log("尿布設備記錄:", cloudDiaperRecord)

              // 更新雲端尿布設備記錄
              setCloudDiaperRecords(prev => {
                const newRecords = [cloudDiaperRecord, ...prev]
                  .sort((a, b) => b.datetime.getTime() - a.datetime.getTime())
                  .slice(0, 1000)
                console.log("更新後的尿布設備記錄數量:", newRecords.length)
                return newRecords
              })

              // 更新尿布設備列表
              setCloudDiaperDevices(prev => {
                const existingDevice = prev.find(d => d.MAC === msg.MAC)
                console.log("現有尿布設備:", existingDevice)

                if (existingDevice) {
                  const updatedDevices = prev.map(d =>
                    d.MAC === msg.MAC
                      ? {
                        ...d,
                        lastSeen: new Date(),
                        recordCount: d.recordCount + 1,
                        currentHumidity: humi,
                        currentTemperature: temp,
                        currentBatteryLevel: battery_level
                      }
                      : d
                  )
                  console.log("更新現有尿布設備，總設備數:", updatedDevices.length)
                  return updatedDevices
                } else {
                  const newDevice: CloudDiaperDevice = {
                    MAC: msg.MAC,
                    deviceName: msg.name || `設備 ${msg.MAC.slice(-8)}`,
                    name: msg.name || "",
                    lastSeen: new Date(),
                    recordCount: 1,
                    currentHumidity: humi,
                    currentTemperature: temp,
                    currentBatteryLevel: battery_level
                  }
                  const updatedDevices = [...prev, newDevice]
                  console.log("添加新尿布設備:", newDevice)
                  console.log("更新後總設備數:", updatedDevices.length)
                  return updatedDevices
                }
              })

              // 如果還沒有選擇設備，自動選擇第一個
              setSelectedCloudDevice(prev => {
                if (!prev) {
                  console.log("自動選擇尿布設備:", msg.MAC)
                  return msg.MAC
                }
                return prev
              })
            } else {
              console.log("⚠️ diaper DV1 數據缺少MAC字段，無法創建尿布設備記錄")
            }
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
          console.error('雲端 MQTT 尿布訊息解析錯誤:', error)
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
  }, [selectedGateway, CLOUD_MQTT_URL, CLOUD_MQTT_OPTIONS])

  const currentPatient = patients.find(p => p.id === selectedPatient) || patients[0]

  // 獲取當前雲端設備的狀態，用於判斷是否需要換尿布
  const currentCloudDevice = selectedCloudDevice && cloudDiaperDevices.length > 0
    ? cloudDiaperDevices.find(device => device.MAC === selectedCloudDevice)
    : null

  // 根據當前MQTT標籤頁決定是否需要更換尿布
  const needsChange = currentMqttTab === "cloud"
    ? (currentCloudDevice ? currentCloudDevice.currentHumidity > 75 : false)
    : currentPatient.currentHumidity > 75

  // 獲取濕度狀態
  const getHumidityStatus = (humidity: number) => {
    if (humidity < 30) return DIAPER_STATUS.DRY
    if (humidity < 50) return DIAPER_STATUS.SLIGHTLY_WET
    if (humidity < 75) return DIAPER_STATUS.WET
    return DIAPER_STATUS.VERY_WET
  }

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

  return (
    <div className="space-y-6">
      {/* 頁面標題 */}
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold flex items-center">
          <Droplets className="mr-3 h-8 w-8 text-blue-500" />
          尿布監測
        </h1>
        {patientName && (
          <div className="mb-3 p-3 bg-purple-50 border border-purple-200 rounded-lg">
            <p className="text-purple-800 text-sm font-medium">
              👶 從健康監控頁面導航 - 當前患者: {patientName}
            </p>
          </div>
        )}
        <p className="text-muted-foreground">
          即時監測長者尿布濕度狀態，確保舒適與健康
        </p>
        <div className="text-sm space-y-2 bg-gray-50 p-4 rounded-lg">
          <div className="font-semibold">連線狀態監控</div>
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <span>本地 MQTT ({MQTT_URL}):</span>
              <span className={connected ? "text-green-600 font-medium" : "text-red-500 font-medium"}>
                {localConnectionStatus}
              </span>
            </div>
            {localError && (
              <div className="text-xs text-red-500 ml-4">
                錯誤: {localError}
              </div>
            )}
            <div className="flex items-center justify-between">
              <span>雲端 MQTT ({CLOUD_MQTT_URL.split('.')[0]}...):</span>
              <span className={cloudConnected ? "text-green-600 font-medium" : "text-red-500 font-medium"}>
                {cloudConnectionStatus}
              </span>
            </div>
            {cloudError && (
              <div className="text-xs text-red-500 ml-4">
                錯誤: {cloudError}
              </div>
            )}
          </div>
          <div className="flex items-center justify-between mt-3">
            <div className="text-xs text-gray-500">
              提示：本地MQTT需要運行在localhost:9001，雲端MQTT會自動連接到HiveMQ雲服務
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
                重連本地
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
                重連雲端
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* 主要功能標籤頁 */}
      <Tabs defaultValue="local" className="w-full" value={currentMqttTab} onValueChange={setCurrentMqttTab}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="local">本地 MQTT</TabsTrigger>
          <TabsTrigger value="cloud">雲端 MQTT</TabsTrigger>
        </TabsList>

        {/* 本地 MQTT 標籤頁 */}
        <TabsContent value="local" className="space-y-6">
          {/* 患者選擇 */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg flex items-center">
                  <User className="mr-3 h-5 w-5 text-blue-500" />
                  患者選擇
                </CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <Select value={selectedPatient} onValueChange={setSelectedPatient}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="選擇患者" />
                </SelectTrigger>
                <SelectContent>
                  {patients.map(patient => (
                    <SelectItem key={patient.id} value={patient.id}>
                      患者：{patient.name}
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
                  <Droplets className="mr-3 h-5 w-5 text-blue-500" />
                  雲端尿布設備監控
                </CardTitle>
                <div className="text-sm">
                  {cloudConnected ? (
                    <span className="text-green-600 flex items-center">
                      <div className="w-2 h-2 bg-green-500 rounded-full mr-2 animate-pulse"></div>
                      連線正常
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
                  <div className="font-medium text-gray-900">選擇監控區域：</div>

                  {/* 橫排選擇器 */}
                  <div className="flex flex-col sm:flex-row gap-4">
                    {/* 養老院選擇 */}
                    <div className="flex-1 space-y-2">
                      <label className="text-sm font-medium text-gray-700">養老院</label>
                      <Select value={selectedHome} onValueChange={setSelectedHome}>
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="選擇養老院" />
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
                      <label className="text-sm font-medium text-gray-700">樓層</label>
                      <Select value={selectedFloor} onValueChange={setSelectedFloor} disabled={!selectedHome}>
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder={selectedHome ? "選擇樓層" : "請先選擇養老院"} />
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
                      <label className="text-sm font-medium text-gray-700">閘道器</label>
                      <Select value={selectedGateway} onValueChange={setSelectedGateway} disabled={!selectedFloor}>
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder={selectedFloor ? "選擇閘道器" : "請先選擇樓層"} />
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
                        <div className="font-medium text-blue-800">當前選擇的閘道器：</div>
                        <div className="text-xs text-blue-700">
                          {gateways.find(gw => gw.id === selectedGateway)?.name}
                          ({gateways.find(gw => gw.id === selectedGateway)?.macAddress})
                        </div>
                        <div className="text-xs text-blue-600">
                          監聽主題: {getHealthTopic() || "無法獲取主題"}
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                  <div className="bg-blue-50 p-3 rounded-lg">
                    <div className="font-medium text-blue-800">已發現設備</div>
                    <div className="text-2xl font-bold text-blue-600">{cloudDiaperDevices.length}</div>
                  </div>
                  <div className="bg-green-50 p-3 rounded-lg">
                    <div className="font-medium text-green-800">總記錄數</div>
                    <div className="text-2xl font-bold text-green-600">{cloudDiaperRecords.length}</div>
                  </div>
                  <div className="bg-purple-50 p-3 rounded-lg">
                    <div className="font-medium text-purple-800">MQTT消息</div>
                    <div className="text-2xl font-bold text-purple-600">{cloudMqttData.length}</div>
                  </div>
                </div>

                {cloudDiaperDevices.length > 0 ? (
                  <div className="space-y-3">
                    <div className="font-medium">選擇監控設備：</div>
                    <Select value={selectedCloudDevice} onValueChange={setSelectedCloudDevice}>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="選擇雲端尿布設備進行詳細監控" />
                      </SelectTrigger>
                      <SelectContent>
                        {cloudDiaperDevices.map(device => (
                          <SelectItem key={device.MAC} value={device.MAC}>
                            <div className="flex items-center justify-between w-full">
                              <span>{device.deviceName}</span>
                              <span className="text-xs text-muted-foreground ml-2">
                                ({device.MAC.slice(-8)}) - 濕度: {device.currentHumidity}%
                              </span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <Droplets className="mx-auto h-8 w-8 mb-2 opacity-50" />
                    <p className="font-medium">尚未發現任何雲端尿布設備</p>
                    <div className="text-xs space-y-1 mt-2">
                      <p>請確認：</p>
                      <p>1. 雲端 MQTT 模擬器已啟動</p>
                      <p>2. 模擬器發送 content: "diaper DV1" 格式的數據</p>
                      <p>3. 數據包含 MAC 和濕度相關字段</p>
                    </div>
                  </div>
                )}

                {/* 最近接收到的雲端數據 */}
                {cloudMqttData.length > 0 && (
                  <div className="mt-6 space-y-2">
                    <div className="font-medium">最近收到的數據：</div>
                    <div className="max-h-40 overflow-y-auto space-y-1">
                      {cloudMqttData.slice(0, 8).map((data, index) => (
                        <div key={index} className="text-xs bg-gray-50 p-2 rounded border">
                          <div className="flex items-center justify-between">
                            <span className="font-mono font-semibold text-blue-600">{data.content}</span>
                            <span className="text-muted-foreground">
                              {data.receivedAt.toLocaleTimeString('zh-TW')}
                            </span>
                          </div>
                          {data.MAC && data.content === "diaper DV1" && (
                            <div className="text-muted-foreground mt-1">
                              設備: <span className="font-mono">{data.MAC}</span>
                              {data.name && ` (${data.name})`}
                              {data.humi && ` | 濕度: ${data.humi}%`}
                              {data.temp && ` | 溫度: ${data.temp}°C`}
                              {data.battery_level && ` | 電量: ${data.battery_level}%`}
                            </div>
                          )}
                          {data.content !== "diaper DV1" && (
                            <div className="text-muted-foreground mt-1">
                              其他設備數據 - MAC: {data.MAC || "無"}
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
                        <div className="font-semibold mb-1">尿布設備創建條件檢查：</div>
                        <div>• 必須有 content: "diaper DV1"</div>
                        <div>• 必須有 MAC 字段</div>
                        <div>• humi, temp, battery level 字段可以為空或0（已放寬條件）</div>
                        <div>• 濕度 &gt; 75% 時會觸發換尿布警告</div>
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
                  設備監測記錄 - {cloudDiaperDevices.find(d => d.MAC === selectedCloudDevice)?.deviceName}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {/* 設備記錄列表 */}
                  <div className="space-y-3 max-h-96 overflow-y-auto">
                    {cloudDiaperRecords
                      .filter(record => record.MAC === selectedCloudDevice)
                      .slice(0, 20)
                      .map((record, index) => (
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
                                <div>
                                  濕度: {record.humi > 0 ? `${record.humi}%` : "無數據"}
                                  {record.temp > 0 && ` | 溫度: ${record.temp}°C`}
                                </div>
                                <div className="text-xs text-muted-foreground">
                                  電量: {record.battery_level}% |
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
                              ? '無濕度數據'
                              : record.humi > 75
                                ? '需要更換'
                                : record.humi > 50
                                  ? '潮濕'
                                  : '正常'}
                          </div>
                        </div>
                      ))}
                  </div>

                  {/* 顯示雲端設備統計信息 */}
                  {currentCloudDevice && (
                    <div className="mt-4 p-4 bg-blue-50 rounded-lg">
                      <div className="text-sm space-y-2">
                        <div className="font-semibold text-blue-800">設備統計信息</div>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
                          <div>
                            <span className="text-muted-foreground">設備MAC:</span>
                            <div className="font-mono">{currentCloudDevice.MAC}</div>
                          </div>
                          <div>
                            <span className="text-muted-foreground">最後連接:</span>
                            <div>{currentCloudDevice.lastSeen.toLocaleString('zh-TW')}</div>
                          </div>
                          <div>
                            <span className="text-muted-foreground">記錄總數:</span>
                            <div>{currentCloudDevice.recordCount} 筆</div>
                          </div>
                          <div>
                            <span className="text-muted-foreground">當前狀態:</span>
                            <div className={currentCloudDevice.currentHumidity > 75 ? "text-red-600 font-medium" : "text-green-600"}>
                              {currentCloudDevice.currentHumidity > 75 ? "需要關注" : "正常"}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      {/* 時間範圍標籤 */}
      <Tabs value={selectedTab} onValueChange={setSelectedTab}>
        <TabsList>
          <TabsTrigger value="today">今日</TabsTrigger>
          <TabsTrigger value="week">本週</TabsTrigger>
          <TabsTrigger value="month">本月</TabsTrigger>
        </TabsList>

        <TabsContent value={selectedTab} className="mt-6 space-y-6">
          {/* 當前尿布狀態 */}
          {needsChange && (
            <Card className="border-red-200 bg-red-50 dark:bg-red-900/20">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">當前尿布狀態</span>
                    <div className="flex items-center gap-2">
                      <span>自動通知</span>
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
                        需要更換尿布！
                      </h3>
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <span className="text-sm">濕度:</span>
                          <Progress
                            value={currentMqttTab === "cloud"
                              ? (currentCloudDevice ? currentCloudDevice.currentHumidity : 0)
                              : currentPatient.currentHumidity
                            }
                            className="flex-1 max-w-[200px]"
                          />
                          <span className="text-sm font-medium">
                            {currentMqttTab === "cloud"
                              ? (currentCloudDevice ? `${currentCloudDevice.currentHumidity}%` : "無數據")
                              : `${currentPatient.currentHumidity}%`
                            }
                          </span>
                        </div>
                        <div className="text-sm text-muted-foreground space-y-1">
                          <p>
                            設備: {currentMqttTab === "cloud"
                              ? (currentCloudDevice ? currentCloudDevice.deviceName : "未選擇設備")
                              : currentPatient.name
                            }
                          </p>
                          {currentMqttTab === "cloud" && currentCloudDevice && (
                            <p>MAC: {currentCloudDevice.MAC}</p>
                          )}
                          <p>
                            上次更換時間: {currentMqttTab === "local" && currentPatient.records.length > 0 ?
                              `${currentPatient.records[0].timestamp} (${getTimeDifference(currentPatient.lastUpdate)})` :
                              '無記錄'
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
                    記錄尿布更換
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
                    <p className="text-sm text-muted-foreground">濕度</p>
                    <p className="text-2xl font-bold">
                      {currentMqttTab === "cloud"
                        ? (currentCloudDevice ? `${currentCloudDevice.currentHumidity}%` : "無數據")
                        : `${currentPatient.currentHumidity}%`
                      }
                    </p>
                    {currentMqttTab === "cloud" && currentCloudDevice && currentCloudDevice.currentHumidity > 75 && (
                      <Badge className="bg-red-100 text-red-700 mt-1">需要更換</Badge>
                    )}
                    {currentMqttTab === "local" && currentPatient.currentHumidity > 75 && (
                      <Badge className="bg-red-100 text-red-700 mt-1">需要更換</Badge>
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
                    <p className="text-sm text-muted-foreground">溫度</p>
                    <p className="text-2xl font-bold">
                      {currentMqttTab === "cloud"
                        ? (currentCloudDevice ? `${currentCloudDevice.currentTemperature}°C` : "無數據")
                        : `${currentPatient.temperature}°C`
                      }
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
                    <p className="text-sm text-muted-foreground">電量</p>
                    <p className="text-2xl font-bold">
                      {currentMqttTab === "cloud"
                        ? (currentCloudDevice ? `${currentCloudDevice.currentBatteryLevel}%` : "無數據")
                        : `${currentPatient.batteryLevel}%`
                      }
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* 尿布更換記錄 */}
          <Card>
            <CardHeader>
              <CardTitle>尿布更換記錄</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {currentPatient.records.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">暫無更換記錄</p>
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
                            狀態: {record.status.label}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          更換人: {record.nurse}
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
              <CardTitle>記錄尿布更換</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <label className="text-sm font-medium mb-3 block">尿布狀態</label>
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
                <label className="text-sm font-medium mb-3 block">護理人員</label>
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
                  取消
                </Button>
                <Button
                  onClick={handleRecordChange}
                  className="flex-1"
                >
                  確認
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}