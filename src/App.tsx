import React from 'react'
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import { ThemeProvider } from './components/providers/ThemeProvider'
import { EmergencyCallProvider } from './contexts/EmergencyCallContext'
import { MainLayout } from './components/layout/MainLayout'
import HomePage from './pages/HomePage'
import HealthPage from './pages/HealthPage'
import NewHealthPage from './pages/NewHealthPage'
import LocationPage from './pages/LocationPage'
import TemperaturePage from './pages/TemperaturePage'
import HeartRatePage from './pages/HeartRatePage'
import RemindersPage from './pages/RemindersPage'
import ResidentsPage from './pages/ResidentsPage'
import ResidentDetailPage from './pages/ResidentDetailPage'
import SettingsPage from './pages/SettingsPage'
import DiaperMonitoringPage from './pages/DiaperMonitoringPage'
import DeviceManagementPage from './pages/DeviceManagementPage'
import EmergencyCallPage from './pages/EmergencyCallPage'
import StaffManagementPage from './pages/StaffManagementPage'
import UWBLocationPage from './pages/UWBLocationPage'
import './index.css'

// Firebase Hosting使用根路徑
const basename = '/'

function App() {
  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
      <EmergencyCallProvider>
        <Router basename={basename}>
          <MainLayout>
            <Routes>
              <Route path="/" element={<HomePage />} />
              <Route path="/health" element={<HealthPage />} />
              <Route path="/health2" element={<NewHealthPage />} />
              <Route path="/location" element={<LocationPage />} />
              <Route path="/temperature" element={<TemperaturePage />} />
              <Route path="/heart-rate" element={<HeartRatePage />} />
              <Route path="/reminders" element={<RemindersPage />} />
              <Route path="/residents" element={<ResidentsPage />} />
              <Route path="/residents/:id" element={<ResidentDetailPage />} />
              <Route path="/diaper-monitoring" element={<DiaperMonitoringPage />} />
              <Route path="/devices" element={<DeviceManagementPage />} />
              <Route path="/settings" element={<SettingsPage />} />
              <Route path="/staff" element={<StaffManagementPage />} />
              <Route path="/uwb-location" element={<UWBLocationPage />} />
              <Route path="/more" element={<Placeholder title="更多功能頁面" />} />
              <Route path="/help" element={<Placeholder title="幫助中心" />} />
              <Route path="/emergency-call" element={<EmergencyCallPage />} />
              <Route path="*" element={<Placeholder title="404 - 頁面不存在" />} />
            </Routes>
          </MainLayout>
        </Router>
      </EmergencyCallProvider>
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
