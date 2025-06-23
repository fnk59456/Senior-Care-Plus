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

// MQTT配置 (暫時註解，等實際連接時啟用)
// const MQTT_URL = "wss://067ec32ef1344d3bb20c4e53abdde99a.s1.eu.hivemq.cloud:8884/mqtt"
// const MQTT_TOPIC = "diaper/monitoring"

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

export default function DiaperMonitoringPage() {
  const [patients, setPatients] = useState<Patient[]>(MOCK_PATIENTS)
  const [selectedPatient, setSelectedPatient] = useState<string>(MOCK_PATIENTS[0].id)
  const [selectedTab, setSelectedTab] = useState("today")
  const [autoNotification, setAutoNotification] = useState(true)
  const [showRecordModal, setShowRecordModal] = useState(false)
  const [recordForm, setRecordForm] = useState({
    status: DIAPER_STATUS.DRY.value,
    nurse: "nurse_a"
  })
  const [connected, setConnected] = useState(false)

  const currentPatient = patients.find(p => p.id === selectedPatient) || patients[0]
  const needsChange = currentPatient.currentHumidity > 75
  
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
        <h1 className="text-3xl font-bold">尿布監測</h1>
        <p className="text-muted-foreground">
          即時監測長者尿布濕度狀態，確保舒適與健康
        </p>
      </div>

      {/* 患者選擇 */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center gap-4">
            <User className="h-5 w-5 text-blue-500" />
            <span className="font-medium">患者:</span>
            <Select value={selectedPatient} onValueChange={setSelectedPatient}>
              <SelectTrigger className="w-[200px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {patients.map(patient => (
                  <SelectItem key={patient.id} value={patient.id}>
                    {patient.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="ml-auto text-sm text-muted-foreground">
              MQTT連線狀態：{connected ? 
                <span className="text-green-600">已連線</span> : 
                <span className="text-red-500">未連線 (模擬模式)</span>
              }
            </div>
          </div>
        </CardContent>
      </Card>

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
                          <Progress value={currentPatient.currentHumidity} className="flex-1 max-w-[200px]" />
                          <span className="text-sm font-medium">{currentPatient.currentHumidity}%</span>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          上次更換時間: {currentPatient.records.length > 0 ? 
                            `${currentPatient.records[0].timestamp} (${getTimeDifference(currentPatient.lastUpdate)})` :
                            '無記錄'
                          }
                        </p>
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
                    <p className="text-2xl font-bold">{currentPatient.currentHumidity}%</p>
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
                    <p className="text-2xl font-bold">{currentPatient.temperature}°C</p>
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
                    <p className="text-2xl font-bold">{currentPatient.batteryLevel}%</p>
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