import React, { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import {
    X,
    Search,
    User,
    Link,
    Unlink,
    AlertCircle,
    CheckCircle,
    Watch,
    Baby,
    Activity,
    MapPin
} from 'lucide-react'
import { useDeviceManagement } from '@/contexts/DeviceManagementContext'
import { Device, Resident, DeviceType, DeviceStatus, DEVICE_TYPE_CONFIG } from '@/types/device-types'
import { useTranslation } from 'react-i18next'

interface DeviceBindingModalProps {
    isOpen: boolean
    onClose: () => void
    device?: Device
    resident?: Resident
}

export default function DeviceBindingModal({
    isOpen,
    onClose,
    device,
    resident
}: DeviceBindingModalProps) {
    const { t } = useTranslation()
    const {
        devices,
        residents,
        getDevicesForResident,
        getResidentForDevice,
        bindDevice,
        unbindDevice
    } = useDeviceManagement()

    const [selectedDeviceId, setSelectedDeviceId] = useState(device?.id || '')
    const [selectedResidentId, setSelectedResidentId] = useState(resident?.id || '')
    const [bindingType, setBindingType] = useState<'primary' | 'secondary'>('primary')
    const [searchDevice, setSearchDevice] = useState('')
    const [searchResident, setSearchResident] = useState('')
    const [notes, setNotes] = useState('')

    if (!isOpen) return null

    const selectedDevice = devices.find(d => d.id === selectedDeviceId)
    const selectedResident = residents.find(r => r.id === selectedResidentId)
    const currentBinding = selectedDevice ? getResidentForDevice(selectedDevice.id) : null
    const residentDevices = selectedResident ? getDevicesForResident(selectedResident.id) : []

    // 篩選可用設備
    const filteredDevices = devices.filter(device =>
        device.name.toLowerCase().includes(searchDevice.toLowerCase()) ||
        device.hardwareId.toLowerCase().includes(searchDevice.toLowerCase()) ||
        device.deviceUid.toLowerCase().includes(searchDevice.toLowerCase())
    )

    // 篩選可用院友
    const filteredResidents = residents.filter(resident =>
        resident.name.toLowerCase().includes(searchResident.toLowerCase()) ||
        resident.room.toLowerCase().includes(searchResident.toLowerCase()) ||
        resident.id.toLowerCase().includes(searchResident.toLowerCase())
    )

    const handleBind = () => {
        if (!selectedDeviceId || !selectedResidentId) return
        bindDevice(selectedDeviceId, selectedResidentId, bindingType)
        onClose()
    }

    const handleUnbind = () => {
        if (!selectedDeviceId || !currentBinding) return
        unbindDevice(selectedDeviceId, currentBinding.id)
        onClose()
    }

    const getDeviceTypeIcon = (deviceType: DeviceType) => {
        switch (deviceType) {
            case DeviceType.SMARTWATCH_300B: return Watch
            case DeviceType.DIAPER_SENSOR: return Baby
            case DeviceType.PEDOMETER: return Activity
            case DeviceType.UWB_TAG: return MapPin
            default: return AlertCircle
        }
    }

    const getStatusBadge = (status: DeviceStatus) => {
        const colors = {
            [DeviceStatus.ACTIVE]: 'bg-green-100 text-green-800',
            [DeviceStatus.INACTIVE]: 'bg-yellow-100 text-yellow-800',
            [DeviceStatus.OFFLINE]: 'bg-gray-100 text-gray-800',
            [DeviceStatus.ERROR]: 'bg-red-100 text-red-800'
        }

        return (
            <Badge className={colors[status]}>
                {status === DeviceStatus.ACTIVE ? t('status:device.status.active') :
                    status === DeviceStatus.INACTIVE ? t('status:device.status.inactive') :
                        status === DeviceStatus.OFFLINE ? t('status:device.status.offline') : t('status:device.status.error')}
            </Badge>
        )
    }

    const getResidentStatusBadge = (status: string) => {
        const colors = {
            'good': 'bg-green-100 text-green-800',
            'attention': 'bg-yellow-100 text-yellow-800',
            'critical': 'bg-red-100 text-red-800'
        }

        return (
            <Badge className={colors[status as keyof typeof colors] || 'bg-gray-100 text-gray-800'}>
                {status === 'good' ? t('status:resident.status.good') :
                    status === 'attention' ? t('status:resident.status.attention') :
                        status === 'critical' ? t('status:resident.status.critical') : t('status:resident.status.unknown')}
            </Badge>
        )
    }

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <Card className="w-full max-w-4xl max-h-[90vh] overflow-y-auto">
                <CardHeader className="flex flex-row items-center justify-between">
                    <CardTitle className="text-xl">{t('pages:residents.deviceBinding.title')}</CardTitle>
                    <Button variant="ghost" size="sm" onClick={onClose}>
                        <X className="h-5 w-5" />
                    </Button>
                </CardHeader>

                <CardContent className="space-y-6">
                    {/* 當前綁定狀態 */}
                    {selectedDevice && currentBinding && (
                        <div className="bg-blue-50 p-4 rounded-lg">
                            <div className="flex items-center gap-2 mb-2">
                                <Link className="h-5 w-5 text-blue-600" />
                                <h3 className="font-semibold text-blue-800">{t('pages:residents.deviceBinding.currentBinding')}</h3>
                            </div>
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-4">
                                    <div className="text-sm text-blue-700">
                                        {t('pages:residents.deviceBinding.deviceBoundToResident', {
                                            deviceName: selectedDevice.name,
                                            residentName: currentBinding.name
                                        })}
                                    </div>
                                </div>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={handleUnbind}
                                    className="text-red-600 border-red-200 hover:bg-red-50"
                                >
                                    <Unlink className="h-4 w-4 mr-1" />
                                    {t('pages:residents.deviceBinding.unbind')}
                                </Button>
                            </div>
                        </div>
                    )}

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {/* 設備選擇 */}
                        <div>
                            <h3 className="text-lg font-semibold mb-3">{t('pages:residents.deviceBinding.selectDevice')}</h3>

                            {/* 設備搜索 */}
                            <div className="relative mb-4">
                                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                                <Input
                                    placeholder={t('pages:residents.deviceBinding.searchDevicePlaceholder')}
                                    value={searchDevice}
                                    onChange={(e) => setSearchDevice(e.target.value)}
                                    className="pl-10"
                                />
                            </div>

                            {/* 設備列表 */}
                            <div className="space-y-2 max-h-64 overflow-y-auto">
                                {filteredDevices.map((device) => {
                                    const DeviceIcon = getDeviceTypeIcon(device.deviceType)
                                    const isSelected = selectedDeviceId === device.id
                                    const deviceResident = getResidentForDevice(device.id)

                                    return (
                                        <div
                                            key={device.id}
                                            onClick={() => setSelectedDeviceId(device.id)}
                                            className={`p-3 rounded-lg border cursor-pointer transition-colors ${isSelected
                                                ? 'border-blue-500 bg-blue-50'
                                                : 'border-gray-200 hover:bg-gray-50'
                                                }`}
                                        >
                                            <div className="flex items-center gap-3">
                                                <div className={`p-2 rounded-lg ${DEVICE_TYPE_CONFIG[device.deviceType].color}`}>
                                                    <DeviceIcon className="h-4 w-4" />
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center gap-2">
                                                        <h4 className="font-medium truncate">{device.name}</h4>
                                                        {getStatusBadge(device.status)}
                                                    </div>
                                                    <p className="text-sm text-muted-foreground truncate">
                                                        {device.hardwareId}
                                                    </p>
                                                    {deviceResident && (
                                                        <p className="text-xs text-blue-600">
                                                            {t('pages:residents.deviceBinding.alreadyBound')}: {deviceResident.name}
                                                        </p>
                                                    )}
                                                </div>
                                                {device.batteryLevel && (
                                                    <div className="text-xs text-gray-500">
                                                        {device.batteryLevel}%
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    )
                                })}
                            </div>
                        </div>

                        {/* 院友選擇 */}
                        <div>
                            <h3 className="text-lg font-semibold mb-3">{t('pages:residents.deviceBinding.selectResident')}</h3>

                            {/* 院友搜索 */}
                            <div className="relative mb-4">
                                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                                <Input
                                    placeholder={t('pages:residents.deviceBinding.searchResidentPlaceholder')}
                                    value={searchResident}
                                    onChange={(e) => setSearchResident(e.target.value)}
                                    className="pl-10"
                                />
                            </div>

                            {/* 院友列表 */}
                            <div className="space-y-2 max-h-64 overflow-y-auto">
                                {filteredResidents.map((resident) => {
                                    const isSelected = selectedResidentId === resident.id
                                    const deviceCount = getDevicesForResident(resident.id).length

                                    return (
                                        <div
                                            key={resident.id}
                                            onClick={() => setSelectedResidentId(resident.id)}
                                            className={`p-3 rounded-lg border cursor-pointer transition-colors ${isSelected
                                                ? 'border-blue-500 bg-blue-50'
                                                : 'border-gray-200 hover:bg-gray-50'
                                                }`}
                                        >
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center text-lg">
                                                    {resident.avatar || '👤'}
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center gap-2">
                                                        <h4 className="font-medium">{resident.name}</h4>
                                                        {getResidentStatusBadge(resident.status)}
                                                    </div>
                                                    <p className="text-sm text-muted-foreground">
                                                        {resident.age} {t('pages:residents.ageUnit')} • {t('pages:residents.room')} {resident.room}
                                                    </p>
                                                    <p className="text-xs text-gray-500">
                                                        {deviceCount} {t('pages:residents.deviceCount')}
                                                    </p>
                                                </div>
                                            </div>
                                        </div>
                                    )
                                })}
                            </div>
                        </div>
                    </div>

                    {/* 綁定設置 */}
                    {selectedDeviceId && selectedResidentId && (
                        <div className="bg-gray-50 p-4 rounded-lg">
                            <h4 className="font-semibold mb-3">{t('pages:residents.deviceBinding.bindingSettings')}</h4>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="text-sm font-medium mb-2 block">{t('pages:residents.deviceBinding.bindingType')}</label>
                                    <Select value={bindingType} onValueChange={(value: 'primary' | 'secondary') => setBindingType(value)}>
                                        <SelectTrigger>
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="primary">{t('pages:residents.deviceBinding.primaryDevice')}</SelectItem>
                                            <SelectItem value="secondary">{t('pages:residents.deviceBinding.secondaryDevice')}</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>

                                <div>
                                    <label className="text-sm font-medium mb-2 block">{t('pages:residents.deviceBinding.notes')}</label>
                                    <Input
                                        placeholder={t('pages:residents.deviceBinding.notesPlaceholder')}
                                        value={notes}
                                        onChange={(e) => setNotes(e.target.value)}
                                    />
                                </div>
                            </div>
                        </div>
                    )}

                    {/* 院友設備概覽 */}
                    {selectedResident && residentDevices.length > 0 && (
                        <div className="bg-green-50 p-4 rounded-lg">
                            <h4 className="font-semibold text-green-800 mb-2">
                                {t('pages:residents.deviceBinding.residentDevices', { name: selectedResident.name })}
                            </h4>
                            <div className="flex flex-wrap gap-2">
                                {residentDevices.map((device) => {
                                    const DeviceIcon = getDeviceTypeIcon(device.deviceType)
                                    return (
                                        <div key={device.id} className="flex items-center gap-2 bg-white px-3 py-1 rounded-lg text-sm">
                                            <DeviceIcon className="h-3 w-3 text-green-600" />
                                            <span>{device.name}</span>
                                            {getStatusBadge(device.status)}
                                        </div>
                                    )
                                })}
                            </div>
                        </div>
                    )}

                    {/* 操作按鈕 */}
                    <div className="flex gap-3 pt-4">
                        <Button variant="outline" onClick={onClose} className="flex-1">
                            {t('common:actions.cancel')}
                        </Button>
                        {selectedDeviceId && selectedResidentId && !currentBinding && (
                            <Button onClick={handleBind} className="flex-1">
                                <Link className="h-4 w-4 mr-2" />
                                {t('pages:residents.deviceBinding.confirmBind')}
                            </Button>
                        )}
                    </div>
                </CardContent>
            </Card>
        </div>
    )
}
