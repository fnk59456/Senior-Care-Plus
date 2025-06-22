import React, { useEffect, useRef, useState } from "react"
// @ts-ignore
import mqtt from "mqtt"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import mapImage from "@/assets/map.jpg"

// 地圖圖片路徑
const MAP_IMG = mapImage
// 地圖實際像素大小（請依map.jpg實際尺寸調整，這裡假設800x1600）
const MAP_WIDTH = 800
const MAP_HEIGHT = 1600
// MQTT WebSocket broker - 改為 HiveMQ 雲端
const MQTT_URL = "wss://067ec32ef1344d3bb20c4e53abdde99a.s1.eu.hivemq.cloud:8884/mqtt"
const MQTT_TOPICS = ["UWB/GW16B8_Loca", "UWB/GWCF18_Loca"]  // 同時訂閱兩個 Topic
const MQTT_OPTIONS = {
  username: 'testweb1',
  password: 'Aa000000'
}

// MQTT位置數據x,y範圍 - 放寬範圍以適應不同的數據
const MIN_X = -10, MAX_X = 10
const MIN_Y = -10, MAX_Y = 10

// 將x,y轉換為地圖像素座標
function mapToPx(x: number, y: number) {
  const px = ((x - MIN_X) / (MAX_X - MIN_X)) * MAP_WIDTH
  const py = ((y - MIN_Y) / (MAX_Y - MIN_Y)) * MAP_HEIGHT
  return { left: px, top: py }
}

type Patient = {
  id: string
  name: string
  position: { x: number; y: number; quality?: number; z?: number }
  updatedAt: number // timestamp
}

export default function LocationPage() {
  const [patients, setPatients] = useState<Record<string, Patient>>({})
  const [connected, setConnected] = useState(false)
  const clientRef = useRef<mqtt.MqttClient | null>(null)

  useEffect(() => {
    // 連接MQTT - 加入認證選項
    const client = mqtt.connect(MQTT_URL, MQTT_OPTIONS)
    clientRef.current = client

    client.on("connect", () => setConnected(true))
    client.on("reconnect", () => setConnected(false))
    client.on("close", () => setConnected(false))
    client.on("error", () => setConnected(false))

    client.subscribe(MQTT_TOPICS)
    client.on("message", (topic: string, payload: Uint8Array) => {
      if (topic !== MQTT_TOPICS[0] && topic !== MQTT_TOPICS[1]) return
      try {
        const rawMessage = new TextDecoder().decode(payload)
        console.log('收到 MQTT 原始訊息:', rawMessage)
        
        const msg = JSON.parse(rawMessage)
        console.log('解析後的訊息:', msg)
        
        if (msg.content === "location" && msg.id && msg.position) {
          console.log('訊息格式正確，處理位置資料:', {
            id: msg.id,
            position: msg.position
          })
          
          // 處理 id 可能是 number 的情況
          const deviceId = String(msg.id)
          setPatients(prev => {
            const newPatients = {
              ...prev,
              [deviceId]: {
                id: deviceId,
                name: msg.name || `設備-${deviceId}`,
                position: {
                  x: msg.position.x,
                  y: msg.position.y,
                  quality: msg.position.quality || 0, // 如果沒有 quality 則預設為 0
                  z: msg.position.z, // 保留 z 座標（雖然 2D 地圖不使用）
                },
                updatedAt: Date.now(),
              },
            }
            console.log('更新後的病人資料:', newPatients)
            return newPatients
          })
        } else {
          console.log('訊息格式不符合要求:', {
            content: msg.content,
            hasId: !!msg.id,
            hasPosition: !!msg.position
          })
        }
      } catch (error) {
        console.error('解析 MQTT 訊息時發生錯誤:', error)
      }
    })
    return () => {
      client.end()
    }
  }, [])

  // 過期判斷（5秒未更新視為離線）
  const now = Date.now()
  const patientList = Object.values(patients)
  const onlinePatients = patientList.filter(p => now - p.updatedAt < 5000)

  return (
    <div>
      <h1 className="text-3xl font-bold mb-4">室內定位</h1>
      <p className="text-muted-foreground mb-4">
        追蹤長者和設備在院內的位置，確保安全和照護
      </p>
      <div className="mb-2 text-sm">
        MQTT連線狀態：{connected ? <span className="text-green-600">已連線</span> : <span className="text-red-500">未連線</span>}
      </div>
      <div className="mb-2 text-sm space-y-1">
        <div>線上設備數量: {onlinePatients.length}</div>
        <div>總設備數量: {patientList.length}</div>
      </div>
      <div className="relative border rounded-md overflow-hidden" style={{ width: MAP_WIDTH, height: MAP_HEIGHT, background: `#eee url(${MAP_IMG}) center/cover no-repeat` }}>
        {/* 病人標記 */}
        {onlinePatients.map(p => {
          const { left, top } = mapToPx(p.position.x, p.position.y)
          return (
            <div key={p.id} style={{ position: "absolute", left, top, transform: "translate(-50%, -50%)" }}>
              <Avatar className="border-2 border-blue-500 shadow-lg">
                <AvatarFallback>{p.name[0]}</AvatarFallback>
              </Avatar>
              <div className="text-xs bg-white/80 rounded px-1 mt-1 text-center">
                設備-{p.id}<br />
                {p.position.z !== undefined ? `Z:${p.position.z.toFixed(2)}` : ''}
              </div>
            </div>
          )
        })}
        {/* 無人在線提示 */}
        {onlinePatients.length === 0 && (
          <div className="absolute inset-0 flex items-center justify-center text-lg text-muted-foreground bg-white/70">
            尚無即時位置資料，請確認MQTT模擬器已啟動
          </div>
        )}
      </div>
    </div>
  )
}
