import { MainLayout } from "@/components/layout/MainLayout"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Settings, Bell, UserCog, Lock, Monitor, Database, Globe, HelpCircle } from "lucide-react"

const settingCategories = [
  {
    title: "個人設置",
    description: "管理您的個人資料和賬戶設置",
    icon: <UserCog className="h-6 w-6 text-blue-500" />,
    color: "bg-blue-50 dark:bg-blue-900/20"
  },
  {
    title: "通知設定",
    description: "設定系統通知和提醒方式",
    icon: <Bell className="h-6 w-6 text-amber-500" />,
    color: "bg-amber-50 dark:bg-amber-900/20"
  },
  {
    title: "安全設置",
    description: "密碼變更和賬戶安全設定",
    icon: <Lock className="h-6 w-6 text-red-500" />,
    color: "bg-red-50 dark:bg-red-900/20"
  },
  {
    title: "顯示設置",
    description: "自定義界面外觀和主題",
    icon: <Monitor className="h-6 w-6 text-purple-500" />,
    color: "bg-purple-50 dark:bg-purple-900/20"
  },
  {
    title: "數據管理",
    description: "資料備份和導出設置",
    icon: <Database className="h-6 w-6 text-green-500" />,
    color: "bg-green-50 dark:bg-green-900/20"
  },
  {
    title: "語言和地區",
    description: "設定系統語言和時區",
    icon: <Globe className="h-6 w-6 text-indigo-500" />,
    color: "bg-indigo-50 dark:bg-indigo-900/20"
  }
]

export default function SettingsPage() {
  return (
    <MainLayout>
      <div>
        <div className="mb-8">
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Settings className="h-7 w-7" />
            系統設置
          </h1>
          <p className="text-muted-foreground mt-1">
            管理系統配置、個人設置和安全選項
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {settingCategories.map((category, i) => (
            <Card key={i} className={`${category.color}`}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    {category.icon}
                    {category.title}
                  </CardTitle>
                </div>
                <CardDescription>{category.description}</CardDescription>
              </CardHeader>
              <CardContent>
                <Button variant="outline" className="w-full">進入設置</Button>
              </CardContent>
            </Card>
          ))}
        </div>

        <Card className="mt-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <HelpCircle className="h-5 w-5 text-blue-500" />
              系統資訊
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-muted-foreground">系統版本</span>
                <span className="font-medium">1.0.0</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">上次更新</span>
                <span className="font-medium">2023/05/10</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">服務條款</span>
                <Button variant="link" className="p-0 h-auto">查看</Button>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">隱私政策</span>
                <Button variant="link" className="p-0 h-auto">查看</Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  )
} 