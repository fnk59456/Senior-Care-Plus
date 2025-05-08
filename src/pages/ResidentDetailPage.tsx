import { MainLayout } from "@/components/layout/MainLayout"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Link, useParams } from "react-router-dom"
import { 
  ChevronLeft, 
  User, 
  Heart, 
  ActivitySquare,
  CalendarDays,
  Map,
  FileText,
  PencilLine,
  Pill
} from "lucide-react"

const residents = [
  {
    id: "001",
    name: "王大明",
    age: 78,
    gender: "男",
    room: "101",
    status: "正常",
    healthStatus: "良好",
    joinDate: "2023/01/15",
    emergencyContact: "王小明 (兒子)",
    emergencyPhone: "0912-345-678",
    healthRecords: [
      { date: "2023/05/01", type: "血壓測量", value: "120/80", notes: "正常範圍" },
      { date: "2023/05/03", type: "血糖測量", value: "95", notes: "空腹血糖正常" },
      { date: "2023/05/05", type: "體重測量", value: "65kg", notes: "體重適中" }
    ],
    medications: [
      { name: "高血壓藥物", dosage: "每日一次", time: "早餐後", prescribed: "2023/01/20" },
      { name: "鈣片", dosage: "每日兩次", time: "早晚餐後", prescribed: "2023/02/15" }
    ],
    activities: [
      { date: "2023/05/05", name: "晨間運動", duration: "30分鐘", notes: "參與積極" },
      { date: "2023/05/04", name: "團體活動", duration: "1小時", notes: "與其他院友互動良好" }
    ],
    notes: "性格開朗，喜歡下棋和看報紙。經常需要提醒喝水。"
  }
]

export default function ResidentDetailPage() {
  const { id } = useParams()
  const resident = residents.find(r => r.id === id) || residents[0]

  return (
    <MainLayout>
      <div>
        <div className="flex items-center mb-8 gap-4">
          <Button variant="outline" size="icon" asChild>
            <Link to="/residents">
              <ChevronLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <h1 className="text-3xl font-bold">{resident.name}</h1>
            <p className="text-muted-foreground">院友詳細資料與健康記錄</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5 text-blue-500" />
                基本資料
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">年齡</span>
                  <span className="font-medium">{resident.age}歲</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">性別</span>
                  <span className="font-medium">{resident.gender}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">房號</span>
                  <span className="font-medium">{resident.room}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">入住日期</span>
                  <span className="font-medium">{resident.joinDate}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">緊急聯絡人</span>
                  <span className="font-medium">{resident.emergencyContact}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">聯絡電話</span>
                  <span className="font-medium">{resident.emergencyPhone}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Heart className="h-5 w-5 text-rose-500" />
                健康狀況
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">當前狀態</span>
                  <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                    resident.status === "正常" 
                      ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" 
                      : resident.status === "需關注" 
                      ? "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400"
                      : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                  }`}>
                    {resident.status}
                  </span>
                </div>

                <h3 className="font-medium border-b pb-1">最近測量記錄</h3>
                {resident.healthRecords.slice(0, 3).map((record, i) => (
                  <div key={i} className="flex flex-col">
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">{record.type}</span>
                      <span className="text-sm font-medium">{record.value}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-xs text-muted-foreground">{record.date}</span>
                      <span className="text-xs text-muted-foreground">{record.notes}</span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Pill className="h-5 w-5 text-green-500" />
                用藥資訊
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {resident.medications.map((med, i) => (
                  <div key={i} className="flex flex-col">
                    <div className="font-medium">{med.name}</div>
                    <div className="text-sm text-muted-foreground">
                      {med.dosage} - {med.time}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      處方日期: {med.prescribed}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 gap-6 mb-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ActivitySquare className="h-5 w-5 text-purple-500" />
                近期活動
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="divide-y">
                {resident.activities.map((activity, i) => (
                  <div key={i} className="py-3 first:pt-0 last:pb-0">
                    <div className="flex justify-between">
                      <div>
                        <div className="font-medium">{activity.name}</div>
                        <div className="text-sm text-muted-foreground">{activity.notes}</div>
                      </div>
                      <div className="flex flex-col items-end">
                        <div className="text-sm font-medium">{activity.date}</div>
                        <div className="text-xs text-muted-foreground">{activity.duration}</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-blue-500" />
                備註
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">{resident.notes}</p>
              <div className="mt-4 flex justify-end">
                <Button variant="outline" size="sm" className="gap-2">
                  <PencilLine className="h-4 w-4" />
                  編輯備註
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </MainLayout>
  )
} 