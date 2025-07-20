import React, { useEffect, useRef, useState } from "react"
// @ts-ignore
import mqtt from "mqtt"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts'
import { Heart, TrendingUp, Clock, AlertTriangle } from "lucide-react"
import { useLocation } from "react-router-dom"

// 本地 MQTT 設置
const MQTT_URL = "ws://localhost:9001"
const MQTT_TOPIC = "health/data"

// 雲端 MQTT 設置
const CLOUD_MQTT_URL = "wss://067ec32ef1344d3bb20c4e53abdde99a.s1.eu.hivemq.cloud:8884/mqtt"
const CLOUD_MQTT_TOPIC = "UWB/GW16B8_Health"
const CLOUD_MQTT_OPTIONS = {
  username: 'testweb1',
  password: 'Aa000000'
}

// 心率範圍
const NORMAL_HEART_RATE_MIN = 60
const NORMAL_HEART_RATE_MAX = 100
const TARGET_HEART_RATE = 75

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
}

type ChartDataPoint = {
  time: string
  hour: string
  heart_rate: number
  isAbnormal: boolean
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
}

// 雲端設備類型
type CloudDevice = {
  MAC: string
  deviceName: string
  lastSeen: Date
  recordCount: number
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
  const location = useLocation()
  const patientName = location.state?.patientName

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
            temperature: msg.temperature
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
    setCloudConnectionStatus("連接中...")
    setCloudError("")

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

    cloudClient.subscribe(CLOUD_MQTT_TOPIC, (err) => {
      if (err) {
        console.error("雲端 MQTT 訂閱失敗:", err)
      } else {
        console.log("已訂閱雲端主題:", CLOUD_MQTT_TOPIC)
      }
    })

    cloudClient.on("message", (topic: string, payload: Uint8Array) => {
      if (topic !== CLOUD_MQTT_TOPIC) return
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

            console.log("創建心率設備記錄:")
            console.log("- MAC:", msg.MAC)
            console.log("- 心率:", hr, "BPM")
            console.log("- 血氧:", SpO2, "%")
            console.log("- 血壓:", bp_syst, "/", bp_diast, "mmHg")

            const cloudDeviceRecord: CloudDeviceRecord = {
              MAC: msg.MAC,
              deviceName: `設備 ${msg.MAC.slice(-8)}`,
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
              isAbnormal: hr > 0 && (hr > NORMAL_HEART_RATE_MAX || hr < NORMAL_HEART_RATE_MIN)
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
                    ? { ...d, lastSeen: new Date(), recordCount: d.recordCount + 1 }
                    : d
                )
                console.log("更新現有心率設備，總設備數:", updatedDevices.length)
                return updatedDevices
              } else {
                const newDevice: CloudDevice = {
                  MAC: msg.MAC,
                  deviceName: `設備 ${msg.MAC.slice(-8)}`,
                  lastSeen: new Date(),
                  recordCount: 1
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

    return () => {
      console.log("清理雲端 MQTT 連接")
      cloudClient.end()
    }
  }, [])

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
        temperature: record.skin_temp
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
      isAbnormal: record.isAbnormal
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
          心跳監測
        </h1>
        {patientName && (
          <div className="mb-3 p-3 bg-pink-50 border border-pink-200 rounded-lg">
            <p className="text-pink-800 text-sm font-medium">
              💗 從健康監控頁面導航 - 當前患者: {patientName}
            </p>
          </div>
        )}
        <p className="text-muted-foreground mb-4">
          即時監控長者心率變化，及時發現異常情況
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
                  <Avatar className="mr-3 h-8 w-8">
                    <AvatarFallback>{USERS.find(u => u.id === selectedUser)?.name[0] || "?"}</AvatarFallback>
                  </Avatar>
                  患者選擇
                </CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <Select value={selectedUser} onValueChange={setSelectedUser}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="選擇患者" />
                </SelectTrigger>
                <SelectContent>
                  {USERS.map(user => (
                    <SelectItem key={user.id} value={user.id}>
                      患者：{user.name}
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
                  雲端設備監控
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
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                  <div className="bg-pink-50 p-3 rounded-lg">
                    <div className="font-medium text-pink-800">已發現設備</div>
                    <div className="text-2xl font-bold text-pink-600">{cloudDevices.length}</div>
                  </div>
                  <div className="bg-green-50 p-3 rounded-lg">
                    <div className="font-medium text-green-800">總記錄數</div>
                    <div className="text-2xl font-bold text-green-600">{cloudDeviceRecords.length}</div>
                  </div>
                  <div className="bg-purple-50 p-3 rounded-lg">
                    <div className="font-medium text-purple-800">MQTT消息</div>
                    <div className="text-2xl font-bold text-purple-600">{cloudMqttData.length}</div>
                  </div>
                </div>

                {cloudDevices.length > 0 ? (
                  <div className="space-y-3">
                    <div className="font-medium">選擇監控設備：</div>
                    <Select value={selectedCloudDevice} onValueChange={setSelectedCloudDevice}>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="選擇雲端設備進行詳細監控" />
                      </SelectTrigger>
                      <SelectContent>
                        {cloudDevices.map(device => (
                          <SelectItem key={device.MAC} value={device.MAC}>
                            <div className="flex items-center justify-between w-full">
                              <span>{device.deviceName}</span>
                              <span className="text-xs text-muted-foreground ml-2">
                                ({device.MAC.slice(-8)}) - {device.recordCount} 筆記錄
                              </span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <AlertTriangle className="mx-auto h-8 w-8 mb-2 opacity-50" />
                    <p className="font-medium">尚未發現任何雲端設備</p>
                    <div className="text-xs space-y-1 mt-2">
                      <p>請確認：</p>
                      <p>1. 雲端 MQTT 模擬器已啟動</p>
                      <p>2. 模擬器發送 content: "300B" 格式的數據</p>
                      <p>3. 數據包含 MAC 和心率相關字段</p>
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
                        <div className="font-semibold mb-1">設備創建條件檢查：</div>
                        <div>• 必須有 content: "300B"</div>
                        <div>• 必須有 MAC 字段</div>
                        <div>• hr, SpO2, bp_syst, bp_diast 字段可以為空或0（已放寬條件）</div>
                        <div>• diaper DV1 類型數據目前不會創建設備記錄</div>
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
                  設備生命體征數據 - {cloudDevices.find(d => d.MAC === selectedCloudDevice)?.deviceName}
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
                              <div className="font-medium">
                                {record.datetime.toLocaleString('zh-TW')}
                              </div>
                              <div className="text-sm text-muted-foreground space-y-1">
                                <div>
                                  心率: {record.hr > 0 ? `${record.hr} BPM` : "無數據"}
                                  {record.SpO2 > 0 && ` | 血氧: ${record.SpO2}%`}
                                </div>
                                {(record.bp_syst > 0 || record.bp_diast > 0) && (
                                  <div>
                                    血壓: {record.bp_syst || "-"}/{record.bp_diast || "-"} mmHg
                                    {record.skin_temp > 0 && ` | 體溫: ${record.skin_temp}°C`}
                                  </div>
                                )}
                                <div className="text-xs text-muted-foreground">
                                  步數: {record.steps} | 電量: {record.battery_level}%
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
                              ? '無心率數據'
                              : record.hr > NORMAL_HEART_RATE_MAX
                                ? '心率過高'
                                : record.hr < NORMAL_HEART_RATE_MIN
                                  ? '心率過低'
                                  : '正常'}
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
          <TabsTrigger value="today">今日</TabsTrigger>
          <TabsTrigger value="yesterday">昨天</TabsTrigger>
          <TabsTrigger value="dayBefore">前天</TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab} className="space-y-6">
          {/* 心率趨勢圖 */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span className="flex items-center">
                  <TrendingUp className="mr-2 h-5 w-5" />
                  心率趨勢圖
                  {currentMqttTab === "cloud" && selectedCloudDevice && (
                    <span className="ml-2 text-sm font-normal text-pink-600">
                      - {cloudDevices.find(d => d.MAC === selectedCloudDevice)?.deviceName || "雲端設備"}
                    </span>
                  )}
                  {currentMqttTab === "local" && (
                    <span className="ml-2 text-sm font-normal text-green-600">
                      - {USERS.find(u => u.id === selectedUser)?.name || "本地用戶"}
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
                        domain={currentMqttTab === "cloud" ? ['dataMin - 5', 'dataMax + 5'] : [40, 120]}
                        tick={{ fontSize: 12 }}
                        label={{ value: '心率 (BPM)', angle: -90, position: 'insideLeft' }}
                      />
                      <Tooltip
                        labelFormatter={(value) => `時間: ${value}`}
                        formatter={(value, name) => [`${value} BPM`, '心率']}
                      />
                      <ReferenceLine y={TARGET_HEART_RATE} stroke="#ec4899" strokeDasharray="5 5" label="目標心率: 75 BPM" />
                      <ReferenceLine y={NORMAL_HEART_RATE_MAX} stroke="#ef4444" strokeDasharray="5 5" label="高心率警戒線" />
                      <ReferenceLine y={NORMAL_HEART_RATE_MIN} stroke="#3b82f6" strokeDasharray="5 5" label="低心率警戒線" />
                      <Line
                        type="monotone"
                        dataKey="heart_rate"
                        stroke="#ec4899"
                        strokeWidth={2}
                        dot={{ fill: '#ec4899', strokeWidth: 2, r: 4 }}
                        activeDot={{ r: 6 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="h-80 flex items-center justify-center text-muted-foreground">
                  <div className="text-center">
                    <Heart className="mx-auto h-12 w-12 mb-4 opacity-50" />
                    <p>暫無{getDateString()}的心率數據</p>
                    {currentMqttTab === "cloud" ? (
                      <div className="text-sm space-y-1">
                        <p>請確認雲端MQTT模擬器已啟動</p>
                        <p>並選擇有效的雲端設備</p>
                      </div>
                    ) : (
                      <p className="text-sm">請確認本地MQTT模擬器已啟動</p>
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
                心率記錄
                {currentMqttTab === "cloud" && selectedCloudDevice && (
                  <span className="ml-2 text-sm font-normal text-pink-600">
                    - {cloudDevices.find(d => d.MAC === selectedCloudDevice)?.deviceName || "雲端設備"}
                  </span>
                )}
                {currentMqttTab === "local" && (
                  <span className="ml-2 text-sm font-normal text-green-600">
                    - {USERS.find(u => u.id === selectedUser)?.name || "本地用戶"}
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
                    全部
                  </Button>
                  <Button
                    variant={recordFilter === "high" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setRecordFilter("high")}
                    className="text-red-600 border-red-600 hover:bg-red-50"
                  >
                    高心率
                  </Button>
                  <Button
                    variant={recordFilter === "low" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setRecordFilter("low")}
                    className="text-blue-600 border-blue-600 hover:bg-blue-50"
                  >
                    低心率
                  </Button>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant={timeRange === "1day" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setTimeRange("1day")}
                  >
                    1天
                  </Button>
                  <Button
                    variant={timeRange === "3day" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setTimeRange("3day")}
                  >
                    3天
                  </Button>
                  <Button
                    variant={timeRange === "7day" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setTimeRange("7day")}
                  >
                    7天
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
                            {record.heart_rate > 0 ? `${record.heart_rate} BPM` : "無心率數據"}
                            {record.temperature && record.temperature > 0 && (
                              <span className="ml-2">| 體溫: {record.temperature}°C</span>
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
                          ? '無心率數據'
                          : record.heart_rate > NORMAL_HEART_RATE_MAX
                            ? '心率過高'
                            : record.heart_rate < NORMAL_HEART_RATE_MIN
                              ? '心率過低'
                              : '正常'}
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <Clock className="mx-auto h-8 w-8 mb-2 opacity-50" />
                    <p>暫無符合條件的記錄</p>
                    {currentMqttTab === "cloud" && !selectedCloudDevice && (
                      <p className="text-sm mt-2">請先選擇雲端設備</p>
                    )}
                    {currentMqttTab === "cloud" && selectedCloudDevice && currentCloudDeviceRecords.length === 0 && (
                      <p className="text-sm mt-2">所選設備暫無心率數據</p>
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