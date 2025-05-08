import React from 'react'
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import { ThemeProvider } from './components/providers/ThemeProvider'
import HomePage from './pages/HomePage'
import './index.css'

// 简单测试组件
const TestPage = () => {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="bg-card p-8 rounded-lg shadow-lg">
        <h1 className="text-3xl font-bold text-foreground mb-4">長者照護系統</h1>
        <p className="text-muted-foreground">應用程式測試頁面</p>
      </div>
    </div>
  )
}

function App() {
  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
      <Router>
        <Routes>
          <Route path="/" element={<HomePage />} />
        </Routes>
      </Router>
    </ThemeProvider>
  )
}

export default App
