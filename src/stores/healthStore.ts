/**
 * 健康數據 Store
 * 管理心率、體溫、血壓、血氧等健康監控數據
 */

import { create } from 'zustand'
import { mqttBus } from '@/services/mqttBus'
import { RoutePatterns } from '@/services/messageRouter'
import type { HealthRecord, MQTTMessage } from '@/types/mqtt-types'

interface HealthState {
    // 數據存儲：key = "gatewayId:MAC", value = 記錄數組
    records: Map<string, HealthRecord[]>

    // 最大記錄數（每個設備）
    maxRecordsPerDevice: number

    // 操作方法
    processHealthMessage: (message: MQTTMessage) => void
    getRecordsByGateway: (gatewayId: string) => HealthRecord[]
    getRecordsByDevice: (deviceMac: string) => HealthRecord[]
    getLatestByDevice: (deviceMac: string) => HealthRecord | null
    getAllDevices: () => string[]
    clearRecords: () => void

    // 統計方法
    getStats: (gatewayId?: string) => {
        totalRecords: number
        totalDevices: number
        avgHeartRate: number
        avgSkinTemp: number
        avgSpO2: number
        abnormalCount: number
    }
}

// 正常值範圍
const NORMAL_RANGES = {
    heartRate: { min: 60, max: 100 },
    skinTemp: { min: 36.0, max: 37.5 },
    SpO2: { min: 95, max: 100 },
    bpSyst: { min: 90, max: 140 },
    bpDiast: { min: 60, max: 90 },
}

