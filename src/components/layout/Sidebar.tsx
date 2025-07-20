"use client"

import { Link, useLocation } from 'react-router-dom'
import { cn } from '@/lib/utils'
import { useEmergencyCall } from '@/contexts/EmergencyCallContext'
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

const navigation = [
  {
    name: '首頁',
    href: '/',
    icon: Home,
    color: 'bg-blue-100 text-blue-600 dark:bg-blue-900/40 dark:text-blue-300',
    description: '返回系統首頁',
  },
  {
    name: '緊急呼叫',
    href: '/emergency-call',
    icon: Phone,
    color: 'bg-red-100 text-red-600 dark:bg-red-900/40 dark:text-red-300',
    description: '快速發送緊急求助信號',
  },
  {
    name: '健康監控',
    href: '/health',
    icon: HeartPulse,
    color: 'bg-rose-100 text-rose-600 dark:bg-rose-900/40 dark:text-rose-300',
    description: '即時監測生命體徵',
  },
  {
    name: '定時提醒',
    href: '/reminders',
    icon: CalendarClock,
    color: 'bg-green-100 text-green-600 dark:bg-green-900/40 dark:text-green-300',
    description: '服藥與照顧提醒',
  },
  {
    name: '室內定位',
    href: '/location',
    icon: Map,
    color: 'bg-indigo-100 text-indigo-600 dark:bg-indigo-900/40 dark:text-indigo-300',
    description: '位置追蹤與安全區域',
  },
  {
    name: '院友管理',
    href: '/residents',
    icon: Users,
    color: 'bg-purple-100 text-purple-600 dark:bg-purple-900/40 dark:text-purple-300',
    description: '管理院友資料與記錄',
  },
  {
    name: '員工管理',
    href: '/staff',
    icon: UserCog,
    color: 'bg-teal-100 text-teal-600 dark:bg-teal-900/40 dark:text-teal-300',
    description: '護理人員和職員管理',
  },
  {
    name: '設備管理',
    href: '/devices',
    icon: MonitorSmartphone,
    color: 'bg-orange-100 text-orange-600 dark:bg-orange-900/40 dark:text-orange-300',
    description: '照護設備管理與維護',
  },
  {
    name: '養老院管理',
    href: '/uwb-location',
    icon: Building2,
    color: 'bg-cyan-100 text-cyan-600 dark:bg-cyan-900/40 dark:text-cyan-300',
    description: 'UWB定位系統場域管理',
  },
  {
    name: '更多功能',
    href: '/more',
    icon: Lightbulb,
    color: 'bg-amber-100 text-amber-600 dark:bg-amber-800/40 dark:text-amber-300',
    description: '探索智慧照護功能',
  },
  {
    name: '設置',
    href: '/settings',
    icon: Settings,
    color: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300',
    description: '系統設置與偏好設定',
  },
  {
    name: '幫助中心',
    href: '/help',
    icon: HelpCircle,
    color: 'bg-sky-100 text-sky-600 dark:bg-sky-900/40 dark:text-sky-300',
    description: '使用指南與支援',
  },
]

export function Sidebar() {
  const location = useLocation()
  const pathname = location.pathname

  return (
    <div className="hidden border-r bg-background/80 backdrop-blur-sm md:block w-64 shadow-sm">
      <div className="flex h-full flex-col">
        <div className="flex items-center p-4 mb-2">
          <div className="h-8 w-8 rounded-full bg-primary flex items-center justify-center mr-2">
            <span className="text-primary-foreground font-bold">護</span>
          </div>
          <span className="font-bold text-lg">長者照護系統</span>
        </div>

        <div className="flex-1 overflow-auto py-4 px-3">
          <div className="space-y-1">
            <SidebarSection title="主要功能" items={navigation.slice(0, 5)} pathname={pathname} />
            <SidebarSection title="管理功能" items={navigation.slice(5, 9)} pathname={pathname} />
            <SidebarSection title="系統" items={navigation.slice(9)} pathname={pathname} />
          </div>
        </div>

        <div className="border-t px-3 py-4">
          <div className="flex items-center justify-between">
            <div className="text-sm font-medium text-muted-foreground">© 2024 長者照護系統</div>
            <div className="flex items-center space-x-2">
              <Sparkles className="h-4 w-4 text-primary" />
              <span className="text-xs text-primary">專業版</span>
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
  items: typeof navigation
  pathname: string
}) {
  const { hasActiveCall } = useEmergencyCall()

  return (
    <div className="px-3 pb-3 border-b">
      <h2 className="mb-2 text-lg font-semibold tracking-tight">{title}</h2>
      <nav className="grid items-start text-sm font-medium gap-2">
        {items.map((item) => {
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

