import React from 'react'
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
    Wifi,
    Info,
    Link,
    Trash2,
    Unlink,
    XCircle
} from 'lucide-react'
import { Device, Resident, DeviceType, DeviceStatus, DEVICE_TYPE_CONFIG } from '@/types/device-types'
import BatteryIcon from '@/components/ui/battery-icon'
import { useTranslation } from 'react-i18next'
import { getDeviceDisplayName } from '@/utils/deviceDisplayName'

interface DeviceListRowProps {
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

export default function DeviceListRow({
    device,
    resident,
    onAction,
    showCheckbox = false,
    isSelected = false,
    onSelectChange,
    locationInfo
}: DeviceListRowProps) {
    const { t } = useTranslation()

    // 获取设备图标
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

    // 获取设备状态
    const getDeviceStatus = () => {
        const status = device.realTimeData?.status || device.status

        switch (status) {
            case DeviceStatus.ACTIVE:
                return { text: t('pages:deviceManagement.deviceCard.online'), color: 'bg-green-100 text-green-800', icon: CheckCircle2 }
            case DeviceStatus.INACTIVE:
                return { text: t('pages:deviceManagement.deviceCard.offline'), color: 'bg-yellow-100 text-yellow-800', icon: XCircle }
            case DeviceStatus.OFFLINE:
                return { text: t('pages:deviceManagement.deviceCard.offline'), color: 'bg-gray-100 text-gray-800', icon: XCircle }
            case DeviceStatus.ERROR:
                return { text: t('pages:deviceManagement.deviceCard.offline'), color: 'bg-red-100 text-red-800', icon: XCircle }
            default:
                return { text: t('pages:deviceManagement.deviceCard.unknown'), color: 'bg-gray-100 text-gray-800', icon: XCircle }
        }
    }

    // 获取电池电量
    const getBatteryLevel = () => {
        const realTimeLevel = device.realTimeData?.batteryLevel
        const deviceLevel = device.batteryLevel || 0
        const finalLevel = realTimeLevel !== undefined ? realTimeLevel : deviceLevel
        return Math.max(0, Math.min(100, finalLevel))
    }

    const DeviceIcon = getDeviceIcon(device.deviceType)
    const statusInfo = getDeviceStatus()
    const StatusIcon = statusInfo.icon
    const batteryLevel = getBatteryLevel()

    return (
        <div className={`flex items-center gap-1.5 md:gap-2 p-2.5 md:p-3 bg-white border rounded-lg hover:shadow-md transition-shadow ${isSelected ? 'border-blue-500 bg-blue-50' : 'border-gray-200'}`}>
            {/* 勾选框 - 仅在显示时渲染 */}
            {showCheckbox && (
                <div className="flex-shrink-0">
                    <Checkbox
                        checked={isSelected}
                        onCheckedChange={(checked) => onSelectChange?.(device.id, checked as boolean)}
                    />
                </div>
            )}

            {/* 设备图标 */}
            <div className={`flex-shrink-0 p-2 rounded ${DEVICE_TYPE_CONFIG[device.deviceType].color}`}>
                <DeviceIcon className="h-5 w-5" />
            </div>

            {/* 设备名称 - 固定宽度，超出省略 */}
            <div className="flex-shrink-0 w-32 lg:w-48">
                <div className="text-sm font-semibold text-gray-900 truncate" title={getDeviceDisplayName(device, t)}>
                    {getDeviceDisplayName(device, t)}
                </div>
            </div>

            {/* UID - 固定宽度，超出省略 */}
            <div className="flex-shrink-0 w-32 lg:w-48">
                <div className="text-xs text-gray-500 mb-1 hidden md:block">{t('pages:deviceManagement.deviceInfo.uid')}</div>
                <div className="text-xs md:text-sm font-mono text-gray-900 truncate" title={device.deviceUid || device.hardwareId || device.id}>
                    {device.deviceUid || device.hardwareId || device.id}
                </div>
            </div>

            {/* QR Code - 占位符 */}
            <div className="flex-shrink-0">
                <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 w-7 p-0"
                    onClick={() => onAction('qrcode', device.id)}
                    title={t('pages:deviceManagement.deviceCard.qrCode') || 'QR Code'}
                >
                    <QrCode className="h-3.5 w-3.5 text-gray-400" />
                </Button>
            </div>

            {/* 电量 - 固定宽度防止错位 */}
            <div className="flex-shrink-0 flex items-center gap-1 w-20">
                <div className="rotate-[270deg]">
                    <BatteryIcon level={batteryLevel} size="lg" />
                </div>
                <span className={`text-xs font-medium w-10 ${batteryLevel <= 25 ? 'text-red-500' : batteryLevel <= 50 ? 'text-yellow-500' : 'text-green-500'}`}>
                    {batteryLevel}%
                </span>
            </div>

            {/* 院友信息 / 閘道器位置信息 */}
            <div className="flex-shrink-0 flex items-center gap-1.5 w-32 lg:w-40">
                {device.deviceType === DeviceType.GATEWAY ? (
                    // 閘道器顯示位置信息
                    locationInfo?.homeName || locationInfo?.floorName ? (
                        <div className="flex flex-col min-w-0 flex-1">
                            <div className="text-xs font-medium text-gray-900 truncate" title={locationInfo.homeName}>
                                {locationInfo.homeName || '未綁定'}
                            </div>
                            <div className="text-xs text-gray-500 truncate" title={locationInfo.floorName}>
                                {locationInfo.floorName || '-'}
                            </div>
                        </div>
                    ) : (
                        <div className="text-xs text-orange-500 truncate">未綁定位置</div>
                    )
                ) : resident ? (
                    // 其他設備顯示院友信息
                    <>
                        <div className={`w-7 h-7 rounded-full flex items-center justify-center text-base flex-shrink-0 ${resident.gender === '男' ? 'bg-blue-100' : 'bg-pink-100'}`}>
                            {resident.gender === '男' ? '👨' : '👩'}
                        </div>
                        <div className="flex flex-col min-w-0 flex-1">
                            <div className="text-xs font-medium text-gray-900 truncate" title={resident.name}>{resident.name}</div>
                            <div className="text-xs text-gray-500 truncate">{resident.room}</div>
                        </div>
                    </>
                ) : (
                    <div className="text-xs text-gray-400 truncate">{t('pages:deviceManagement.deviceInfo.unbound')}</div>
                )}
            </div>

            {/* 状态 */}
            <div className="flex-shrink-0 w-16">
                <Badge className={`${statusInfo.color} flex items-center gap-1 text-xs justify-center`}>
                    <StatusIcon className="h-3 w-3" />
                    <span className="hidden lg:inline">{statusInfo.text}</span>
                </Badge>
            </div>

            {/* 操作按钮 - 紧凑排列 */}
            <div className="flex-shrink-0 flex items-center gap-1 ml-auto">
                <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onAction('deviceInfo', device.id)}
                    className="text-blue-600 hover:text-blue-700 h-7 px-2"
                    title={t('pages:deviceManagement.deviceCard.deviceInfo')}
                >
                    <Info className="h-3.5 w-3.5" />
                    <span className="hidden 2xl:inline ml-1 text-xs">{t('pages:deviceManagement.deviceCard.deviceInfo')}</span>
                </Button>

                <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onAction('bindDevice', device.id)}
                    className="text-green-600 hover:text-green-700 h-7 px-2"
                    title={t('pages:deviceManagement.deviceCard.bindDevice')}
                >
                    <Link className="h-3.5 w-3.5" />
                    <span className="hidden 2xl:inline ml-1 text-xs">{t('pages:deviceManagement.deviceCard.bindDevice')}</span>
                </Button>

                <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onAction('remove', device.id)}
                    className="text-red-600 hover:text-red-700 h-7 px-2"
                    title={t('pages:deviceManagement.deviceCard.removeDevice')}
                >
                    <Trash2 className="h-3.5 w-3.5" />
                    <span className="hidden 2xl:inline ml-1 text-xs">{t('pages:deviceManagement.deviceCard.removeDevice')}</span>
                </Button>

                <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onAction('unbind', device.id)}
                    className="text-orange-600 hover:text-orange-700 h-7 px-2"
                    title={t('pages:deviceManagement.deviceCard.unbind')}
                >
                    <Unlink className="h-3.5 w-3.5" />
                    <span className="hidden 2xl:inline ml-1 text-xs">{t('pages:deviceManagement.deviceCard.unbind')}</span>
                </Button>
            </div>
        </div>
    )
}

