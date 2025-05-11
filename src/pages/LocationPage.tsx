import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { MapPin, History, AlertTriangle } from "lucide-react"

export default function LocationPage() {
  return (
    <div>
      <h1 className="text-3xl font-bold mb-4">室內定位</h1>
      <p className="text-muted-foreground mb-8">
        追蹤長者和設備在院內的位置，確保安全和照護
      </p>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MapPin className="h-5 w-5 text-red-500" />
              當前位置
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col gap-4">
              <div className="font-medium">王大明</div>
              <div className="text-lg font-bold">二樓走廊</div>
              <div className="text-sm text-muted-foreground">更新於 2分鐘前</div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <History className="h-5 w-5 text-blue-500" />
              位置歷史
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {[
                { location: "二樓走廊", time: "10:32 AM", ago: "2分鐘前" },
                { location: "二樓房間", time: "10:15 AM", ago: "19分鐘前" },
                { location: "餐廳", time: "09:30 AM", ago: "1小時前" },
              ].map((entry, i) => (
                <div key={i} className="flex justify-between items-center">
                  <div>
                    <div className="font-medium">{entry.location}</div>
                    <div className="text-sm text-muted-foreground">{entry.time}</div>
                  </div>
                  <div className="text-sm text-muted-foreground">{entry.ago}</div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-500" />
              安全區域
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between mb-4">
              <div className="font-medium">狀態</div>
              <div className="text-sm px-2 py-1 bg-green-100 text-green-700 rounded-full dark:bg-green-900/30 dark:text-green-400">
                正常
              </div>
            </div>
            <div className="text-sm text-muted-foreground">
              王大明目前在安全區域內活動，無異常狀況。
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>位置地圖</CardTitle>
          <CardDescription>即時查看院內人員和設備位置</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-96 border rounded-md bg-muted/20 flex items-center justify-center">
            <div className="text-muted-foreground">院內地圖（展示位置）</div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
