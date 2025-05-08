"use client"

import * as React from "react"
import { ThemeProvider as NextThemesProvider } from "next-themes"
import { type ThemeProviderProps } from "next-themes/dist/types"

// 確保ThemeProvider能夠正確運行在非Next.js環境中
export function ThemeProvider({ children, ...props }: ThemeProviderProps) {
  const [mounted, setMounted] = React.useState(false)

  // 確保在客戶端渲染時才顯示UI，避免水合不匹配問題
  React.useEffect(() => {
    setMounted(true)
  }, [])

  // 防止水合不匹配問題
  if (!mounted) {
    return <div style={{ visibility: "hidden" }}>{children}</div>
  }

  // @ts-ignore - 忽略類型錯誤，確保組件能正常渲染
  return <NextThemesProvider {...props}>{children}</NextThemesProvider>
} 