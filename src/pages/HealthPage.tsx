import { MainLayout } from "@/components/layout/MainLayout"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Thermometer, Heart, Droplet } from "lucide-react"

const healthData = [
  {
    title: "體溫監測",
    icon: <Thermometer className="h-8 w-8 text-rose-500" />,
    value: "36.5°C",
    status: "正常",
    lastUpdated: "10分鐘前",
    color: "bg-rose-50 text-rose-600 dark:bg-rose-900/20 dark:text-rose-300"
  },
  {
    title: "心率監測",
    icon: <Heart className="h-8 w-8 text-red-500" />,
    value: "72 BPM",
    status: "正常",
    lastUpdated: "5分鐘前",
    color: "bg-red-50 text-red-600 dark:bg-red-900/20 dark:text-red-300"
  },
  {
    title: "尿布監測",
    icon: <Droplet className="h-8 w-8 text-blue-500" />,
    value: "乾燥",
    status: "正常",
    lastUpdated: "15分鐘前",
    color: "bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-300"
  }
]

export default function HealthPage() {
  return (
    <MainLayout>
      <div>
        <h1 className="mb-4 text-3xl font-bold">健康監測</h1>
        <p className="text-muted-foreground mb-8">
          查看並監測長者的健康狀況，包括體溫、心率和尿布監測數據。
        </p>

        <div className="grid gap-6 grid-cols-1 md:grid-cols-3">
          {healthData.map((item, index) => (
            <Card key={index}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">{item.title}</CardTitle>
                  <div className={`rounded-full p-2 ${item.color}`}>
                    {item.icon}
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col gap-2">
                  <div className="text-3xl font-bold">{item.value}</div>
                  <div className="flex justify-between text-sm">
                    <span className="font-medium">狀態: {item.status}</span>
                    <span className="text-muted-foreground">{item.lastUpdated}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <h2 className="mt-8 mb-4 text-2xl font-bold">歷史數據</h2>
        <Card className="mt-4">
          <CardHeader>
            <CardTitle>數據分析</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">
              此處顯示長者健康數據的圖表和趨勢分析。
            </p>
            <div className="h-64 flex items-center justify-center border rounded-md mt-4 bg-muted/20">
              <p className="text-muted-foreground">健康數據圖表</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  )
} 