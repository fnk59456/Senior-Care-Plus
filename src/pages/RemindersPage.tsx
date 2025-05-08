import { MainLayout } from "@/components/layout/MainLayout"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { PlusCircle, Clock, Pill, Coffee, Calendar } from "lucide-react"

const reminders = [
  {
    id: 1,
    title: "服藥提醒",
    time: "08:00",
    description: "高血壓藥物",
    icon: <Pill className="h-5 w-5" />,
    color: "text-blue-500"
  },
  {
    id: 2,
    title: "服藥提醒",
    time: "12:00",
    description: "糖尿病藥物",
    icon: <Pill className="h-5 w-5" />,
    color: "text-blue-500"
  },
  {
    id: 3,
    title: "喝水提醒",
    time: "10:00",
    description: "確保水分攝取",
    icon: <Coffee className="h-5 w-5" />,
    color: "text-green-500"
  },
  {
    id: 4,
    title: "物理治療",
    time: "14:30",
    description: "進行日常復健運動",
    icon: <Calendar className="h-5 w-5" />,
    color: "text-purple-500"
  },
  {
    id: 5,
    title: "服藥提醒",
    time: "18:00",
    description: "高血壓藥物",
    icon: <Pill className="h-5 w-5" />,
    color: "text-blue-500"
  }
]

export default function RemindersPage() {
  return (
    <MainLayout>
      <div>
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold">定時提醒</h1>
            <p className="text-muted-foreground mt-1">
              管理長者的服藥、喝水和其他照護提醒
            </p>
          </div>
          <Button className="gap-2">
            <PlusCircle className="h-4 w-4" />
            新增提醒
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              今日提醒
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="divide-y">
              {reminders.map((reminder) => (
                <div key={reminder.id} className="py-4 first:pt-0 last:pb-0">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`${reminder.color}`}>
                        {reminder.icon}
                      </div>
                      <div>
                        <div className="font-medium">{reminder.title}</div>
                        <div className="text-sm text-muted-foreground">{reminder.description}</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-lg font-medium">{reminder.time}</div>
                      <Button variant="outline" size="sm">完成</Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-8">
          <Card>
            <CardHeader>
              <CardTitle>週期提醒</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">管理每日、每週或自定義週期的提醒事項</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>提醒統計</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">查看提醒完成情況和統計數據</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>提醒設置</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">自定義提醒通知方式和提醒規則</p>
            </CardContent>
          </Card>
        </div>
      </div>
    </MainLayout>
  )
} 