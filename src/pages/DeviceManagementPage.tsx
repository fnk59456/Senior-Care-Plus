import React, { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  Search,
  RotateCcw,
  Watch,
  User,
  Activity,
  AlertCircle,
  Settings,
  Plus,
  MapPin,
  Baby,
  Trash2,
  X
} from "lucide-react"
import { useDeviceManagement } from "@/contexts/DeviceManagementContext"
import { DeviceType, DeviceStatus, DEVICE_TYPE_CONFIG, DeviceUIDGenerator } from "@/types/device-types"

export default function DeviceManagementPage() {
  const {
    devices,
    addDevice,
    updateDevice,
    removeDevice,
    getDeviceTypeSummary,
    getDeviceStatusSummary
  } = useDeviceManagement()

  const [searchTerm, setSearchTerm] = useState("")
  const [selectedFilter, setSelectedFilter] = useState<DeviceType | "all">("all")
  const [showAddModal, setShowAddModal] = useState(false)
  const [showReplaceModal, setShowReplaceModal] = useState(false)
  const [selectedDevice, setSelectedDevice] = useState<any>(null)
  const [newHardwareId, setNewHardwareId] = useState("")

  // 新增設備的狀態
  const [newDevice, setNewDevice] = useState({
    deviceType: DeviceType.SMARTWATCH_300B,
    name: "",
    hardwareId: "",
    mac: "",
    deviceId: "",
    gatewayId: ""
  })

  // 篩選設備
  const filteredDevices = devices.filter(device => {
    const matchesSearch =
      device.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      device.hardwareId.toLowerCase().includes(searchTerm.toLowerCase()) ||
      device.deviceUid.toLowerCase().includes(searchTerm.toLowerCase())

    const matchesFilter =
      selectedFilter === "all" || device.deviceType === selectedFilter

    return matchesSearch && matchesFilter
  })

  // 獲取設備圖標
  const getDeviceIcon = (deviceType: DeviceType) => {
    switch (deviceType) {
      case DeviceType.SMARTWATCH_300B: return Watch
      case DeviceType.DIAPER_SENSOR: return Baby
      case DeviceType.PEDOMETER: return Activity
      case DeviceType.UWB_TAG: return MapPin
      default: return Settings
    }
  }

  // 獲取設備狀態徽章
  const getDeviceStatusBadge = (status: DeviceStatus) => {
    const colors = {
      [DeviceStatus.ACTIVE]: 'bg-green-100 text-green-800',
      [DeviceStatus.INACTIVE]: 'bg-yellow-100 text-yellow-800',
      [DeviceStatus.OFFLINE]: 'bg-gray-100 text-gray-800',
      [DeviceStatus.ERROR]: 'bg-red-100 text-red-800'
    }

    const labels = {
      [DeviceStatus.ACTIVE]: '活躍',
      [DeviceStatus.INACTIVE]: '待機',
      [DeviceStatus.OFFLINE]: '離線',
      [DeviceStatus.ERROR]: '異常'
    }

    return {
      className: colors[status],
      label: labels[status]
    }
  }

  // 處理新增設備
  const handleAddDevice = () => {
    let deviceUid: string

    // 根據設備類型生成UID
    if (newDevice.deviceType === DeviceType.SMARTWATCH_300B) {
      deviceUid = DeviceUIDGenerator.generate300B(newDevice.mac)
    } else if (newDevice.deviceType === DeviceType.DIAPER_SENSOR) {
      deviceUid = DeviceUIDGenerator.generateDiaper(newDevice.mac)
    } else if (newDevice.deviceType === DeviceType.PEDOMETER) {
      deviceUid = DeviceUIDGenerator.generatePedo(newDevice.deviceId)
    } else {
      deviceUid = DeviceUIDGenerator.generateTag(newDevice.deviceId)
    }

    const deviceData = {
      deviceUid: deviceUid as any,
      deviceType: newDevice.deviceType,
      name: newDevice.name,
      hardwareId: newDevice.hardwareId,
      status: DeviceStatus.ACTIVE,
      gatewayId: newDevice.gatewayId || undefined
    }

    addDevice(deviceData)
    setShowAddModal(false)
    setNewDevice({
      deviceType: DeviceType.SMARTWATCH_300B,
      name: "",
      hardwareId: "",
      mac: "",
      deviceId: "",
      gatewayId: ""
    })
  }

  // 處理替換設備
  const handleReplaceDevice = (device: any) => {
    setSelectedDevice(device)
    setNewHardwareId(device.hardwareId)
    setShowReplaceModal(true)
  }

  // 確認替換設備
  const confirmReplaceDevice = () => {
    if (selectedDevice && newHardwareId.trim()) {
      updateDevice(selectedDevice.id, { hardwareId: newHardwareId.trim() })
      setShowReplaceModal(false)
      setSelectedDevice(null)
      setNewHardwareId("")
    }
  }

  // 處理移除設備
  const handleRemoveDevice = (deviceId: string) => {
    if (confirm('確定要移除這個設備嗎？')) {
      removeDevice(deviceId)
    }
  }

  // 統計數據
  const deviceTypeSummary = getDeviceTypeSummary()
  const deviceStatusSummary = getDeviceStatusSummary()
  const totalDevices = devices.length
  const activeDevices = deviceStatusSummary[DeviceStatus.ACTIVE]

  return (
    <div className="space-y-6">
      {/* 頁面標題 */}
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold">設備管理</h1>
        <p className="text-muted-foreground">
          管理所有類型的照護設備，支援300B手錶、尿布傳感器、運動傳感器、定位標籤
        </p>
      </div>

      {/* 搜尋框 */}
      <Card>
        <CardContent className="pt-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="搜尋設備名稱、硬體編號或設備UID..."
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
          variant={selectedFilter === DeviceType.SMARTWATCH_300B ? "default" : "outline"}
          onClick={() => setSelectedFilter(DeviceType.SMARTWATCH_300B)}
          className="gap-2"
        >
          <Watch className="h-4 w-4" />
          300B手錶
        </Button>
        <Button
          variant={selectedFilter === DeviceType.DIAPER_SENSOR ? "default" : "outline"}
          onClick={() => setSelectedFilter(DeviceType.DIAPER_SENSOR)}
          className="gap-2"
        >
          <Baby className="h-4 w-4" />
          尿布傳感器
        </Button>
        <Button
          variant={selectedFilter === DeviceType.PEDOMETER ? "default" : "outline"}
          onClick={() => setSelectedFilter(DeviceType.PEDOMETER)}
          className="gap-2"
        >
          <Activity className="h-4 w-4" />
          運動傳感器
        </Button>
        <Button
          variant={selectedFilter === DeviceType.UWB_TAG ? "default" : "outline"}
          onClick={() => setSelectedFilter(DeviceType.UWB_TAG)}
          className="gap-2"
        >
          <MapPin className="h-4 w-4" />
          定位標籤
        </Button>
      </div>

      {/* 新增設備按鈕 */}
      <div className="flex justify-end">
        <Button onClick={() => setShowAddModal(true)}>
          <Plus className="h-4 w-4 mr-2" />
          新增設備
        </Button>
      </div>

      {/* 統計資訊 */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
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
              <p className="text-sm text-muted-foreground">活躍設備</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-2xl font-bold text-blue-600">{deviceTypeSummary[DeviceType.SMARTWATCH_300B]}</p>
              <p className="text-sm text-muted-foreground">300B手錶</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-2xl font-bold text-purple-600">{deviceTypeSummary[DeviceType.DIAPER_SENSOR]}</p>
              <p className="text-sm text-muted-foreground">尿布傳感器</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-2xl font-bold text-orange-600">{deviceTypeSummary[DeviceType.UWB_TAG] + deviceTypeSummary[DeviceType.PEDOMETER]}</p>
              <p className="text-sm text-muted-foreground">其他設備</p>
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
              filteredDevices.map((device) => {
                const DeviceIcon = getDeviceIcon(device.deviceType)
                const statusInfo = getDeviceStatusBadge(device.status)

                return (
                  <div key={device.id} className="flex items-center gap-4 p-4 border rounded-lg hover:bg-muted/50 transition-colors">
                    {/* 設備圖標 */}
                    <div className={`rounded-full p-3 ${DEVICE_TYPE_CONFIG[device.deviceType].color}`}>
                      <DeviceIcon className="h-6 w-6" />
                    </div>

                    {/* 設備資訊 */}
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="text-base font-semibold">{device.name}</h3>
                        <Badge className={statusInfo.className}>
                          {statusInfo.label}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground mb-1">
                        {device.deviceUid} | 硬體編號: {device.hardwareId}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        類型: {DEVICE_TYPE_CONFIG[device.deviceType].label}
                        {device.gatewayId && ` | 網關: ${device.gatewayId}`}
                      </p>
                    </div>

                    {/* 操作按鈕 */}
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleReplaceDevice(device)}
                        className="gap-2"
                      >
                        <RotateCcw className="h-4 w-4" />
                        替換
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleRemoveDevice(device.id)}
                        className="gap-2 text-red-600"
                      >
                        <Trash2 className="h-4 w-4" />
                        移除
                      </Button>
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </CardContent>
      </Card>

      {/* 新增設備彈出視窗 */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-md">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>新增設備</CardTitle>
              <Button variant="ghost" size="sm" onClick={() => setShowAddModal(false)}>
                <X className="h-5 w-5" />
              </Button>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium mb-2 block">設備類型</label>
                <Select
                  value={newDevice.deviceType}
                  onValueChange={(value: DeviceType) => setNewDevice({ ...newDevice, deviceType: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={DeviceType.SMARTWATCH_300B}>300B 健康監測手錶</SelectItem>
                    <SelectItem value={DeviceType.DIAPER_SENSOR}>智能尿布傳感器</SelectItem>
                    <SelectItem value={DeviceType.PEDOMETER}>運動傳感器</SelectItem>
                    <SelectItem value={DeviceType.UWB_TAG}>UWB定位標籤</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block">設備名稱</label>
                <Input
                  placeholder="輸入設備名稱"
                  value={newDevice.name}
                  onChange={(e) => setNewDevice({ ...newDevice, name: e.target.value })}
                />
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block">硬體編號</label>
                <Input
                  placeholder="輸入硬體編號"
                  value={newDevice.hardwareId}
                  onChange={(e) => setNewDevice({ ...newDevice, hardwareId: e.target.value })}
                />
              </div>

              {/* 根據設備類型顯示不同的識別欄位 */}
              {(newDevice.deviceType === DeviceType.SMARTWATCH_300B || newDevice.deviceType === DeviceType.DIAPER_SENSOR) && (
                <div>
                  <label className="text-sm font-medium mb-2 block">MAC 地址</label>
                  <Input
                    placeholder="輸入MAC地址 (如: E0:0E:08:36:93:F8)"
                    value={newDevice.mac}
                    onChange={(e) => setNewDevice({ ...newDevice, mac: e.target.value })}
                  />
                </div>
              )}

              {(newDevice.deviceType === DeviceType.PEDOMETER || newDevice.deviceType === DeviceType.UWB_TAG) && (
                <div>
                  <label className="text-sm font-medium mb-2 block">設備ID</label>
                  <Input
                    placeholder="輸入設備ID (如: 5345)"
                    value={newDevice.deviceId}
                    onChange={(e) => setNewDevice({ ...newDevice, deviceId: e.target.value })}
                  />
                </div>
              )}

              <div>
                <label className="text-sm font-medium mb-2 block">網關ID (選填)</label>
                <Input
                  placeholder="輸入網關ID"
                  value={newDevice.gatewayId}
                  onChange={(e) => setNewDevice({ ...newDevice, gatewayId: e.target.value })}
                />
              </div>

              <div className="flex gap-3 pt-4">
                <Button
                  variant="outline"
                  onClick={() => setShowAddModal(false)}
                  className="flex-1"
                >
                  取消
                </Button>
                <Button
                  onClick={handleAddDevice}
                  className="flex-1"
                  disabled={!newDevice.name || !newDevice.hardwareId ||
                    ((newDevice.deviceType === DeviceType.SMARTWATCH_300B || newDevice.deviceType === DeviceType.DIAPER_SENSOR) && !newDevice.mac) ||
                    ((newDevice.deviceType === DeviceType.PEDOMETER || newDevice.deviceType === DeviceType.UWB_TAG) && !newDevice.deviceId)
                  }
                >
                  新增設備
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

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
                  設備UID: {selectedDevice.deviceUid}
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