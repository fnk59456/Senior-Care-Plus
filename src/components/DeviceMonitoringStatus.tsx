import React from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
    Wifi,
    WifiOff,
    AlertCircle,
    CheckCircle2,
    Clock,
    RefreshCw,
    Activity,
    Battery,
    Signal
} from 'lucide-react'
import { useDeviceMonitoring } from '@/contexts/DeviceMonitoringContext'
import { useTranslation } from 'react-i18next'

export default function DeviceMonitoringStatus() {
    const { t } = useTranslation()
    const {
        isMonitoring,
        connectionStatus,
        getMonitoringStats,
        stopMonitoring
    } = useDeviceMonitoring()

    const stats = getMonitoringStats()

    // 獲取連接狀態圖標
    const getConnectionIcon = () => {
        if (isMonitoring && connectionStatus.isConnected) {
            return <Wifi className="h-5 w-5 text-green-500" />
        } else if (isMonitoring && !connectionStatus.isConnected) {
            return <WifiOff className="h-5 w-5 text-red-500" />
        } else {
            return <WifiOff className="h-5 w-5 text-gray-400" />
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

    // 獲取狀態徽章
    const getStatusBadge = () => {
        if (isMonitoring && connectionStatus.isConnected) {
            return (
                <Badge className="bg-green-100 text-green-800 border-green-200">
                    <CheckCircle2 className="h-3 w-3 mr-1" />
                    監控中
                </Badge>
            )
        } else if (isMonitoring && !connectionStatus.isConnected) {
            return (
                <Badge className="bg-yellow-100 text-yellow-800 border-yellow-200">
                    <RefreshCw className="h-3 w-3 mr-1 animate-spin" />
                    連接中
                </Badge>
            )
        } else {
            return (
                <Badge variant="outline" className="text-gray-600">
                    <WifiOff className="h-3 w-3 mr-1" />
                    未啟動
                </Badge>
            )
        }
    }

    return (
        <div className="space-y-4">
            {/* 連接狀態卡片 */}
            <Card>
                <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            {getConnectionIcon()}
                            <div>
                                <h3 className="font-semibold text-sm">監控狀態</h3>
                                <p className={`text-sm ${getConnectionColor()}`}>
                                    {getConnectionText()}
                                </p>
                            </div>
                        </div>

                        <div className="flex items-center gap-2">
                            {getStatusBadge()}
                            {isMonitoring && (
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={stopMonitoring}
                                    className="text-red-600 hover:text-red-700"
                                >
                                    停止
                                </Button>
                            )}
                        </div>
                    </div>

                    {/* 最後更新時間 */}
                    {connectionStatus.lastMessageTime && (
                        <div className="mt-3 pt-3 border-t border-gray-100">
                            <div className="flex items-center gap-2 text-xs text-gray-500">
                                <Clock className="h-3 w-3" />
                                <span>最後更新: {connectionStatus.lastMessageTime.toLocaleTimeString()}</span>
                            </div>
                        </div>
                    )}

                    {/* 錯誤提示 */}
                    {connectionStatus.error && (
                        <div className="mt-3 pt-3 border-t border-red-100">
                            <div className="flex items-center gap-2 text-sm text-red-600">
                                <AlertCircle className="h-4 w-4" />
                                <span>{connectionStatus.error}</span>
                            </div>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* 統計數據卡片 */}
            {isMonitoring && (
                <Card>
                    <CardContent className="p-4">
                        <div className="flex items-center gap-2 mb-3">
                            <Activity className="h-4 w-4 text-blue-500" />
                            <h3 className="font-semibold text-sm">實時統計</h3>
                        </div>

                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            <div className="text-center">
                                <div className="text-lg font-bold text-blue-600">{stats.totalDevices}</div>
                                <div className="text-xs text-gray-600">總設備</div>
                            </div>
                            <div className="text-center">
                                <div className="text-lg font-bold text-green-600">{stats.onlineDevices}</div>
                                <div className="text-xs text-gray-600">線上</div>
                            </div>
                            <div className="text-center">
                                <div className="text-lg font-bold text-yellow-600">{stats.offlineDevices}</div>
                                <div className="text-xs text-gray-600">離線</div>
                            </div>
                            <div className="text-center">
                                <div className="text-lg font-bold text-purple-600">{stats.averageBatteryLevel}%</div>
                                <div className="text-xs text-gray-600">平均電量</div>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            )}
        </div>
    )
}
