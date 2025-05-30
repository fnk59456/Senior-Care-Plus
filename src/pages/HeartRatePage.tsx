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

// MQTT設置
const MQTT_URL = "ws://localhost:9001"
const MQTT_TOPIC = "health/data"

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

export default function HeartRatePage() {
  const [selectedUser, setSelectedUser] = useState<string>("user001") // 默認選擇張三
  const [activeTab, setActiveTab] = useState<string>("today")
  const [heartRateRecords, setHeartRateRecords] = useState<HeartRateRecord[]>([])
  const [connected, setConnected] = useState(false)
  const [filteredRecords, setFilteredRecords] = useState<HeartRateRecord[]>([])
  const [recordFilter, setRecordFilter] = useState<string>("all")
  const [timeRange, setTimeRange] = useState<string>("1day")
  const clientRef = useRef<mqtt.MqttClient | null>(null)

  // MQTT連接
  useEffect(() => {
    const client = mqtt.connect(MQTT_URL)
    clientRef.current = client

    client.on("connect", () => {
      console.log("MQTT已連接")
      setConnected(true)
    })
    client.on("reconnect", () => {
      console.log("MQTT重新連接中")
      setConnected(false)
    })
    client.on("close", () => {
      console.log("MQTT連接關閉")
      setConnected(false)
    })
    client.on("error", (error) => {
      console.error("MQTT連接錯誤:", error)
      setConnected(false)
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
      console.log("清理MQTT連接")
      client.end()
    }
  }, [])

  // 獲取當前用戶的記錄
  const currentUserRecords = heartRateRecords.filter(record => record.id === selectedUser)

  console.log("當前選中用戶:", selectedUser)
  console.log("所有心率記錄數:", heartRateRecords.length)
  console.log("當前用戶記錄數:", currentUserRecords.length)
  
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
    
    const now = new Date()
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000)
    const dayBeforeYesterday = new Date(today.getTime() - 2 * 24 * 60 * 60 * 1000)

    console.log("日期參考點:")
    console.log("今天:", today.toLocaleDateString())
    console.log("昨天:", yesterday.toLocaleDateString()) 
    console.log("前天:", dayBeforeYesterday.toLocaleDateString())

    let filtered: HeartRateRecord[] = []
    
    // 由於模擬器數據可能是歷史數據，我們需要更靈活的過濾
    if (activeTab === "today") {
      // 如果沒有今天的數據，顯示最新的一天數據
      filtered = records.filter(r => {
        const recordDate = new Date(r.datetime.getFullYear(), r.datetime.getMonth(), r.datetime.getDate())
        return recordDate.getTime() === today.getTime()
      })
      
      // 如果今天沒有數據，取最新一天的數據
      if (filtered.length === 0 && records.length > 0) {
        const latestRecord = records[0] // 已按時間排序
        const latestDate = new Date(latestRecord.datetime.getFullYear(), latestRecord.datetime.getMonth(), latestRecord.datetime.getDate())
        filtered = records.filter(r => {
          const recordDate = new Date(r.datetime.getFullYear(), r.datetime.getMonth(), r.datetime.getDate())
          return recordDate.getTime() === latestDate.getTime()
        })
        console.log("今天無數據，使用最新日期:", latestDate.toLocaleDateString(), "記錄數:", filtered.length)
      }
    } else if (activeTab === "yesterday") {
      filtered = records.filter(r => {
        const recordDate = new Date(r.datetime.getFullYear(), r.datetime.getMonth(), r.datetime.getDate())
        return recordDate.getTime() === yesterday.getTime()
      })
      
      // 如果昨天沒有數據，取第二新的一天數據
      if (filtered.length === 0 && records.length > 0) {
        const uniqueDates = [...new Set(records.map(r => {
          const d = new Date(r.datetime.getFullYear(), r.datetime.getMonth(), r.datetime.getDate())
          return d.getTime()
        }))].sort((a, b) => b - a)
        
        if (uniqueDates.length > 1) {
          const secondLatestDate = uniqueDates[1]
          filtered = records.filter(r => {
            const recordDate = new Date(r.datetime.getFullYear(), r.datetime.getMonth(), r.datetime.getDate())
            return recordDate.getTime() === secondLatestDate
          })
          console.log("昨天無數據，使用第二新日期:", new Date(secondLatestDate).toLocaleDateString(), "記錄數:", filtered.length)
        }
      }
    } else if (activeTab === "dayBefore") {
      filtered = records.filter(r => {
        const recordDate = new Date(r.datetime.getFullYear(), r.datetime.getMonth(), r.datetime.getDate())
        return recordDate.getTime() === dayBeforeYesterday.getTime()
      })
      
      // 如果前天沒有數據，取第三新的一天數據
      if (filtered.length === 0 && records.length > 0) {
        const uniqueDates = [...new Set(records.map(r => {
          const d = new Date(r.datetime.getFullYear(), r.datetime.getMonth(), r.datetime.getDate())
          return d.getTime()
        }))].sort((a, b) => b - a)
        
        if (uniqueDates.length > 2) {
          const thirdLatestDate = uniqueDates[2]
          filtered = records.filter(r => {
            const recordDate = new Date(r.datetime.getFullYear(), r.datetime.getMonth(), r.datetime.getDate())
            return recordDate.getTime() === thirdLatestDate
          })
          console.log("前天無數據，使用第三新日期:", new Date(thirdLatestDate).toLocaleDateString(), "記錄數:", filtered.length)
        }
      }
    } else {
      filtered = records.filter(r => r.datetime >= today)
    }
    
    console.log("過濾後記錄數:", filtered.length)
    if (filtered.length > 0) {
      console.log("第一筆記錄時間:", filtered[0].datetime.toLocaleString())
      console.log("最後一筆記錄時間:", filtered[filtered.length - 1].datetime.toLocaleString())
    }
    
    return filtered
  }

  const dateFilteredRecords = getFilteredByDate(currentUserRecords)

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
        <p className="text-muted-foreground mb-4">
          即時監控長者心率變化，及時發現異常情況
        </p>
        <div className="text-sm">
          MQTT連線狀態：{connected ? <span className="text-green-600">已連線</span> : <span className="text-red-500">未連線</span>}
        </div>
      </div>

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
                        domain={[40, 120]} 
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
                    <p className="text-sm">請確認MQTT模擬器已啟動</p>
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
                        <div className={`p-2 rounded-full ${
                          record.heart_rate > NORMAL_HEART_RATE_MAX 
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
                            {record.heart_rate} BPM
                          </div>
                        </div>
                      </div>
                      <div className={`px-3 py-1 rounded-full text-sm font-medium ${
                        record.heart_rate > NORMAL_HEART_RATE_MAX 
                          ? 'bg-red-100 text-red-700' 
                          : record.heart_rate < NORMAL_HEART_RATE_MIN 
                          ? 'bg-blue-100 text-blue-700' 
                          : 'bg-green-100 text-green-700'
                      }`}>
                        {record.heart_rate > NORMAL_HEART_RATE_MAX 
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