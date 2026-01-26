"use client"

import { Link, useLocation } from 'react-router-dom'
import { cn } from '@/lib/utils'
import { useEmergencyCall } from '@/contexts/EmergencyCallContext'
import { useTranslation } from 'react-i18next'
import {
  Home,
  HeartPulse,
  CalendarClock,
  Map,
  Users,
  UserCog,
  MonitorSmartphone,
  Building2,
  Lightbulb,
  Settings,
  HelpCircle,
  Sparkles,
  Phone,
} from 'lucide-react'

// 導航項目配置 - 使用函數來獲取翻譯
const getNavigationItems = (t: any) => [
  {
    name: t('navigation:sidebar.items.home.name'),
    href: '/',
    icon: Home,
    color: 'bg-blue-100 text-blue-600 dark:bg-blue-900/40 dark:text-blue-300',
    description: t('navigation:sidebar.items.home.description'),
  },
  {
    name: t('navigation:sidebar.items.emergency.name'),
    href: '/emergency-call',
    icon: Phone,
    color: 'bg-red-100 text-red-600 dark:bg-red-900/40 dark:text-red-300',
    description: t('navigation:sidebar.items.emergency.description'),
  },
  {
    name: t('navigation:sidebar.items.health.name'),
    href: '/health',
    icon: HeartPulse,
    color: 'bg-rose-100 text-rose-600 dark:bg-rose-900/40 dark:text-rose-300',
    description: t('navigation:sidebar.items.health.description'),
  },
  {
    name: t('navigation:sidebar.items.reminders.name'),
    href: '/reminders',
    icon: CalendarClock,
    color: 'bg-green-100 text-green-600 dark:bg-green-900/40 dark:text-green-300',
    description: t('navigation:sidebar.items.reminders.description'),
  },
  {
    name: t('navigation:sidebar.items.location.name'),
    href: '/location',
    icon: Map,
    color: 'bg-indigo-100 text-indigo-600 dark:bg-indigo-900/40 dark:text-indigo-300',
    description: t('navigation:sidebar.items.location.description'),
  },
  {
    name: t('navigation:sidebar.items.residents.name'),
    href: '/residents',
    icon: Users,
    color: 'bg-purple-100 text-purple-600 dark:bg-purple-900/40 dark:text-purple-300',
    description: t('navigation:sidebar.items.residents.description'),
  },
  {
    name: t('navigation:sidebar.items.staff.name'),
    href: '/staff',
    icon: UserCog,
    color: 'bg-teal-100 text-teal-600 dark:bg-teal-900/40 dark:text-teal-300',
    description: t('navigation:sidebar.items.staff.description'),
  },
  {
    name: t('navigation:sidebar.items.devices.name'),
    href: '/devices',
    icon: MonitorSmartphone,
    color: 'bg-orange-100 text-orange-600 dark:bg-orange-900/40 dark:text-orange-300',
    description: t('navigation:sidebar.items.devices.description'),
  },
  {
    name: t('navigation:sidebar.items.uwbLocation.name'),
    href: '/uwb-location',
    icon: Building2,
    color: 'bg-cyan-100 text-cyan-600 dark:bg-cyan-900/40 dark:text-cyan-300',
    description: t('navigation:sidebar.items.uwbLocation.description'),
  },
  {
    name: '後端測試',
    href: '/backend-test',
    icon: Sparkles,
    color: 'bg-purple-100 text-purple-600 dark:bg-purple-900/40 dark:text-purple-300',
    description: '測試前端與後端連接',
  },
  {
    name: '場域管理測試',
    href: '/field-test',
    icon: Building2,
    color: 'bg-indigo-100 text-indigo-600 dark:bg-indigo-900/40 dark:text-indigo-300',
    description: '測試場域增刪改查功能',
  },
  {
    name: t('navigation:sidebar.items.more.name'),
    href: '/more',
    icon: Lightbulb,
    color: 'bg-amber-100 text-amber-600 dark:bg-amber-800/40 dark:text-amber-300',
    description: t('navigation:sidebar.items.more.description'),
  },
  {
    name: t('navigation:sidebar.items.settings.name'),
    href: '/settings',
    icon: Settings,
    color: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300',
    description: t('navigation:sidebar.items.settings.description'),
  },
  {
    name: t('navigation:sidebar.items.help.name'),
    href: '/help',
    icon: HelpCircle,
    color: 'bg-sky-100 text-sky-600 dark:bg-sky-900/40 dark:text-sky-300',
    description: t('navigation:sidebar.items.help.description'),
  },
]

