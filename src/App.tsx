import React from 'react'
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import { ThemeProvider } from './components/providers/ThemeProvider'
import { MainLayout } from './components/layout/MainLayout'  
import HomePage from './pages/HomePage'
import HealthPage from './pages/HealthPage'
import NewHealthPage from './pages/NewHealthPage'
import LocationPage from './pages/LocationPage'
import RemindersPage from './pages/RemindersPage'
import ResidentsPage from './pages/ResidentsPage'
import ResidentDetailPage from './pages/ResidentDetailPage'
import SettingsPage from './pages/SettingsPage'
import './index.css'

function App() {
  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
      <Router>
        <MainLayout>
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/health" element={<HealthPage />} />
            <Route path="/health2" element={<NewHealthPage />} />
            <Route path="/location" element={<LocationPage />} />
            <Route path="/reminders" element={<RemindersPage />} />
            <Route path="/residents" element={<ResidentsPage />} />
            <Route path="/residents/:id" element={<ResidentDetailPage />} />
            <Route path="/settings" element={<SettingsPage />} />
            <Route path="/staff" element={<Placeholder title="員工管理頁面" />} />
            <Route path="/devices" element={<Placeholder title="設備管理頁面" />} />
            <Route path="/more" element={<Placeholder title="更多功能頁面" />} />
            <Route path="/help" element={<Placeholder title="幫助中心" />} />
            <Route path="*" element={<Placeholder title="404 - 頁面不存在" />} />
          </Routes>
        </MainLayout>
      </Router>
    </ThemeProvider>
  )
}

function Placeholder({ title }: { title: string }) {
  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold">{title}</h1>
      <p>此頁面正在開發中</p>
    </div>
  )
}

export default App
