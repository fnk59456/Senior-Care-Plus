import React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Search, Filter, RefreshCw, AlertCircle, TestTube, Bug } from 'lucide-react'
import { useDeviceManagement } from '@/contexts/DeviceManagementContext'
import { useDeviceMonitoring } from '@/contexts/DeviceMonitoringContext'
import { DeviceType, DeviceStatus } from '@/types/device-types'
import DeviceMonitorCard from './DeviceMonitorCard'
import DeviceMonitoringControls from './DeviceMonitoringControls'
import DeviceMonitoringStatus from './DeviceMonitoringStatus'
import DeviceMonitoringTest from './DeviceMonitoringTest'
import DeviceMonitoringDebug from './DeviceMonitoringDebug'
import { useTranslation } from 'react-i18next'

interface DeviceMonitoringViewProps {
    onAction: (action: string, deviceId: string) => void
}

export default function DeviceMonitoringView({ onAction }: DeviceMonitoringViewProps) {
    const { t } = useTranslation()
    const { devices, getResidentForDevice, getDeviceStatusSummary } = useDeviceManagement()
    const {
        realTimeDevices,
        isMonitoring,
        connectionStatus
    } = useDeviceMonitoring()

    // 狀態管理
    const [searchTerm, setSearchTerm] = React.useState('')
    const [statusFilter, setStatusFilter] = React.useState<DeviceStatus | 'all'>('all')
    const [typeFilter, setTypeFilter] = React.useState<DeviceType | 'all'>('all')
    const [isRefreshing, setIsRefreshing] = React.useState(false)
    const [showControls, setShowControls] = React.useState(false)
    const [showTest, setShowTest] = React.useState(false)
    const [showDebug, setShowDebug] = React.useState(false)

    // 只顯示已綁定設備
    const boundDevices = devices.filter(device => device.residentId)

    // 獲取實時數據
    const getDeviceWithRealTimeData = (device: any) => {
        const realTimeData = realTimeDevices.get(device.id)
        return {
            ...device,
            realTimeData
        }
    }

    // 篩選設備
    const filteredDevices = boundDevices.filter(device => {
        const resident = getResidentForDevice(device.id)

        // 搜索篩選
        const matchesSearch =
            device.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            device.hardwareId.toLowerCase().includes(searchTerm.toLowerCase()) ||
            device.deviceUid.toLowerCase().includes(searchTerm.toLowerCase()) ||
            (resident && (
                resident.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                resident.room.toLowerCase().includes(searchTerm.toLowerCase())
            ))

        // 狀態篩選
        const matchesStatus = statusFilter === 'all' || device.status === statusFilter

        // 類型篩選
        const matchesType = typeFilter === 'all' || device.deviceType === typeFilter

        return matchesSearch && matchesStatus && matchesType
    })

    // 統計數據
    const deviceStatusSummary = getDeviceStatusSummary()
    const monitoringStats = {
        total: boundDevices.length,
        online: boundDevices.filter(device => {
            const realTimeData = realTimeDevices.get(device.id)
            return realTimeData && realTimeData.status === 'online'
        }).length,
        offline: boundDevices.filter(device => {
            const realTimeData = realTimeDevices.get(device.id)
            return !realTimeData || realTimeData.status === 'offline'
        }).length,
        error: boundDevices.filter(device => {
            const realTimeData = realTimeDevices.get(device.id)
            return realTimeData && realTimeData.status === 'error'
        }).length,
        averageBattery: boundDevices.length > 0 ?
            Math.round(boundDevices.reduce((sum, device) => {
                const realTimeData = realTimeDevices.get(device.id)
                return sum + (realTimeData?.batteryLevel || device.batteryLevel || 0)
            }, 0) / boundDevices.length) : 0
    }
    const activeDevices = isMonitoring ? monitoringStats.online : deviceStatusSummary[DeviceStatus.ACTIVE]
    const offlineDevices = isMonitoring ? monitoringStats.offline : deviceStatusSummary[DeviceStatus.OFFLINE]
    const errorDevices = isMonitoring ? monitoringStats.error : deviceStatusSummary[DeviceStatus.ERROR]

    // 刷新數據
    const handleRefresh = async () => {
        setIsRefreshing(true)
        // 這裡可以添加實際的刷新邏輯
        setTimeout(() => {
            setIsRefreshing(false)
        }, 1000)
    }

    // 處理設備操作
    const handleDeviceAction = (action: string, deviceId: string) => {
        console.log(`執行操作: ${action} 設備ID: ${deviceId}`)
        onAction(action, deviceId)
    }

    return (
        <div className="space-y-6">
            {/* 監控狀態和控制面板 */}
            <div className="flex justify-between items-center">
                <h3 className="text-lg font-semibold">設備監控</h3>
                <div className="flex gap-2">
                    <Button
                        variant="outline"
                        onClick={() => setShowControls(!showControls)}
                        className="gap-2"
                    >
                        <Filter className="h-4 w-4" />
                        {showControls ? '隱藏控制' : '顯示控制'}
                    </Button>
                    <Button
                        variant="outline"
                        onClick={() => setShowTest(!showTest)}
                        className="gap-2"
                    >
                        <TestTube className="h-4 w-4" />
                        {showTest ? '隱藏測試' : '顯示測試'}
                    </Button>
                    <Button
                        variant="outline"
                        onClick={() => setShowDebug(!showDebug)}
                        className="gap-2"
                    >
                        <Bug className="h-4 w-4" />
                        {showDebug ? '隱藏調試' : '顯示調試'}
                    </Button>
                </div>
            </div>

            {/* 監控狀態 */}
            <DeviceMonitoringStatus />

            {/* 監控控制面板 */}
            {showControls && <DeviceMonitoringControls />}

            {/* 測試面板 */}
            {showTest && <DeviceMonitoringTest />}

            {/* 調試面板 */}
            {showDebug && <DeviceMonitoringDebug />}

            {/* 統計概覽 */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card>
                    <CardContent className="p-4">
                        <div className="text-center">
                            <p className="text-2xl font-bold text-blue-600">{boundDevices.length}</p>
                            <p className="text-sm text-muted-foreground">已綁定設備</p>
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="p-4">
                        <div className="text-center">
                            <p className="text-2xl font-bold text-green-600">{activeDevices}</p>
                            <p className="text-sm text-muted-foreground">線上設備</p>
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="p-4">
                        <div className="text-center">
                            <p className="text-2xl font-bold text-yellow-600">{offlineDevices}</p>
                            <p className="text-sm text-muted-foreground">離線設備</p>
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="p-4">
                        <div className="text-center">
                            <p className="text-2xl font-bold text-red-600">{errorDevices}</p>
                            <p className="text-sm text-muted-foreground">錯誤設備</p>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* 搜索和篩選 */}
            <Card>
                <CardContent className="p-4">
                    <div className="flex flex-col md:flex-row gap-4">
                        {/* 搜索框 */}
                        <div className="flex-1 relative">
                            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input
                                placeholder="搜索設備、院友或位置..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="pl-10"
                            />
                        </div>

                        {/* 狀態篩選 */}
                        <Select value={statusFilter} onValueChange={(value: DeviceStatus | 'all') => setStatusFilter(value)}>
                            <SelectTrigger className="w-full md:w-40">
                                <SelectValue placeholder="設備狀態" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">所有狀態</SelectItem>
                                <SelectItem value={DeviceStatus.ACTIVE}>線上</SelectItem>
                                <SelectItem value={DeviceStatus.INACTIVE}>非活躍</SelectItem>
                                <SelectItem value={DeviceStatus.OFFLINE}>離線</SelectItem>
                                <SelectItem value={DeviceStatus.ERROR}>錯誤</SelectItem>
                            </SelectContent>
                        </Select>

                        {/* 類型篩選 */}
                        <Select value={typeFilter} onValueChange={(value: DeviceType | 'all') => setTypeFilter(value)}>
                            <SelectTrigger className="w-full md:w-40">
                                <SelectValue placeholder="設備類型" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">所有類型</SelectItem>
                                <SelectItem value={DeviceType.SMARTWATCH_300B}>智慧手錶</SelectItem>
                                <SelectItem value={DeviceType.DIAPER_SENSOR}>尿布感測器</SelectItem>
                                <SelectItem value={DeviceType.PEDOMETER}>計步器</SelectItem>
                                <SelectItem value={DeviceType.UWB_TAG}>UWB標籤</SelectItem>
                            </SelectContent>
                        </Select>

                        {/* 刷新按鈕 */}
                        <Button
                            variant="outline"
                            onClick={handleRefresh}
                            disabled={isRefreshing}
                            className="gap-2"
                        >
                            <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
                            刷新
                        </Button>
                    </div>
                </CardContent>
            </Card>

            {/* 設備監控卡片網格 */}
            <div>
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold">設備監控</h3>
                    <Badge variant="outline" className="gap-1">
                        <Filter className="h-3 w-3" />
                        {filteredDevices.length} 個設備
                    </Badge>
                </div>

                {filteredDevices.length === 0 ? (
                    <Card>
                        <CardContent className="p-8 text-center">
                            <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                            <p className="text-muted-foreground">
                                {boundDevices.length === 0
                                    ? '沒有已綁定的設備'
                                    : '沒有符合篩選條件的設備'
                                }
                            </p>
                        </CardContent>
                    </Card>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {filteredDevices.map(device => {
                            const resident = getResidentForDevice(device.id)
                            const deviceWithRealTime = getDeviceWithRealTimeData(device)
                            return (
                                <DeviceMonitorCard
                                    key={device.id}
                                    device={deviceWithRealTime}
                                    resident={resident}
                                    onAction={handleDeviceAction}
                                />
                            )
                        })}
                    </div>
                )}
            </div>
        </div>
    )
}