export function Sidebar() {
  const location = useLocation()
  const pathname = location.pathname
  const { t } = useTranslation()
  const navigation = getNavigationItems(t)

  return (
    <div className="hidden border-r bg-background/80 backdrop-blur-sm md:block w-64 shadow-sm h-full">
      <div className="flex h-full flex-col">
        <div className="flex-1 overflow-auto py-4 px-3">
          <div className="space-y-1">
            <SidebarSection title={t('navigation:sidebar.sections.main')} items={navigation.slice(0, 5)} pathname={pathname} />
            <SidebarSection title={t('navigation:sidebar.sections.management')} items={navigation.slice(5, 9)} pathname={pathname} />
            <SidebarSection title={t('navigation:sidebar.sections.system')} items={navigation.slice(9)} pathname={pathname} />
          </div>
        </div>

        <div className="border-t px-3 py-4">
          <div className="flex items-center justify-between">
            <div className="text-sm font-medium text-muted-foreground">{t('navigation:footer.copyright')}</div>
            <div className="flex items-center space-x-2">
              <Sparkles className="h-4 w-4 text-primary" />
              <span className="text-xs text-primary">{t('navigation:footer.version')}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function SidebarSection({
  title,
  items,
  pathname,
}: {
  title: string
  items: any[]
  pathname: string
}) {
  const { hasActiveCall } = useEmergencyCall()

  return (
    <div className="px-3 pb-3 border-b">
      <h2 className="mb-2 text-lg font-semibold tracking-tight">{title}</h2>
      <nav className="grid items-start text-sm font-medium gap-2">
        {items.map((item: any) => {
          console.log("渲染項目：", item.name, "=>", item.href)

          // 檢查是否為緊急呼叫項目
          const isEmergencyCall = item.href === '/emergency-call'
          const shouldShowAlert = isEmergencyCall && hasActiveCall

          return (
            <Link
              key={item.href}
              to={item.href}
              onClick={() => {
                console.log("點擊：", item.name, "=>", item.href)
              }}
              className={cn(
                "flex w-full items-center text-left gap-3 rounded-lg px-3 py-2.5 transition-all group relative",
                shouldShowAlert ? "border border-red-200 dark:border-red-800" : "",
                pathname === item.href
                  ? "bg-primary/10 text-primary font-semibold shadow-sm"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              <span
                className={cn(
                  "rounded-full p-2 flex items-center justify-center transition-all duration-200",
                  item.color,
                  shouldShowAlert ? "animate-pulse" : "",
                  pathname === item.href ? "shadow-inner" : "group-hover:shadow"
                )}
              >
                <item.icon className="h-5 w-5" />
              </span>
              <div className="flex flex-col">
                <span className={shouldShowAlert ? "font-semibold" : ""}>{item.name}</span>
                {pathname === item.href && (
                  <span className="text-xs text-muted-foreground font-normal">{item.description}</span>
                )}
              </div>
              {shouldShowAlert && pathname !== item.href && (
                <span className="absolute right-2 top-1/2 -translate-y-1/2 bg-red-500 text-white text-xs px-1.5 py-0.5 rounded-full font-bold">
                  !
                </span>
              )}
              {pathname === item.href && (
                <span className="absolute right-2 top-1/2 -translate-y-1/2 w-1.5 h-8 bg-primary rounded-full" />
              )}
            </Link>
          )
        })}
      </nav>
    </div>
  )
}

