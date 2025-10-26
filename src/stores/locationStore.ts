/**
 * 位置數據 Store
 * 管理 UWB 室內定位數據
 */

import { create } from 'zustand'
import { mqttBus } from '@/services/mqttBus'
import { RoutePatterns } from '@/services/messageRouter'
import type { LocationRecord, MQTTMessage } from '@/types/mqtt-types'

interface LocationState {
    // 數據存儲：key = deviceId, value = 最新位置記錄
    currentLocations: Map<string, LocationRecord>

    // 歷史軌跡：key = deviceId, value = 位置記錄數組
    locationHistory: Map<string, LocationRecord[]>

    // 最大歷史記錄數（每個設備）
    maxHistoryPerDevice: number

    // 過期時間（毫秒，超過此時間視為離線）
    expiryTime: number

    // 操作方法
    processLocationMessage: (message: MQTTMessage) => void
    getLocationByDevice: (deviceId: string) => LocationRecord | null
    getLocationsByGateway: (gatewayId: string) => LocationRecord[]
    getLocationsByFloor: (floorId: string) => LocationRecord[]
    getOnlineDevices: () => LocationRecord[]
    getDeviceHistory: (deviceId: string, limit?: number) => LocationRecord[]
    clearHistory: () => void

    // 統計方法
    getStats: (gatewayId?: string) => {
        totalDevices: number
        onlineDevices: number
        offlineDevices: number
        avgQuality: number
    }
}

export const useLocationStore = create<LocationState>((set, get) => {
    // 延遲訂閱 MQTT 消息，確保 MQTT Bus 已初始化
    setTimeout(() => {
        try {
            mqttBus.subscribe(RoutePatterns.LOCATION, (message) => {
                get().processLocationMessage(message)
            })
            console.log('✅ Location Store 路由已註冊')
        } catch (error) {
            console.warn('⚠️ Location Store 路由註冊失敗:', error)
        }
    }, 200)

    return {
        currentLocations: new Map(),
        locationHistory: new Map(),
        maxHistoryPerDevice: 100,
        expiryTime: 5000, // 5秒

        /**
         * 處理位置數據消息
         */
        processLocationMessage: (message: MQTTMessage) => {
            const data = message.payload

            // 檢查是否為位置數據
            if (data.content !== 'location') {
                return
            }

            const deviceId = String(data.id)
            if (!deviceId) {
                console.warn('⚠️ 位置數據缺少設備 ID')
                return
            }

            const position = data.position
            if (!position || typeof position.x !== 'number' || typeof position.y !== 'number') {
                console.warn('⚠️ 位置數據格式錯誤')
                return
            }

            const gatewayId = message.gateway?.id || ''
            const floorId = data.floor_id || data.floorId || ''

            // 創建位置記錄
            const record: LocationRecord = {
                deviceId,
                gatewayId,
                position: {
                    x: position.x,
                    y: position.y,
                    z: position.z || 0,
                    quality: position.quality || 0,
                },
                floorId,
                timestamp: message.timestamp,
                deviceName: data.device_name || data.name,
                residentId: data.resident_id || data.residentId,
                residentName: data.resident_name || data.residentName,
                residentRoom: data.resident_room || data.residentRoom,
            }

            console.log('📍 處理位置數據:', record)

            // 更新 Store
            set((state) => {
                // 更新當前位置
                const newCurrentLocations = new Map(state.currentLocations)
                newCurrentLocations.set(deviceId, record)

                // 更新歷史記錄
                const newLocationHistory = new Map(state.locationHistory)
                const history = newLocationHistory.get(deviceId) || []
                const updatedHistory = [record, ...history].slice(0, state.maxHistoryPerDevice)
                newLocationHistory.set(deviceId, updatedHistory)

                return {
                    currentLocations: newCurrentLocations,
                    locationHistory: newLocationHistory,
                }
            })
        },

        /**
         * 獲取設備的當前位置
         */
        getLocationByDevice: (deviceId: string) => {
            const location = get().currentLocations.get(deviceId)

            if (!location) return null

            // 檢查是否過期
            const isExpired = Date.now() - location.timestamp.getTime() > get().expiryTime
            return isExpired ? null : location
        },

        /**
         * 獲取 Gateway 下的所有設備位置
         */
        getLocationsByGateway: (gatewayId: string) => {
            const now = Date.now()
            const expiryTime = get().expiryTime
            const locations: LocationRecord[] = []

            get().currentLocations.forEach((location) => {
                if (location.gatewayId === gatewayId) {
                    // 只返回未過期的
                    const isExpired = now - location.timestamp.getTime() > expiryTime
                    if (!isExpired) {
                        locations.push(location)
                    }
                }
            })

            return locations.sort((a, b) =>
                b.timestamp.getTime() - a.timestamp.getTime()
            )
        },

        /**
         * 獲取樓層的所有設備位置
         */
        getLocationsByFloor: (floorId: string) => {
            const now = Date.now()
            const expiryTime = get().expiryTime
            const locations: LocationRecord[] = []

            get().currentLocations.forEach((location) => {
                if (location.floorId === floorId) {
                    const isExpired = now - location.timestamp.getTime() > expiryTime
                    if (!isExpired) {
                        locations.push(location)
                    }
                }
            })

            return locations
        },

        /**
         * 獲取所有在線設備
         */
        getOnlineDevices: () => {
            const now = Date.now()
            const expiryTime = get().expiryTime
            const onlineDevices: LocationRecord[] = []

            get().currentLocations.forEach((location) => {
                const isExpired = now - location.timestamp.getTime() > expiryTime
                if (!isExpired) {
                    onlineDevices.push(location)
                }
            })

            return onlineDevices.sort((a, b) =>
                b.timestamp.getTime() - a.timestamp.getTime()
            )
        },

        /**
         * 獲取設備的歷史軌跡
         */
        getDeviceHistory: (deviceId: string, limit?: number) => {
            const history = get().locationHistory.get(deviceId) || []
            return limit ? history.slice(0, limit) : history
        },

        /**
         * 清空歷史記錄
         */
        clearHistory: () => {
            set({ locationHistory: new Map() })
            console.log('🗑️ 已清空位置歷史記錄')
        },

        /**
         * 獲取統計數據
         */
        getStats: (gatewayId?: string) => {
            const now = Date.now()
            const expiryTime = get().expiryTime
            const locations = gatewayId
                ? get().getLocationsByGateway(gatewayId)
                : Array.from(get().currentLocations.values())

            const totalDevices = get().currentLocations.size

            const onlineDevices = locations.filter(location => {
                const isExpired = now - location.timestamp.getTime() > expiryTime
                return !isExpired
            })

            const qualities = onlineDevices.map(l => l.position.quality).filter(q => q > 0)
            const avgQuality = qualities.length > 0
                ? Math.round(qualities.reduce((a, b) => a + b, 0) / qualities.length)
                : 0

            return {
                totalDevices,
                onlineDevices: onlineDevices.length,
                offlineDevices: totalDevices - onlineDevices.length,
                avgQuality,
            }
        },
    }
})

// 導出便捷方法
export const getCurrentLocation = (deviceId: string) => {
    return useLocationStore.getState().getLocationByDevice(deviceId)
}

export const getOnlineDevicesCount = () => {
    return useLocationStore.getState().getOnlineDevices().length
}

