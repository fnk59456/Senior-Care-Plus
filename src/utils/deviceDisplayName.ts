import { Device, DeviceType } from '@/types/device-types'
import { TFunction } from 'i18next'

const DEVICE_TYPE_LABEL_KEYS: Record<DeviceType, string> = {
    [DeviceType.SMARTWATCH_300B]: 'pages:deviceManagement.deviceTypeLabels.smartwatch300B',
    [DeviceType.DIAPER_SENSOR]: 'pages:deviceManagement.deviceTypeLabels.diaperSensor',
    [DeviceType.PEDOMETER]: 'pages:deviceManagement.deviceTypeLabels.pedometer',
    [DeviceType.UWB_TAG]: 'pages:deviceManagement.deviceTypeLabels.uwbTag',
    [DeviceType.UWB_ANCHOR]: 'pages:deviceManagement.deviceTypeLabels.uwbAnchor',
    [DeviceType.GATEWAY]: 'pages:deviceManagement.deviceTypeLabels.gateway'
}

/**
 * 取得設備顯示名稱（支援國際化前綴）。
 * - 若有 customName 則顯示自訂名稱；
 * - 若有 nameSuffix 則顯示 t(設備類型前綴) + ' ' + nameSuffix；
 * - 否則回退為 name（舊資料相容）。
 */
export function getDeviceDisplayName(device: Device, t: TFunction): string {
    if (device.customName != null && device.customName !== '') {
        return device.customName
    }
    if (device.nameSuffix != null && device.nameSuffix !== '') {
        const key = DEVICE_TYPE_LABEL_KEYS[device.deviceType]
        const prefix = key ? t(key) : device.deviceType
        return `${prefix} ${device.nameSuffix}`.trim()
    }
    return device.name || ''
}

/**
 * 取得設備名稱後綴（用於 API/指令，例如錨點名、標籤 ID）。
 * 有 nameSuffix 時直接回傳，否則回退為傳入的 fallback（例如從 name 解析）。
 */
export function getDeviceNameSuffix(device: Device, fallback: string): string {
    return (device.nameSuffix != null && device.nameSuffix !== '') ? device.nameSuffix : fallback
}

/** 取得設備類型顯示標籤（i18n） */
export function getDeviceTypeLabel(deviceType: DeviceType, t: TFunction): string {
    const key = DEVICE_TYPE_LABEL_KEYS[deviceType]
    return key ? t(key) : deviceType
}
