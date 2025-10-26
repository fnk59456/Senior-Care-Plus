/**
 * Store 統一導出
 */

export { useHealthStore, getHealthStats, getLatestHealthData } from './healthStore'
export { useLocationStore, getCurrentLocation, getOnlineDevicesCount } from './locationStore'
export { useDeviceStore, getDeviceStats, isDeviceOnline } from './deviceStore'

// 導出類型
export type { HealthRecord, LocationRecord, DeviceStatusRecord } from '@/types/mqtt-types'


