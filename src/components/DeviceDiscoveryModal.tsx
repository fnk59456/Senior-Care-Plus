import React, { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import {
    Watch,
    MapPin,
    Baby,
    Activity,
    CheckCircle2,
    XCircle,
    Wifi,
    Signal
} from 'lucide-react'
import { useDeviceDiscovery } from '@/contexts/DeviceDiscoveryContext'
import { useDeviceManagement } from '@/contexts/DeviceManagementContext'
import { DeviceType, DEVICE_TYPE_CONFIG } from '@/types/device-types'
import { useTranslation } from 'react-i18next'

export default function DeviceDiscoveryModal() {
    const { t } = useTranslation()
    const {
        discoveredDevices,
        isDiscovering,
        showDiscoveryModal,
        setShowDiscoveryModal,
        confirmDevice,
        rejectDevice,
        removeDevice,
        stopDiscovery,
        clearDiscoveredDevices
    } = useDeviceDiscovery()

    const { devices, removeDevice: removeDeviceFromSystem } = useDeviceManagement()

    const [editingNames, setEditingNames] = useState<Record<string, string>>({})

    // 獲取設備圖標
    const getDeviceIcon = (deviceType: DeviceType) => {
        switch (deviceType) {
            case DeviceType.SMARTWATCH_300B:
                return Watch
            case DeviceType.UWB_TAG:
                return MapPin
            case DeviceType.DIAPER_SENSOR:
                return Baby
            case DeviceType.PEDOMETER:
                return Activity
            default:
                return MapPin
        }
    }

    // 獲取設備類型標籤
    const getDeviceTypeLabel = (deviceType: DeviceType) => {
        return DEVICE_TYPE_CONFIG[deviceType].label
    }

    // 獲取設備類型顏色
    const getDeviceTypeColor = (deviceType: DeviceType) => {
        return DEVICE_TYPE_CONFIG[deviceType].color
    }

    // 處理設備名稱編輯
    const handleNameChange = (deviceId: string, name: string) => {
        setEditingNames(prev => ({ ...prev, [deviceId]: name }))
    }

    // 確認添加設備
    const handleConfirmDevice = (deviceId: string) => {
        const customName = editingNames[deviceId]
        confirmDevice(deviceId, customName)
        setEditingNames(prev => {
            const newNames = { ...prev }
            delete newNames[deviceId]
            return newNames
        })
    }

    // 拒絕設備
    const handleRejectDevice = (deviceId: string) => {
        rejectDevice(deviceId)
        setEditingNames(prev => {
            const newNames = { ...prev }
            delete newNames[deviceId]
            return newNames
        })
    }

    // 關閉彈出視窗
    const handleClose = () => {
        setShowDiscoveryModal(false)
        stopDiscovery()
        clearDiscoveredDevices()
    }

    return (
        <Dialog open={showDiscoveryModal} onOpenChange={handleClose}>
            <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Wifi className="h-5 w-5" />
                        {t('pages:deviceManagement.deviceDiscovery.title')}
                        {isDiscovering && (
                            <Badge variant="default" className="animate-pulse">
                                {t('pages:deviceManagement.deviceDiscovery.discovering')}
                            </Badge>
                        )}
                    </DialogTitle>
                </DialogHeader>

                <div className="space-y-4">
                    {/* 已存在的設備 */}
                    {devices.length > 0 && (
                        <div>
                            <h3 className="text-lg font-semibold mb-3 text-gray-700">{t('pages:deviceManagement.deviceDiscovery.existingDevices')}</h3>
                            <div className="grid gap-3">
                                {devices.map((device) => {
                                    const DeviceIcon = getDeviceIcon(device.deviceType)
                                    return (
                                        <Card key={device.id} className="p-3">
                                            <CardContent className="p-0">
                                                <div className="flex items-center justify-between">
                                                    <div className="flex items-center gap-3">
                                                        <div className={`p-2 rounded-full ${getDeviceTypeColor(device.deviceType)}`}>
                                                            <DeviceIcon className="h-5 w-5" />
                                                        </div>
                                                        <div>
                                                            <div className="font-medium">{device.name}</div>
                                                            <div className="text-sm text-gray-600">
                                                                {device.deviceUid} | {device.hardwareId}
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <Button
                                                        size="sm"
                                                        variant="outline"
                                                        onClick={() => {
                                                            if (confirm(t('pages:deviceManagement.confirms.removeDevice'))) {
                                                                removeDeviceFromSystem(device.id)
                                                            }
                                                        }}
                                                        className="text-red-600 hover:text-red-700"
                                                    >
                                                        <XCircle className="h-4 w-4 mr-1" />
                                                        {t('pages:deviceManagement.deviceDiscovery.remove')}
                                                    </Button>
                                                </div>
                                            </CardContent>
                                        </Card>
                                    )
                                })}
                            </div>
                        </div>
                    )}

                    {/* 新發現的設備 */}
                    <div>
                        <h3 className="text-lg font-semibold mb-3 text-gray-700">{t('pages:deviceManagement.deviceDiscovery.newlyDiscovered')}</h3>
                        {discoveredDevices.length === 0 ? (
                            <div className="text-center py-8 text-gray-500">
                                {isDiscovering ? (
                                    <div className="space-y-2">
                                        <div className="animate-spin w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full mx-auto"></div>
                                        <p>{t('pages:deviceManagement.deviceDiscovery.scanning')}</p>
                                    </div>
                                ) : (
                                    <p>{t('pages:deviceManagement.deviceDiscovery.newlyDiscovered')}</p>
                                )}
                            </div>
                        ) : (
                            <div className="grid gap-4">
                                {discoveredDevices.map((device) => {
                                    const DeviceIcon = getDeviceIcon(device.deviceType)
                                    const isEditing = editingNames[device.id] !== undefined
                                    const currentName = editingNames[device.id] || device.name

                                    return (
                                        <Card key={device.id} className="p-4">
                                            <CardContent className="p-0">
                                                <div className="flex items-center justify-between">
                                                    {/* 設備信息 */}
                                                    <div className="flex items-center gap-4 flex-1">
                                                        {/* 設備圖標 */}
                                                        <div className={`p-2 rounded-full ${getDeviceTypeColor(device.deviceType)}`}>
                                                            <DeviceIcon className="h-6 w-6" />
                                                        </div>

                                                        {/* 設備詳情 */}
                                                        <div className="flex-1 space-y-2">
                                                            <div className="flex items-center gap-2">
                                                                <Badge variant="outline" className={getDeviceTypeColor(device.deviceType)}>
                                                                    {getDeviceTypeLabel(device.deviceType)}
                                                                </Badge>
                                                                <Badge variant="secondary">
                                                                    {device.deviceUid}
                                                                </Badge>
                                                            </div>

                                                            {/* 設備名稱輸入 */}
                                                            <div className="flex items-center gap-2">
                                                                <span className="text-sm text-gray-600">{t('pages:deviceManagement.deviceInfo.deviceName')}:</span>
                                                                <Input
                                                                    value={currentName}
                                                                    onChange={(e) => handleNameChange(device.id, e.target.value)}
                                                                    placeholder={t('pages:deviceManagement.deviceInfo.deviceName')}
                                                                    className="w-48"
                                                                />
                                                            </div>

                                                            {/* 設備詳情 */}
                                                            <div className="text-sm text-gray-600 space-y-1">
                                                                <div>硬體編號: {device.hardwareId}</div>
                                                                {device.macAddress && (
                                                                    <div>MAC地址: {device.macAddress}</div>
                                                                )}
                                                                <div>閘道器ID: {device.gatewayId}</div>
                                                                <div className="flex items-center gap-4">
                                                                    <div className="flex items-center gap-1">
                                                                        <Signal className="h-4 w-4" />
                                                                        {device.signalStrength ? `${device.signalStrength}dBm` : '未知'}
                                                                    </div>
                                                                    <div className="text-xs text-gray-500">
                                                                        最後發現: {device.lastSeen.toLocaleTimeString()}
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>

                                                    {/* 操作按鈕 */}
                                                    <div className="flex items-center gap-2">
                                                        <Button
                                                            size="sm"
                                                            onClick={() => handleConfirmDevice(device.id)}
                                                            className="bg-green-600 hover:bg-green-700"
                                                        >
                                                            <CheckCircle2 className="h-4 w-4 mr-1" />
                                                            {t('pages:deviceManagement.deviceDiscovery.add')}
                                                        </Button>
                                                        <Button
                                                            size="sm"
                                                            variant="outline"
                                                            onClick={() => handleRejectDevice(device.id)}
                                                            className="text-red-600 hover:text-red-700"
                                                        >
                                                            <XCircle className="h-4 w-4 mr-1" />
                                                            {t('pages:deviceManagement.deviceDiscovery.cancel')}
                                                        </Button>
                                                    </div>
                                                </div>
                                            </CardContent>
                                        </Card>
                                    )
                                })}
                            </div>
                        )}

                        {/* 操作按鈕 */}
                        <div className="flex justify-between pt-4 border-t">
                            <div className="text-sm text-gray-600">
                                {t('pages:deviceManagement.deviceDiscovery.existingCount')} {devices.length} {t('pages:deviceManagement.deviceDiscovery.deviceCount')} | {t('pages:deviceManagement.deviceDiscovery.discoveredCount')} {discoveredDevices.length} {t('pages:deviceManagement.deviceDiscovery.deviceCount')}
                            </div>
                            <div className="flex gap-2">
                                <Button variant="outline" onClick={handleClose}>
                                    {t('pages:deviceManagement.deviceDiscovery.cancel')}
                                </Button>
                                {isDiscovering && (
                                    <Button onClick={stopDiscovery}>
                                        {t('pages:deviceManagement.deviceDiscovery.stopDiscovery')}
                                    </Button>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    )
}
