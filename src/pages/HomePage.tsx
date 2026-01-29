import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import {
  Activity, CalendarClock, MapPin, Users, UserCog,
  MonitorSmartphone, ArrowRight, LineChart, Bell,
  ClipboardCheck, HeartPulse, Sparkles, Phone
} from "lucide-react"
import { Link } from "react-router-dom"
import { useTranslation } from "react-i18next"

// 功能配置 - 使用函數來獲取翻譯
const getFeatures = (t: any) => [
  {
    title: t('pages:home.features.emergency.title'),
    icon: <Phone className="h-8 w-8 text-white" />,
    desc: t('pages:home.features.emergency.description'),
    href: "/emergency-call",
    color: "from-red-600 to-red-800",
    bgLight: "bg-red-50",
    bgDark: "dark:bg-red-900/20",
    priority: true,
  },
  {
    title: t('pages:home.features.health.title'),
    icon: <Activity className="h-8 w-8 text-white" />,
    desc: t('pages:home.features.health.description'),
    href: "/health",
    color: "from-blue-500 to-blue-700",
    bgLight: "bg-blue-50",
    bgDark: "dark:bg-blue-900/20",
  },
  {
    title: t('pages:home.features.reminders.title'),
    icon: <CalendarClock className="h-8 w-8 text-white" />,
    desc: t('pages:home.features.reminders.description'),
    href: "/reminders",
    color: "from-green-500 to-green-700",
    bgLight: "bg-green-50",
    bgDark: "dark:bg-green-900/20",
  },
  {
    title: t('pages:home.features.location.title'),
    icon: <MapPin className="h-8 w-8 text-white" />,
    desc: t('pages:home.features.location.description'),
    href: "/location",
    color: "from-indigo-500 to-indigo-700",
    bgLight: "bg-indigo-50",
    bgDark: "dark:bg-indigo-900/20",
  },
  {
    title: t('pages:home.features.heartTemp.title'),
    icon: <Activity className="h-8 w-8 text-white" />,
    desc: t('pages:home.features.heartTemp.description'),
    href: "/heart-temp-monitoring",
    color: "from-teal-500 to-emerald-700",
    bgLight: "bg-teal-50",
    bgDark: "dark:bg-teal-900/20",
  },
  {
    title: t('pages:home.features.diaper.title'),
    icon: <MonitorSmartphone className="h-8 w-8 text-white" />,
    desc: t('pages:home.features.diaper.description'),
    href: "/diaper-monitoring",
    color: "from-orange-500 to-orange-700",
    bgLight: "bg-orange-50",
    bgDark: "dark:bg-orange-900/20",
  },
]

export default function HomePage() {
  const { t } = useTranslation()
  const features = getFeatures(t)

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
              {t('common:app.subtitle')}
            </div>
          </div>

          <h1 className="mb-4 text-4xl md:text-5xl font-bold tracking-tight">
            {t('pages:home.title')}<span className="gradient-text font-extrabold"> {t('common:app.title')}</span>
          </h1>

          <p className="mb-6 text-xl opacity-90 leading-relaxed">
            {t('pages:home.subtitle')}
          </p>

          <div className="flex flex-wrap gap-4">
            <Link to="/health">
              <Button size="lg" className="btn-glow font-semibold px-6 py-6 h-auto">
                {t('pages:home.actions.startUsing')}
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
                {t('pages:home.actions.systemGuide')}
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {/* 統計概覽 */}
      <div className="grid gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 mb-8">
        {[
          {
            title: t('pages:home.stats.totalResidents'),
            value: "72",
            icon: <Users className="h-6 w-6" />,
            change: "+2",
            color: "text-blue-600",
            bgColor: "bg-blue-100 dark:bg-blue-900/30",
            href: "/residents",
          },
          {
            title: t('pages:home.stats.todayTasks'),
            value: "28",
            icon: <ClipboardCheck className="h-6 w-6" />,
            change: `12 ${t('pages:home.stats.completed')}`,
            color: "text-green-600",
            bgColor: "bg-green-100 dark:bg-green-900/30",
            href: "/reminders",
          },
          {
            title: t('pages:home.stats.healthAlerts'),
            value: "3",
            icon: <Bell className="h-6 w-6" />,
            change: "-1",
            color: "text-amber-600",
            bgColor: "bg-amber-100 dark:bg-amber-900/30",
            href: "/health",
          },
          {
            title: t('pages:home.stats.monthlyReport'),
            value: t('common:actions.view'),
            icon: <LineChart className="h-6 w-6" />,
            change: "",
            color: "text-purple-600",
            bgColor: "bg-purple-100 dark:bg-purple-900/30",
            href: "/more",
          },
        ].map((stat, i) => (
          <Link to={stat.href} key={i} className="h-full block">
            <Card className="h-full flex flex-col card-float overflow-hidden border-0 shadow-md hover:scale-[1.01] hover:shadow-lg transition-transform">
              <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
                <div className={`rounded-full p-2 ${stat.color} ${stat.bgColor}`}>
                  {stat.icon}
                </div>
              </CardHeader>
              <CardContent className="flex-1 flex flex-col min-h-[4.5rem]">
                <div className="text-2xl font-bold">{stat.value}</div>
                <p className="text-xs text-muted-foreground mt-1 min-h-[1.25rem]">{stat.change || '\u00A0'}</p>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      {/* 功能卡片區 */}
      <div>
        <h2 className="text-2xl font-bold tracking-tight mb-6 flex items-center">
          <span className="mr-2">{t('navigation:sidebar.sections.main')}</span>
          <div className="h-1 flex-1 bg-gradient-to-r from-primary/50 to-transparent rounded-full"></div>
        </h2>
        <div className="grid gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((feature) => (
            <Link to={feature.href} key={feature.title} className="group relative block">
              <Card
                className={`card-float transition-transform hover:scale-[1.01] hover:shadow-lg border-0 overflow-hidden ${feature.priority
                  ? 'ring-2 ring-red-200 dark:ring-red-800 shadow-lg'
                  : ''
                  } ${feature.bgLight} ${feature.bgDark}`}
              >
                <div className={`absolute inset-0 bg-gradient-to-br opacity-0 group-hover:opacity-10 transition-opacity duration-300 ${feature.color} pointer-events-none`} />
                {feature.priority && (
                  <div className="absolute top-2 right-2 bg-red-500 text-white text-xs font-bold px-2 py-1 rounded-full">
                    {t('status:alerts.emergency')}
                  </div>
                )}
                <CardHeader>
                  <div className="flex items-center gap-4">
                    <div className={`icon-container ${feature.priority ? 'animate-pulse' : ''}`}>
                      {feature.icon}
                    </div>
                    <CardTitle className={`text-xl ${feature.priority ? 'text-red-700 dark:text-red-400' : ''}`}>
                      {feature.title}
                    </CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">{feature.desc}</p>
                  <div className={`mt-4 flex items-center text-sm font-medium ${feature.priority ? 'text-red-600 dark:text-red-400' : 'text-primary'
                    }`}>
                    <span>{t('common:actions.view')} {t('common:placeholders.details', '詳情')}</span>
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
