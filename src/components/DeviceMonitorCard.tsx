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
                return { text: t('pages:deviceManagement.deviceCard.online'), color: 'text-green-600', icon: CheckCircle2 }
            case DeviceStatus.INACTIVE:
                return { text: t('pages:deviceManagement.deviceCard.offline'), color: 'text-yellow-600', icon: CheckCircle2 }
            case DeviceStatus.OFFLINE:
                return { text: t('pages:deviceManagement.deviceCard.offline'), color: 'text-gray-600', icon: CheckCircle2 }
            case DeviceStatus.ERROR:
                return { text: t('pages:deviceManagement.deviceCard.offline'), color: 'text-red-600', icon: CheckCircle2 }
            default:
                return { text: t('pages:deviceManagement.deviceCard.unknown'), color: 'text-gray-600', icon: CheckCircle2 }
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
        const homeName = 'Room'
        const floor = resident.room?.split('/')[0] || 'X'
        const roomInfo = resident.room?.split('/')[1] || 'Y'
        const roomNumber = resident.room || 'Z'

        return `${homeName}/${roomNumber}`
    }

    const DeviceIcon = getDeviceIcon(device.deviceType)
    const statusInfo = getDeviceStatus()
    const StatusIcon = statusInfo.icon

    return (
        <Card className="relative p-3 hover:shadow-md transition-shadow h-full flex flex-col">
            {/* 頂部區域：設備名稱 + ID信息 + QR碼 */}
            <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2 flex-1 min-w-0">
                    {/* 設備圖標 */}
                    <div className={`p-1.5 rounded ${DEVICE_TYPE_CONFIG[device.deviceType].color}`}>
                        <DeviceIcon className="h-5 w-5" />
                    </div>

                    {/* 設備名稱 */}
                    <span className="font-bold text-1xl text-gray-900 truncate">{device.name}</span>

                    {/* 重要ID信息 - 顯示MQTT識別資訊 */}
                    <span className="text-sm font-mono text-gray-600 bg-gray-100 px-2 py-1 rounded">
                        {device.deviceUid || device.hardwareId || device.id}
                    </span>
                </div>

                {/* QR碼圖標 */}
                <div className="ml-2 flex-shrink-0">
                    <QrCode className="h-4 w-4 text-gray-400" />
                </div>
            </div>

            {/* 中部區域：電量 + 用戶信息並排 */}
            <div className="flex items-start mb-2 flex-1">
                {/* 左側：電量信息 - 垂直布局，上緣對齐用戶名稱 */}
                <div className="flex flex-col items-center mr-4 pt-6">
                    <div className="rotate-[270deg] mb-1">
                        <BatteryIcon
                            level={getBatteryLevel()}
                            size="4xl"
                        />
                    </div>
                    {/* 數字在圖標下方 */}
                    <div className="mt-1">
                        <span className={`text-xs font-medium ${getBatteryLevel() <= 25 ? 'text-red-500' : getBatteryLevel() <= 50 ? 'text-yellow-500' : 'text-green-500'}`}>
                            {getBatteryLevel()}%
                        </span>
                    </div>
                </div>

                {/* 右側：用戶信息 - 垂直布局 */}
                {resident ? (
                    <div className="flex flex-col flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm ${resident.gender === '男' ? 'bg-blue-100 text-blue-600' : 'bg-pink-100 text-pink-600'
                                }`}>
                                {resident.gender === '男' ? '👨' : '👩'}
                            </div>
                            <div className="font-medium text-base text-gray-900">{resident.name}</div>
                        </div>
                        {/* 位置資訊 */}
                        <div className="text-sm text-gray-600 mb-2">
                            {formatLocation(resident)}
                        </div>
                        {/* 狀態指示器 - 在用戶資訊下方 */}
                        <div className="flex items-center gap-2">
                            <StatusIcon className={`h-5 w-5 ${statusInfo.color}`} />
                            <span className={`text-base font-medium ${statusInfo.color}`}>
                                {statusInfo.text}
                            </span>
                        </div>
                    </div>
                ) : (
                    <div className="flex-1 min-w-0">
                        <div className="text-base text-gray-500">{t('pages:deviceManagement.deviceInfo.unbound')}</div>
                    </div>
                )}
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
