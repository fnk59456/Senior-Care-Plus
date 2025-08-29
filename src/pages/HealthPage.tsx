import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import {
  Thermometer, Heart, Baby, Phone, Clock, Bed,
  Bell, Menu, Pause, User, CircleDot
} from "lucide-react"
import { useState } from "react"
import { useNavigate } from "react-router-dom"

// 患者數據
const patients = [
  {
    id: 1,
    name: "張三",
    age: 80,
    gcs: 8,
    status: "正常",
    statusColor: "bg-green-500",
    avatar: "ZS"
  },
  {
    id: 2,
    name: "李四",
    age: 70,
    gcs: 13,
    status: "正常",
    statusColor: "bg-green-500",
    avatar: "LS"
  },
  {
    id: 3,
    name: "王五",
    age: 75,
    gcs: 10,
    status: "異常",
    statusColor: "bg-red-500",
    avatar: "WW"
  }
]

// 監控功能圖標配置
const monitoringIcons = [
  { icon: Thermometer, color: "text-red-500", route: "/temperature" },
  { icon: Heart, color: "text-gray-500", route: "/heart-rate" },
  { icon: Baby, color: "text-purple-500", route: "/diaper-monitoring" },
  { icon: Phone, color: "text-gray-500", route: "/emergency-call" },
  { icon: Clock, color: "text-gray-500", route: "/reminders" },
  { icon: Bed, color: "text-gray-500", route: "/location" },
  { icon: Bell, color: "text-yellow-500", route: "/settings" },
  { icon: Menu, color: "text-gray-500", route: "/residents" },
  { icon: Pause, color: "text-gray-500", route: "/devices" }
]

export default function HealthPage() {
  const [selectedFilter, setSelectedFilter] = useState("全部")
  const navigate = useNavigate()

  const filters = ["全部", "異常", "正常"]

  // 根據選擇的篩選器過濾患者
  const filteredPatients = patients.filter(patient => {
    if (selectedFilter === "全部") return true
    return patient.status === selectedFilter
  })

  // 處理圖標點擊導航
  const handleIconClick = (route: string, patientName: string) => {
    // 將患者信息作為state傳遞到目標頁面
    navigate(route, { state: { patientName } })
  }

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

      {/* 監控標題 */}
      <div className="mb-4">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">監控</h2>

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
        {filteredPatients.map((patient) => (
          <Card key={patient.id} className="bg-white shadow-sm border-0 rounded-2xl overflow-hidden">
            <CardContent className="p-6">
              {/* 患者基本信息 */}
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-4">
                  <Avatar className="h-16 w-16 bg-gray-200">
                    <AvatarFallback className="text-gray-600 text-lg font-medium">
                      {patient.avatar}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <h3 className="text-xl font-bold text-gray-900 mb-1">{patient.name}</h3>
                    <p className="text-gray-600">年齡: {patient.age}, GCS: {patient.gcs}</p>
                  </div>
                </div>
                <div className={`w-4 h-4 rounded-full ${patient.statusColor}`}></div>
              </div>

              {/* 監控功能圖標網格 */}
              <div className="grid grid-cols-3 gap-4">
                {monitoringIcons.map((item, index) => {
                  const IconComponent = item.icon
                  return (
                    <Button
                      key={index}
                      variant="ghost"
                      className="h-16 w-full bg-gray-100 hover:bg-gray-200 rounded-xl p-4 flex items-center justify-center transition-colors"
                      onClick={() => handleIconClick(item.route, patient.name)}
                    >
                      <IconComponent className={`h-6 w-6 ${item.color}`} />
                    </Button>
                  )
                })}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* 空狀態提示 */}
      {filteredPatients.length === 0 && (
        <div className="text-center py-12">
          <div className="text-gray-400 mb-2">
            <CircleDot className="h-12 w-12 mx-auto" />
          </div>
          <p className="text-gray-500">目前沒有{selectedFilter}狀態的患者</p>
        </div>
      )}
    </div>
  )
}
