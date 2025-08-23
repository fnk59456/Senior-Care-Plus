import React, { useEffect, useRef, useState } from "react"
// @ts-ignore
import mqtt from "mqtt"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { useUWBLocation } from "@/contexts/UWBLocationContext"
import {
  MapPin,
  Wifi,
  Signal,
  Battery,
  AlertCircle,
  CheckCircle2,
  Loader2
} from "lucide-react"

// 類型定義
interface Patient {
  id: string
  name: string
  position: { x: number; y: number; quality?: number; z?: number }
  updatedAt: number
  gatewayId: string
}

export default function LocationPage() {
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
    setSelectedGateway
  } = useUWBLocation()

  // 本地狀態
  const [patients, setPatients] = useState<Record<string, Patient>>({})
  const [connected, setConnected] = useState(false)
  const [connectionStatus, setConnectionStatus] = useState("未連線")
  const [currentTopic, setCurrentTopic] = useState("")
  const [mqttError, setMqttError] = useState("")

  const clientRef = useRef<mqtt.MqttClient | null>(null)

  // MQTT連接配置 - 使用useMemo避免重新創建
  const MQTT_URL = `${import.meta.env.VITE_MQTT_PROTOCOL}://${import.meta.env.VITE_MQTT_BROKER}:${import.meta.env.VITE_MQTT_PORT}/mqtt`
  const MQTT_OPTIONS = React.useMemo(() => ({
    username: import.meta.env.VITE_MQTT_USERNAME,
    password: import.meta.env.VITE_MQTT_PASSWORD
  }), [])

  // 獲取Gateway的location主題
  const getLocationTopic = () => {
    if (!selectedGateway) return null

    // 檢查是否有雲端數據
    const gateway = gateways.find(gw => gw.id === selectedGateway)
    console.log("🔍 選擇的閘道器:", gateway)

    if (gateway?.cloudData?.pub_topic?.location) {
      console.log("✅ 使用雲端主題:", gateway.cloudData.pub_topic.location)
      return gateway.cloudData.pub_topic.location
    }

    // 如果沒有雲端數據，構建主題名稱
    if (gateway) {
      const gatewayName = gateway.name.replace(/\s+/g, '')
      const constructedTopic = `UWB/${gatewayName}_Loca`
      console.log("🔧 構建本地主題:", constructedTopic)
      return constructedTopic
    }

    console.log("❌ 無法獲取閘道器主題")
    return null
  }

  // 座標轉換函數（複製自UWBLocationPage）
  const convertRealToDisplayCoords = (x: number, y: number, floor: any, imgElement: HTMLImageElement) => {
    if (!floor?.calibration?.isCalibrated || !imgElement) return null

    const { originPixel, originCoordinates, pixelToMeterRatio } = floor.calibration

    // 計算相對於原點的實際距離（米）
    const deltaX = x - (originCoordinates?.x || 0)
    const deltaY = y - (originCoordinates?.y || 0)

    // 轉換為像素距離
    const pixelX = originPixel.x + (deltaX * pixelToMeterRatio)
    const pixelY = originPixel.y - (deltaY * pixelToMeterRatio) // Y軸反向

    // 獲取圖片顯示信息
    const rect = imgElement.getBoundingClientRect()
    const naturalWidth = imgElement.naturalWidth
    const naturalHeight = imgElement.naturalHeight
    const actualWidth = rect.width
    const actualHeight = rect.height

    // 轉換為顯示座標
    const displayX = (pixelX / naturalWidth) * actualWidth
    const displayY = (pixelY / naturalHeight) * actualHeight

    return { x: displayX, y: displayY }
  }

  // MQTT連接管理
  useEffect(() => {
    if (!selectedGateway) {
      // 清理連接
      if (clientRef.current) {
        clientRef.current.end()
        clientRef.current = null
      }
      setConnected(false)
      setConnectionStatus("未選擇閘道器")
      setCurrentTopic("")
      return
    }

    const locationTopic = getLocationTopic()
    if (!locationTopic) {
      setConnectionStatus("無法獲取閘道器主題")
      return
    }

    setConnectionStatus("連接中...")
    setMqttError("")

    // 建立MQTT連接
    const client = mqtt.connect(MQTT_URL, {
      ...MQTT_OPTIONS,
      reconnectPeriod: 1000,        // 減少重連間隔
      connectTimeout: 30000,        // 增加連接超時
      keepalive: 30,               // 減少keepalive間隔
      clean: false,                // 改為false，保持會話
      clientId: `location-client-${Math.random().toString(16).slice(2, 8)}`,
      reschedulePings: true,       // 重新安排ping
      queueQoSZero: false,         // 不隊列QoS 0消息
      rejectUnauthorized: false    // 不拒絕未授權連接
    })

gi    clientRef.current = client

    client.on("connect", () => {
      console.log("✅ 室內定位MQTT已連接")
      setConnected(true)
      setConnectionStatus("已連線")
      setMqttError("")

      // 訂閱主題
      client.subscribe(locationTopic, (err) => {
        if (err) {
          console.error("訂閱失敗:", err)
          setMqttError("訂閱失敗")
        } else {
          console.log("已訂閱主題:", locationTopic)
          setCurrentTopic(locationTopic)
        }
      })
    })

    client.on("reconnect", () => {
      console.log("重新連接中...")
      setConnected(false)
      setConnectionStatus("重新連接中...")
    })

    client.on("close", () => {
      console.log("連接已關閉")
      setConnected(false)
      setConnectionStatus("連接已關閉")
    })

    client.on("offline", () => {
      console.log("客戶端離線")
      setConnected(false)
      setConnectionStatus("客戶端離線")
    })

    client.on("packetsend", (packet) => {
      console.log("發送數據包:", packet.cmd)
    })

    client.on("packetreceive", (packet) => {
      console.log("接收數據包:", packet.cmd)
    })

    client.on("error", (error) => {
      console.error("MQTT連接錯誤:", error)
      setConnected(false)
      setMqttError(error.message || "連接錯誤")
      setConnectionStatus("連接錯誤")
    })

    client.on("message", (topic: string, payload: Uint8Array) => {
      if (topic !== locationTopic) return

      try {
        const rawMessage = new TextDecoder().decode(payload)
        const msg = JSON.parse(rawMessage)

        if (msg.content === "location" && msg.id && msg.position) {
          const deviceId = String(msg.id)
          setPatients(prev => ({
            ...prev,
            [deviceId]: {
              id: deviceId,
              name: msg.name || `設備-${deviceId}`,
              position: {
                x: msg.position.x,
                y: msg.position.y,
                quality: msg.position.quality || 0,
                z: msg.position.z,
              },
              updatedAt: Date.now(),
              gatewayId: selectedGateway
            },
          }))
        }
      } catch (error) {
        console.error('MQTT 訊息解析錯誤:', error)
      }
    })

    return () => {
      console.log("清理MQTT連接")
      client.end()
    }
  }, [selectedGateway, MQTT_URL, MQTT_OPTIONS])

  // 過期判斷（5秒未更新視為離線）
  const now = Date.now()
  const patientList = Object.values(patients)
  const onlinePatients = patientList.filter(p => now - p.updatedAt < 5000)

  // 獲取當前選擇的樓層數據
  const selectedFloorData = floors.find(f => f.id === selectedFloor)
  const mapImage = selectedFloorData?.mapImage
  const calibration = selectedFloorData?.calibration
  const dimensions = selectedFloorData?.dimensions

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold mb-4">室內定位</h1>
        <p className="text-muted-foreground mb-4">
          追蹤長者和設備在院內的位置，確保安全和照護
        </p>
      </div>

      {/* 巢狀結構選單 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <MapPin className="mr-2 h-5 w-5" />
            選擇監控區域
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            {/* 養老院選擇 */}
            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium">養老院</label>
              <Select
                value={selectedHome}
                onValueChange={(value) => {
                  setSelectedHome(value)
                  setSelectedFloor("")
                  setSelectedGateway("")
                }}
              >
                <SelectTrigger className="w-[180px]">
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
            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium">樓層</label>
              <Select
                value={selectedFloor}
                onValueChange={(value) => {
                  setSelectedFloor(value)
                  setSelectedGateway("")
                }}
                disabled={!selectedHome}
              >
                <SelectTrigger className="w-[150px]">
                  <SelectValue placeholder="選擇樓層" />
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
              <label className="text-sm font-medium">閘道器</label>
              <Select
                value={selectedGateway}
                onValueChange={setSelectedGateway}
                disabled={!selectedFloor}
              >
                <SelectTrigger className="w-[200px]">
                  <SelectValue placeholder="選擇閘道器" />
                </SelectTrigger>
                <SelectContent>
                  {gateways
                    .filter(gw => gw.floorId === selectedFloor && gw.status === 'online')
                    .map(gateway => (
                      <SelectItem key={gateway.id} value={gateway.id}>
                        <div className="flex items-center gap-2">
                          <div className={`w-2 h-2 rounded-full ${gateway.cloudData ? 'bg-green-500' : 'bg-blue-500'}`}></div>
                          {gateway.name} {gateway.cloudData ? '' : '(本地)'}
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
          <CardTitle className="flex items-center">
            <Wifi className="mr-2 h-5 w-5" />
            MQTT連接狀態
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">狀態:</span>
              <Badge variant={connected ? "default" : "secondary"}>
                {connected ? (
                  <CheckCircle2 className="mr-1 h-3 w-3" />
                ) : (
                  <AlertCircle className="mr-1 h-3 w-3" />
                )}
                {connectionStatus}
              </Badge>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">主題:</span>
              <span className="text-sm font-mono">{currentTopic || "無"}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">設備數量:</span>
              <span className="text-sm">{onlinePatients.length}</span>
            </div>
          </div>
          {mqttError && (
            <div className="mt-2 text-sm text-red-600">
              錯誤: {mqttError}
            </div>
          )}
        </CardContent>
      </Card>

      {/* 地圖顯示 */}
      {selectedFloorData && mapImage ? (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <MapPin className="mr-2 h-5 w-5" />
              {selectedFloorData.name} - 即時位置地圖
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="relative border rounded-md overflow-hidden bg-gray-50">
              {dimensions ? (
                <div
                  className="relative"
                  style={{
                    width: dimensions.width,
                    height: dimensions.height
                  }}
                >
                  <img
                    src={mapImage}
                    alt={`${selectedFloorData.name}地圖`}
                    className="w-full h-full object-contain"
                    style={{ maxWidth: '100%', maxHeight: '100%' }}
                  />

                  {/* 病人標記 */}
                  {onlinePatients.map(patient => {
                    if (!calibration?.isCalibrated) return null

                    const displayCoords = convertRealToDisplayCoords(
                      patient.position.x,
                      patient.position.y,
                      selectedFloorData,
                      document.querySelector('img') as HTMLImageElement
                    )

                    if (!displayCoords) return null

                    return (
                      <div
                        key={patient.id}
                        className="absolute transform -translate-x-1/2 -translate-y-1/2"
                        style={{
                          left: displayCoords.x,
                          top: displayCoords.y
                        }}
                      >
                        <Avatar className="border-2 border-blue-500 shadow-lg">
                          <AvatarFallback>{patient.name[0]}</AvatarFallback>
                        </Avatar>
                        <div className="text-xs bg-white/80 rounded px-1 mt-1 text-center whitespace-nowrap">
                          設備-{patient.id}<br />
                          {patient.position.z !== undefined ? `Z:${patient.position.z.toFixed(2)}` : ''}
                        </div>
                      </div>
                    )
                  })}

                  {/* 無人在線提示 */}
                  {onlinePatients.length === 0 && (
                    <div className="absolute inset-0 flex items-center justify-center text-lg text-muted-foreground bg-white/70">
                      {connected ? "尚無即時位置資料" : "請先選擇閘道器並建立連接"}
                    </div>
                  )}
                </div>
              ) : (
                <div className="p-8 text-center text-muted-foreground">
                  <MapPin className="mx-auto h-12 w-12 mb-3 opacity-30" />
                  <p>該樓層尚未設定地圖尺寸</p>
                </div>
              )}
            </div>

            {/* 地圖資訊 */}
            {calibration && (
              <div className="mt-4 text-sm text-muted-foreground">
                <div>地圖狀態: {calibration.isCalibrated ? "已標定" : "未標定"}</div>
                {calibration.isCalibrated && (
                  <div>比例: {calibration.pixelToMeterRatio.toFixed(2)} 像素/米</div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-8 text-center text-muted-foreground">
            <MapPin className="mx-auto h-12 w-12 mb-3 opacity-30" />
            <p>請先選擇樓層以顯示地圖</p>
          </CardContent>
        </Card>
      )}

      {/* 設備列表 */}
      {onlinePatients.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Signal className="mr-2 h-5 w-5" />
              在線設備 ({onlinePatients.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {onlinePatients.map(patient => (
                <div key={patient.id} className="flex items-center gap-3 p-3 border rounded-lg">
                  <Avatar className="h-8 w-8">
                    <AvatarFallback>{patient.name[0]}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <div className="font-medium">{patient.name}</div>
                    <div className="text-sm text-muted-foreground">
                      位置: ({patient.position.x.toFixed(2)}, {patient.position.y.toFixed(2)})
                      {patient.position.z !== undefined && `, Z: ${patient.position.z.toFixed(2)}`}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      更新: {new Date(patient.updatedAt).toLocaleTimeString()}
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    <span className="text-xs text-green-600">在線</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
