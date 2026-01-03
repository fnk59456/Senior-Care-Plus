import React, { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Device, DeviceStatus, DEVICE_TYPE_CONFIG } from '@/types/device-types'
import { useTranslation } from 'react-i18next'
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
    Tag,
    Edit,
    Save,
    X,
    Anchor
} from 'lucide-react'
import { useDeviceManagement } from '@/contexts/DeviceManagementContext'
import { useUWBLocation } from '@/contexts/UWBLocationContext'

interface DeviceInfoModalProps {
    isOpen: boolean
    onClose: () => void
    device: Device | null
}

export default function DeviceInfoModal({ isOpen, onClose, device }: DeviceInfoModalProps) {
    const { t } = useTranslation()
    const { updateDevice } = useDeviceManagement()
    const { gateways } = useUWBLocation()
    const [isEditingName, setIsEditingName] = useState(false)
    const [editedName, setEditedName] = useState(device?.name || '')

    // 初始化編輯名稱 - Hooks 必須在條件返回之前調用
    React.useEffect(() => {
        if (device && isOpen) {
            setEditedName(device.name)
            setIsEditingName(false)
        }
    }, [device, isOpen])

    // 處理保存名稱
    const handleSaveName = () => {
        if (!device) return
        if (editedName.trim() && editedName !== device.name) {
            updateDevice(device.id, { name: editedName.trim() })
        }
        setIsEditingName(false)
    }

    // 處理取消編輯
    const handleCancelEdit = () => {
        if (!device) return
        setEditedName(device.name)
        setIsEditingName(false)
    }

    // 條件返回必須在所有 Hooks 之後
    if (!device) return null

    // 獲取設備圖標
    const getDeviceIcon = (deviceType: string) => {
        switch (deviceType) {
            case '300B': return Watch
            case 'DIAPER': return Baby
            case 'PEDO': return Activity
            case 'TAG': return MapPin
            case 'ANCHOR': return Anchor
            case 'GATEWAY': return Wifi
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

    // 格式化閘道器ID（同時顯示10進制和16進制）
    const formatGatewayId = (gatewayId: string | undefined): string => {
        if (!gatewayId || gatewayId === '未設定') {
            return gatewayId || '未設定'
        }

        // 嘗試解析為數字
        const numId = Number(gatewayId)

        // 如果是有效數字，同時顯示10進制和16進制
        if (!isNaN(numId) && isFinite(numId) && numId > 0) {
            const hexId = numId.toString(16).toUpperCase()
            // 格式：10進制 (16進制)
            return `${gatewayId} (0x${hexId})`
        }

        // 如果不是數字，直接返回原值
        return gatewayId
    }

    // 獲取閘道器資訊（通過 cloud_gateway_id 匹配）
    const getGatewayInfo = (gatewayId: string | undefined): { name: string | null; id: string } => {
        if (!gatewayId) {
            return { name: null, id: '未設定' }
        }

        // 嘗試匹配 cloud_gateway_id
        const gateway = gateways.find(gw => {
            // 檢查多個可能的字段位置
            const cloudGatewayId = (gw as any).cloud_gateway_id || gw.cloudData?.gateway_id
            return String(cloudGatewayId) === String(gatewayId)
        })

        if (gateway && gateway.name) {
            // 找到閘道器名稱
            return { name: gateway.name, id: gatewayId }
        }

        // 找不到名稱，只返回ID
        return { name: null, id: gatewayId }
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
                        {t('pages:deviceManagement.deviceInfo.title')}
                    </DialogTitle>
                </DialogHeader>

                <div className="space-y-4">
                    {/* 基本資訊 */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-lg flex items-center gap-2">
                                <Hash className="h-4 w-4" />
                                {t('pages:deviceManagement.deviceInfo.basicInfo')}
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-sm font-medium text-gray-600 flex items-center gap-2">
                                        {t('pages:deviceManagement.deviceInfo.deviceName')}
                                        {!isEditingName && (
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                className="h-6 w-6 p-0"
                                                onClick={() => setIsEditingName(true)}
                                                title={t('pages:deviceManagement.deviceInfo.editName') || '編輯名稱'}
                                            >
                                                <Edit className="h-3 w-3" />
                                            </Button>
                                        )}
                                    </label>
                                    {isEditingName ? (
                                        <div className="flex items-center gap-2 mt-1">
                                            <Input
                                                value={editedName}
                                                onChange={(e) => setEditedName(e.target.value)}
                                                className="text-sm"
                                                autoFocus
                                            />
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                className="h-8 w-8 p-0"
                                                onClick={handleSaveName}
                                                title={t('common:actions.save') || '保存'}
                                            >
                                                <Save className="h-4 w-4 text-green-600" />
                                            </Button>
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                className="h-8 w-8 p-0"
                                                onClick={handleCancelEdit}
                                                title={t('common:actions.cancel') || '取消'}
                                            >
                                                <X className="h-4 w-4 text-red-600" />
                                            </Button>
                                        </div>
                                    ) : (
                                        <p className="text-sm font-semibold">{device.name}</p>
                                    )}
                                </div>
                                <div>
                                    <label className="text-sm font-medium text-gray-600">{t('pages:deviceManagement.deviceInfo.status')}</label>
                                    <div className="mt-1">
                                        <Badge className={getStatusColor(device.status)}>
                                            {device.status}
                                        </Badge>
                                    </div>
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-sm font-medium text-gray-600">{t('pages:deviceManagement.deviceInfo.deviceUid')}</label>
                                    <p className="text-sm font-mono bg-gray-100 p-2 rounded">{device.deviceUid}</p>
                                </div>
                                <div>
                                    <label className="text-sm font-medium text-gray-600">{t('pages:deviceManagement.deviceInfo.deviceType')}</label>
                                    <p className="text-sm">{config?.label || device.deviceType}</p>
                                </div>
                            </div>
                            <div>
                                <label className="text-sm font-medium text-gray-600">{t('pages:deviceManagement.deviceInfo.hardwareId')}</label>
                                <p className="text-sm font-mono bg-gray-100 p-2 rounded">{device.hardwareId}</p>
                            </div>
                        </CardContent>
                    </Card>

                    {/* 關聯資訊 */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-lg flex items-center gap-2">
                                <Wifi className="h-4 w-4" />
                                {t('pages:deviceManagement.deviceInfo.bindingInfo')}
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-sm font-medium text-gray-600">{t('pages:deviceManagement.deviceInfo.gatewayName')}</label>
                                    <p className="text-sm">{getGatewayInfo(device.gatewayId).name || '—'}</p>
                                </div>
                                <div>
                                    <label className="text-sm font-medium text-gray-600">{t('pages:deviceManagement.deviceInfo.gatewayId')}</label>
                                    <p className="text-sm font-mono">{formatGatewayId(getGatewayInfo(device.gatewayId).id)}</p>
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-sm font-medium text-gray-600">{t('pages:deviceManagement.deviceInfo.firmwareVersion')}</label>
                                    <p className="text-sm">{device.firmwareVersion || '未知'}</p>
                                </div>
                                <div>
                                    <label className="text-sm font-medium text-gray-600">{t('pages:deviceManagement.deviceInfo.residentId')}</label>
                                    <p className="text-sm">{device.residentId || '未綁定'}</p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* 數據資訊 */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-lg flex items-center gap-2">
                                <Battery className="h-4 w-4" />
                                {t('pages:deviceManagement.deviceInfo.dataInfo')}
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-sm font-medium text-gray-600">{t('pages:deviceManagement.deviceInfo.batteryLevel')}</label>
                                    <p className={`text-sm font-semibold ${getBatteryColor(device.batteryLevel || 0)}`}>
                                        {device.batteryLevel || 0}%
                                    </p>
                                </div>
                                <div>
                                    <label className="text-sm font-medium text-gray-600">{t('pages:deviceManagement.deviceInfo.lastSeen')}</label>
                                    <p className="text-sm">
                                        {device.lastSeen ? new Date(device.lastSeen).toLocaleString() : '未知'}
                                    </p>
                                </div>
                            </div>
                            {device.lastData && Object.keys(device.lastData).length > 0 && (
                                <div>
                                    <label className="text-sm font-medium text-gray-600">{t('pages:deviceManagement.deviceInfo.lastData')}</label>
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
                                {t('pages:deviceManagement.deviceInfo.systemInfo')}
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-sm font-medium text-gray-600">{t('pages:deviceManagement.deviceInfo.createdAt')}</label>
                                    <p className="text-sm">{new Date(device.createdAt).toLocaleString()}</p>
                                </div>
                                <div>
                                    <label className="text-sm font-medium text-gray-600">{t('pages:deviceManagement.deviceInfo.updatedAt')}</label>
                                    <p className="text-sm">{new Date(device.updatedAt).toLocaleString()}</p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                <div className="flex justify-end pt-4">
                    <Button onClick={onClose}>
                        {t('pages:deviceManagement.deviceInfo.close')}
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    )
}
