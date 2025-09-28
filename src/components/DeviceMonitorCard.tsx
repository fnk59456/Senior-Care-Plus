import React from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
    CheckCircle2,
    QrCode,
    User,
    MapPin,
    Activity,
    Baby,
    Watch,
    Settings
} from 'lucide-react'
import { Device, Resident, DeviceType, DeviceStatus, DEVICE_TYPE_CONFIG } from '@/types/device-types'
import DeviceActionHandler from './DeviceActionHandler'
import BatteryIcon from '@/components/ui/battery-icon'
import { useTranslation } from 'react-i18next'

interface DeviceMonitorCardProps {
    device: Device & { realTimeData?: any }
    resident?: Resident
    onAction: (action: string, deviceId: string) => void
}

export default function DeviceMonitorCard({ device, resident, onAction }: DeviceMonitorCardProps) {
    const { t } = useTranslation()

    // 獲取設備圖標
    const getDeviceIcon = (deviceType: DeviceType) => {
        switch (deviceType) {
            case DeviceType.SMARTWATCH_300B: return Watch
            case DeviceType.DIAPER_SENSOR: return Baby
            case DeviceType.PEDOMETER: return Activity
            case DeviceType.UWB_TAG: return MapPin
            default: return Settings
        }
    }

    // 電池顏色邏輯已移至BatteryIcon組件中
    // 25%以下：紅色，50%以下：黃色，其他：綠色

    // 獲取設備狀態（優先使用實時數據）
    const getDeviceStatus = () => {
        const status = device.realTimeData?.status || device.status

        switch (status) {
            case DeviceStatus.ACTIVE:
                return { text: '線上', color: 'text-green-600', icon: CheckCircle2 }
            case DeviceStatus.INACTIVE:
                return { text: '非活躍', color: 'text-yellow-600', icon: CheckCircle2 }
            case DeviceStatus.OFFLINE:
                return { text: '離線', color: 'text-gray-600', icon: CheckCircle2 }
            case DeviceStatus.ERROR:
                return { text: '錯誤', color: 'text-red-600', icon: CheckCircle2 }
            default:
                return { text: '未知', color: 'text-gray-600', icon: CheckCircle2 }
        }
    }

    // 獲取電池電量（優先使用實時數據）
    const getBatteryLevel = () => {
        const realTimeLevel = device.realTimeData?.batteryLevel
        const deviceLevel = device.batteryLevel || 0
        const finalLevel = realTimeLevel !== undefined ? realTimeLevel : deviceLevel

        // 確保電量在有效範圍內
        const normalizedLevel = Math.max(0, Math.min(100, finalLevel))

        console.log(`🔋 DeviceMonitorCard ${device.name} 電量:`, {
            realTime: realTimeLevel,
            device: deviceLevel,
            final: finalLevel,
            normalized: normalizedLevel,
            hasRealTimeData: !!device.realTimeData
        })

        return normalizedLevel
    }

    // 獲取最後活動時間
    const getLastSeen = () => {
        if (device.realTimeData?.lastSeen) {
            return new Date(device.realTimeData.lastSeen)
        }
        return device.lastSeen ? new Date(device.lastSeen) : new Date()
    }

    // 格式化位置資訊
    const formatLocation = (resident: Resident) => {
        const homeName = '群仁仁群'
        const floor = resident.room?.split('/')[0] || 'X'
        const roomInfo = resident.room?.split('/')[1] || 'Y'
        const roomNumber = resident.room || 'Z'

        return `${homeName}/${floor}/寢室${roomInfo}/${roomNumber}`
    }

    const DeviceIcon = getDeviceIcon(device.deviceType)
    const statusInfo = getDeviceStatus()
    const StatusIcon = statusInfo.icon

    return (
        <Card className="relative p-4 hover:shadow-md transition-shadow">
            {/* QR碼圖標 */}
            <div className="absolute top-3 right-3">
                <QrCode className="h-4 w-4 text-gray-400" />
            </div>

            {/* 電池電量 */}
            <div className="flex items-center gap-2 mb-3">
                <BatteryIcon
                    level={getBatteryLevel()}
                    size="md"
                    className="flex-shrink-0"
                />
                {device.realTimeData && (
                    <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" title="實時數據" />
                )}
            </div>

            {/* 設備ID */}
            <div className="text-xs text-gray-500 mb-2 font-mono">
                {device.hardwareId}
            </div>

            {/* 院友資訊 */}
            {resident && (
                <div className="mb-3">
                    <div className="flex items-center gap-2 mb-1">
                        <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs ${resident.gender === '男' ? 'bg-blue-100 text-blue-600' : 'bg-pink-100 text-pink-600'
                            }`}>
                            {resident.gender === '男' ? '👨' : '👩'}
                        </div>
                        <span className="font-medium text-sm">{resident.name}</span>
                    </div>

                    {/* 位置資訊 */}
                    <div className="text-xs text-gray-600 ml-8">
                        {formatLocation(resident)}
                    </div>
                </div>
            )}

            {/* 設備資訊 */}
            <div className="flex items-center gap-2 mb-3">
                <div className={`p-1.5 rounded ${DEVICE_TYPE_CONFIG[device.deviceType].color}`}>
                    <DeviceIcon className="h-3 w-3" />
                </div>
                <span className="text-sm font-medium">{device.name}</span>
            </div>

            {/* 狀態指示器 */}
            <div className="flex items-center gap-2 mb-4">
                <StatusIcon className={`h-4 w-4 ${statusInfo.color}`} />
                <span className={`text-sm ${statusInfo.color}`}>
                    {statusInfo.text}
                </span>
            </div>

            {/* 操作按鈕 */}
            <DeviceActionHandler
                deviceId={device.id}
                deviceName={device.name}
                onAction={onAction}
            />
        </Card>
    )
}