export const useHealthStore = create<HealthState>((set, get) => {
    // 延遲訂閱 MQTT 消息，確保 MQTT Bus 已初始化
    setTimeout(() => {
        try {
            mqttBus.subscribe(RoutePatterns.HEALTH, (message) => {
                get().processHealthMessage(message)
            })
            console.log('✅ Health Store 路由已註冊')
        } catch (error) {
            console.warn('⚠️ Health Store 路由註冊失敗:', error)
        }
    }, 200)

    return {
        records: new Map(),
        maxRecordsPerDevice: 1000,

        /**
         * 處理健康數據消息
         */
        processHealthMessage: (message: MQTTMessage) => {
            const data = message.payload

            // 檢查是否為健康數據（300B）
            if (data.content !== '300B') {
                return
            }

            const MAC = data.MAC || data['mac address'] || data.macAddress
            if (!MAC) {
                console.warn('⚠️ 健康數據缺少 MAC 地址')
                return
            }

            const gatewayId = message.gateway?.id || ''

            // 解析數據
            const record: HealthRecord = {
                MAC,
                gatewayId,
                deviceName: data.name || data.device_name || `設備 ${MAC.slice(-8)}`,
                heartRate: parseInt(data.hr) || undefined,
                skinTemp: parseFloat(data['skin temp']) || undefined,
                roomTemp: parseFloat(data['room temp']) || undefined,
                SpO2: parseInt(data.SpO2) || undefined,
                bpSyst: parseInt(data['bp syst']) || undefined,
                bpDiast: parseInt(data['bp diast']) || undefined,
                steps: parseInt(data.steps) || undefined,
                lightSleep: parseInt(data['light sleep (min)']) || undefined,
                deepSleep: parseInt(data['deep sleep (min)']) || undefined,
                batteryLevel: parseInt(data['battery level']) || undefined,
                signalStrength: parseInt(data['signal strength']) || undefined,
                timestamp: message.timestamp,
            }

            console.log('💓 處理健康數據:', record)

            // 更新 Store
            set((state) => {
                const key = `${gatewayId}:${MAC}`
                const existing = state.records.get(key) || []

                // 檢查是否為重複記錄
                const isDuplicate = existing.some(r =>
                    Math.abs(r.timestamp.getTime() - record.timestamp.getTime()) < 1000
                )

                if (isDuplicate) {
                    return state
                }

                // 添加新記錄並限制數量
                const updated = [record, ...existing].slice(0, state.maxRecordsPerDevice)
                const newRecords = new Map(state.records)
                newRecords.set(key, updated)

                return { records: newRecords }
            })
        },

        /**
         * 獲取特定 Gateway 的所有記錄
         */
        getRecordsByGateway: (gatewayId: string) => {
            const allRecords: HealthRecord[] = []

            get().records.forEach((records, key) => {
                if (key.startsWith(`${gatewayId}:`)) {
                    allRecords.push(...records)
                }
            })

            return allRecords.sort((a, b) =>
                b.timestamp.getTime() - a.timestamp.getTime()
            )
        },

        /**
         * 獲取特定設備的所有記錄
         */
        getRecordsByDevice: (deviceMac: string) => {
            const allRecords: HealthRecord[] = []

            get().records.forEach((records) => {
                const filtered = records.filter(r => r.MAC === deviceMac)
                allRecords.push(...filtered)
            })

            return allRecords.sort((a, b) =>
                b.timestamp.getTime() - a.timestamp.getTime()
            )
        },

        /**
         * 獲取設備的最新記錄
         */
        getLatestByDevice: (deviceMac: string) => {
            const records = get().getRecordsByDevice(deviceMac)
            return records.length > 0 ? records[0] : null
        },

        /**
         * 獲取所有設備的 MAC 地址列表
         */
        getAllDevices: () => {
            const devices = new Set<string>()

            get().records.forEach((records) => {
                records.forEach(record => devices.add(record.MAC))
            })

            return Array.from(devices)
        },

        /**
         * 清空所有記錄
         */
        clearRecords: () => {
            set({ records: new Map() })
            console.log('🗑️ 已清空健康數據記錄')
        },

        /**
         * 獲取統計數據
         */
        getStats: (gatewayId?: string) => {
            const records = gatewayId
                ? get().getRecordsByGateway(gatewayId)
                : Array.from(get().records.values()).flat()

            if (records.length === 0) {
                return {
                    totalRecords: 0,
                    totalDevices: 0,
                    avgHeartRate: 0,
                    avgSkinTemp: 0,
                    avgSpO2: 0,
                    abnormalCount: 0,
                }
            }

            const devices = new Set(records.map(r => r.MAC))

            // 計算平均值
            const heartRates = records.map(r => r.heartRate).filter(v => v) as number[]
            const skinTemps = records.map(r => r.skinTemp).filter(v => v) as number[]
            const spO2s = records.map(r => r.SpO2).filter(v => v) as number[]

            const avg = (arr: number[]) => arr.length > 0
                ? arr.reduce((a, b) => a + b, 0) / arr.length
                : 0

            // 計算異常數量
            const abnormalCount = records.filter(r => {
                const hrAbnormal = r.heartRate && (
                    r.heartRate < NORMAL_RANGES.heartRate.min ||
                    r.heartRate > NORMAL_RANGES.heartRate.max
                )
                const tempAbnormal = r.skinTemp && (
                    r.skinTemp < NORMAL_RANGES.skinTemp.min ||
                    r.skinTemp > NORMAL_RANGES.skinTemp.max
                )
                const spO2Abnormal = r.SpO2 && r.SpO2 < NORMAL_RANGES.SpO2.min

                return hrAbnormal || tempAbnormal || spO2Abnormal
            }).length

            return {
                totalRecords: records.length,
                totalDevices: devices.size,
                avgHeartRate: Math.round(avg(heartRates)),
                avgSkinTemp: Math.round(avg(skinTemps) * 10) / 10,
                avgSpO2: Math.round(avg(spO2s)),
                abnormalCount,
            }
        },
    }
})

// 導出便捷方法
export const getHealthStats = (gatewayId?: string) => {
    return useHealthStore.getState().getStats(gatewayId)
}

export const getLatestHealthData = (deviceMac: string) => {
    return useHealthStore.getState().getLatestByDevice(deviceMac)
}

