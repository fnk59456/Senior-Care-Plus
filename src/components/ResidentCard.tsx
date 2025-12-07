import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
    Heart,
    AlertTriangle,
    AlertCircle,
    Edit,
    X,
    Link,
    Unlink,
    Info,
    MapPin,
    Watch,
    Baby,
    Activity,
    Settings
} from 'lucide-react'
import { Resident, Device, DeviceType, DeviceStatus, DEVICE_TYPE_CONFIG } from '@/types/device-types'
import { useTranslation } from 'react-i18next'
import BatteryIcon from '@/components/ui/battery-icon'

interface ResidentCardProps {
    resident: Resident
    devices: Device[]
    realTimeData?: Map<string, any>
    onAction: (action: string, residentId: string, deviceId?: string) => void
}

export default function ResidentCard({ resident, devices, realTimeData, onAction }: ResidentCardProps) {
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


    // 獲取設備電量
    const getDeviceBattery = (device: Device) => {
        const realTimeDevice = realTimeData?.get(device.id)
        return realTimeDevice?.batteryLevel || device.batteryLevel || 0
    }

    // 獲取設備實時狀態
    const getDeviceRealTimeStatus = (device: Device) => {
        const realTimeDevice = realTimeData?.get(device.id)
        return {
            isOnline: realTimeDevice?.status === DeviceStatus.ACTIVE,
            lastSeen: realTimeDevice?.lastSeen || device.lastSeen,
            signalStrength: realTimeDevice?.signalStrength,
            hasRealTimeData: !!realTimeDevice
        }
    }

    // 獲取院友狀態信息
    const getStatusInfo = (status: string) => {
        switch (status) {
            case 'good':
                return {
                    badge: (
                        <Badge className="bg-green-100 text-green-800 hover:bg-green-100">
                            <Heart className="w-3 h-3 mr-1 fill-current" />
                            {t('status:resident.status.good')}
                        </Badge>
                    ),
                    icon: '💚',
                    bgColor: 'bg-green-100'
                }
            case 'attention':
                return {
                    badge: (
                        <Badge className="bg-orange-100 text-orange-800 hover:bg-orange-100">
                            <AlertTriangle className="w-3 h-3 mr-1" />
                            {t('status:resident.status.attention')}
                        </Badge>
                    ),
                    icon: '⚠️',
                    bgColor: 'bg-orange-100'
                }
            case 'critical':
                return {
                    badge: (
                        <Badge className="bg-red-100 text-red-800 hover:bg-red-100">
                            <AlertCircle className="w-3 h-3 mr-1" />
                            {t('status:resident.status.critical')}
                        </Badge>
                    ),
                    icon: '🚨',
                    bgColor: 'bg-red-100'
                }
            default:
                return {
                    badge: <Badge>{t('status:resident.status.unknown', '未知')}</Badge>,
                    icon: '❓',
                    bgColor: 'bg-gray-100'
                }
        }
    }

    const statusInfo = getStatusInfo(resident.status)
    const displayId = resident.patientCode || resident.id

    return (
        <Card className="relative p-4 hover:shadow-md transition-shadow h-full flex flex-col min-w-[280px]">
            {/* 院友基本信息 - 頭像、姓名、狀態在同一行 */}
            <div className="flex items-center gap-4 mb-4">
                {/* 院友頭像 */}
                <div className={`w-14 h-14 rounded-full ${statusInfo.bgColor} flex items-center justify-center text-2xl flex-shrink-0`}>
                    {statusInfo.icon}
                </div>

                {/* 院友信息 */}
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-2">
                        <h3 className="font-semibold text-xl">{resident.name}</h3>
                        {statusInfo.badge}
                    </div>
                    <div className="text-sm text-gray-600 space-y-1">
                        <p>{t('pages:residents.id')}: {displayId}</p>
                        <p>{t('pages:residents.room')}: {resident.room} • {resident.age} {t('pages:residents.ageUnit')}</p>
                    </div>
                </div>
            </div>

            {/* 設備列表 */}
            {devices.length > 0 ? (
                <div className="space-y-2 flex-1 mb-4">
                    <h4 className="text-sm font-medium text-gray-700">{t('pages:residents.boundDevices')}:</h4>
                    <div className="space-y-2 max-h-36 overflow-y-auto">
                        {devices.map((device) => {
                            const DeviceIcon = getDeviceIcon(device.deviceType)
                            const batteryLevel = getDeviceBattery(device)
                            const realTimeStatus = getDeviceRealTimeStatus(device)

                            return (
                                <div key={device.id} className="flex items-center justify-between bg-gray-50 p-3 rounded-lg">
                                    <div className="flex items-center gap-3 flex-1 min-w-0">
                                        {/* 設備圖標 */}
                                        <div className={`p-1.5 rounded-full ${DEVICE_TYPE_CONFIG[device.deviceType].color} flex-shrink-0`}>
                                            <DeviceIcon className="h-4 w-4" />
                                        </div>

                                        {/* 設備信息 */}
                                        <div className="flex-1 min-w-0">
                                            <p
                                                className="font-medium text-sm leading-snug text-gray-800"
                                                style={{
                                                    display: '-webkit-box',
                                                    WebkitLineClamp: 2,
                                                    WebkitBoxOrient: 'vertical',
                                                    overflow: 'hidden'
                                                }}
                                                title={device.name}
                                            >
                                                {device.name}
                                            </p>
                                            {realTimeStatus.hasRealTimeData && (
                                                <div className="flex items-center gap-2">
                                                    <span className="text-xs text-green-600 font-medium">
                                                        ● 即時
                                                    </span>
                                                </div>
                                            )}
                                        </div>

                                        {/* 電量顯示 */}
                                        <div className="flex items-center gap-1 flex-shrink-0 min-w-[60px] justify-end">
                                            <BatteryIcon
                                                level={batteryLevel}
                                                size="sm"
                                            />
                                            <span className={`text-sm font-medium ${batteryLevel > 50 ? 'text-green-600' :
                                                batteryLevel > 20 ? 'text-yellow-600' : 'text-red-600'
                                                }`}>
                                                {batteryLevel}%
                                            </span>
                                        </div>
                                    </div>

                                    {/* 解綁按鈕 */}
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => onAction('unbindDevice', resident.id, device.id)}
                                        className="h-7 w-7 p-0 text-red-600 hover:text-red-700 flex-shrink-0"
                                        title={t('pages:residents.actions.unbindDevice')}
                                    >
                                        <Unlink className="h-4 w-4" />
                                    </Button>
                                </div>
                            )
                        })}
                    </div>
                </div>
            ) : (
                <div className="flex-1 flex items-center justify-center text-sm text-gray-500 mb-4">
                    {t('pages:residents.noDevicesBound')}
                </div>
            )}

            {/* 操作按鈕 - 底部居中，圖標拉大 */}
            <div className="flex items-center justify-center gap-4 pt-3 border-t border-gray-100">
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onAction('manageDevices', resident.id)}
                    className="h-12 w-12 p-0"
                    title={t('pages:residents.actions.manageDevices')}
                >
                    <Link className="w-6 h-6" />
                </Button>
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onAction('edit', resident.id)}
                    className="h-12 w-12 p-0"
                    title={t('pages:residents.actions.edit')}
                >
                    <Edit className="w-6 h-6" />
                </Button>
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onAction('remove', resident.id)}
                    className="h-12 w-12 p-0 text-red-600 hover:text-red-700"
                    title={t('pages:residents.actions.remove')}
                >
                    <X className="w-6 h-6" />
                </Button>
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onAction('info', resident.id)}
                    className="h-12 w-12 p-0"
                    title={t('pages:residents.actions.info')}
                >
                    <Info className="w-6 h-6" />
                </Button>
            </div>
        </Card>
    )
}
