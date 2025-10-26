// import React from 'react'
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import { ThemeProvider } from './components/providers/ThemeProvider'
import { EmergencyCallProvider } from './contexts/EmergencyCallContext'
import { UWBLocationProvider } from './contexts/UWBLocationContext'
import { DeviceManagementProvider } from './contexts/DeviceManagementContext'
import { DeviceMonitoringProvider } from './contexts/DeviceMonitoringContext'
import { DeviceDiscoveryProvider } from './contexts/DeviceDiscoveryContext'
import { LanguageProvider } from './contexts/LanguageContext'
import { MainLayout } from './components/layout/MainLayout'
import { ErrorBoundary } from './components/ErrorBoundary'
import { useTranslation } from 'react-i18next'
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
import TestI18nPage from './pages/TestI18nPage'
import BackendConnectionTest from './pages/BackendConnectionTest'
import FieldManagementTest from './pages/FieldManagementTest'
import './index.css'

// Firebase Hosting使用根路徑
const basename = '/'

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
        <LanguageProvider>
          <DeviceManagementProvider>
            <UWBLocationProvider>
              <DeviceMonitoringProvider>
                <DeviceDiscoveryProvider>
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
                          <Route path="/test-i18n" element={<TestI18nPage />} />
                          <Route path="/backend-test" element={<BackendConnectionTest />} />
                          <Route path="/field-test" element={<FieldManagementTest />} />
                          <Route path="/more" element={<Placeholder title="更多功能頁面" />} />
                          <Route path="/help" element={<Placeholder title="幫助中心" />} />
                          <Route path="/emergency-call" element={<EmergencyCallPage />} />
                          <Route path="*" element={<Placeholder title="404 - 頁面不存在" />} />
                        </Routes>
                      </MainLayout>
                    </Router>
                  </EmergencyCallProvider>
                </DeviceDiscoveryProvider>
              </DeviceMonitoringProvider>
            </UWBLocationProvider>
          </DeviceManagementProvider>
        </LanguageProvider>
      </ThemeProvider>
    </ErrorBoundary>
  )
}

function Placeholder({ title }: { title: string }) {
  const { t } = useTranslation()
  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold">{t('pages:placeholder.title', { title })}</h1>
      <p>{t('pages:placeholder.description')}</p>
    </div>
  )
}

export default App
