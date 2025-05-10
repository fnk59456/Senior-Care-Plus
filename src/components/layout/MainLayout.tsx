"use client"

import { ReactNode } from 'react'
import { Sidebar } from './Sidebar'
import { TopNav } from './TopNav'

interface MainLayoutProps {
  children: ReactNode
}

export function MainLayout({ children }: MainLayoutProps) {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <TopNav />
      <div className="flex flex-1 overflow-hidden">
        {/* 只保留桌面端側邊欄 */}
        <div className="w-64 border-r bg-background">
          <Sidebar />
        </div>

        {/* 主內容 */}
        <main className="flex-1 overflow-auto p-4 md:p-6 lg:p-8">
          <div className="container mx-auto max-w-7xl">
            {children}
          </div>
        </main>
      </div>
    </div>
  )
}
