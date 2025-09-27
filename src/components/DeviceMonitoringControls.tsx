import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
// import { Alert, AlertDescription } from '@/components/ui/alert'
import {
    Play,
    Square,
    Wifi,
    WifiOff,
    AlertCircle,
    CheckCircle2,
    Clock,
    Activity,
    Battery,
    Signal
} from 'lucide-react'
import { useDeviceMonitoring } from '@/contexts/DeviceMonitoringContext'
import { useUWBLocation } from '@/contexts/UWBLocationContext'
import { useTranslation } from 'react-i18next'

export default function DeviceMonitoringControls() {
    const { t } = useTranslation()
    const {
        isMonitoring,
        connectionStatus,
        startMonitoring,
        stopMonitoring,
        getMonitoringStats
    } = useDeviceMonitoring()

    const { gateways } = useUWBLocation()

    // 狀態管理
    const [selectedGateways, setSelectedGateways] = useState<string[]>([])
    const [isStarting, setIsStarting] = useState(false)

    // 統計數據
    const stats = getMonitoringStats()

    // 可用的Gateway列表
    const availableGateways = gateways.filter(gateway => gateway.status === 'online')

    // 處理Gateway選擇
    const handleGatewaySelect = (gatewayId: string) => {
        if (selectedGateways.includes(gatewayId)) {
            setSelectedGateways(prev => prev.filter(id => id !== gatewayId))
        } else {
            setSelectedGateways(prev => [...prev, gatewayId])
        }
    }

    // 啟動監控
    const handleStartMonitoring = async () => {
        if (selectedGateways.length === 0) {
            alert('請選擇至少一個Gateway')
            return
        }

        setIsStarting(true)
        try {
            await startMonitoring(selectedGateways)
        } catch (error) {
            console.error('啟動監控失敗:', error)
        } finally {
            setIsStarting(false)
        }
    }

    // 停止監控
    const handleStopMonitoring = () => {
        stopMonitoring()
        setSelectedGateways([])
    }

    // 獲取連接狀態圖標
    const getConnectionIcon = () => {
        if (isMonitoring && connectionStatus.isConnected) {
            return <Wifi className="h-4 w-4 text-green-500" />
        } else if (isMonitoring && !connectionStatus.isConnected) {
            return <WifiOff className="h-4 w-4 text-red-500" />
        } else {
            return <WifiOff className="h-4 w-4 text-gray-400" />
        }
    }

    // 獲取連接狀態文字
    const getConnectionText = () => {
        if (isMonitoring && connectionStatus.isConnected) {
            return `已連接 (${connectionStatus.connectedGateways.length} 個Gateway)`
        } else if (isMonitoring && !connectionStatus.isConnected) {
            return '連接中...'
        } else {
            return '未連接'
        }
    }

    // 獲取連接狀態顏色
    const getConnectionColor = () => {
        if (isMonitoring && connectionStatus.isConnected) {
            return 'text-green-600'
        } else if (isMonitoring && !connectionStatus.isConnected) {
            return 'text-yellow-600'
        } else {
            return 'text-gray-600'
        }
    }

    return (
        <div className="space-y-4">
            {/* 監控控制面板 */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Activity className="h-5 w-5" />
                        設備監控控制
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    {/* 連接狀態 */}
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            {getConnectionIcon()}
                            <span className={`font-medium ${getConnectionColor()}`}>
                                {getConnectionText()}
                            </span>
                        </div>

                        {connectionStatus.lastMessageTime && (
                            <div className="flex items-center gap-1 text-sm text-gray-500">
                                <Clock className="h-3 w-3" />
                                最後更新: {connectionStatus.lastMessageTime.toLocaleTimeString()}
                            </div>
                        )}
                    </div>

                    {/* 錯誤提示 */}
                    {connectionStatus.error && (
                        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center gap-2">
                            <AlertCircle className="h-4 w-4 text-red-600" />
                            <span className="text-red-800 text-sm">
                                {connectionStatus.error}
                            </span>
                        </div>
                    )}

                    {/* Gateway選擇 */}
                    <div>
                        <label className="text-sm font-medium mb-2 block">選擇Gateway</label>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                            {availableGateways.map(gateway => (
                                <div
                                    key={gateway.id}
                                    className={`p-3 border rounded-lg cursor-pointer transition-colors ${selectedGateways.includes(gateway.id)
                                        ? 'border-blue-500 bg-blue-50'
                                        : 'border-gray-200 hover:bg-gray-50'
                                        }`}
                                    onClick={() => handleGatewaySelect(gateway.id)}
                                >
                                    <div className="flex items-center gap-2">
                                        <div className={`w-2 h-2 rounded-full ${selectedGateways.includes(gateway.id) ? 'bg-blue-500' : 'bg-gray-300'
                                            }`} />
                                        <div className="flex-1">
                                            <p className="font-medium text-sm">{gateway.name}</p>
                                            <p className="text-xs text-gray-500">{gateway.macAddress}</p>
                                        </div>
                                        <Badge variant="outline" className="text-xs">
                                            {gateway.status}
                                        </Badge>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* 控制按鈕 */}
                    <div className="flex gap-2">
                        {!isMonitoring ? (
                            <Button
                                onClick={handleStartMonitoring}
                                disabled={isStarting || selectedGateways.length === 0}
                                className="gap-2"
                            >
                                <Play className="h-4 w-4" />
                                {isStarting ? '啟動中...' : '啟動監控'}
                            </Button>
                        ) : (
                            <Button
                                onClick={handleStopMonitoring}
                                variant="destructive"
                                className="gap-2"
                            >
                                <Square className="h-4 w-4" />
                                停止監控
                            </Button>
                        )}
                    </div>
                </CardContent>
            </Card>

            {/* 監控統計 */}
            {isMonitoring && (
                <Card>
                    <CardHeader>
                        <CardTitle className="text-lg">監控統計</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                            <div className="text-center">
                                <div className="text-2xl font-bold text-blue-600">{stats.totalDevices}</div>
                                <div className="text-sm text-gray-600">總設備</div>
                            </div>
                            <div className="text-center">
                                <div className="text-2xl font-bold text-green-600">{stats.onlineDevices}</div>
                                <div className="text-sm text-gray-600">線上</div>
                            </div>
                            <div className="text-center">
                                <div className="text-2xl font-bold text-yellow-600">{stats.offlineDevices}</div>
                                <div className="text-sm text-gray-600">離線</div>
                            </div>
                            <div className="text-center">
                                <div className="text-2xl font-bold text-red-600">{stats.errorDevices}</div>
                                <div className="text-sm text-gray-600">錯誤</div>
                            </div>
                            <div className="text-center">
                                <div className="text-2xl font-bold text-purple-600">{stats.averageBatteryLevel}%</div>
                                <div className="text-sm text-gray-600">平均電量</div>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            )}
        </div>
    )
}
