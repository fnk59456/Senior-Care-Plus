/**
 * 設備狀態 Store
 * 管理設備（Gateway、Anchor、Tag）的實時狀態
 */

import { create } from 'zustand'
import { mqttBus } from '@/services/mqttBus'
import { RoutePatterns } from '@/services/messageRouter'
import type { DeviceStatusRecord, MQTTMessage } from '@/types/mqtt-types'

interface DeviceState {
    // 設備狀態：key = deviceId, value = 狀態記錄
    devices: Map<string, DeviceStatusRecord>

    // 過期時間（毫秒）
    offlineThreshold: number

    // 操作方法
    processDeviceMessage: (message: MQTTMessage) => void
    getDevice: (deviceId: string) => DeviceStatusRecord | null
    getDevicesByGateway: (gatewayId: string) => DeviceStatusRecord[]
    getDevicesByType: (deviceType: DeviceStatusRecord['deviceType']) => DeviceStatusRecord[]
    getOnlineDevices: () => DeviceStatusRecord[]
    getOfflineDevices: () => DeviceStatusRecord[]
    updateDeviceStatus: (deviceId: string, status: DeviceStatusRecord['status']) => void
    removeDevice: (deviceId: string) => void
    clearDevices: () => void

    // 統計方法
    getStats: () => {
        total: number
        online: number
        offline: number
        byType: Record<string, number>
        avgBattery: number
        lowBatteryCount: number
    }
}

const LOW_BATTERY_THRESHOLD = 20 // 20%

