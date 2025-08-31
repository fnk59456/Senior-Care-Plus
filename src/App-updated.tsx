import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import { DeviceManagementProvider } from '@/contexts/DeviceManagementContext'
import { ThemeProvider } from '@/components/providers/ThemeProvider'
import MainLayout from '@/components/layout/MainLayout'
import EnhancedHealthPage from '@/pages/EnhancedHealthPage'
import DeviceManagementPage from '@/pages/DeviceManagementPage'
import ResidentsPage from '@/pages/ResidentsPage'
import LocationPage from '@/pages/LocationPage'
import HeartRatePage from '@/pages/HeartRatePage'
import TemperaturePage from '@/pages/TemperaturePage'
import DiaperMonitoringPage from '@/pages/DiaperMonitoringPage'
import EmergencyCallPage from '@/pages/EmergencyCallPage'
import RemindersPage from '@/pages/RemindersPage'
import SettingsPage from '@/pages/SettingsPage'
import StaffManagementPage from '@/pages/StaffManagementPage'
import './App.css'

function App() {
    return (
        <ThemeProvider defaultTheme="light" storageKey="care-system-theme">
            <DeviceManagementProvider>
                <Router>
                    <MainLayout>
                        <Routes>
                            {/* 使用升級後的HealthPage */}
                            <Route path="/" element={<EnhancedHealthPage />} />
                            <Route path="/health" element={<EnhancedHealthPage />} />

                            {/* 現有頁面 */}
                            <Route path="/residents" element={<ResidentsPage />} />
                            <Route path="/devices" element={<DeviceManagementPage />} />
                            <Route path="/location" element={<LocationPage />} />
                            <Route path="/heart-rate" element={<HeartRatePage />} />
                            <Route path="/temperature" element={<TemperaturePage />} />
                            <Route path="/diaper-monitoring" element={<DiaperMonitoringPage />} />
                            <Route path="/emergency-call" element={<EmergencyCallPage />} />
                            <Route path="/reminders" element={<RemindersPage />} />
                            <Route path="/settings" element={<SettingsPage />} />
                            <Route path="/staff" element={<StaffManagementPage />} />
                        </Routes>
                    </MainLayout>
                </Router>
            </DeviceManagementProvider>
        </ThemeProvider>
    )
}

export default App
