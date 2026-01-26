"use client"

import { ReactNode } from 'react'
import { Sidebar } from './Sidebar'
import { TopNav } from './TopNav'
import { Toaster } from '@/components/ui/toaster'

interface MainLayoutProps {
  children: ReactNode
}

export function MainLayout({ children }: MainLayoutProps) {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <TopNav />
      <div className="flex flex-1 overflow-hidden">
        {/* 桌面端側邊欄 */}
        <div className="hidden md:block w-64 fixed left-0 top-16 h-[calc(100vh-4rem)] z-30">
          <Sidebar />
        </div>

        {/* 移動端側邊欄 (初始隱藏) */}
        <div id="mobile-sidebar" className="fixed inset-0 z-40 hidden md:hidden">
          <div className="absolute inset-0 bg-black/50" />
          <div className="absolute left-0 top-0 bottom-0 w-64 bg-background shadow-xl">
            <Sidebar />
          </div>
        </div>

        <main className="flex-1 overflow-auto p-4 md:p-6 lg:p-8 md:ml-64">
          <div className="container mx-auto max-w-7xl">
            {children}
          </div>
        </main>
      </div>
      <Toaster />
    </div>
  )
}