export const useDeviceStore = create<DeviceState>((set, get) => {
    // 延遲訂閱 MQTT 消息，確保 MQTT Bus 已初始化
    setTimeout(() => {
        try {
            // 訂閱健康數據以更新設備狀態
            mqttBus.subscribe(RoutePatterns.HEALTH, (message) => {
                get().processDeviceMessage(message)
            })

            // 訂閱位置數據以更新設備狀態
            mqttBus.subscribe(RoutePatterns.LOCATION, (message) => {
                get().processDeviceMessage(message)
            })
            console.log('✅ Device Store 路由已註冊')
        } catch (error) {
            console.warn('⚠️ Device Store 路由註冊失敗:', error)
        }
    }, 200)

    return {
        devices: new Map(),
        offlineThreshold: 60000, // 60秒

        /**
         * 處理設備消息（從 Health 或 Location 數據提取設備狀態）
         */
        processDeviceMessage: (message: MQTTMessage) => {
            const data = message.payload
            const gatewayId = message.gateway?.id || ''

            let deviceId: string | undefined
            let deviceUid: string | undefined
            let deviceType: DeviceStatusRecord['deviceType'] = 'tag'
            let batteryLevel: number | undefined
            let signalStrength: number | undefined
            let position: DeviceStatusRecord['position'] | undefined

            // 從 Health 數據提取
            if (data.content === '300B') {
                const MAC = data.MAC || data['mac address']
                deviceId = MAC
                deviceUid = `TAG:${MAC}`
                deviceType = 'tag'
                batteryLevel = parseInt(data['battery level']) || undefined
                signalStrength = parseInt(data['signal strength']) || undefined
            }
            // 從 Location 數據提取
            else if (data.content === 'location') {
                deviceId = String(data.id)
                deviceUid = deviceId
                deviceType = 'tag'

                if (data.position) {
                    position = {
                        x: data.position.x,
                        y: data.position.y,
                        z: data.position.z || 0,
                        quality: data.position.quality || 0,
                    }
                }
            }

            if (!deviceId) {
                return
            }

            // 確定設備狀態
            const status: DeviceStatusRecord['status'] =
                batteryLevel && batteryLevel < LOW_BATTERY_THRESHOLD ? 'inactive' : 'active'

            // 創建或更新設備記錄
            const record: DeviceStatusRecord = {
                deviceId,
                deviceUid: deviceUid || deviceId,
                deviceType,
                status,
                batteryLevel,
                signalStrength,
                lastSeen: message.timestamp,
                position,
            }

            console.log('🔧 處理設備狀態:', record)

            // 更新 Store
            set((state) => {
                const newDevices = new Map(state.devices)
                const existing = newDevices.get(deviceId)

                if (existing) {
                    // 合併更新
                    newDevices.set(deviceId, {
                        ...existing,
                        ...record,
                        // 保留原有數據（如果新數據沒有）
                        batteryLevel: record.batteryLevel ?? existing.batteryLevel,
                        signalStrength: record.signalStrength ?? existing.signalStrength,
                        position: record.position ?? existing.position,
                    })
                } else {
                    newDevices.set(deviceId, record)
                }

                return { devices: newDevices }
            })
        },

        /**
         * 獲取設備
         */
        getDevice: (deviceId: string) => {
            return get().devices.get(deviceId) || null
        },

        /**
         * 獲取 Gateway 下的所有設備
         */
        getDevicesByGateway: (gatewayId: string) => {
            // 注意：目前設備記錄沒有直接存儲 gatewayId
            // 需要通過其他方式關聯，這裡返回所有設備
            // 實際使用時可能需要從 Context 或其他地方獲取關聯信息
            return Array.from(get().devices.values())
        },

        /**
         * 按類型獲取設備
         */
        getDevicesByType: (deviceType: DeviceStatusRecord['deviceType']) => {
            const devices: DeviceStatusRecord[] = []

            get().devices.forEach((device) => {
                if (device.deviceType === deviceType) {
                    devices.push(device)
                }
            })

            return devices.sort((a, b) =>
                b.lastSeen.getTime() - a.lastSeen.getTime()
            )
        },

        /**
         * 獲取在線設備
         */
        getOnlineDevices: () => {
            const now = Date.now()
            const threshold = get().offlineThreshold
            const onlineDevices: DeviceStatusRecord[] = []

            get().devices.forEach((device) => {
                const isOnline = now - device.lastSeen.getTime() < threshold
                if (isOnline && device.status === 'active') {
                    onlineDevices.push(device)
                }
            })

            return onlineDevices
        },

        /**
         * 獲取離線設備
         */
        getOfflineDevices: () => {
            const now = Date.now()
            const threshold = get().offlineThreshold
            const offlineDevices: DeviceStatusRecord[] = []

            get().devices.forEach((device) => {
                const isOffline = now - device.lastSeen.getTime() >= threshold
                if (isOffline || device.status === 'offline') {
                    offlineDevices.push(device)
                }
            })

            return offlineDevices
        },

        /**
         * 更新設備狀態
         */
        updateDeviceStatus: (deviceId: string, status: DeviceStatusRecord['status']) => {
            set((state) => {
                const device = state.devices.get(deviceId)
                if (!device) return state

                const newDevices = new Map(state.devices)
                newDevices.set(deviceId, { ...device, status })

                return { devices: newDevices }
            })
        },

        /**
         * 移除設備
         */
        removeDevice: (deviceId: string) => {
            set((state) => {
                const newDevices = new Map(state.devices)
                newDevices.delete(deviceId)
                return { devices: newDevices }
            })
        },

        /**
         * 清空所有設備
         */
        clearDevices: () => {
            set({ devices: new Map() })
            console.log('🗑️ 已清空設備記錄')
        },

        /**
         * 獲取統計數據
         */
        getStats: () => {
            const devices = Array.from(get().devices.values())
            const now = Date.now()
            const threshold = get().offlineThreshold

            const online = devices.filter(d =>
                now - d.lastSeen.getTime() < threshold && d.status === 'active'
            ).length

            const offline = devices.length - online

            // 按類型統計
            const byType: Record<string, number> = {}
            devices.forEach(device => {
                byType[device.deviceType] = (byType[device.deviceType] || 0) + 1
            })

            // 計算平均電量
            const batteries = devices
                .map(d => d.batteryLevel)
                .filter(b => b !== undefined) as number[]

            const avgBattery = batteries.length > 0
                ? Math.round(batteries.reduce((a, b) => a + b, 0) / batteries.length)
                : 0

            // 低電量設備數
            const lowBatteryCount = devices.filter(d =>
                d.batteryLevel && d.batteryLevel < LOW_BATTERY_THRESHOLD
            ).length

            return {
                total: devices.length,
                online,
                offline,
                byType,
                avgBattery,
                lowBatteryCount,
            }
        },
    }
})

// 導出便捷方法
export const getDeviceStats = () => {
    return useDeviceStore.getState().getStats()
}

export const isDeviceOnline = (deviceId: string): boolean => {
    const device = useDeviceStore.getState().getDevice(deviceId)
    if (!device) return false

    const now = Date.now()
    const threshold = useDeviceStore.getState().offlineThreshold
    return now - device.lastSeen.getTime() < threshold && device.status === 'active'
}

