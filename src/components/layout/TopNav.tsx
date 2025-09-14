"use client"

import { Bell, Moon, Sun, Menu, Search, User, ShieldAlert, MessageSquare, LogOut, X } from 'lucide-react'
import { useTheme } from 'next-themes'
import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { LanguageSwitcher } from '@/components/LanguageSwitcher'
import { useTranslation } from 'react-i18next'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu'
import { Input } from '@/components/ui/input'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { useState } from 'react'

export function TopNav() {
  const { t } = useTranslation()
  const { setTheme, theme } = useTheme()
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen)
    // 切換側邊欄的可見性
    const mobileMenu = document.getElementById('mobile-sidebar')
    if (mobileMenu) {
      if (isMobileMenuOpen) {
        mobileMenu.classList.add('hidden')
      } else {
        mobileMenu.classList.remove('hidden')
      }
    }
  }

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 shadow-sm">
      <div className="container flex h-16 items-center justify-between">
        <div className="flex items-center gap-2 md:gap-4">
          <Button variant="ghost" size="icon" className="md:hidden" onClick={toggleMobileMenu}>
            {isMobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </Button>
          <a href="/" className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-full bg-gradient-to-br from-primary to-blue-600 flex items-center justify-center">
              <span className="text-primary-foreground font-bold">護</span>
            </div>
            <span className="hidden font-bold text-lg md:inline-block">{t('common:app.title')}</span>
          </a>
        </div>

        <div className="flex-1 mx-4 max-w-md hidden md:flex">
          <div className="relative w-full">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder={t('common:placeholders.search')}
              className="w-full pl-9 bg-muted/50 border-muted focus-visible:bg-background hover:bg-muted/80 transition-colors"
            />
          </div>
        </div>

        <div className="flex items-center gap-3">
          <LanguageSwitcher />

          <Button variant="ghost" size="icon" className="text-primary hover:text-primary/80 hover:bg-primary/10">
            <ShieldAlert className="h-5 w-5" />
          </Button>

          <Button variant="ghost" size="icon" className="text-primary hover:text-primary/80 hover:bg-primary/10">
            <MessageSquare className="h-5 w-5" />
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="relative text-primary hover:text-primary/80 hover:bg-primary/10">
                <Bell className="h-5 w-5" />
                <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-destructive text-[10px] font-medium text-destructive-foreground">3</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-80">
              <div className="p-3">
                <h3 className="font-semibold">通知</h3>
                <p className="text-sm text-muted-foreground">您有3條未讀通知</p>
              </div>
              <DropdownMenuSeparator />
              <div className="py-2 max-h-[300px] overflow-y-auto">
                {[
                  { title: "王老先生需要協助", time: "5分鐘前", type: "urgent" },
                  { title: "李大媽血壓異常", time: "10分鐘前", type: "warning" },
                  { title: "今日藥物提醒完成度90%", time: "30分鐘前", type: "info" }
                ].map((item, i) => (
                  <div key={i} className="px-4 py-2.5 hover:bg-muted cursor-pointer flex items-center gap-3">
                    <div className={`h-2 w-2 rounded-full ${item.type === 'urgent' ? 'bg-red-500' :
                      item.type === 'warning' ? 'bg-amber-500' :
                        'bg-blue-500'
                      }`} />
                    <div className="flex-1">
                      <p className="text-sm font-medium">{item.title}</p>
                      <p className="text-xs text-muted-foreground">{item.time}</p>
                    </div>
                  </div>
                ))}
              </div>
              <DropdownMenuSeparator />
              <div className="p-2">
                <Button variant="ghost" size="sm" className="w-full">查看所有通知</Button>
              </div>
            </DropdownMenuContent>
          </DropdownMenu>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="text-primary hover:text-primary/80 hover:bg-primary/10">
                <Sun className="h-5 w-5 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
                <Moon className="absolute h-5 w-5 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
                <span className="sr-only">切換主題</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => setTheme("light")} className="cursor-pointer">
                <Sun className="mr-2 h-4 w-4" />
                淺色
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setTheme("dark")} className="cursor-pointer">
                <Moon className="mr-2 h-4 w-4" />
                深色
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setTheme("system")} className="cursor-pointer">
                <span className="mr-2">💻</span>
                系統
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="gap-2 ml-2 rounded-full px-2 hover:bg-primary/10">
                <Avatar className="h-8 w-8 border-2 border-primary/20">
                  <AvatarImage src="/avatar.png" alt="使用者頭像" />
                  <AvatarFallback className="bg-primary/10 text-primary">管理</AvatarFallback>
                </Avatar>
                <div className="hidden md:block text-left">
                  <span className="block text-sm font-medium">管理員</span>
                  <span className="block text-xs text-muted-foreground">超級管理員</span>
                </div>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <div className="p-2 border-b">
                <p className="font-medium">張志豪</p>
                <p className="text-xs text-muted-foreground">admin@example.com</p>
              </div>
              <DropdownMenuItem className="cursor-pointer">
                <User className="mr-2 h-4 w-4" />
                個人資料
              </DropdownMenuItem>
              <DropdownMenuItem className="cursor-pointer">
                <ShieldAlert className="mr-2 h-4 w-4" />
                安全設置
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="cursor-pointer text-destructive focus:text-destructive focus:bg-destructive/10">
                <LogOut className="mr-2 h-4 w-4" />
                登出
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  )
}