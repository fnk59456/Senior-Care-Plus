import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import {
  Thermometer, Heart, Baby, Phone, Clock,
  Bell, Menu, Pause, User, CircleDot, Activity, MapPin,
  Watch, Wifi, WifiOff, Battery
} from "lucide-react"
import { useState } from "react"
import { useNavigate } from "react-router-dom"
import { useDeviceManagement } from "@/contexts/DeviceManagementContext"
import { DeviceType, DeviceStatus } from "@/types/device-types"

// 患者數據現在從 DeviceManagementContext 獲取

// 監控功能圖標配置
const monitoringIcons = [
  { icon: Thermometer, color: "text-red-500", route: "/temperature", label: "體溫" },
  { icon: Heart, color: "text-red-600", route: "/heart-rate", label: "心率" },
  { icon: Baby, color: "text-purple-500", route: "/diaper-monitoring", label: "尿布" },
  { icon: Activity, color: "text-green-500", route: "/pedometer", label: "運動" },
  { icon: MapPin, color: "text-blue-500", route: "/location", label: "定位" },
  { icon: Phone, color: "text-gray-500", route: "/emergency-call", label: "緊急" },
  { icon: Clock, color: "text-gray-500", route: "/reminders", label: "提醒" },
  { icon: Menu, color: "text-gray-500", route: "/residents", label: "院友" },
  { icon: Pause, color: "text-gray-500", route: "/devices", label: "設備" }
]

