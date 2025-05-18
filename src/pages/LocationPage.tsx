import React, { useEffect, useRef, useState } from "react"
// @ts-ignore
import mqtt from "mqtt"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"

// 地圖圖片路徑
const MAP_IMG = "/assets/map.jpg"
// 地圖實際像素大小（請依map.jpg實際尺寸調整，這裡假設800x1600）
const MAP_WIDTH = 800
const MAP_HEIGHT = 1600
// MQTT WebSocket broker
const MQTT_URL = "ws://localhost:9001"
const MQTT_TOPIC = "GW17F5_Loca"

// MQTT位置數據x,y範圍
const MIN_X = 0.1, MAX_X = 2.5
const MIN_Y = 0.1, MAX_Y = 2.5

// 將x,y轉換為地圖像素座標
function mapToPx(x: number, y: number) {
  const px = ((x - MIN_X) / (MAX_X - MIN_X)) * MAP_WIDTH
  const py = ((y - MIN_Y) / (MAX_Y - MIN_Y)) * MAP_HEIGHT
  return { left: px, top: py }
}

type Patient = {
  id: string
  name: string
  position: { x: number; y: number; quality: number }
  updatedAt: number // timestamp
}

export default function LocationPage() {
  const [patients, setPatients] = useState<Record<string, Patient>>({})
  const [connected, setConnected] = useState(false)
  const clientRef = useRef<mqtt.MqttClient | null>(null)

  useEffect(() => {
    // 連接MQTT
    const client = mqtt.connect(MQTT_URL)
    clientRef.current = client

    client.on("connect", () => setConnected(true))
    client.on("reconnect", () => setConnected(false))
    client.on("close", () => setConnected(false))
    client.on("error", () => setConnected(false))

    client.subscribe(MQTT_TOPIC)
    client.on("message", (topic: string, payload: Uint8Array) => {
      if (topic !== MQTT_TOPIC) return
      try {
        const msg = JSON.parse(new TextDecoder().decode(payload))
        if (msg.content === "location" && msg.id && msg.position) {
          setPatients(prev => ({
            ...prev,
            [msg.id]: {
              id: msg.id,
              name: msg.name || msg.id,
              position: {
                x: msg.position.x,
                y: msg.position.y,
                quality: msg.position.quality,
              },
              updatedAt: Date.now(),
            },
          }))
        }
      } catch {}
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
                {p.name}<br />品質:{p.position.quality}
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
