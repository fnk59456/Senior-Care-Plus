import React from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import {
    CheckCircle2,
    QrCode,
    User,
    MapPin,
    Activity,
    Baby,
    Watch,
    Settings,
    Anchor,
    Wifi
} from 'lucide-react'
import { Device, Resident, DeviceType, DeviceStatus, DEVICE_TYPE_CONFIG } from '@/types/device-types'
import DeviceActionHandler from './DeviceActionHandler'
import BatteryIcon from '@/components/ui/battery-icon'
import { useTranslation } from 'react-i18next'
import { getDeviceDisplayName } from '@/utils/deviceDisplayName'

interface DeviceMonitorCardProps {
    device: Device & { realTimeData?: any }
    resident?: Resident
    onAction: (action: string, deviceId: string) => void
    showCheckbox?: boolean
    isSelected?: boolean
    onSelectChange?: (deviceId: string, checked: boolean) => void
    // 閘道器綁定信息（場域和樓層）
    locationInfo?: {
        homeName?: string
        floorName?: string
    }
}

export default function DeviceMonitorCard({
    device,
    resident,
    onAction,
    showCheckbox = false,
    isSelected = false,
    onSelectChange,
    locationInfo
}: DeviceMonitorCardProps) {
    const { t } = useTranslation()

    // 獲取設備圖標
    const getDeviceIcon = (deviceType: DeviceType) => {
        switch (deviceType) {
            case DeviceType.SMARTWATCH_300B: return Watch
            case DeviceType.DIAPER_SENSOR: return Baby
            case DeviceType.PEDOMETER: return Activity
            case DeviceType.UWB_TAG: return MapPin
            case DeviceType.UWB_ANCHOR: return Anchor
            case DeviceType.GATEWAY: return Wifi
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

        // 移除頻繁的調試日誌，避免影響其他日誌閱讀
        // 如需調試，可使用條件判斷：只在開發環境或特定情況下輸出
        // if (process.env.NODE_ENV === 'development' && /* 其他條件 */) {
        //     console.log(`🔋 DeviceMonitorCard ${device.name} 電量:`, {
        //         realTime: realTimeLevel,
        //         device: deviceLevel,
        //         final: finalLevel,
        //         normalized: normalizedLevel,
        //         hasRealTimeData: !!device.realTimeData
        //     })
        // }

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
        <Card className={`relative p-3 hover:shadow-md transition-shadow h-full flex flex-col ${isSelected ? 'border-blue-500 bg-blue-50 border-2' : ''}`}>
            {/* 勾选框 - 绝对定位在左上角 */}
            {showCheckbox && (
                <div className="absolute top-2 left-2 z-10">
                    <Checkbox
                        checked={isSelected}
                        onCheckedChange={(checked) => onSelectChange?.(device.id, checked as boolean)}
                    />
                </div>
            )}

            {/* 頂部區域：設備圖標 + 設備名稱 + QR碼 */}
            <div className={`flex items-center justify-between mb-4 ${showCheckbox ? 'ml-5' : ''}`}>
                <div className="flex items-center gap-2 flex-1 min-w-0">
                    {/* 設備圖標 */}
                    <div className={`p-1.5 rounded ${DEVICE_TYPE_CONFIG[device.deviceType].color}`}>
                        <DeviceIcon className="h-5 w-5" />
                    </div>

                    {/* 設備名稱 - 完整显示 */}
                    <span className="font-bold text-1xl text-gray-900 truncate">{getDeviceDisplayName(device, t)}</span>
                </div>

                {/* QR碼圖標 */}
                <div className="ml-2 flex-shrink-0">
                    <QrCode className="h-4 w-4 text-gray-400" />
                </div>
            </div>

            {/* 中部區域：電量 + 院友信息（横向排列，垂直居中） */}
            <div className="flex items-center mb-3">
                {/* 左側：電量信息 - 垂直布局 */}
                <div className="flex flex-col items-center mr-4">
                    <div className="rotate-[270deg] mb-2">
                        <BatteryIcon
                            level={getBatteryLevel()}
                            size="2xl"
                        />
                    </div>
                    <div className="mt-1">
                        <span className={`text-xs font-medium ${getBatteryLevel() <= 25 ? 'text-red-500' : getBatteryLevel() <= 50 ? 'text-yellow-500' : 'text-green-500'}`}>
                            {getBatteryLevel()}%
                        </span>
                    </div>
                </div>

                {/* 右側：院友信息/位置信息和UID - 垂直布局，居中 */}
                <div className="flex flex-col flex-1 min-w-0 justify-center">
                    {/* 閘道器位置信息 或 院友信息 - 横向排列 */}
                    {device.deviceType === DeviceType.GATEWAY ? (
                        // 閘道器顯示位置信息
                        <div className="flex items-center gap-2 mb-2">
                            {locationInfo?.homeName || locationInfo?.floorName ? (
                                <>
                                    <div className="p-1.5 rounded bg-blue-100">
                                        <MapPin className="h-5 w-5 text-blue-600" />
                                    </div>
                                    <div className="font-medium text-base text-gray-900 flex-shrink-0">
                                        {locationInfo.homeName || '未綁定'}
                                    </div>
                                    {locationInfo.floorName && (
                                        <div className="text-base text-gray-600 flex-shrink-0">
                                            → {locationInfo.floorName}
                                        </div>
                                    )}
                                </>
                            ) : (
                                <div className="text-base text-orange-500">未綁定位置</div>
                            )}
                            {/* 状态 */}
                            <div className="flex items-center gap-1 flex-shrink-0 ml-auto">
                                <StatusIcon className={`h-5 w-5 ${statusInfo.color}`} />
                                <span className={`text-base font-medium ${statusInfo.color}`}>
                                    {statusInfo.text}
                                </span>
                            </div>
                        </div>
                    ) : resident ? (
                        <div className="flex items-center gap-2 mb-2">
                            {/* 头像 */}
                            <div className={`w-9 h-9 rounded-full flex items-center justify-center text-base flex-shrink-0 ${resident.gender === '男' ? 'bg-blue-100' : 'bg-pink-100'}`}>
                                {resident.gender === '男' ? '👨' : '👩'}
                            </div>
                            {/* 姓名 */}
                            <div className="font-medium text-base text-gray-900 flex-shrink-0">{resident.name}</div>
                            {/* 房间 */}
                            <div className="text-base text-gray-600 flex-shrink-0">
                                {formatLocation(resident)}
                            </div>
                            {/* 状态 */}
                            <div className="flex items-center gap-1 flex-shrink-0 ml-auto">
                                <StatusIcon className={`h-5 w-5 ${statusInfo.color}`} />
                                <span className={`text-base font-medium ${statusInfo.color}`}>
                                    {statusInfo.text}
                                </span>
                            </div>
                        </div>
                    ) : (
                        <div className="mb-2">
                            <div className="text-lg text-gray-500">{t('pages:deviceManagement.deviceInfo.unbound')}</div>
                        </div>
                    )}

                    {/* UID信息 - 在院友信息下方 */}
                    <div className="flex items-center gap-2">
                        <span className="text-sm text-gray-500">UID</span>
                        <span className="text-sm font-mono text-gray-900 bg-gray-100 px-2 py-1 rounded break-all">
                            {device.deviceUid || device.hardwareId || device.id}
                        </span>
                    </div>
                </div>
            </div>

            {/* 操作按鈕 */}
            <DeviceActionHandler
                deviceId={device.id}
                deviceName={getDeviceDisplayName(device, t)}
                onAction={onAction}
            />
        </Card>
    )
}