export default function HealthPage() {
  const { residents, getDevicesForResident, getDeviceStatusSummary } = useDeviceManagement()
  const [selectedFilter, setSelectedFilter] = useState("全部")
  const navigate = useNavigate()

  const filters = ["全部", "異常", "正常", "需注意"]

  // 計算病患狀態（基於設備狀態）
  const calculatePatientStatus = (residentId: string) => {
    const devices = getDevicesForResident(residentId)
    if (devices.length === 0) return "無設備"

    const hasError = devices.some(d => d.status === DeviceStatus.ERROR)
    const hasOffline = devices.some(d => d.status === DeviceStatus.OFFLINE)
    const allActive = devices.every(d => d.status === DeviceStatus.ACTIVE)

    if (hasError) return "異常"
    if (hasOffline) return "需注意"
    if (allActive) return "正常"
    return "需注意"
  }

  // 獲取狀態顏色
  const getStatusColor = (status: string) => {
    switch (status) {
      case "正常": return "bg-green-500"
      case "異常": return "bg-red-500"
      case "需注意": return "bg-yellow-500"
      default: return "bg-gray-500"
    }
  }

  // 根據選擇的篩選器過濾患者
  const filteredPatients = residents.filter(resident => {
    if (selectedFilter === "全部") return true
    const patientStatus = calculatePatientStatus(resident.id)
    return patientStatus === selectedFilter
  })

  // 處理圖標點擊導航
  const handleIconClick = (route: string, residentId: string) => {
    // 將患者信息作為state傳遞到目標頁面
    navigate(route, { state: { residentId } })
  }

  // 獲取設備類型圖標
  const getDeviceIcon = (deviceType: DeviceType) => {
    switch (deviceType) {
      case DeviceType.SMARTWATCH_300B: return Watch
      case DeviceType.DIAPER_SENSOR: return Baby
      case DeviceType.PEDOMETER: return Activity
      case DeviceType.UWB_TAG: return MapPin
      default: return CircleDot
    }
  }

  // 統計數據
  const deviceStatusSummary = getDeviceStatusSummary()

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      {/* 頁面標題 */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Avatar className="h-10 w-10 bg-blue-500">
            <AvatarFallback className="text-white">
              <User className="h-6 w-6" />
            </AvatarFallback>
          </Avatar>
          <h1 className="text-xl font-bold text-gray-900">長者照護系統</h1>
        </div>
        <Button variant="ghost" size="sm">
          <Bell className="h-5 w-5" />
        </Button>
      </div>

      {/* 系統概覽統計 */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <Card className="bg-gradient-to-br from-blue-50 to-blue-100">
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-blue-700">{residents.length}</div>
            <div className="text-sm text-blue-600">總院友數</div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-green-50 to-green-100">
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-green-700">{deviceStatusSummary[DeviceStatus.ACTIVE]}</div>
            <div className="text-sm text-green-600">活躍設備</div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-yellow-50 to-yellow-100">
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-yellow-700">{deviceStatusSummary[DeviceStatus.OFFLINE]}</div>
            <div className="text-sm text-yellow-600">離線設備</div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-red-50 to-red-100">
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-red-700">{deviceStatusSummary[DeviceStatus.ERROR]}</div>
            <div className="text-sm text-red-600">異常設備</div>
          </CardContent>
        </Card>
      </div>

      {/* 監控標題 */}
      <div className="mb-4">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">病患監控</h2>

        {/* 狀態篩選器 */}
        <div className="flex gap-2 mb-6">
          {filters.map((filter) => (
            <Button
              key={filter}
              variant={selectedFilter === filter ? "default" : "outline"}
              onClick={() => setSelectedFilter(filter)}
              className={`rounded-full px-6 py-2 text-sm font-medium ${selectedFilter === filter
                ? "bg-blue-500 text-white hover:bg-blue-600"
                : "bg-white text-gray-700 border-gray-300 hover:bg-gray-50"
                }`}
            >
              {filter}
            </Button>
          ))}
        </div>
      </div>

      {/* 患者卡片列表 */}
      <div className="space-y-4">
        {filteredPatients.map((patient) => {
          const patientStatus = calculatePatientStatus(patient.id)
          const statusColor = getStatusColor(patientStatus)
          const devices = getDevicesForResident(patient.id)

          return (
            <Card key={patient.id} className="bg-white shadow-sm border-0 rounded-2xl overflow-hidden">
              <CardContent className="p-6">
                {/* 患者基本信息 */}
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-4">
                    <Avatar className="h-16 w-16 bg-gray-200">
                      <AvatarFallback className="text-gray-600 text-lg font-medium">
                        {patient.avatar || patient.name.slice(0, 2)}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <h3 className="text-xl font-bold text-gray-900 mb-1">{patient.name}</h3>
                      <p className="text-gray-600">年齡: {patient.age} • 房間: {patient.room}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge className="text-xs">
                          {patientStatus}
                        </Badge>
                        <Badge variant="outline" className="text-xs">
                          {devices.length} 設備
                        </Badge>
                      </div>
                    </div>
                  </div>
                  <div className={`w-4 h-4 rounded-full ${statusColor}`}></div>
                </div>

                {/* 設備狀態快覽 */}
                {devices.length > 0 && (
                  <div className="flex flex-wrap gap-2 mb-4">
                    {devices.slice(0, 4).map((device) => {
                      const DeviceIcon = getDeviceIcon(device.deviceType)
                      return (
                        <div key={device.id} className="flex items-center gap-1 bg-gray-100 px-2 py-1 rounded-lg text-xs">
                          <DeviceIcon className="h-3 w-3" />
                          <span className="truncate max-w-20">{device.name}</span>
                          {device.status === DeviceStatus.ACTIVE ? (
                            <Wifi className="h-3 w-3 text-green-500" />
                          ) : (
                            <WifiOff className="h-3 w-3 text-gray-400" />
                          )}
                          {device.batteryLevel && (
                            <div className="flex items-center">
                              <Battery className={`h-3 w-3 ${device.batteryLevel > 20 ? 'text-green-500' : 'text-red-500'}`} />
                              <span className="text-xs ml-1">{device.batteryLevel}%</span>
                            </div>
                          )}
                        </div>
                      )
                    })}
                    {devices.length > 4 && (
                      <Badge variant="outline" className="text-xs">
                        +{devices.length - 4} 更多
                      </Badge>
                    )}
                  </div>
                )}

                {/* 監控功能圖標網格 */}
                <div className="grid grid-cols-3 gap-4">
                  {monitoringIcons.map((item, index) => {
                    const IconComponent = item.icon
                    return (
                      <Button
                        key={index}
                        variant="ghost"
                        className="h-16 w-full bg-gray-100 hover:bg-gray-200 rounded-xl p-4 flex flex-col items-center justify-center transition-colors gap-1"
                        onClick={() => handleIconClick(item.route, patient.id)}
                      >
                        <IconComponent className={`h-5 w-5 ${item.color}`} />
                        <span className="text-xs text-gray-600">{item.label}</span>
                      </Button>
                    )
                  })}
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* 空狀態提示 */}
      {filteredPatients.length === 0 && (
        <div className="text-center py-12">
          <div className="text-gray-400 mb-4">
            <CircleDot className="h-12 w-12 mx-auto" />
          </div>
          <p className="text-gray-500 mb-2">目前沒有{selectedFilter}狀態的患者</p>
          <Button
            variant="outline"
            onClick={() => navigate('/residents')}
          >
            前往院友管理設定設備
          </Button>
        </div>
      )}
    </div>
  )
}
