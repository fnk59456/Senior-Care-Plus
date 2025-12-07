import { useEffect, useMemo, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from "recharts"
import {
  Heart,
  Thermometer,
  Activity,
  Clock,
  AlertTriangle,
  MapPin,
  Baby,
  Watch,
  Settings
} from "lucide-react"
import { useLocation } from "react-router-dom"
import { useTranslation } from "react-i18next"
import { useUWBLocation } from "@/contexts/UWBLocationContext"
import { useDeviceManagement } from "@/contexts/DeviceManagementContext"
import { DeviceType } from "@/types/device-types"
import { mqttBus } from "@/services/mqttBus"

// 心率範圍
const NORMAL_HEART_RATE_MIN = 60
const NORMAL_HEART_RATE_MAX = 100
const TARGET_HEART_RATE = 75

// 血壓範圍
const NORMAL_BP_SYST_MAX = 120
const NORMAL_BP_DIAST_MAX = 80
const HIGH_BP_SYST = 140
const HIGH_BP_DIAST = 90

// 體溫範圍
const NORMAL_TEMP_MIN = 36.0
const NORMAL_TEMP_MAX = 37.5

type BaseMqttData = {
  content: string
  MAC: string
  receivedAt: Date
  topic: string
  gateway?: string
  gatewayId?: string
  topicGateway?: string
  hr?: number
  SpO2?: number
  bp_syst?: number
  bp_diast?: number
  skin_temp?: number
  room_temp?: number
  steps?: number
  light_sleep?: number
  deep_sleep?: number
  battery_level?: number
}

type HeartRecord = {
  MAC: string
  deviceName: string
  hr: number
  SpO2: number
  bp_syst: number
  bp_diast: number
  skin_temp: number
  room_temp: number
  steps: number
  battery_level: number
  time: string
  datetime: Date
  isAbnormal: boolean
  gateway?: string
  gatewayId?: string
  topic?: string
  topicGateway?: string
  residentId?: string
  residentName?: string
  residentRoom?: string
  residentStatus?: string
  deviceType?: DeviceType
}

type TempRecord = {
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
  gateway?: string
  gatewayId?: string
  topic?: string
  topicGateway?: string
  residentId?: string
  residentName?: string
  residentRoom?: string
  residentStatus?: string
  deviceType?: DeviceType
}

type CloudDevice = {
  MAC: string
  deviceName: string
  lastSeen: Date
  recordCount: number
  gateway?: string
  gatewayId?: string
  topic?: string
  topicGateway?: string
  residentId?: string
  residentName?: string
  residentRoom?: string
  residentStatus?: string
  deviceType?: DeviceType
}

export default function HeartTemperaturePage() {
  const { t } = useTranslation()
  const location = useLocation()
  const patientName = location.state?.patientName

  // UWB 區域狀態
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

  // 設備管理上下文
  const { devices, getResidentForDevice } = useDeviceManagement()

  // 共用工具
  const getResidentInfoByMAC = (mac: string) => {
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

  const getDeviceTypeIcon = (deviceType?: DeviceType) => {
    switch (deviceType) {
      case DeviceType.SMARTWATCH_300B:
        return <Watch className="h-4 w-4" />
      case DeviceType.DIAPER_SENSOR:
        return <Baby className="h-4 w-4" />
      case DeviceType.UWB_TAG:
        return <MapPin className="h-4 w-4" />
      default:
        return <Settings className="h-4 w-4" />
    }
  }

  const getStatusInfo = (status?: string) => {
    switch (status) {
      case "active":
        return { badge: t("status:device.status.active"), bgColor: "bg-green-50" }
      case "inactive":
        return { badge: t("status:device.status.inactive"), bgColor: "bg-red-50" }
      case "warning":
        return { badge: t("status:device.status.error"), bgColor: "bg-yellow-50" }
      default:
        return { badge: t("status:device.status.offline"), bgColor: "bg-gray-50" }
    }
  }

  // 心率狀態
  const [heartDevices, setHeartDevices] = useState<CloudDevice[]>([])
  const [heartDeviceRecords, setHeartDeviceRecords] = useState<HeartRecord[]>([])
  const [heartMqttData, setHeartMqttData] = useState<BaseMqttData[]>([])
  const [selectedHeartDevice, setSelectedHeartDevice] = useState<string>("")
  const [heartRecordFilter, setHeartRecordFilter] = useState<string>("all")
  const [heartTimeRange, setHeartTimeRange] = useState<string>("1day")
  const [heartTab, setHeartTab] = useState<string>("today")
  const [showReferenceLines, setShowReferenceLines] = useState<boolean>(true)

  // 體溫狀態
  const [tempDevices, setTempDevices] = useState<CloudDevice[]>([])
  const [tempDeviceRecords, setTempDeviceRecords] = useState<TempRecord[]>([])
  const [tempMqttData, setTempMqttData] = useState<BaseMqttData[]>([])
  const [selectedTempDevice, setSelectedTempDevice] = useState<string>("")
  const [tempRecordFilter, setTempRecordFilter] = useState<string>("all")
  const [tempTimeRange, setTempTimeRange] = useState<string>("1day")
  const [tempTab, setTempTab] = useState<string>("today")

  // MQTT 連線狀態
  const [cloudConnected, setCloudConnected] = useState(false)
  const [cloudConnectionStatus, setCloudConnectionStatus] = useState<string>("未連線")

  // MQTT 狀態監聽
  useEffect(() => {
    const unsubscribe = mqttBus.onStatusChange((status) => {
      setCloudConnected(status === "connected")
      setCloudConnectionStatus(
        status === "connected"
          ? t("pages:heartRate.connectionStatus.connected")
          : status === "connecting"
            ? t("pages:heartRate.connectionStatus.connecting")
            : status === "reconnecting"
              ? t("pages:heartRate.connectionStatus.reconnecting")
              : status === "error"
                ? t("pages:heartRate.connectionStatus.connectionError")
                : t("pages:heartRate.connectionStatus.disconnected")
      )
    })

    const currentStatus = mqttBus.getStatus()
    setCloudConnected(currentStatus === "connected")
    setCloudConnectionStatus(
      currentStatus === "connected"
        ? t("pages:heartRate.connectionStatus.connected")
        : t("pages:heartRate.connectionStatus.disconnected")
    )

    return unsubscribe
  }, [t])

  // Gateway 變更時重置選擇
  useEffect(() => {
    setSelectedHeartDevice("")
    setSelectedTempDevice("")
  }, [selectedGateway])

  // MQTT 數據處理（統一來源）
  useEffect(() => {
    let lastProcessedTime = 0
    let processedMessages = new Set<string>()
    let lastUpdateTime = 0

    const updateMqttData = () => {
      const now = Date.now()
      if (now - lastUpdateTime < 5000) return

      try {
        const recentMessages = mqttBus.getRecentMessages()
        const newMessages = recentMessages.filter(msg => {
          const msgTime = msg.timestamp.getTime()
          const key = `${msg.topic}-${msgTime}`
          return msgTime > lastProcessedTime && !processedMessages.has(key)
        })

        if (newMessages.length === 0) return

        lastProcessedTime = Math.max(...newMessages.map(msg => msg.timestamp.getTime()))
        newMessages.forEach(msg => processedMessages.add(`${msg.topic}-${msg.timestamp.getTime()}`))

        const formatted = newMessages
          .filter(msg => msg.payload?.content === "300B")
          .map(msg => {
            const data = msg.payload
            const MAC = data.MAC || data["mac address"] || data.macAddress || ""
            return {
              content: data.content || "unknown",
              MAC,
              receivedAt: msg.timestamp,
              topic: msg.topic,
              gateway: msg.gateway?.name || "",
              gatewayId: msg.gateway?.id || "",
              topicGateway: msg.topic?.match(/GW[A-F0-9]+/)?.[0] || "",
              hr: data.hr ? Number(data.hr) : 0,
              SpO2: data.SpO2 ? Number(data.SpO2) : 0,
              bp_syst: data["bp syst"] ? Number(data["bp syst"]) : 0,
              bp_diast: data["bp diast"] ? Number(data["bp diast"]) : 0,
              skin_temp: data["skin temp"] ? Number(data["skin temp"]) : 0,
              room_temp: data["room temp"] ? Number(data["room temp"]) : 0,
              steps: data.steps ? Number(data.steps) : 0,
              light_sleep: data["light sleep (min)"] ? Number(data["light sleep (min)"]) : 0,
              deep_sleep: data["deep sleep (min)"] ? Number(data["deep sleep (min)"]) : 0,
              battery_level: data["battery level"] ? Number(data["battery level"]) : 0
            } as BaseMqttData
          })
          .filter(item => item.MAC)

        if (formatted.length === 0) return

        // 更新原始列表
        setHeartMqttData(prev => {
          const combined = [...formatted, ...prev]
            .sort((a, b) => b.receivedAt.getTime() - a.receivedAt.getTime())
            .slice(0, 50)
          return combined
        })
        setTempMqttData(prev => {
          const combined = [...formatted, ...prev]
            .sort((a, b) => b.receivedAt.getTime() - a.receivedAt.getTime())
            .slice(0, 50)
          return combined
        })

        formatted.forEach(data => {
          const residentInfo = getResidentInfoByMAC(data.MAC)

          const heartRecord: HeartRecord = {
            MAC: data.MAC,
            deviceName: residentInfo?.residentName ? `${residentInfo.residentName} (${residentInfo.residentRoom})` : `設備 ${data.MAC.slice(-8)}`,
            hr: data.hr || 0,
            SpO2: data.SpO2 || 0,
            bp_syst: data.bp_syst || 0,
            bp_diast: data.bp_diast || 0,
            skin_temp: data.skin_temp || 0,
            room_temp: data.room_temp || 0,
            steps: data.steps || 0,
            battery_level: data.battery_level || 0,
            time: data.receivedAt.toISOString(),
            datetime: data.receivedAt,
            isAbnormal: (data.hr || 0) > 0 && ((data.hr || 0) > NORMAL_HEART_RATE_MAX || (data.hr || 0) < NORMAL_HEART_RATE_MIN),
            gateway: data.gateway,
            gatewayId: data.gatewayId,
            topic: data.topic,
            topicGateway: data.topicGateway,
            ...residentInfo
          }

          const tempRecord: TempRecord = {
            MAC: data.MAC,
            deviceName: residentInfo?.residentName ? `${residentInfo.residentName} (${residentInfo.residentRoom})` : `設備 ${data.MAC.slice(-8)}`,
            skin_temp: data.skin_temp || 0,
            room_temp: data.room_temp || 0,
            steps: data.steps || 0,
            light_sleep: data.light_sleep || 0,
            deep_sleep: data.deep_sleep || 0,
            battery_level: data.battery_level || 0,
            time: data.receivedAt.toISOString(),
            datetime: data.receivedAt,
            isAbnormal: (data.skin_temp || 0) > 0 && ((data.skin_temp || 0) > NORMAL_TEMP_MAX || (data.skin_temp || 0) < NORMAL_TEMP_MIN),
            gateway: data.gateway,
            gatewayId: data.gatewayId,
            topic: data.topic,
            topicGateway: data.topicGateway,
            ...residentInfo
          }

          setHeartDeviceRecords(prev => {
            const combined = [heartRecord, ...prev]
              .sort((a, b) => b.datetime.getTime() - a.datetime.getTime())
              .slice(0, 1000)
            return combined
          })

          setTempDeviceRecords(prev => {
            const combined = [tempRecord, ...prev]
              .sort((a, b) => b.datetime.getTime() - a.datetime.getTime())
              .slice(0, 1000)
            return combined
          })

          setHeartDevices(prev => {
            const existing = prev.find(d => d.MAC === data.MAC)
            if (existing) {
              return prev.map(d =>
                d.MAC === data.MAC
                  ? { ...d, lastSeen: data.receivedAt, recordCount: d.recordCount + 1, ...residentInfo }
                  : d
              )
            }
            const newDevice: CloudDevice = {
              MAC: data.MAC,
              deviceName: residentInfo?.residentName ? `${residentInfo.residentName} (${residentInfo.residentRoom})` : `設備 ${data.MAC.slice(-8)}`,
              lastSeen: data.receivedAt,
              recordCount: 1,
              gateway: data.gateway,
              gatewayId: data.gatewayId,
              topic: data.topic,
              topicGateway: data.topicGateway,
              ...residentInfo
            }
            return [...prev, newDevice]
          })

          setTempDevices(prev => {
            const existing = prev.find(d => d.MAC === data.MAC)
            if (existing) {
              return prev.map(d =>
                d.MAC === data.MAC
                  ? { ...d, lastSeen: data.receivedAt, recordCount: d.recordCount + 1, ...residentInfo }
                  : d
              )
            }
            const newDevice: CloudDevice = {
              MAC: data.MAC,
              deviceName: residentInfo?.residentName ? `${residentInfo.residentName} (${residentInfo.residentRoom})` : `設備 ${data.MAC.slice(-8)}`,
              lastSeen: data.receivedAt,
              recordCount: 1,
              gateway: data.gateway,
              gatewayId: data.gatewayId,
              topic: data.topic,
              topicGateway: data.topicGateway,
              ...residentInfo
            }
            return [...prev, newDevice]
          })

          setSelectedHeartDevice(prev => prev || data.MAC)
          setSelectedTempDevice(prev => prev || data.MAC)
        })

        const oneHourAgo = Date.now() - 60 * 60 * 1000
        const toDelete: string[] = []
        processedMessages.forEach(key => {
          const ts = Number(String(key).split("-").pop() || "0")
          if (ts < oneHourAgo) toDelete.push(String(key))
        })
        toDelete.forEach(key => processedMessages.delete(key))

        lastUpdateTime = Date.now()
      } catch (error) {
        console.error("Error processing MQTT data:", error)
      }
    }

    updateMqttData()
    const interval = setInterval(updateMqttData, 10000)
    return () => clearInterval(interval)
  }, [])

  // 心率資料整理
  const filteredHeartRecords = useMemo(() => {
    let filtered = [...heartDeviceRecords.filter(r => selectedHeartDevice ? r.MAC === selectedHeartDevice : true)]
    if (heartTimeRange !== "1day") {
      const now = new Date()
      const days = heartTimeRange === "3day" ? 3 : 7
      const cutoff = new Date(now.getTime() - days * 24 * 60 * 60 * 1000)
      filtered = filtered.filter(r => r.datetime >= cutoff)
    }
    if (heartRecordFilter === "high") filtered = filtered.filter(r => r.hr > NORMAL_HEART_RATE_MAX)
    if (heartRecordFilter === "low") filtered = filtered.filter(r => r.hr < NORMAL_HEART_RATE_MIN)
    if (heartRecordFilter === "highBP") filtered = filtered.filter(r => (r.bp_syst && r.bp_syst >= HIGH_BP_SYST) || (r.bp_diast && r.bp_diast >= HIGH_BP_DIAST))
    if (heartRecordFilter === "lowBP") filtered = filtered.filter(r => (r.bp_syst && r.bp_syst < 90) || (r.bp_diast && r.bp_diast < 60))
    return filtered
  }, [heartDeviceRecords, heartRecordFilter, heartTimeRange, selectedHeartDevice])

  const heartChartData = useMemo(() => {
    return filteredHeartRecords
      .slice(0, 144)
      .reverse()
      .map(record => ({
        time: record.time,
        hour: record.datetime.toLocaleTimeString("zh-TW", { hour: "2-digit", minute: "2-digit" }),
        heart_rate: record.hr,
        isAbnormal: record.isAbnormal,
        bp_syst: record.bp_syst || 0,
        bp_diast: record.bp_diast || 0
      }))
  }, [filteredHeartRecords])

  // 體溫資料整理
  const filteredTempRecords = useMemo(() => {
    let filtered = [...tempDeviceRecords.filter(r => selectedTempDevice ? r.MAC === selectedTempDevice : true)]
    if (tempTimeRange !== "1day") {
      const now = new Date()
      const days = tempTimeRange === "3day" ? 3 : 7
      const cutoff = new Date(now.getTime() - days * 24 * 60 * 60 * 1000)
      filtered = filtered.filter(r => r.datetime >= cutoff)
    }
    if (tempRecordFilter === "high") filtered = filtered.filter(r => r.skin_temp > NORMAL_TEMP_MAX)
    if (tempRecordFilter === "low") filtered = filtered.filter(r => r.skin_temp < NORMAL_TEMP_MIN)
    return filtered
  }, [tempDeviceRecords, tempRecordFilter, tempTimeRange, selectedTempDevice])

  const tempChartData = useMemo(() => {
    return filteredTempRecords
      .slice(0, 144)
      .reverse()
      .map(record => ({
        time: record.time,
        hour: record.datetime.toLocaleTimeString("zh-TW", { hour: "2-digit", minute: "2-digit" }),
        temperature: record.skin_temp,
        isAbnormal: record.isAbnormal
      }))
  }, [filteredTempRecords])

  const getDateString = (tab: string) => {
    const now = new Date()
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    if (tab === "yesterday") return new Date(today.getTime() - 24 * 60 * 60 * 1000).toLocaleDateString("zh-TW")
    if (tab === "dayBefore") return new Date(today.getTime() - 2 * 24 * 60 * 60 * 1000).toLocaleDateString("zh-TW")
    return today.toLocaleDateString("zh-TW")
  }

  const getHealthTopic = () => {
    if (!selectedGateway) return null
    const gateway = gateways.find(gw => gw.id === selectedGateway)
    if (gateway?.cloudData?.pub_topic?.health) return gateway.cloudData.pub_topic.health
    if (gateway) {
      const gatewayName = gateway.name.replace(/\s+/g, "")
      return `UWB/GW${gatewayName}_Health`
    }
    return null
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold mb-4 flex items-center">
          <Heart className="mr-3 h-8 w-8 text-pink-500" />
          {t("pages:heartTemp.title")}
        </h1>
        {patientName && (
          <div className="mb-3 p-3 bg-pink-50 border border-pink-200 rounded-lg">
            <p className="text-pink-800 text-sm font-medium">
              {t("pages:heartRate.navigationFromHealth")} - {t("pages:heartRate.currentPatient")}: {patientName}
            </p>
          </div>
        )}
        <p className="text-muted-foreground mb-4">
          {t("pages:heartTemp.subtitle")}
        </p>
        <div className="text-sm space-y-2 bg-gray-50 p-4 rounded-lg">
          <div className="font-semibold">{t("pages:heartRate.connectionStatus.title")}</div>
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <span>{t("pages:heartRate.connectionStatus.cloudMqtt")}:</span>
              <span className={cloudConnected ? "text-green-600 font-medium" : "text-red-500 font-medium"}>
                {cloudConnectionStatus}
              </span>
            </div>
          </div>
        </div>
      </div>

      <Tabs defaultValue="heart" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="heart">{t("pages:heartTemp.tabs.heart")}</TabsTrigger>
          <TabsTrigger value="temp">{t("pages:heartTemp.tabs.temp")}</TabsTrigger>
        </TabsList>

        <TabsContent value="heart" className="space-y-6">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg flex items-center">
                  <AlertTriangle className="mr-3 h-5 w-5 text-pink-500" />
                  {t("pages:heartRate.cloudDeviceMonitoring.title")}
                </CardTitle>
                <div className="text-sm">
                  <span className={cloudConnected ? "text-green-600 flex items-center" : "text-red-500 flex items-center"}>
                    <div className={`w-2 h-2 rounded-full mr-2 ${cloudConnected ? "bg-green-500 animate-pulse" : "bg-red-500"}`}></div>
                    {cloudConnectionStatus}
                  </span>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex flex-col sm:flex-row gap-4">
                  <div className="flex-1 space-y-2">
                    <label className="text-sm font-medium text-gray-700">{t("pages:heartRate.cloudDeviceMonitoring.selectNursingHome")}</label>
                    <Select value={selectedHome || ""} onValueChange={setSelectedHome}>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder={t("pages:heartRate.cloudDeviceMonitoring.selectNursingHomeFirst")} />
                      </SelectTrigger>
                      <SelectContent>
                        {homes.map(home => (
                          <SelectItem key={home.id} value={home.id}>{home.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex-1 space-y-2">
                    <label className="text-sm font-medium text-gray-700">{t("pages:heartRate.cloudDeviceMonitoring.selectFloor")}</label>
                    <Select value={selectedFloor || ""} onValueChange={setSelectedFloor} disabled={!selectedHome}>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder={selectedHome ? t("pages:heartRate.cloudDeviceMonitoring.selectFloorFirst") : t("pages:heartRate.cloudDeviceMonitoring.selectNursingHomeFirst")} />
                      </SelectTrigger>
                      <SelectContent>
                        {floors.filter(f => f.homeId === selectedHome).map(floor => (
                          <SelectItem key={floor.id} value={floor.id}>{floor.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex-1 space-y-2">
                    <label className="text-sm font-medium text-gray-700">{t("pages:heartRate.cloudDeviceMonitoring.selectGateway")}</label>
                    <Select value={selectedGateway || ""} onValueChange={setSelectedGateway} disabled={!selectedFloor}>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder={selectedFloor ? t("pages:heartRate.cloudDeviceMonitoring.selectGateway") : t("pages:heartRate.cloudDeviceMonitoring.selectFloorFirst")} />
                      </SelectTrigger>
                      <SelectContent>
                        {gateways.filter(g => g.floorId === selectedFloor).map(gateway => (
                          <SelectItem key={gateway.id} value={gateway.id}>
                            <div className="flex items-center justify-between w-full">
                              <span>{gateway.name}</span>
                              <span className="text-xs text-muted-foreground ml-2">{gateway.macAddress}</span>
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
                      <div className="font-medium text-pink-800">{t("pages:heartRate.cloudDeviceMonitoring.currentGateway")}</div>
                      <div className="text-xs text-pink-700">
                        {gateways.find(gw => gw.id === selectedGateway)?.name} ({gateways.find(gw => gw.id === selectedGateway)?.macAddress})
                      </div>
                      <div className="text-xs text-pink-600">
                        {t("pages:heartRate.cloudDeviceMonitoring.listeningTopic")}: {getHealthTopic() || t("pages:heartRate.cloudDeviceMonitoring.cannotGetTopic")}
                      </div>
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                  <div className="bg-pink-50 p-3 rounded-lg">
                    <div className="font-medium text-pink-800">{t("pages:heartRate.cloudDeviceMonitoring.discoveredDevices")}</div>
                    <div className="text-2xl font-bold text-pink-600">{heartDevices.length}</div>
                  </div>
                  <div className="bg-green-50 p-3 rounded-lg">
                    <div className="font-medium text-green-800">{t("pages:heartRate.cloudDeviceMonitoring.totalRecords")}</div>
                    <div className="text-2xl font-bold text-green-600">{heartDeviceRecords.length}</div>
                  </div>
                  <div className="bg-purple-50 p-3 rounded-lg">
                    <div className="font-medium text-purple-800">{t("pages:heartRate.connectionStatus.title")}</div>
                    <div className="text-2xl font-bold text-purple-600">{cloudConnected ? t("pages:heartRate.connectionStatus.connected") : t("pages:heartRate.connectionStatus.disconnected")}</div>
                  </div>
                </div>

                {heartDevices.length > 0 ? (
                  <div className="space-y-3">
                    <div className="font-medium">{t("pages:heartRate.cloudDeviceMonitoring.selectDevice")}</div>
                    <div className="border rounded-lg divide-y max-h-[520px] overflow-y-auto">
                      {heartDevices
                        .filter(device => {
                          if (selectedGateway) {
                            const gateway = gateways.find(gw => gw.id === selectedGateway)
                            if (gateway) {
                              const deviceRecords = heartDeviceRecords.filter(record => record.MAC === device.MAC)
                              return deviceRecords.some(record => {
                                const recordGatewayPrefix = record.gateway?.split("_")[0] || ""
                                const selectedGatewayPrefix = gateway.name?.split("_")[0] || ""
                                return recordGatewayPrefix && selectedGatewayPrefix && recordGatewayPrefix === selectedGatewayPrefix
                              })
                            }
                          }
                          return true
                        })
                        .map(device => {
                          const statusInfo = getStatusInfo(device.residentStatus)
                          const isSelected = selectedHeartDevice === device.MAC
                          return (
                            <button
                              key={device.MAC}
                              onClick={() => setSelectedHeartDevice(device.MAC)}
                              className={`w-full text-left px-3 py-2 flex items-center justify-between hover:bg-pink-50 transition ${isSelected ? "bg-pink-50 border-l-4 border-pink-400" : ""}`}
                              aria-pressed={isSelected}
                            >
                              <div className="flex items-center gap-2">
                                {getDeviceTypeIcon(device.deviceType)}
                                <span>{device.residentName || device.deviceName}</span>
                                {device.residentRoom && <span className="text-xs text-muted-foreground">({device.residentRoom})</span>}
                              </div>
                              <div className="flex items-center gap-2">
                                <span className={`px-2 py-1 rounded-full text-xs ${statusInfo.bgColor}`}>{statusInfo.badge}</span>
                                <span className="text-xs text-muted-foreground">{device.recordCount} {t("pages:heartRate.cloudDeviceMonitoring.records")}</span>
                              </div>
                            </button>
                          )
                        })}
                    </div>
                    <div className="text-xs text-muted-foreground">{t("common:actions.scrollForMore")}</div>
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <AlertTriangle className="mx-auto h-8 w-8 mb-2 opacity-50" />
                    <p className="font-medium">{t("pages:heartRate.cloudDeviceMonitoring.noDevices")}</p>
                  </div>
                )}

                {heartMqttData.length > 0 && (
                  <div className="mt-6 space-y-2">
                    <div className="font-medium">{t("pages:heartRate.recentMqttData.title")}</div>
                    <div className="max-h-40 overflow-y-auto space-y-1">
                      {heartMqttData.slice(0, 8).map((data, index) => (
                        <div key={index} className="text-xs bg-gray-50 p-2 rounded border">
                          <div className="flex items-center justify-between">
                            <span className="font-mono font-semibold text-pink-600">{data.content}</span>
                            <span className="text-muted-foreground">{data.receivedAt.toLocaleTimeString("zh-TW")}</span>
                          </div>
                          {data.MAC && (
                            <div className="text-muted-foreground mt-1">
                              {t("pages:heartRate.recentMqttData.device")}: <span className="font-mono">{data.MAC}</span>
                              {data.hr && ` | ${t("pages:heartRate.recentMqttData.heartRate")}: ${data.hr} BPM`}
                              {data.SpO2 && ` | ${t("pages:heartRate.recentMqttData.spo2")}: ${data.SpO2}%`}
                              {data.bp_syst && data.bp_diast && ` | ${t("pages:heartRate.recentMqttData.bloodPressure")}: ${data.bp_syst}/${data.bp_diast}`}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* 原始數據檢視器 - 用於調試 */}
                <div className="mt-4">
                  <details className="group">
                    <summary className="cursor-pointer font-medium text-sm text-muted-foreground hover:text-foreground">
                      🔍 {t("pages:heartRate.rawMqttData.title")}
                    </summary>
                    <div className="mt-2 space-y-2 text-xs">
                      <div className="text-muted-foreground">
                        {t("pages:heartRate.rawMqttData.clickToExpand")}
                      </div>
                      <div className="max-h-60 overflow-y-auto space-y-2">
                        {heartMqttData.slice(0, 5).map((data, index) => (
                          <details key={index} className="border rounded p-2 bg-slate-50">
                            <summary className="cursor-pointer font-mono text-xs hover:bg-slate-100 p-1 rounded">
                              [{index + 1}] {data.content} - {data.receivedAt.toLocaleString("zh-TW")}
                            </summary>
                            <pre className="mt-2 text-xs overflow-x-auto whitespace-pre-wrap bg-white p-2 rounded border">
                              {JSON.stringify({
                                content: data.content,
                                topic: data.topic,
                                gateway: data.gateway,
                                MAC: data.MAC,
                                receivedAt: data.receivedAt,
                                hr: data.hr,
                                SpO2: data.SpO2,
                                bp_syst: data.bp_syst,
                                bp_diast: data.bp_diast,
                                skin_temp: data.skin_temp,
                                room_temp: data.room_temp,
                                steps: data.steps,
                                light_sleep: data.light_sleep,
                                deep_sleep: data.deep_sleep,
                                battery_level: data.battery_level
                              }, null, 2)}
                            </pre>
                          </details>
                        ))}
                      </div>
                    </div>
                  </details>
                </div>
              </div>
            </CardContent>
          </Card>

          {selectedHeartDevice && heartDeviceRecords.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Heart className="mr-2 h-5 w-5" />
                  {t("pages:heartRate.deviceHeartRateData.title")} - {(() => {
                    const device = heartDevices.find(d => d.MAC === selectedHeartDevice)
                    return device?.residentName ? `${device.residentName} (${device.residentRoom})` : device?.deviceName || t("pages:heartRate.deviceHeartRateData.unknownDevice")
                  })()}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="space-y-3 max-h-80 overflow-y-auto">
                    {heartDeviceRecords.filter(record => record.MAC === selectedHeartDevice).slice(0, 20).map((record, index) => (
                      <div key={index} className="flex items-center justify-between p-3 rounded-lg border">
                        <div className="flex items-center gap-3">
                          <div className={`p-2 rounded-full ${record.hr > NORMAL_HEART_RATE_MAX
                            ? "bg-red-100 text-red-600"
                            : record.hr < NORMAL_HEART_RATE_MIN && record.hr > 0
                              ? "bg-blue-100 text-blue-600"
                              : "bg-green-100 text-green-600"
                            }`}>
                            {record.isAbnormal ? <AlertTriangle className="h-4 w-4" /> : <Heart className="h-4 w-4" />}
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
                                {t("pages:heartRate.deviceHeartRateData.heartRate")}: {record.hr > 0 ? `${record.hr} BPM` : t("pages:heartRate.deviceHeartRateData.noData")}
                                {record.SpO2 > 0 && ` | ${t("pages:heartRate.deviceHeartRateData.spo2")}: ${record.SpO2}%`}
                              </div>
                              {(record.bp_syst > 0 || record.bp_diast > 0) && (
                                <div>
                                  {t("pages:heartRate.deviceHeartRateData.bloodPressure")}: {record.bp_syst || "-"}{"/"}{record.bp_diast || "-"} mmHg
                                  {record.skin_temp > 0 && ` | ${t("pages:heartRate.deviceHeartRateData.skinTemperature")}: ${record.skin_temp}°C`}
                                </div>
                              )}
                              <div className="text-xs text-muted-foreground">
                                {t("pages:heartRate.deviceHeartRateData.steps")}: {record.steps} | {t("pages:heartRate.deviceHeartRateData.battery")}: {record.battery_level}%
                              </div>
                            </div>
                          </div>
                        </div>
                        <div className={`px-3 py-1 rounded-full text-sm font-medium ${record.hr === 0
                          ? "bg-gray-100 text-gray-700"
                          : record.hr > NORMAL_HEART_RATE_MAX
                            ? "bg-red-100 text-red-700"
                            : record.hr < NORMAL_HEART_RATE_MIN
                              ? "bg-blue-100 text-blue-700"
                              : "bg-green-100 text-green-700"
                          }`}>
                          {record.hr === 0
                            ? t("pages:heartRate.deviceHeartRateData.noHeartRateData")
                            : record.hr > NORMAL_HEART_RATE_MAX
                              ? t("pages:heartRate.deviceHeartRateData.heartRateHigh")
                              : record.hr < NORMAL_HEART_RATE_MIN
                                ? t("pages:heartRate.deviceHeartRateData.heartRateLow")
                                : t("pages:heartRate.deviceHeartRateData.normal")}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          <Tabs value={heartTab} onValueChange={setHeartTab}>
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="today">{t("pages:heartRate.dateTabs.today")}</TabsTrigger>
              <TabsTrigger value="yesterday">{t("pages:heartRate.dateTabs.yesterday")}</TabsTrigger>
              <TabsTrigger value="dayBefore">{t("pages:heartRate.dateTabs.dayBefore")}</TabsTrigger>
            </TabsList>
            <TabsContent value={heartTab} className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span className="flex items-center">
                      <Heart className="mr-2 h-5 w-5" />
                      {t("pages:heartRate.heartRateTrendChart.title")}
                    </span>
                    <div className="flex items-center gap-3">
                      <Button variant={showReferenceLines ? "default" : "outline"} size="sm" onClick={() => setShowReferenceLines(!showReferenceLines)} className="text-xs">
                        {showReferenceLines ? t("pages:heartRate.heartRateChart.hideReferenceLines") : t("pages:heartRate.heartRateChart.showReferenceLines")}
                      </Button>
                      <span className="text-sm text-muted-foreground">{getDateString(heartTab)}</span>
                    </div>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {heartChartData.length > 0 ? (
                    <div className="h-80">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={heartChartData}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="hour" tick={{ fontSize: 12 }} interval="preserveStartEnd" />
                          <YAxis domain={["dataMin - 5", "dataMax + 5"]} tick={{ fontSize: 12 }} label={{ value: t("pages:heartRate.heartRateChart.yAxisLabel"), angle: -90, position: "insideLeft" }} />
                          <Tooltip
                            labelFormatter={(value) => `${t("pages:heartRate.heartRateChart.time")}: ${value}`}
                            formatter={(value, name) => {
                              if (name === "heart_rate") return [`${value} BPM`, t("pages:heartRate.heartRateChart.legend.heartRate")]
                              if (name === "bp_syst") return [`${value} mmHg`, t("pages:heartRate.heartRateChart.legend.systolicBP")]
                              if (name === "bp_diast") return [`${value} mmHg`, t("pages:heartRate.heartRateChart.legend.diastolicBP")]
                              return [`${value}`, name]
                            }}
                          />
                          {showReferenceLines && (
                            <>
                              <ReferenceLine y={TARGET_HEART_RATE} stroke="#ec4899" strokeDasharray="5 5" label={`${t("pages:heartRate.heartRateChart.targetHeartRate")}: 75 BPM`} />
                              <ReferenceLine y={NORMAL_HEART_RATE_MAX} stroke="#ef4444" strokeDasharray="5 5" label={t("pages:heartRate.heartRateChart.highHeartRateLine")} />
                              <ReferenceLine y={NORMAL_HEART_RATE_MIN} stroke="#3b82f6" strokeDasharray="5 5" label={t("pages:heartRate.heartRateChart.lowHeartRateLine")} />
                            </>
                          )}
                          <Line type="monotone" dataKey="heart_rate" stroke="#ec4899" strokeWidth={2} dot={{ fill: "#ec4899", strokeWidth: 2, r: 4 }} activeDot={{ r: 6 }} />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  ) : (
                    <div className="h-80 flex items-center justify-center text-muted-foreground">
                      <div className="text-center">
                        <Heart className="mx-auto h-12 w-12 mb-4 opacity-50" />
                        <p>{t("pages:heartRate.heartRateChart.noData", { date: getDateString(heartTab) })}</p>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Clock className="mr-2 h-5 w-5" />
                    {t("pages:heartRate.heartRateRecords.title")}
                  </CardTitle>
                  <div className="flex gap-4 pt-4">
                    <div className="flex gap-2">
                      <Button variant={heartRecordFilter === "all" ? "default" : "outline"} size="sm" onClick={() => setHeartRecordFilter("all")}>{t("pages:heartRate.heartRateRecords.filters.all")}</Button>
                      <Button variant={heartRecordFilter === "high" ? "default" : "outline"} size="sm" onClick={() => setHeartRecordFilter("high")} className="text-red-600 border-red-600 hover:bg-red-50">{t("pages:heartRate.heartRateRecords.filters.high")}</Button>
                      <Button variant={heartRecordFilter === "low" ? "default" : "outline"} size="sm" onClick={() => setHeartRecordFilter("low")} className="text-blue-600 border-blue-600 hover:bg-blue-50">{t("pages:heartRate.heartRateRecords.filters.low")}</Button>
                      <Button variant={heartRecordFilter === "highBP" ? "default" : "outline"} size="sm" onClick={() => setHeartRecordFilter("highBP")} className="text-red-600 border-red-600 hover:bg-red-50">{t("pages:heartRate.heartRateRecords.filters.highBP")}</Button>
                      <Button variant={heartRecordFilter === "lowBP" ? "default" : "outline"} size="sm" onClick={() => setHeartRecordFilter("lowBP")} className="text-purple-600 border-purple-600 hover:bg-purple-50">{t("pages:heartRate.heartRateRecords.filters.lowBP")}</Button>
                    </div>
                    <div className="flex gap-2">
                      <Button variant={heartTimeRange === "1day" ? "default" : "outline"} size="sm" onClick={() => setHeartTimeRange("1day")}>{t("pages:heartRate.heartRateRecords.timeRanges.1day")}</Button>
                      <Button variant={heartTimeRange === "3day" ? "default" : "outline"} size="sm" onClick={() => setHeartTimeRange("3day")}>{t("pages:heartRate.heartRateRecords.timeRanges.3day")}</Button>
                      <Button variant={heartTimeRange === "7day" ? "default" : "outline"} size="sm" onClick={() => setHeartTimeRange("7day")}>{t("pages:heartRate.heartRateRecords.timeRanges.7day")}</Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3 max-h-96 overflow-y-auto">
                    {filteredHeartRecords.length > 0 ? (
                      filteredHeartRecords.map((record, index) => (
                        <div key={index} className="flex items-center justify-between p-3 rounded-lg border">
                          <div className="flex items-center gap-3">
                            <div className={`p-2 rounded-full ${record.hr > NORMAL_HEART_RATE_MAX ? "bg-red-100 text-red-600" : record.hr < NORMAL_HEART_RATE_MIN ? "bg-blue-100 text-blue-600" : "bg-green-100 text-green-600"}`}>
                              {record.isAbnormal ? <AlertTriangle className="h-4 w-4" /> : <Heart className="h-4 w-4" />}
                            </div>
                            <div>
                              <div className="font-medium">{record.datetime.toLocaleString("zh-TW")}</div>
                              <div className="text-sm text-muted-foreground">
                                {record.hr > 0 ? `${record.hr} BPM` : t("pages:heartRate.heartRateRecords.noHeartRateData")}
                                {record.skin_temp > 0 && <span className="ml-2">| {t("pages:heartRate.heartRateRecords.temperature")}: {record.skin_temp}°C</span>}
                                {(record.bp_syst && record.bp_syst > 0) && (record.bp_diast && record.bp_diast > 0) && (
                                  <span className="ml-2">| {t("pages:heartRate.heartRateRecords.bloodPressure")}: {record.bp_syst}/{record.bp_diast} mmHg</span>
                                )}
                              </div>
                            </div>
                          </div>
                          <div className={`px-3 py-1 rounded-full text-sm font-medium ${record.hr === 0 ? "bg-gray-100 text-gray-700" : record.hr > NORMAL_HEART_RATE_MAX ? "bg-red-100 text-red-700" : record.hr < NORMAL_HEART_RATE_MIN ? "bg-blue-100 text-blue-700" : "bg-green-100 text-green-700"}`}>
                            {record.hr === 0
                              ? t("pages:heartRate.heartRateRecords.noHeartRateData")
                              : record.hr > NORMAL_HEART_RATE_MAX
                                ? t("pages:heartRate.heartRateRecords.heartRateHigh")
                                : record.hr < NORMAL_HEART_RATE_MIN
                                  ? t("pages:heartRate.heartRateRecords.heartRateLow")
                                  : t("pages:heartRate.heartRateRecords.normal")}
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="text-center py-8 text-muted-foreground">
                        <Clock className="mx-auto h-8 w-8 mb-2 opacity-50" />
                        <p>{t("pages:heartRate.heartRateRecords.noRecords")}</p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </TabsContent>

        <TabsContent value="temp" className="space-y-6">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg flex items-center">
                  <AlertTriangle className="mr-3 h-5 w-5 text-blue-500" />
                  {t("pages:temperature.cloudDeviceMonitoring.title")}
                </CardTitle>
                <div className="text-sm">
                  <span className={cloudConnected ? "text-green-600 flex items-center" : "text-red-500 flex items-center"}>
                    <div className={`w-2 h-2 rounded-full mr-2 ${cloudConnected ? "bg-green-500 animate-pulse" : "bg-red-500"}`}></div>
                    {cloudConnectionStatus}
                  </span>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex flex-col sm:flex-row gap-4">
                  <div className="flex-1 space-y-2">
                    <label className="text-sm font-medium text-gray-700">{t("pages:location.selectArea.nursingHome")}</label>
                    <Select value={selectedHome || ""} onValueChange={setSelectedHome}>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder={t("pages:location.selectArea.selectNursingHome")} />
                      </SelectTrigger>
                      <SelectContent>
                        {homes.map(home => (
                          <SelectItem key={home.id} value={home.id}>{home.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex-1 space-y-2">
                    <label className="text-sm font-medium text-gray-700">{t("pages:location.selectArea.floor")}</label>
                    <Select value={selectedFloor || ""} onValueChange={setSelectedFloor} disabled={!selectedHome}>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder={selectedHome ? t("pages:location.selectArea.selectFloor") : t("pages:temperature.cloudDeviceMonitoring.selectNursingHomeFirst")} />
                      </SelectTrigger>
                      <SelectContent>
                        {floors.filter(floor => floor.homeId === selectedHome).map(floor => (
                          <SelectItem key={floor.id} value={floor.id}>{floor.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex-1 space-y-2">
                    <label className="text-sm font-medium text-gray-700">{t("pages:location.selectArea.gateway")}</label>
                    <Select value={selectedGateway || ""} onValueChange={setSelectedGateway} disabled={!selectedFloor}>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder={selectedFloor ? t("pages:location.selectArea.selectGateway") : t("pages:temperature.cloudDeviceMonitoring.selectFloorFirst")} />
                      </SelectTrigger>
                      <SelectContent>
                        {gateways.filter(gateway => gateway.floorId === selectedFloor).map(gateway => (
                          <SelectItem key={gateway.id} value={gateway.id}>
                            <div className="flex items-center justify-between w-full">
                              <span>{gateway.name}</span>
                              <span className="text-xs text-muted-foreground ml-2">{gateway.macAddress}</span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {selectedGateway && (
                  <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                    <div className="text-sm space-y-1">
                      <div className="font-medium text-blue-800">{t("pages:temperature.cloudDeviceMonitoring.currentGateway")}</div>
                      <div className="text-xs text-blue-700">
                        {gateways.find(gw => gw.id === selectedGateway)?.name} ({gateways.find(gw => gw.id === selectedGateway)?.macAddress})
                      </div>
                      <div className="text-xs text-blue-600">
                        {t("pages:temperature.cloudDeviceMonitoring.listeningTopic")}: {getHealthTopic() || t("pages:temperature.cloudDeviceMonitoring.cannotGetTopic")}
                      </div>
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                  <div className="bg-blue-50 p-3 rounded-lg">
                    <div className="font-medium text-blue-800">{t("pages:temperature.cloudDeviceMonitoring.discoveredDevices")}</div>
                    <div className="text-2xl font-bold text-blue-600">{tempDevices.length}</div>
                  </div>
                  <div className="bg-green-50 p-3 rounded-lg">
                    <div className="font-medium text-green-800">{t("pages:temperature.cloudDeviceMonitoring.totalRecords")}</div>
                    <div className="text-2xl font-bold text-green-600">{tempDeviceRecords.length}</div>
                  </div>
                  <div className="bg-purple-50 p-3 rounded-lg">
                    <div className="font-medium text-purple-800">{t("pages:temperature.cloudDeviceMonitoring.mqttMessages")}</div>
                    <div className="text-2xl font-bold text-purple-600">{tempMqttData.length}</div>
                  </div>
                </div>

                {tempDevices.length > 0 ? (
                  <div className="space-y-3">
                    <div className="font-medium">{t("pages:temperature.cloudDeviceMonitoring.selectDevice")}</div>
                    <div className="border rounded-lg divide-y max-h-[520px] overflow-y-auto">
                      {tempDevices
                        .filter(device => {
                          if (selectedGateway) {
                            const gateway = gateways.find(gw => gw.id === selectedGateway)
                            if (gateway) {
                              const deviceRecords = tempDeviceRecords.filter(record => record.MAC === device.MAC)
                              const hasMatchingRecord = deviceRecords.some(record => {
                                const recordGateway = record.gateway || ""
                                const gatewayName = gateway.name || ""
                                const gatewayMac = gateway.macAddress || ""
                                const macSuffix = gatewayMac.replace(/:/g, "").slice(-4).toUpperCase()
                                return recordGateway.includes(macSuffix) || recordGateway.toUpperCase().includes(gatewayName.split("_")[0].toUpperCase())
                              })
                              return hasMatchingRecord
                            }
                          }
                          return true
                        })
                        .map(device => {
                          const statusInfo = getStatusInfo(device.residentStatus)
                          const isSelected = selectedTempDevice === device.MAC
                          return (
                            <button
                              key={device.MAC}
                              onClick={() => setSelectedTempDevice(device.MAC)}
                              className={`w-full text-left px-3 py-2 flex items-center justify-between hover:bg-blue-50 transition ${isSelected ? "bg-blue-50 border-l-4 border-blue-400" : ""}`}
                              aria-pressed={isSelected}
                            >
                              <div className="flex items-center gap-2">
                                {getDeviceTypeIcon(device.deviceType)}
                                <span>{device.residentName || device.deviceName}</span>
                                {device.residentRoom && <span className="text-xs text-muted-foreground">({device.residentRoom})</span>}
                              </div>
                              <div className="flex items-center gap-2">
                                <span className={`px-2 py-1 rounded-full text-xs ${statusInfo.bgColor}`}>{statusInfo.badge}</span>
                                <span className="text-xs text-muted-foreground">{device.recordCount} {t("pages:temperature.cloudDeviceMonitoring.records")}</span>
                              </div>
                            </button>
                          )
                        })}
                    </div>
                    <div className="text-xs text-muted-foreground">{t("common:actions.scrollForMore")}</div>
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <AlertTriangle className="mx-auto h-8 w-8 mb-2 opacity-50" />
                    <p className="font-medium">{t("pages:temperature.cloudDeviceMonitoring.noDevices")}</p>
                  </div>
                )}

                {tempMqttData.length > 0 && (
                  <div className="mt-6 space-y-2">
                    <div className="font-medium">{t("pages:temperature.cloudDeviceMonitoring.recentData")}</div>
                    <div className="max-h-40 overflow-y-auto space-y-1">
                      {tempMqttData.slice(0, 8).map((data, index) => (
                        <div key={index} className="text-xs bg-gray-50 p-2 rounded border">
                          <div className="flex items-center justify-between">
                            <span className="font-mono font-semibold text-blue-600">{data.content}</span>
                            <span className="text-muted-foreground">{data.receivedAt.toLocaleTimeString("zh-TW")}</span>
                          </div>
                          {data.MAC && (
                            <div className="text-muted-foreground mt-1">
                              {t("pages:temperature.cloudDeviceMonitoring.device")}: <span className="font-mono">{data.MAC}</span>
                              {data.skin_temp && ` | ${t("pages:temperature.cloudDeviceMonitoring.temperature")}: ${data.skin_temp}°C`}
                              {data.room_temp && ` | ${t("pages:temperature.cloudDeviceMonitoring.roomTemperature")}: ${data.room_temp}°C`}
                              {data.battery_level && ` | ${t("pages:temperature.cloudDeviceMonitoring.battery")}: ${data.battery_level}%`}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* 原始數據檢視器 - 用於調試 */}
                <div className="mt-4">
                  <details className="group">
                    <summary className="cursor-pointer font-medium text-sm text-muted-foreground hover:text-foreground">
                      🔍 {t("pages:temperature.cloudDeviceMonitoring.viewRawData")}
                    </summary>
                    <div className="mt-2 space-y-2 text-xs">
                      <div className="text-muted-foreground">
                        {t("pages:temperature.cloudDeviceMonitoring.clickToExpand")}
                      </div>
                      <div className="max-h-60 overflow-y-auto space-y-2">
                        {tempMqttData.slice(0, 5).map((data, index) => (
                          <details key={index} className="border rounded p-2 bg-slate-50">
                            <summary className="cursor-pointer font-mono text-xs hover:bg-slate-100 p-1 rounded">
                              [{index + 1}] {data.content} - {data.receivedAt.toLocaleString("zh-TW")}
                            </summary>
                            <pre className="mt-2 text-xs overflow-x-auto whitespace-pre-wrap bg-white p-2 rounded border">
                              {JSON.stringify({
                                content: data.content,
                                topic: data.topic,
                                gateway: data.gateway,
                                MAC: data.MAC,
                                receivedAt: data.receivedAt,
                                hr: data.hr,
                                SpO2: data.SpO2,
                                bp_syst: data.bp_syst,
                                bp_diast: data.bp_diast,
                                skin_temp: data.skin_temp,
                                room_temp: data.room_temp,
                                steps: data.steps,
                                light_sleep: data.light_sleep,
                                deep_sleep: data.deep_sleep,
                                battery_level: data.battery_level
                              }, null, 2)}
                            </pre>
                          </details>
                        ))}
                      </div>
                    </div>
                  </details>
                </div>
              </div>
            </CardContent>
          </Card>

          {selectedTempDevice && tempDeviceRecords.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Thermometer className="mr-2 h-5 w-5" />
                  {t("pages:temperature.deviceTemperatureData.title")} - {(() => {
                    const device = tempDevices.find(d => d.MAC === selectedTempDevice)
                    return device?.residentName ? `${device.residentName} (${device.residentRoom})` : device?.deviceName || t("pages:temperature.deviceTemperatureData.unknownDevice")
                  })()}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="space-y-3 max-h-80 overflow-y-auto">
                    {tempDeviceRecords.filter(record => record.MAC === selectedTempDevice).slice(0, 20).map((record, index) => (
                      <div key={index} className="flex items-center justify-between p-3 rounded-lg border">
                        <div className="flex items-center gap-3">
                          <div className={`p-2 rounded-full ${record.skin_temp > NORMAL_TEMP_MAX
                            ? "bg-red-100 text-red-600"
                            : record.skin_temp < NORMAL_TEMP_MIN
                              ? "bg-blue-100 text-blue-600"
                              : "bg-green-100 text-green-600"
                            }`}>
                            {record.isAbnormal ? <AlertTriangle className="h-4 w-4" /> : <Thermometer className="h-4 w-4" />}
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
                              {t("pages:temperature.deviceTemperatureData.skinTemperature")}: {record.skin_temp}°C | {t("pages:temperature.deviceTemperatureData.roomTemperature")}: {record.room_temp}°C
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {t("pages:temperature.deviceTemperatureData.steps")}: {record.steps} | {t("pages:temperature.deviceTemperatureData.battery")}: {record.battery_level}%
                            </div>
                          </div>
                        </div>
                        <div className={`px-3 py-1 rounded-full text-sm font-medium ${record.skin_temp > NORMAL_TEMP_MAX
                          ? "bg-red-100 text-red-700"
                          : record.skin_temp < NORMAL_TEMP_MIN
                            ? "bg-blue-100 text-blue-700"
                            : "bg-green-100 text-green-700"
                          }`}>
                          {record.skin_temp > NORMAL_TEMP_MAX
                            ? t("pages:temperature.deviceTemperatureData.temperatureHigh")
                            : record.skin_temp < NORMAL_TEMP_MIN
                              ? t("pages:temperature.deviceTemperatureData.temperatureLow")
                              : t("pages:temperature.deviceTemperatureData.normal")}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          <Tabs value={tempTab} onValueChange={setTempTab}>
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="today">{t("pages:temperature.dateTabs.today")}</TabsTrigger>
              <TabsTrigger value="yesterday">{t("pages:temperature.dateTabs.yesterday")}</TabsTrigger>
              <TabsTrigger value="dayBefore">{t("pages:temperature.dateTabs.dayBefore")}</TabsTrigger>
            </TabsList>
            <TabsContent value={tempTab} className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span className="flex items-center">
                      <Activity className="mr-2 h-5 w-5" />
                      {t("pages:temperature.temperatureChart.title")}
                    </span>
                    <span className="text-sm text-muted-foreground">{getDateString(tempTab)}</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {tempChartData.length > 0 ? (
                    <div className="h-80">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={tempChartData}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="hour" tick={{ fontSize: 12 }} interval="preserveStartEnd" />
                          <YAxis domain={["dataMin - 1", "dataMax + 1"]} tick={{ fontSize: 12 }} label={{ value: t("pages:temperature.temperatureChart.yAxisLabel"), angle: -90, position: "insideLeft" }} />
                          <Tooltip labelFormatter={(value) => `${t("pages:temperature.temperatureChart.time")}: ${value}`} formatter={(value) => [`${value}°C`, t("pages:temperature.temperatureChart.temperature")]} />
                          <ReferenceLine y={NORMAL_TEMP_MAX} stroke="#ef4444" strokeDasharray="5 5" label={t("pages:temperature.temperatureChart.highTempLine")} />
                          <ReferenceLine y={NORMAL_TEMP_MIN} stroke="#3b82f6" strokeDasharray="5 5" label={t("pages:temperature.temperatureChart.lowTempLine")} />
                          <Line type="monotone" dataKey="temperature" stroke="#8884d8" strokeWidth={2} dot={{ fill: "#8884d8", strokeWidth: 2, r: 4 }} activeDot={{ r: 6 }} />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  ) : (
                    <div className="h-80 flex items-center justify-center text-muted-foreground">
                      <div className="text-center">
                        <Thermometer className="mx-auto h-12 w-12 mb-4 opacity-50" />
                        <p>{t("pages:temperature.temperatureChart.noData", { date: getDateString(tempTab) })}</p>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Clock className="mr-2 h-5 w-5" />
                    {t("pages:temperature.temperatureRecords.title")}
                  </CardTitle>
                  <div className="flex gap-4 pt-4">
                    <div className="flex gap-2">
                      <Button variant={tempRecordFilter === "all" ? "default" : "outline"} size="sm" onClick={() => setTempRecordFilter("all")}>{t("pages:temperature.temperatureRecords.filters.all")}</Button>
                      <Button variant={tempRecordFilter === "high" ? "default" : "outline"} size="sm" onClick={() => setTempRecordFilter("high")} className="text-red-600 border-red-600 hover:bg-red-50">{t("pages:temperature.temperatureRecords.filters.high")}</Button>
                      <Button variant={tempRecordFilter === "low" ? "default" : "outline"} size="sm" onClick={() => setTempRecordFilter("low")} className="text-blue-600 border-blue-600 hover:bg-blue-50">{t("pages:temperature.temperatureRecords.filters.low")}</Button>
                    </div>
                    <div className="flex gap-2">
                      <Button variant={tempTimeRange === "1day" ? "default" : "outline"} size="sm" onClick={() => setTempTimeRange("1day")}>{t("pages:temperature.temperatureRecords.timeRanges.1day")}</Button>
                      <Button variant={tempTimeRange === "3day" ? "default" : "outline"} size="sm" onClick={() => setTempTimeRange("3day")}>{t("pages:temperature.temperatureRecords.timeRanges.3day")}</Button>
                      <Button variant={tempTimeRange === "7day" ? "default" : "outline"} size="sm" onClick={() => setTempTimeRange("7day")}>{t("pages:temperature.temperatureRecords.timeRanges.7day")}</Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3 max-h-96 overflow-y-auto">
                    {filteredTempRecords.length > 0 ? (
                      filteredTempRecords.map((record, index) => (
                        <div key={index} className="flex items-center justify-between p-3 rounded-lg border">
                          <div className="flex items-center gap-3">
                            <div className={`p-2 rounded-full ${record.skin_temp > NORMAL_TEMP_MAX ? "bg-red-100 text-red-600" : record.skin_temp < NORMAL_TEMP_MIN ? "bg-blue-100 text-blue-600" : "bg-green-100 text-green-600"}`}>
                              {record.isAbnormal ? <AlertTriangle className="h-4 w-4" /> : <Thermometer className="h-4 w-4" />}
                            </div>
                            <div>
                              <div className="font-medium">{record.datetime.toLocaleString("zh-TW")}</div>
                              <div className="text-sm text-muted-foreground">
                                {record.skin_temp > 0 ? `${record.skin_temp}°C` : t("pages:temperature.temperatureRecords.noTemperatureData")}
                                {record.room_temp && record.room_temp > 0 && <span className="ml-2">| {t("pages:temperature.temperatureRecords.roomTemperature")}: {record.room_temp}°C</span>}
                              </div>
                            </div>
                          </div>
                          <div className={`px-3 py-1 rounded-full text-sm font-medium ${record.skin_temp === 0 ? "bg-gray-100 text-gray-700" : record.skin_temp > NORMAL_TEMP_MAX ? "bg-red-100 text-red-700" : record.skin_temp < NORMAL_TEMP_MIN ? "bg-blue-100 text-blue-700" : "bg-green-100 text-green-700"}`}>
                            {record.skin_temp === 0
                              ? t("pages:temperature.temperatureRecords.noTemperatureData")
                              : record.skin_temp > NORMAL_TEMP_MAX
                                ? t("pages:temperature.temperatureRecords.temperatureHigh")
                                : record.skin_temp < NORMAL_TEMP_MIN
                                  ? t("pages:temperature.temperatureRecords.temperatureLow")
                                  : t("pages:temperature.temperatureRecords.normal")}
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="text-center py-8 text-muted-foreground">
                        <Clock className="mx-auto h-8 w-8 mb-2 opacity-50" />
                        <p>{t("pages:temperature.temperatureRecords.noRecords")}</p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </TabsContent>
      </Tabs>
    </div>
  )
}

