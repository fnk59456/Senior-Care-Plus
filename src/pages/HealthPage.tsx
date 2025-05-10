import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { 
  Thermometer, Heart, Droplet, Activity, LucideGlassWater, 
  CircleDollarSign, Weight, LineChart, Bed, Clock, BookOpen, Download 
} from "lucide-react"
import { useState } from "react"

const healthMetrics = [/* 保留不變，略 */]
const timeRanges = ["24小時", "7天", "30天", "90天", "半年", "1年"]

export default function HealthPage() {
  const [selectedTimeRange, setSelectedTimeRange] = useState("7天")
  const [selectedTab, setSelectedTab] = useState("overview")

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold">健康監測</h1>
        <p className="text-muted-foreground">
          全面監測長者的健康狀況，包括生命體徵、活動指標和照護紀錄。
        </p>
      </div>

      <Tabs defaultValue="overview" className="w-full" onValueChange={setSelectedTab}>
        <div className="flex justify-between items-center mb-4">
          <TabsList>
            <TabsTrigger value="overview">概覽</TabsTrigger>
            <TabsTrigger value="vitals">生命體徵</TabsTrigger>
            <TabsTrigger value="activity">活動監測</TabsTrigger>
            <TabsTrigger value="records">照護紀錄</TabsTrigger>
          </TabsList>

          <div className="flex items-center gap-2">
            <Select value={selectedTimeRange} onValueChange={setSelectedTimeRange}>
              <SelectTrigger className="w-[100px]">
                <SelectValue placeholder="時間範圍" />
              </SelectTrigger>
              <SelectContent>
                {timeRanges.map((range) => (
                  <SelectItem key={range} value={range}>{range}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button variant="outline" size="sm" className="gap-2">
              <Download className="h-4 w-4" />
              <span>匯出</span>
            </Button>
          </div>
        </div>

        {/* === 概覽頁籤 === */}
        <TabsContent value="overview" className="mt-0">
          <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-4">
            {healthMetrics.map((metric, index) => (
              <Card key={index} className="overflow-hidden transition-all hover:shadow-md">
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base font-medium">{metric.title}</CardTitle>
                    <div className={`rounded-full p-1.5 ${metric.color}`}>
                      {metric.icon}
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-col gap-1">
                    <div className="text-2xl font-bold">{metric.value}</div>
                    <div className="flex justify-between text-xs">
                      <span className={`font-medium px-2 py-0.5 rounded-full ${
                        metric.status === "正常" || metric.status === "良好"
                          ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                          : "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
                      }`}>
                        {metric.status}
                      </span>
                      <span className="text-muted-foreground">{metric.lastUpdated}</span>
                    </div>
                    <div className="mt-2 text-xs text-muted-foreground">
                      <div>{metric.range}</div>
                      <div>{metric.details}</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* 健康趨勢圖表 */}
          <Card className="mt-6">
            <CardHeader>
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle>健康趨勢分析</CardTitle>
                  <CardDescription>顯示過去{selectedTimeRange}的健康指標趨勢</CardDescription>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm">體溫</Button>
                  <Button variant="outline" size="sm">心率</Button>
                  <Button variant="outline" size="sm">血壓</Button>
                  <Button variant="outline" size="sm">血糖</Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="h-[300px] w-full flex items-center justify-center border rounded-md bg-muted/20">
                <div className="flex flex-col items-center gap-2">
                  <LineChart className="h-12 w-12 text-muted-foreground" />
                  <p className="text-muted-foreground">健康數據趨勢圖 - {selectedTimeRange}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* === 其他頁籤內容 === */}
        <TabsContent value="vitals" className="mt-0">
          <Card>
            <CardHeader>
              <CardTitle>生命體徵詳細數據</CardTitle>
              <CardDescription>
                包含體溫、心率、血壓、血氧等關鍵生命指標的詳細記錄
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[400px] w-full flex items-center justify-center border rounded-md bg-muted/20">
                <div className="flex flex-col items-center gap-2">
                  <Activity className="h-12 w-12 text-muted-foreground" />
                  <p className="text-muted-foreground">生命體徵詳細數據表格與圖表</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="activity" className="mt-0">
          <Card>
            <CardHeader>
              <CardTitle>日常活動監測</CardTitle>
              <CardDescription>
                包含行動能力、活動量、睡眠質量等活動相關指標
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[400px] w-full flex items-center justify-center border rounded-md bg-muted/20">
                <div className="flex flex-col items-center gap-2">
                  <Clock className="h-12 w-12 text-muted-foreground" />
                  <p className="text-muted-foreground">活動監測數據與分析</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="records" className="mt-0">
          <Card>
            <CardHeader>
              <CardTitle>照護紀錄</CardTitle>
              <CardDescription>
                包含用藥紀錄、護理紀錄、診斷報告等照護相關資訊
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[400px] w-full flex items-center justify-center border rounded-md bg-muted/20">
                <div className="flex flex-col items-center gap-2">
                  <BookOpen className="h-12 w-12 text-muted-foreground" />
                  <p className="text-muted-foreground">照護紀錄與病史資料</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* === 異常提醒區塊 === */}
      <div className="border-t pt-6">
        <h2 className="mb-4 text-xl font-semibold">異常提醒</h2>
        <div className="flex gap-4 overflow-auto pb-2">
          <Card className="min-w-[250px] flex-shrink-0 border-l-4 border-l-amber-500">
            <CardHeader className="py-3">
              <CardTitle className="text-sm font-medium">血壓略高於正常範圍</CardTitle>
            </CardHeader>
            <CardContent className="py-2">
              <p className="text-xs text-muted-foreground">今日早晨測量: 142/88</p>
              <p className="text-xs mt-1">建議: 觀察並於明日複測，注意飲食控制鹽分攝取</p>
            </CardContent>
          </Card>

          <Card className="min-w-[250px] flex-shrink-0 border-l-4 border-l-blue-500">
            <CardHeader className="py-3">
              <CardTitle className="text-sm font-medium">睡眠品質下降</CardTitle>
            </CardHeader>
            <CardContent className="py-2">
              <p className="text-xs text-muted-foreground">過去一週平均睡眠時間: 5.8小時</p>
              <p className="text-xs mt-1">建議: 檢查睡眠環境，考慮調整晚間照護流程</p>
            </CardContent>
          </Card>

          <Card className="min-w-[250px] flex-shrink-0 border-l-4 border-l-green-500">
            <CardHeader className="py-3">
              <CardTitle className="text-sm font-medium">體重恢復正常</CardTitle>
            </CardHeader>
            <CardContent className="py-2">
              <p className="text-xs text-muted-foreground">本月增加: 1.5kg (目前: 65kg)</p>
              <p className="text-xs mt-1">備註: 營養補充計畫執行良好，繼續維持</p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
