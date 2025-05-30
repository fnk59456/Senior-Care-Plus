import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import {
  Activity, CalendarClock, MapPin, Users, UserCog,
  MonitorSmartphone, ArrowRight, LineChart, Bell,
  ClipboardCheck, HeartPulse, Sparkles, Heart
} from "lucide-react"
import { Link } from "react-router-dom"

const features = [
  {
    title: "健康監控",
    icon: <Activity className="h-8 w-8 text-white" />,
    desc: "即時監測長者健康狀態與異常警示",
    href: "/health",
    color: "from-blue-500 to-blue-700",
    bgLight: "bg-blue-50",
    bgDark: "dark:bg-blue-900/20",
  },
  {
    title: "定時提醒",
    icon: <CalendarClock className="h-8 w-8 text-white" />,
    desc: "管理服藥、喝水、測量等定時提醒",
    href: "/reminders",
    color: "from-green-500 to-green-700",
    bgLight: "bg-green-50",
    bgDark: "dark:bg-green-900/20",
  },
  {
    title: "室內定位",
    icon: <MapPin className="h-8 w-8 text-white" />,
    desc: "追蹤長者與設備在院內的位置",
    href: "/location",
    color: "from-indigo-500 to-indigo-700",
    bgLight: "bg-indigo-50",
    bgDark: "dark:bg-indigo-900/20",
  },
  {
    title: "體溫監測",
    icon: <HeartPulse className="h-8 w-8 text-white" />,
    desc: "即時監控長者體溫變化與異常警示",
    href: "/temperature",
    color: "from-red-500 to-red-700",
    bgLight: "bg-red-50",
    bgDark: "dark:bg-red-900/20",
  },
  {
    title: "心跳監測",
    icon: <Heart className="h-8 w-8 text-white" />,
    desc: "即時監控長者心率變化與異常警示",
    href: "/heart-rate",
    color: "from-pink-500 to-pink-700",
    bgLight: "bg-pink-50",
    bgDark: "dark:bg-pink-900/20",
  },
  {
    title: "設備管理",
    icon: <MonitorSmartphone className="h-8 w-8 text-white" />,
    desc: "追蹤與管理照護設備",
    href: "/devices",
    color: "from-orange-500 to-orange-700",
    bgLight: "bg-orange-50",
    bgDark: "dark:bg-orange-900/20",
  },
]

export default function HomePage() {
  return (
    <div className="space-y-8">
      {/* 歡迎區域 */}
      <div className="relative overflow-hidden rounded-xl bg-gradient-custom p-8 text-primary-foreground shadow-lg mb-8">
        <div className="absolute -right-10 -top-10 h-48 w-48 rounded-full bg-primary-foreground/10 blur-3xl pointer-events-none" />
        <div className="absolute left-1/2 bottom-0 h-32 w-32 rounded-full bg-primary-foreground/20 blur-2xl pointer-events-none" />

        <div className="relative z-10 max-w-3xl">
          <div className="flex items-center gap-3 mb-4">
            <HeartPulse className="h-8 w-8 text-primary-foreground/90 animate-pulse" />
            <div className="bg-white/20 backdrop-blur-sm px-3 py-1 rounded-full text-sm font-medium">
              智慧長照解決方案
            </div>
          </div>

          <h1 className="mb-4 text-4xl md:text-5xl font-bold tracking-tight">
            歡迎使用<span className="gradient-text font-extrabold"> 長者照護系統</span>
          </h1>

          <p className="mb-6 text-xl opacity-90 leading-relaxed">
            提供全面的長者照護管理，確保長者得到最佳的照顧和關注。整合健康監測、位置追蹤與智慧提醒功能。
          </p>

          <div className="flex flex-wrap gap-4">
            <Link to="/health">
              <Button size="lg" className="btn-glow font-semibold px-6 py-6 h-auto">
                立即開始使用
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </Link>
            <Link to="/help">
              <Button
                variant="outline"
                size="lg"
                className="bg-white/10 backdrop-blur-sm border-primary-foreground/30 text-primary-foreground hover:bg-primary-foreground/20 font-semibold px-6 py-6 h-auto"
              >
                <Sparkles className="mr-2 h-5 w-5" />
                系統功能指南
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {/* 統計概覽 */}
      <div className="grid gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 mb-8">
        {[
          {
            title: "院友總數",
            value: "72",
            icon: <Users className="h-6 w-6" />,
            change: "+2",
            color: "text-blue-600",
            bgColor: "bg-blue-100 dark:bg-blue-900/30",
            href: "/residents",
          },
          {
            title: "今日任務",
            value: "28",
            icon: <ClipboardCheck className="h-6 w-6" />,
            change: "12 已完成",
            color: "text-green-600",
            bgColor: "bg-green-100 dark:bg-green-900/30",
            href: "/reminders",
          },
          {
            title: "健康警示",
            value: "3",
            icon: <Bell className="h-6 w-6" />,
            change: "-1",
            color: "text-amber-600",
            bgColor: "bg-amber-100 dark:bg-amber-900/30",
            href: "/health",
          },
          {
            title: "本月報表",
            value: "查看",
            icon: <LineChart className="h-6 w-6" />,
            change: "",
            color: "text-purple-600",
            bgColor: "bg-purple-100 dark:bg-purple-900/30",
            href: "/more",
          },
        ].map((stat, i) => (
          <Link to={stat.href} key={i}>
            <Card className="card-float overflow-hidden border-0 shadow-md hover:scale-[1.01] hover:shadow-lg transition-transform">
              <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
                <div className={`rounded-full p-2 ${stat.color} ${stat.bgColor}`}>
                  {stat.icon}
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stat.value}</div>
                <p className="text-xs text-muted-foreground mt-1">{stat.change}</p>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      {/* 功能卡片區 */}
      <div>
        <h2 className="text-2xl font-bold tracking-tight mb-6 flex items-center">
          <span className="mr-2">主要功能</span>
          <div className="h-1 flex-1 bg-gradient-to-r from-primary/50 to-transparent rounded-full"></div>
        </h2>
        <div className="grid gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((feature) => (
            <Link to={feature.href} key={feature.title} className="group relative block">
              <Card
                className={`card-float transition-transform hover:scale-[1.01] hover:shadow-lg border-0 overflow-hidden ${feature.bgLight} ${feature.bgDark}`}
              >
                <div className={`absolute inset-0 bg-gradient-to-br opacity-0 group-hover:opacity-10 transition-opacity duration-300 ${feature.color} pointer-events-none`} />
                <CardHeader>
                  <div className="flex items-center gap-4">
                    <div className="icon-container">{feature.icon}</div>
                    <CardTitle className="text-xl">{feature.title}</CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">{feature.desc}</p>
                  <div className="mt-4 flex items-center text-sm text-primary font-medium">
                    <span>查看詳情</span>
                    <ArrowRight className="ml-1 h-4 w-4 transition-transform group-hover:translate-x-2" />
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </div>
    </div>
  )
}
