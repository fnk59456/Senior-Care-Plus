import React, { useState, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { useEmergencyCall } from "@/contexts/EmergencyCallContext"
import { 
  AlertTriangle, 
  Clock, 
  CheckCircle, 
  User, 
  MapPin, 
  RefreshCw,
  X,
  ClipboardCheck
} from "lucide-react"

// 緊急類型
const EMERGENCY_TYPES = [
  { id: "fall", label: "跌倒", color: "bg-red-500" },
  { id: "pain", label: "疼痛", color: "bg-orange-500" },
  { id: "toilet", label: "如廁協助", color: "bg-green-500" },
  { id: "medicine", label: "藥物協助", color: "bg-blue-500" },
  { id: "help", label: "其他協助", color: "bg-purple-500" }
]

// 患者列表
const PATIENTS = [
  { id: "patient1", name: "張三" },
  { id: "patient2", name: "李四" },
  { id: "patient3", name: "王五" },
  { id: "patient4", name: "趙六" }
]

// 位置列表
const LOCATIONS = [
  { id: "A101", name: "A區 101房" },
  { id: "A102", name: "A區 102房" },
  { id: "B201", name: "B區 201房" },
  { id: "B202", name: "B區 202房" }
]

// 護工列表
const CAREGIVERS = ["護工A", "護工B", "護工C", "護工D"]

// 響應狀態類型
type ResponseStatus = "pending" | "responding" | "completed" | "cancelled"

// 緊急呼叫記錄
type EmergencyCall = {
  id: string
  patientId: string
  patientName: string
  location: string
  type: string
  typeLabel: string
  callTime: string
  responseTime?: string
  completedTime?: string
  status: ResponseStatus
  caregiver?: string
  cancelReason?: string
  waitTime: number
}

// 對話框類型
type DialogType = "none" | "emergencyType" | "cancelCall"

export default function EmergencyCallPage() {
  const [selectedPatient, setSelectedPatient] = useState<string>("")
  const [selectedLocation, setSelectedLocation] = useState<string>("")
  const [activeCall, setActiveCall] = useState<EmergencyCall | null>(null)
  const [callHistory, setCallHistory] = useState<EmergencyCall[]>([])
  const [dialogType, setDialogType] = useState<DialogType>("none")
  const [cancelReason, setCancelReason] = useState("")
  const [waitTime, setWaitTime] = useState(0)
  
  const { setCallStatus } = useEmergencyCall()
  
  const responseTimerRef = useRef<NodeJS.Timeout | null>(null)
  const completeTimerRef = useRef<NodeJS.Timeout | null>(null)
  const waitTimerRef = useRef<NodeJS.Timeout | null>(null)

  // 格式化時間
  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('zh-TW', { 
      hour: '2-digit', 
      minute: '2-digit', 
      second: '2-digit' 
    })
  }

  // 隨機選擇護工
  const getRandomCaregiver = () => {
    return CAREGIVERS[Math.floor(Math.random() * CAREGIVERS.length)]
  }

  // 開始緊急呼叫
  const startEmergencyCall = (emergencyType: string) => {
    if (!selectedPatient || !selectedLocation) return

    const patient = PATIENTS.find(p => p.id === selectedPatient)
    const location = LOCATIONS.find(l => l.id === selectedLocation)
    const typeInfo = EMERGENCY_TYPES.find(t => t.id === emergencyType)
    
    if (!patient || !location || !typeInfo) return

    const newCall: EmergencyCall = {
      id: Date.now().toString(),
      patientId: selectedPatient,
      patientName: patient.name,
      location: location.name,
      type: emergencyType,
      typeLabel: typeInfo.label,
      callTime: formatTime(new Date()),
      status: "pending",
      waitTime: 0
    }

    setActiveCall(newCall)
    setCallStatus("pending")
    setWaitTime(0)
    setDialogType("none")

    // 清除之前的計時器（如果存在）
    if (responseTimerRef.current) {
      clearTimeout(responseTimerRef.current)
      responseTimerRef.current = null
    }
    if (completeTimerRef.current) {
      clearTimeout(completeTimerRef.current)
      completeTimerRef.current = null
    }
    if (waitTimerRef.current) {
      clearInterval(waitTimerRef.current)
      waitTimerRef.current = null
    }

    // 開始等待時間計時器
    waitTimerRef.current = setInterval(() => {
      setWaitTime(prev => prev + 1)
    }, 1000)

    // 5-8秒後自動進入響應狀態
    const responseDelay = Math.random() * 3000 + 5000 // 5-8秒
    
    responseTimerRef.current = setTimeout(() => {
      setActiveCall(prev => {
        if (prev && prev.status === "pending") {
          const updatedCall = {
            ...prev,
            status: "responding" as ResponseStatus,
            caregiver: getRandomCaregiver(),
            responseTime: formatTime(new Date())
          }
          setCallStatus("responding")
          return updatedCall
        }
        return prev
      })
    }, responseDelay)
  }

  // 完成呼叫
  const completeCall = (finalStatus: ResponseStatus, reason?: string) => {
    if (!activeCall) {
      return
    }

    const completedCall: EmergencyCall = {
      ...activeCall,
      status: finalStatus,
      completedTime: formatTime(new Date()),
      cancelReason: reason,
      waitTime: waitTime
    }

    setCallHistory(prev => [completedCall, ...prev])
    setActiveCall(null)
    setCallStatus("none")
    setWaitTime(0)
    setCancelReason("")
    
    // 清除所有計時器
    if (responseTimerRef.current) {
      clearTimeout(responseTimerRef.current)
      responseTimerRef.current = null
    }
    if (completeTimerRef.current) {
      clearTimeout(completeTimerRef.current)
      completeTimerRef.current = null
    }
    if (waitTimerRef.current) {
      clearInterval(waitTimerRef.current)
      waitTimerRef.current = null
    }
  }

  // 取消呼叫
  const cancelCall = () => {
    if (!cancelReason.trim()) return
    completeCall("cancelled", cancelReason)
    setDialogType("none")
  }

  // 監聽狀態變化，當進入響應狀態時設置完成計時器
  useEffect(() => {
    if (activeCall && activeCall.status === "responding") {
      // 清除之前的完成計時器（如果存在）
      if (completeTimerRef.current) {
        clearTimeout(completeTimerRef.current)
        completeTimerRef.current = null
      }
      
      // 5-8秒後自動完成
      const completeDelay = Math.random() * 3000 + 5000 // 5-8秒
      completeTimerRef.current = setTimeout(() => {
        completeCall("completed")
      }, completeDelay)
    }
  }, [activeCall?.status])

  // 清理計時器
  useEffect(() => {
    return () => {
      if (responseTimerRef.current) clearTimeout(responseTimerRef.current)
      if (completeTimerRef.current) clearTimeout(completeTimerRef.current)
      if (waitTimerRef.current) clearInterval(waitTimerRef.current)
    }
  }, [])

  // 格式化等待時間
  const formatWaitTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}分${secs}秒`
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold mb-4">緊急呼叫</h1>
        <p className="text-muted-foreground mb-6">
          快速發送緊急求助信號，確保及時獲得協助
        </p>
      </div>

      {/* 患者和位置選擇 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2 mb-2">
              <User className="h-4 w-4 text-blue-500" />
              <span className="font-medium">患者</span>
            </div>
            <Select value={selectedPatient} onValueChange={setSelectedPatient}>
              <SelectTrigger>
                <SelectValue placeholder="選擇患者" />
              </SelectTrigger>
              <SelectContent>
                {PATIENTS.map(patient => (
                  <SelectItem key={patient.id} value={patient.id}>
                    {patient.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2 mb-2">
              <MapPin className="h-4 w-4 text-blue-500" />
              <span className="font-medium">位置</span>
            </div>
            <Select value={selectedLocation} onValueChange={setSelectedLocation}>
              <SelectTrigger>
                <SelectValue placeholder="選擇位置" />
              </SelectTrigger>
              <SelectContent>
                {LOCATIONS.map(location => (
                  <SelectItem key={location.id} value={location.id}>
                    {location.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </CardContent>
        </Card>
      </div>

      {/* 緊急呼叫按鈕 */}
      {!activeCall && (
        <div className="flex justify-center">
          <Button
            onClick={() => setDialogType("emergencyType")}
            disabled={!selectedPatient || !selectedLocation}
            className="w-48 h-48 rounded-full bg-red-500 hover:bg-red-600 text-white text-2xl font-bold shadow-lg"
          >
            緊急<br />呼叫
          </Button>
        </div>
      )}

      {/* 響應狀態卡片 */}
      {activeCall && (
        <Card className={`${
          activeCall.status === "pending" ? "bg-red-50 border-red-200" :
          activeCall.status === "responding" ? "bg-yellow-50 border-yellow-200" :
          "bg-green-50 border-green-200"
        }`}>
          <CardHeader>
            <CardTitle className={`text-2xl font-bold ${
              activeCall.status === "pending" ? "text-red-600" :
              activeCall.status === "responding" ? "text-yellow-600" :
              "text-green-600"
            }`}>
              {activeCall.status === "pending" && "正在響應中..."}
              {activeCall.status === "responding" && "正在響應中..."}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-2 gap-6">
              <div>
                <span className="text-base text-muted-foreground">患者：</span>
                <span className="font-semibold text-lg">{activeCall.patientName}</span>
              </div>
              <div>
                <span className="text-base text-muted-foreground">位置：</span>
                <span className="font-semibold text-lg">{activeCall.location}</span>
              </div>
              <div>
                <span className="text-base text-muted-foreground">類型：</span>
                <Badge className={`text-sm px-3 py-1 ${EMERGENCY_TYPES.find(t => t.id === activeCall.type)?.color}`}>
                  {activeCall.typeLabel}
                </Badge>
              </div>
              <div>
                <span className="text-base text-muted-foreground">呼叫時間：</span>
                <span className="font-semibold text-lg">{activeCall.callTime}</span>
              </div>
              <div>
                <span className="text-base text-muted-foreground">等待時間：</span>
                <span className="font-bold text-lg text-red-600">{formatWaitTime(waitTime)}</span>
              </div>
            </div>

            {activeCall.status === "responding" && (
              <div className="space-y-3 pt-4 border-t">
                <div>
                  <span className="text-base text-muted-foreground">響應人員：</span>
                  <span className="font-semibold text-lg">{activeCall.caregiver}</span>
                </div>
                <div>
                  <span className="text-base text-muted-foreground">響應時間：</span>
                  <span className="font-semibold text-lg">{activeCall.responseTime}</span>
                </div>
                <div className="text-yellow-600 font-semibold text-lg bg-yellow-100 p-3 rounded-lg">
                  護理人員正趕往現場...
                </div>
              </div>
            )}

            {activeCall.status === "pending" && (
              <Button
                onClick={() => setDialogType("cancelCall")}
                variant="outline"
                className="w-full h-12 text-lg"
              >
                <RefreshCw className="mr-2 h-5 w-5" />
                刷新狀態
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      {/* 呼叫記錄 */}
      <div>
        <h2 className="text-2xl font-bold mb-6">呼叫記錄</h2>
        <div className="space-y-4">
          {callHistory.length === 0 ? (
            <Card className="border-dashed border-2 border-gray-200">
              <CardContent className="p-8 text-center">
                <div className="text-gray-400 mb-2">
                  <ClipboardCheck className="h-12 w-12 mx-auto" />
                </div>
                <p className="text-lg text-muted-foreground">暫無呼叫記錄</p>
                <p className="text-sm text-muted-foreground mt-1">完成的緊急呼叫將顯示在這裡</p>
              </CardContent>
            </Card>
          ) : (
            callHistory.map(call => (
              <Card key={call.id} className="overflow-hidden shadow-md hover:shadow-lg transition-shadow">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center space-x-4">
                      <div className="flex-shrink-0">
                        {call.status === "completed" ? (
                          <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                            <CheckCircle className="h-7 w-7 text-green-600" />
                          </div>
                        ) : call.status === "cancelled" ? (
                          <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center">
                            <X className="h-7 w-7 text-gray-600" />
                          </div>
                        ) : (
                          <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center">
                            <AlertTriangle className="h-7 w-7 text-orange-600" />
                          </div>
                        )}
                      </div>
                      <div className="space-y-2">
                        <div className="flex items-center space-x-3">
                          <Badge className={`text-sm px-3 py-1 font-medium ${EMERGENCY_TYPES.find(t => t.id === call.type)?.color}`}>
                            {call.typeLabel}
                          </Badge>
                          <span className={`text-base font-semibold px-3 py-1 rounded-full ${
                            call.status === "completed" ? "bg-green-100 text-green-700" : 
                            call.status === "cancelled" ? "bg-gray-100 text-gray-700" : 
                            "bg-orange-100 text-orange-700"
                          }`}>
                            {call.status === "completed" ? "已解決" : 
                             call.status === "cancelled" ? "已取消" : "等待響應"}
                          </span>
                        </div>
                        <div className="flex items-center space-x-4 text-base text-muted-foreground">
                          <div className="flex items-center space-x-1">
                            <User className="h-4 w-4" />
                            <span className="font-medium text-gray-700">{call.patientName}</span>
                          </div>
                          <div className="flex items-center space-x-1">
                            <MapPin className="h-4 w-4" />
                            <span className="font-medium text-gray-700">{call.location}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="bg-gray-50 rounded-lg p-4 mt-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="flex items-center space-x-2">
                        <Clock className="h-4 w-4 text-gray-500" />
                        <span className="text-sm text-gray-500">呼叫時間:</span>
                        <span className="font-medium text-base">{call.callTime}</span>
                      </div>
                      {call.completedTime && (
                        <div className="flex items-center space-x-2">
                          <CheckCircle className="h-4 w-4 text-gray-500" />
                          <span className="text-sm text-gray-500">處理時間:</span>
                          <span className="font-medium text-base">{call.completedTime}</span>
                        </div>
                      )}
                      {call.caregiver && (
                        <div className="flex items-center space-x-2">
                          <User className="h-4 w-4 text-gray-500" />
                          <span className="text-sm text-gray-500">處理人員:</span>
                          <span className="font-medium text-base text-blue-600">{call.caregiver}</span>
                        </div>
                      )}
                      {call.cancelReason && (
                        <div className="flex items-center space-x-2">
                          <X className="h-4 w-4 text-gray-500" />
                          <span className="text-sm text-gray-500">取消原因:</span>
                          <span className="font-medium text-base text-red-600">{call.cancelReason}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>

      {/* 緊急類型選擇對話框 */}
      {dialogType === "emergencyType" && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <Card className="w-full max-w-md mx-4">
            <CardHeader>
              <CardTitle className="text-center text-xl">選擇緊急類型</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {EMERGENCY_TYPES.map(type => (
                <Button
                  key={type.id}
                  onClick={() => startEmergencyCall(type.id)}
                  className={`w-full h-14 text-white text-lg font-semibold rounded-full ${type.color} hover:opacity-90 transition-all`}
                >
                  {type.label}
                </Button>
              ))}
              <Button
                onClick={() => setDialogType("none")}
                variant="outline"
                className="w-full h-12 mt-6 text-gray-600 border-gray-300"
              >
                取消
              </Button>
            </CardContent>
          </Card>
        </div>
      )}

      {/* 取消呼叫對話框 */}
      {dialogType === "cancelCall" && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <Card className="w-full max-w-md mx-4">
            <CardHeader>
              <CardTitle>取消緊急呼叫</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium">請輸入取消原因：</label>
                <Input
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                  placeholder="取消原因"
                  className="mt-1"
                />
              </div>
              <div className="flex space-x-2">
                <Button
                  onClick={() => setDialogType("none")}
                  variant="outline"
                  className="flex-1"
                >
                  返回
                </Button>
                <Button
                  onClick={cancelCall}
                  disabled={!cancelReason.trim()}
                  className="flex-1 bg-red-500 hover:bg-red-600"
                >
                  確認取消
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
} 