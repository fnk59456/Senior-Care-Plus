import React, { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { DeviceStatus } from '@/types/device-types'
import { useDeviceManagement } from './DeviceManagementContext'

import { mqttBus } from '@/services/mqttBus'
import { MQTTMessage } from '@/types/mqtt-types'

// 實時設備數據類型
export interface RealTimeDeviceData {
    deviceId: string
    deviceUid: string
    batteryLevel: number
    status: DeviceStatus
    lastSeen: Date
    signalStrength?: number
    position?: {
        x: number
        y: number
        z: number
        quality: number
    }
}

// MQTT 連接狀態
interface MQTTConnectionStatus {
    isConnected: boolean
    connectedGateways: string[]
    lastMessageTime: Date | null
    error: string | null
}

// MQTT 調試消息
interface MQTTDebugMessage {
    id: string
    timestamp: Date
    topic: string
    message: string
    type: 'health' | 'location' | 'ack' | 'message' | 'other'
    rawData?: any
    parsedData?: any
    deviceId?: string
    deviceName?: string
}

// 設備監控上下文類型
interface DeviceMonitoringContextType {
    // 實時設備數據
    realTimeDevices: Map<string, RealTimeDeviceData>

    // 監控狀態
    isMonitoring: boolean
    connectionStatus: MQTTConnectionStatus

    // 調試面板
    debugMessages: MQTTDebugMessage[]
    maxMessages: number
    topicFilter: string
    deviceFilter: string
    showDebugPanel: boolean

    // 統計數據
    stats: {
        totalMessages: number
        healthMessages: number
        locationMessages: number
        ackMessages: number
    }

    // 操作方法
    startMonitoring: (gatewayId: string) => void
    stopMonitoring: () => void
    clearDebugMessages: () => void
    setMaxMessages: (count: number) => void
    setTopicFilter: (filter: string) => void
    setDeviceFilter: (filter: string) => void
    setShowDebugPanel: (show: boolean) => void
    exportDebugData: () => void
}

const DeviceMonitoringContext = createContext<DeviceMonitoringContextType | undefined>(undefined)

export function DeviceMonitoringProvider({ children }: { children: React.ReactNode }) {
    const { devices } = useDeviceManagement()


    // 狀態管理
    const [realTimeDevices, setRealTimeDevices] = useState<Map<string, RealTimeDeviceData>>(new Map())
    const [isMonitoring, setIsMonitoring] = useState(false)
    const [connectionStatus, setConnectionStatus] = useState<MQTTConnectionStatus>({
        isConnected: false,
        connectedGateways: [],
        lastMessageTime: null,
        error: null
    })
    const [debugMessages, setDebugMessages] = useState<MQTTDebugMessage[]>([])
    const [maxMessages, setMaxMessages] = useState(50)
    const [topicFilter, setTopicFilter] = useState('')
    const [deviceFilter, setDeviceFilter] = useState('')
    const [showDebugPanel, setShowDebugPanel] = useState(false)
    const [stats, setStats] = useState({
        totalMessages: 0,
        healthMessages: 0,
        locationMessages: 0,
        ackMessages: 0
    })

    // 添加調試消息
    const addDebugMessage = useCallback((topic: string, message: string, type: MQTTDebugMessage['type'] = 'other', rawData?: any, parsedData?: any, deviceId?: string, deviceName?: string) => {
        const debugMessage: MQTTDebugMessage = {
            id: Date.now().toString(),
            timestamp: new Date(),
            topic,
            message,
            type,
            rawData,
            parsedData,
            deviceId,
            deviceName
        }

        setDebugMessages(prev => {
            const newMessages = [debugMessage, ...prev].slice(0, maxMessages)
            return newMessages
        })

        // 更新統計
        setStats(prev => ({
            ...prev,
            totalMessages: prev.totalMessages + 1,
            healthMessages: type === 'health' ? prev.healthMessages + 1 : prev.healthMessages,
            locationMessages: type === 'location' ? prev.locationMessages + 1 : prev.locationMessages,
            ackMessages: type === 'ack' ? prev.ackMessages + 1 : prev.ackMessages,
        }))
    }, [maxMessages])

    // 處理健康數據
    const handleHealthData = useCallback((data: any) => {
        // 提取可能的設備識別信息
        const deviceId = data['device id'] || data.device_id || data.deviceId
        const deviceUid = data['device uid'] || data.device_uid || data.deviceUid
        const hardwareId = data['hardware id'] || data.hardware_id || data.hardwareId
        const macAddress = data['mac address'] || data.mac_address || data.macAddress || data.MAC
        const name = data.name || data.device_name
        const id = data.id // UWB Tag ID

        // 查找對應的設備（如果存在）
        const device = devices.find(d => {
            // 嘗試多種匹配方式
            const matches = {
                byId: d.id === deviceId,
                byUid: d.deviceUid === deviceUid,
                byHardwareId: d.hardwareId === hardwareId,
                byMacAddress: d.hardwareId === macAddress,
                byName: d.name === deviceId || d.name === name,
                // 新增：匹配deviceUid中的MAC地址部分
                byUidMac: d.deviceUid && macAddress && d.deviceUid.includes(macAddress),
                // 新增：匹配MAC地址與deviceUid的後半部分
                byMacInUid: d.deviceUid && macAddress && d.deviceUid.split(':').slice(1).join(':') === macAddress,
                // 新增：匹配 UWB Tag ID
                byTagId: id && d.deviceUid === `TAG:${id}`
            }

            return matches.byId || matches.byUid || matches.byHardwareId || matches.byMacAddress || matches.byName || matches.byUidMac || matches.byMacInUid || matches.byTagId
        })

        // 如果找到對應設備，更新實時數據
        if (device) {
            // 提取電池電量並正規化
            const extractedBatteryLevel = data['battery level'] || data.battery_level || data.battery
            // 如果沒有電量信息，保持現有值
            const currentData = realTimeDevices.get(device.id)
            const batteryLevel = extractedBatteryLevel !== undefined
                ? Math.max(0, Math.min(100, Number(extractedBatteryLevel) || 0))
                : (currentData?.batteryLevel || device.batteryLevel || 0)

            const realTimeData: RealTimeDeviceData = {
                deviceId: device.id,
                deviceUid: device.deviceUid,
                batteryLevel: batteryLevel,
                status: 'online' as DeviceStatus,
                lastSeen: new Date(),
                signalStrength: data['signal strength'] || data.signal_strength || data.signalStrength,
                position: data.position ? {
                    x: data.position.x || 0,
                    y: data.position.y || 0,
                    z: data.position.z || 0,
                    quality: data.position.quality || 0
                } : currentData?.position
            }

            setRealTimeDevices(prev => new Map(prev.set(device.id, realTimeData)))
        }
    }, [devices, realTimeDevices])

    // 處理位置數據
    const handleLocationData = useCallback((data: any) => {
        // 位置數據處理邏輯...
        // 這裡可以復用 handleHealthData 的部分邏輯，或者專門處理位置更新
        handleHealthData(data)
    }, [handleHealthData])

    // 處理ACK數據
    const handleAckData = useCallback((_data: any) => {
        // ACK數據處理邏輯...
    }, [])

    // 處理一般消息 (包含 UWB Tag 的 _Message)
    const handleMessageData = useCallback((data: any) => {
        handleHealthData(data)
    }, [handleHealthData])

    // 監聽 MQTT Bus
    useEffect(() => {
        // 1. 處理歷史消息 (Persistence)
        const processRecentMessages = () => {
            const recentMessages = mqttBus.getRecentMessages()
            console.log(`🔄 [DeviceMonitoringContext] Processing ${recentMessages.length} recent messages for persistence`)

            recentMessages.forEach(msg => {
                const { topic, payload } = msg
                try {
                    if (topic.includes('Health')) {
                        handleHealthData(payload)
                    } else if (topic.includes('Loca')) {
                        handleLocationData(payload)
                    } else if (topic.includes('Ack')) {
                        handleAckData(payload)
                    } else if (topic.includes('Message')) {
                        handleMessageData(payload)
                    } else if (topic.includes('TagConf')) {
                        handleHealthData(payload) // TagConf also contains device info like battery
                    }
                } catch (error) {
                    console.error('❌ Error processing recent message:', error)
                }
            })
        }

        // 初始加載歷史消息
        processRecentMessages()

        // 2. 訂閱新消息
        const unsubscribe = mqttBus.subscribe('UWB/#', (message: MQTTMessage) => {
            const { topic, payload } = message

            try {
                // 根據Topic類型處理數據
                if (topic.includes('Health')) {
                    handleHealthData(payload)
                    addDebugMessage(topic, JSON.stringify(payload), 'health', payload, payload)
                } else if (topic.includes('Loca')) {
                    handleLocationData(payload)
                    addDebugMessage(topic, JSON.stringify(payload), 'location', payload, payload)
                } else if (topic.includes('Ack')) {
                    handleAckData(payload)
                    addDebugMessage(topic, JSON.stringify(payload), 'ack', payload, payload)
                } else if (topic.includes('Message')) {
                    handleMessageData(payload)
                    addDebugMessage(topic, JSON.stringify(payload), 'message', payload, payload)
                } else if (topic.includes('TagConf')) {
                    handleHealthData(payload)
                    addDebugMessage(topic, JSON.stringify(payload), 'other', payload, payload)
                } else {
                    addDebugMessage(topic, JSON.stringify(payload), 'other', payload, payload)
                }

                setConnectionStatus(prev => ({
                    ...prev,
                    lastMessageTime: new Date()
                }))
            } catch (error) {
                console.error('❌ 處理MQTT消息失敗:', error)
            }
        })

        // 監聽連接狀態
        const statusUnsubscribe = mqttBus.onStatusChange((status) => {
            setIsMonitoring(status === 'connected')
            setConnectionStatus(prev => ({
                ...prev,
                isConnected: status === 'connected',
                error: status === 'error' ? 'Connection Error' : null
            }))
        })

        // 初始化狀態
        const currentStatus = mqttBus.getStatus()
        setIsMonitoring(currentStatus === 'connected')
        setConnectionStatus(prev => ({
            ...prev,
            isConnected: currentStatus === 'connected'
        }))

        return () => {
            unsubscribe()
            statusUnsubscribe()
        }
        // 只在組件掛載時訂閱一次，避免重複訂閱
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])

    // 兼容舊接口的方法
    const startMonitoring = useCallback((gatewayId: string) => {
        console.log(`🚀 全域監控已啟用，無需手動啟動 Gateway: ${gatewayId}`)
        // 這裡可以做一些過濾邏輯，但目前我們全域監聽
    }, [])

    const stopMonitoring = useCallback(() => {
        console.log('🛑 全域監控持續運行中')
    }, [])

    const clearDebugMessages = useCallback(() => {
        setDebugMessages([])
        setStats({
            totalMessages: 0,
            healthMessages: 0,
            locationMessages: 0,
            ackMessages: 0
        })
    }, [])

    const exportDebugData = useCallback(() => {
        const data = {
            timestamp: new Date().toISOString(),
            messages: debugMessages,
            stats: stats
        }

        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `mqtt_debug_${Date.now()}.json`
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        URL.revokeObjectURL(url)
    }, [debugMessages, stats])

    const value: DeviceMonitoringContextType = {
        realTimeDevices,
        isMonitoring,
        connectionStatus,
        debugMessages,
        maxMessages,
        topicFilter,
        deviceFilter,
        showDebugPanel,
        stats,
        startMonitoring,
        stopMonitoring,
        clearDebugMessages,
        setMaxMessages,
        setTopicFilter,
        setDeviceFilter,
        setShowDebugPanel,
        exportDebugData
    }

    return (
        <DeviceMonitoringContext.Provider value={value}>
            {children}
        </DeviceMonitoringContext.Provider>
    )
}

export const useDeviceMonitoring = () => {
    const context = useContext(DeviceMonitoringContext)
    if (!context) {
        throw new Error('useDeviceMonitoring must be used within DeviceMonitoringProvider')
    }
    return context
}

export default DeviceMonitoringContext