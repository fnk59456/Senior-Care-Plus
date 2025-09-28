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
        stats
    } = useDeviceMonitoring()

    const { gateways, selectedGateway, setSelectedGateway } = useUWBLocation()

    // 狀態管理
    const [isStarting, setIsStarting] = useState(false)

    // 可用的Gateway列表
    const availableGateways = (gateways || []).filter(gateway => gateway.status === 'online')

    // 處理Gateway選擇
    const handleGatewaySelect = (gatewayId: string) => {
        setSelectedGateway(gatewayId)
    }

    // 啟動監控
    const handleStartMonitoring = async () => {
        if (!selectedGateway) {
            alert('請選擇一個Gateway')
            return
        }

        setIsStarting(true)
        try {
            startMonitoring(selectedGateway)
        } catch (error) {
            console.error('啟動監控失敗:', error)
        } finally {
            setIsStarting(false)
        }
    }

    // 停止監控
    const handleStopMonitoring = () => {
        stopMonitoring()
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
            return `已連接 (${connectionStatus.connectedGateways?.length || 0} 個Gateway)`
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
                        <Select value={selectedGateway} onValueChange={handleGatewaySelect}>
                            <SelectTrigger>
                                <SelectValue placeholder="選擇一個Gateway" />
                            </SelectTrigger>
                            <SelectContent>
                                {availableGateways.map(gateway => (
                                    <SelectItem key={gateway.id} value={gateway.id}>
                                        <div className="flex items-center justify-between w-full">
                                            <span>{gateway.name}</span>
                                            <Badge variant={gateway.status === 'online' ? 'default' : 'secondary'} className="ml-2">
                                                {gateway.status}
                                            </Badge>
                                        </div>
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    {/* 控制按鈕 */}
                    <div className="flex gap-2">
                        {!isMonitoring ? (
                            <Button
                                onClick={handleStartMonitoring}
                                disabled={isStarting || !selectedGateway}
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
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            <div className="text-center">
                                <div className="text-2xl font-bold text-blue-600">{stats.totalMessages}</div>
                                <div className="text-sm text-gray-600">總消息</div>
                            </div>
                            <div className="text-center">
                                <div className="text-2xl font-bold text-green-600">{stats.healthMessages}</div>
                                <div className="text-sm text-gray-600">健康數據</div>
                            </div>
                            <div className="text-center">
                                <div className="text-2xl font-bold text-yellow-600">{stats.locationMessages}</div>
                                <div className="text-sm text-gray-600">位置數據</div>
                            </div>
                            <div className="text-center">
                                <div className="text-2xl font-bold text-purple-600">{stats.ackMessages}</div>
                                <div className="text-sm text-gray-600">ACK消息</div>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            )}
        </div>
    )
}
