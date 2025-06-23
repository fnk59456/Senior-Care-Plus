import React, { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { 
  Search, 
  RotateCcw, 
  Watch, 
  User,
  Activity,
  AlertCircle,
  Settings
} from "lucide-react"

// 設備類型定義
const DEVICE_TYPES = {
  SMARTWATCH: { 
    label: "智能手錶", 
    icon: Watch, 
    color: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300",
    prefix: "W"
  },
  DIAPER_SENSOR: { 
    label: "尿布傳感器", 
    icon: User, 
    color: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300",
    prefix: "D"
  }
}

// 設備狀態定義
const DEVICE_STATUS = {
  ACTIVE: { label: "活動", color: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300" },
  INACTIVE: { label: "不活動", color: "bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-300" }
}

// 模擬設備數據
const MOCK_DEVICES = [
  {
    id: "1",
    name: "健康監測手錶 #1",
    type: DEVICE_TYPES.SMARTWATCH,
    status: DEVICE_STATUS.ACTIVE,
    patient: "王大明",
    hardwareId: "HWID-W23445",
    deviceCode: "W001"
  },
  {
    id: "2", 
    name: "健康監測手錶 #2",
    type: DEVICE_TYPES.SMARTWATCH,
    status: DEVICE_STATUS.ACTIVE,
    patient: "李小華",
    hardwareId: "HWID-W23446",
    deviceCode: "W002"
  },
  {
    id: "3",
    name: "智能尿布傳感器 #1", 
    type: DEVICE_TYPES.DIAPER_SENSOR,
    status: DEVICE_STATUS.ACTIVE,
    patient: "王大明",
    hardwareId: "HWID-D23001",
    deviceCode: "D001"
  },
  {
    id: "4",
    name: "智能尿布傳感器 #2",
    type: DEVICE_TYPES.DIAPER_SENSOR,
    status: DEVICE_STATUS.INACTIVE,
    patient: "張美麗",
    hardwareId: "HWID-D23002", 
    deviceCode: "D002"
  },
  {
    id: "5",
    name: "健康監測手錶 #3",
    type: DEVICE_TYPES.SMARTWATCH,
    status: DEVICE_STATUS.INACTIVE,
    patient: "林志明",
    hardwareId: "HWID-W23447",
    deviceCode: "W003"
  },
  {
    id: "6",
    name: "智能尿布傳感器 #3",
    type: DEVICE_TYPES.DIAPER_SENSOR,
    status: DEVICE_STATUS.ACTIVE,
    patient: "陳小玲",
    hardwareId: "HWID-D23003",
    deviceCode: "D003"
  }
]

interface Device {
  id: string
  name: string
  type: typeof DEVICE_TYPES[keyof typeof DEVICE_TYPES]
  status: typeof DEVICE_STATUS[keyof typeof DEVICE_STATUS]
  patient: string
  hardwareId: string
  deviceCode: string
}

export default function DeviceManagementPage() {
  const [devices, setDevices] = useState<Device[]>(MOCK_DEVICES)
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedFilter, setSelectedFilter] = useState("all")
  const [showReplaceModal, setShowReplaceModal] = useState(false)
  const [selectedDevice, setSelectedDevice] = useState<Device | null>(null)
  const [newHardwareId, setNewHardwareId] = useState("")

  // 篩選設備
  const filteredDevices = devices.filter(device => {
    const matchesSearch = 
      device.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      device.hardwareId.toLowerCase().includes(searchTerm.toLowerCase()) ||
      device.patient.toLowerCase().includes(searchTerm.toLowerCase()) ||
      device.deviceCode.toLowerCase().includes(searchTerm.toLowerCase())
    
    const matchesFilter = 
      selectedFilter === "all" ||
      (selectedFilter === "smartwatch" && device.type === DEVICE_TYPES.SMARTWATCH) ||
      (selectedFilter === "diaper" && device.type === DEVICE_TYPES.DIAPER_SENSOR)
    
    return matchesSearch && matchesFilter
  })

  // 處理替換設備
  const handleReplaceDevice = (device: Device) => {
    setSelectedDevice(device)
    setNewHardwareId(device.hardwareId)
    setShowReplaceModal(true)
  }

  // 確認替換設備
  const confirmReplaceDevice = () => {
    if (selectedDevice && newHardwareId.trim()) {
      setDevices(prev => prev.map(device => 
        device.id === selectedDevice.id 
          ? { ...device, hardwareId: newHardwareId.trim() }
          : device
      ))
      setShowReplaceModal(false)
      setSelectedDevice(null)
      setNewHardwareId("")
    }
  }

  // 統計數據
  const totalDevices = devices.length
  const activeDevices = devices.filter(d => d.status === DEVICE_STATUS.ACTIVE).length
  const smartwatchCount = devices.filter(d => d.type === DEVICE_TYPES.SMARTWATCH).length
  const diaperSensorCount = devices.filter(d => d.type === DEVICE_TYPES.DIAPER_SENSOR).length

  return (
    <div className="space-y-6">
      {/* 頁面標題 */}
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold">設備管理</h1>
        <p className="text-muted-foreground">
          管理智能手錶與尿布傳感器等照護設備
        </p>
      </div>

      {/* 搜尋框 */}
      <Card>
        <CardContent className="pt-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="搜尋設備名稱、編號或患者名稱..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardContent>
      </Card>

      {/* 篩選標籤 */}
      <div className="flex gap-2 flex-wrap">
        <Button
          variant={selectedFilter === "all" ? "default" : "outline"}
          onClick={() => setSelectedFilter("all")}
          className="gap-2"
        >
          <Settings className="h-4 w-4" />
          全部
        </Button>
        <Button
          variant={selectedFilter === "smartwatch" ? "default" : "outline"}
          onClick={() => setSelectedFilter("smartwatch")}
          className="gap-2"
        >
          <Watch className="h-4 w-4" />
          智能手錶
        </Button>
        <Button
          variant={selectedFilter === "diaper" ? "default" : "outline"}
          onClick={() => setSelectedFilter("diaper")}
          className="gap-2"
        >
          <User className="h-4 w-4" />
          尿布傳感器
        </Button>
      </div>

      {/* 統計資訊 */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-2xl font-bold">{totalDevices}</p>
              <p className="text-sm text-muted-foreground">總設備數</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-2xl font-bold text-green-600">{activeDevices}</p>
              <p className="text-sm text-muted-foreground">活動設備</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-2xl font-bold text-blue-600">{smartwatchCount}</p>
              <p className="text-sm text-muted-foreground">智能手錶</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-2xl font-bold text-purple-600">{diaperSensorCount}</p>
              <p className="text-sm text-muted-foreground">尿布傳感器</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 設備列表 */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle>設備列表</CardTitle>
            <span className="text-sm text-muted-foreground">
              共 {filteredDevices.length} 個設備
            </span>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {filteredDevices.length === 0 ? (
              <div className="text-center py-8">
                <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">沒有找到符合條件的設備</p>
              </div>
            ) : (
              filteredDevices.map((device) => (
                <div key={device.id} className="flex items-center gap-4 p-4 border rounded-lg hover:bg-muted/50 transition-colors">
                  {/* 設備圖標 */}
                  <div className={`rounded-full p-3 ${device.type.color}`}>
                    <device.type.icon className="h-6 w-6" />
                  </div>
                  
                  {/* 設備資訊 */}
                                     <div className="flex-1">
                     <div className="flex items-center gap-2 mb-1">
                       <h3 className="text-base font-semibold">{device.name}</h3>
                       <Badge className={device.status.color}>
                         {device.status.label}
                       </Badge>
                     </div>
                    <p className="text-sm text-muted-foreground mb-1">
                      {device.deviceCode} | 當前硬體編號: {device.hardwareId}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      患者: {device.patient}
                    </p>
                  </div>

                  {/* 替換按鈕 */}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleReplaceDevice(device)}
                    className="gap-2"
                  >
                    <RotateCcw className="h-4 w-4" />
                  </Button>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      {/* 替換設備彈出視窗 */}
      {showReplaceModal && selectedDevice && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle>替換設備</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="text-center space-y-2">
                <h3 className="font-semibold">{selectedDevice.name}</h3>
                <p className="text-sm text-muted-foreground">
                  當前硬體編號: {selectedDevice.hardwareId}
                </p>
                <p className="text-sm text-muted-foreground">
                  使用者: {selectedDevice.patient}
                </p>
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block">
                  新硬體編號
                </label>
                <Input
                  value={newHardwareId}
                  onChange={(e) => setNewHardwareId(e.target.value)}
                  placeholder="輸入新的硬體編號"
                />
              </div>

              <div className="flex gap-3 pt-4">
                <Button 
                  variant="outline" 
                  onClick={() => {
                    setShowReplaceModal(false)
                    setSelectedDevice(null)
                    setNewHardwareId("")
                  }}
                  className="flex-1"
                >
                  取消
                </Button>
                <Button 
                  onClick={confirmReplaceDevice}
                  className="flex-1"
                  disabled={!newHardwareId.trim() || newHardwareId === selectedDevice.hardwareId}
                >
                  確認替換
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
} 