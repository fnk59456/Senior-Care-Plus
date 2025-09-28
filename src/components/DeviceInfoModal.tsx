import React from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Device, DeviceStatus, DEVICE_TYPE_CONFIG } from '@/types/device-types'
import {
    Watch,
    MapPin,
    Baby,
    Activity,
    Settings,
    Battery,
    Wifi,
    Calendar,
    User,
    Hash,
    Tag
} from 'lucide-react'

interface DeviceInfoModalProps {
    isOpen: boolean
    onClose: () => void
    device: Device | null
}

export default function DeviceInfoModal({ isOpen, onClose, device }: DeviceInfoModalProps) {
    if (!device) return null

    // 獲取設備圖標
    const getDeviceIcon = (deviceType: string) => {
        switch (deviceType) {
            case '300B': return Watch
            case 'DIAPER': return Baby
            case 'PEDO': return Activity
            case 'TAG': return MapPin
            default: return Settings
        }
    }

    // 獲取設備狀態顏色
    const getStatusColor = (status: DeviceStatus) => {
        switch (status) {
            case DeviceStatus.ACTIVE: return 'bg-green-100 text-green-800'
            case DeviceStatus.INACTIVE: return 'bg-yellow-100 text-yellow-800'
            case DeviceStatus.OFFLINE: return 'bg-gray-100 text-gray-800'
            case DeviceStatus.ERROR: return 'bg-red-100 text-red-800'
            default: return 'bg-gray-100 text-gray-800'
        }
    }

    // 獲取電量顏色
    const getBatteryColor = (level: number) => {
        if (level <= 25) return 'text-red-500'
        if (level <= 50) return 'text-yellow-500'
        return 'text-green-500'
    }

    const DeviceIcon = getDeviceIcon(device.deviceType)
    const config = DEVICE_TYPE_CONFIG[device.deviceType as keyof typeof DEVICE_TYPE_CONFIG]

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <div className={`p-2 rounded-full ${config?.color || 'bg-gray-100'}`}>
                            <DeviceIcon className="h-5 w-5" />
                        </div>
                        設備詳細資訊
                    </DialogTitle>
                </DialogHeader>

                <div className="space-y-4">
                    {/* 基本資訊 */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-lg flex items-center gap-2">
                                <Hash className="h-4 w-4" />
                                基本資訊
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-sm font-medium text-gray-600">設備名稱</label>
                                    <p className="text-sm font-semibold">{device.name}</p>
                                </div>
                                <div>
                                    <label className="text-sm font-medium text-gray-600">設備狀態</label>
                                    <div className="mt-1">
                                        <Badge className={getStatusColor(device.status)}>
                                            {device.status}
                                        </Badge>
                                    </div>
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-sm font-medium text-gray-600">設備UID</label>
                                    <p className="text-sm font-mono bg-gray-100 p-2 rounded">{device.deviceUid}</p>
                                </div>
                                <div>
                                    <label className="text-sm font-medium text-gray-600">設備類型</label>
                                    <p className="text-sm">{config?.label || device.deviceType}</p>
                                </div>
                            </div>
                            <div>
                                <label className="text-sm font-medium text-gray-600">硬體ID</label>
                                <p className="text-sm font-mono bg-gray-100 p-2 rounded">{device.hardwareId}</p>
                            </div>
                        </CardContent>
                    </Card>

                    {/* 關聯資訊 */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-lg flex items-center gap-2">
                                <Wifi className="h-4 w-4" />
                                關聯資訊
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-sm font-medium text-gray-600">閘道器ID</label>
                                    <p className="text-sm">{device.gatewayId || '未設定'}</p>
                                </div>
                                <div>
                                    <label className="text-sm font-medium text-gray-600">韌體版本</label>
                                    <p className="text-sm">{device.firmwareVersion || '未知'}</p>
                                </div>
                            </div>
                            <div>
                                <label className="text-sm font-medium text-gray-600">綁定院友</label>
                                <p className="text-sm">{device.residentId || '未綁定'}</p>
                            </div>
                        </CardContent>
                    </Card>

                    {/* 數據資訊 */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-lg flex items-center gap-2">
                                <Battery className="h-4 w-4" />
                                數據資訊
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-sm font-medium text-gray-600">電量</label>
                                    <p className={`text-sm font-semibold ${getBatteryColor(device.batteryLevel || 0)}`}>
                                        {device.batteryLevel || 0}%
                                    </p>
                                </div>
                                <div>
                                    <label className="text-sm font-medium text-gray-600">最後活動</label>
                                    <p className="text-sm">
                                        {device.lastSeen ? new Date(device.lastSeen).toLocaleString() : '未知'}
                                    </p>
                                </div>
                            </div>
                            {device.lastData && Object.keys(device.lastData).length > 0 && (
                                <div>
                                    <label className="text-sm font-medium text-gray-600">最後數據</label>
                                    <pre className="text-xs bg-gray-100 p-2 rounded overflow-x-auto">
                                        {JSON.stringify(device.lastData, null, 2)}
                                    </pre>
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    {/* 系統資訊 */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-lg flex items-center gap-2">
                                <Calendar className="h-4 w-4" />
                                系統資訊
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-sm font-medium text-gray-600">創建時間</label>
                                    <p className="text-sm">{new Date(device.createdAt).toLocaleString()}</p>
                                </div>
                                <div>
                                    <label className="text-sm font-medium text-gray-600">更新時間</label>
                                    <p className="text-sm">{new Date(device.updatedAt).toLocaleString()}</p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                <div className="flex justify-end pt-4">
                    <Button onClick={onClose}>
                        關閉
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    )
}
