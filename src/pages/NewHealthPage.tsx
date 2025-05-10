import { MainLayout } from "@/components/layout/MainLayout"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Thermometer, Heart, Droplet, Activity } from "lucide-react"

export default function NewHealthPage() {
  return (
    <MainLayout>
      <div className="space-y-6">
        <h1 className="text-3xl font-bold">健康監控頁面</h1>
        <p className="text-muted-foreground">這是新創建的健康監控頁面</p>
        
        <div className="grid gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>體溫監測</CardTitle>
                <Thermometer className="h-5 w-5 text-rose-500" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">36.5°C</div>
              <p className="text-sm text-muted-foreground">正常範圍</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>心率監測</CardTitle>
                <Heart className="h-5 w-5 text-red-500" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">75 BPM</div>
              <p className="text-sm text-muted-foreground">正常範圍</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>血壓監測</CardTitle>
                <Activity className="h-5 w-5 text-blue-500" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">120/80</div>
              <p className="text-sm text-muted-foreground">正常範圍</p>
            </CardContent>
          </Card>
        </div>
      </div>
    </MainLayout>
  )
} 