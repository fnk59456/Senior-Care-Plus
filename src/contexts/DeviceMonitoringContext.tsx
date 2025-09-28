import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react'
import mqtt from 'mqtt'
import { DeviceStatus } from '@/types/device-types'
import { useDeviceManagement } from './DeviceManagementContext'
import { useUWBLocation } from './UWBLocationContext'

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
    const { gateways } = useUWBLocation()

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

    // MQTT客戶端管理
    const mqttClientRef = useRef<mqtt.MqttClient | null>(null)
    const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null)

    // 生成設備監控Topics - 參考DiaperMonitoringPage的簡單邏輯
    const generateDeviceTopics = useCallback((gatewayId: string) => {
        console.log(`🔍 開始查找Gateway ${gatewayId}`)

        if (!gatewayId) {
            console.log('❌ 沒有選擇Gateway')
            return []
        }

        // 查找Gateway
        const gateway = gateways.find(gw => gw.id === gatewayId)
        console.log(`🔍 找到Gateway:`, gateway)

        if (!gateway) {
            console.log('❌ 找不到Gateway')
            return []
        }

        // 優先使用雲端數據的pub_topic配置
        if (gateway.cloudData?.pub_topic) {
            console.log('✅ 使用雲端Topic配置:', gateway.cloudData.pub_topic)
            return [
                gateway.cloudData.pub_topic.health,
                gateway.cloudData.pub_topic.location,
                gateway.cloudData.pub_topic.message,
                gateway.cloudData.pub_topic.ack_from_node,
            ].filter(Boolean)
        }

        // 如果沒有雲端數據，構建主題名稱
        const gatewayName = gateway.name.replace(/\s+/g, '')
        const topics = [
            `UWB/GW${gatewayName}_Health`,
            `UWB/GW${gatewayName}_Loca`,
            `UWB/GW${gatewayName}_Message`,
            `UWB/GW${gatewayName}_Ack`
        ]

        console.log('🔧 構建本地Topic:', topics)
        return topics
    }, [gateways])

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
    const handleHealthData = useCallback((_gatewayId: string, data: any) => {
        console.log(`📊 處理健康數據:`, data)

        // 提取可能的設備識別信息
        const deviceId = data['device id'] || data.device_id || data.deviceId
        const deviceUid = data['device uid'] || data.device_uid || data.deviceUid
        const hardwareId = data['hardware id'] || data.hardware_id || data.hardwareId
        const macAddress = data['mac address'] || data.mac_address || data.macAddress || data.MAC
        const name = data.name || data.device_name

        console.log(`🔍 查找設備 - 提取的識別信息:`, {
            deviceId,
            deviceUid,
            hardwareId,
            macAddress,
            name
        })

        console.log(`🔍 可用設備列表:`, devices.map(d => ({
            id: d.id,
            name: d.name,
            deviceUid: d.deviceUid,
            hardwareId: d.hardwareId
        })))

        // 查找對應的設備
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
                byMacInUid: d.deviceUid && macAddress && d.deviceUid.split(':').slice(1).join(':') === macAddress
            }

            console.log(`🔍 檢查設備 ${d.name}:`, {
                ...matches,
                deviceUid: d.deviceUid,
                macAddress,
                uidMacPart: d.deviceUid ? d.deviceUid.split(':').slice(1).join(':') : null
            })

            return matches.byId || matches.byUid || matches.byHardwareId || matches.byMacAddress || matches.byName || matches.byUidMac || matches.byMacInUid
        })

        if (!device) {
            console.log('❌ 找不到對應的設備:', {
                extractedInfo: { deviceId, deviceUid, hardwareId, macAddress, name },
                availableDevices: devices.map(d => ({ id: d.id, name: d.name, deviceUid: d.deviceUid, hardwareId: d.hardwareId }))
            })
            return
        }

        // 提取電池電量並正規化
        const extractedBatteryLevel = data['battery level'] || data.battery_level || data.battery || device.batteryLevel || 0
        const normalizedBatteryLevel = Math.max(0, Math.min(100, Number(extractedBatteryLevel) || 0))

        const realTimeData: RealTimeDeviceData = {
            deviceId: device.id,
            deviceUid: device.deviceUid,
            batteryLevel: normalizedBatteryLevel,
            status: 'online' as DeviceStatus,
            lastSeen: new Date(),
            signalStrength: data['signal strength'] || data.signal_strength || data.signalStrength,
            position: data.position ? {
                x: data.position.x || 0,
                y: data.position.y || 0,
                z: data.position.z || 0,
                quality: data.position.quality || 0
            } : undefined
        }

        setRealTimeDevices(prev => new Map(prev.set(device.id, realTimeData)))
        console.log(`✅ 更新設備 ${device.name} 實時數據:`, realTimeData)
    }, [devices])

    // 處理位置數據
    const handleLocationData = useCallback((_gatewayId: string, data: any) => {
        console.log(`📍 處理位置數據:`, data)
        // 位置數據的調試消息已在主消息處理中添加
    }, [])

    // 處理ACK數據
    const handleAckData = useCallback((_gatewayId: string, data: any) => {
        console.log(`✅ 處理ACK數據:`, data)
        // ACK數據的調試消息已在主消息處理中添加
    }, [])

    // 處理消息數據
    const handleMessageData = useCallback((_gatewayId: string, data: any) => {
        console.log(`💬 處理消息數據:`, data)
        // 消息數據的調試消息已在主消息處理中添加
    }, [])

    // 開始監控
    const startMonitoring = useCallback((gatewayId: string) => {
        console.log(`🚀 開始監控Gateway: ${gatewayId}`)

        if (isMonitoring) {
            console.log('⚠️ 已在監控中，先停止當前監控')
            stopMonitoring()
        }

        const topics = generateDeviceTopics(gatewayId)
        if (topics.length === 0) {
            console.log('❌ 沒有可用的Topic')
            setConnectionStatus(prev => ({ ...prev, error: '沒有可用的Topic' }))
            return
        }

        // MQTT連接配置
        const MQTT_URL = `${import.meta.env.VITE_MQTT_PROTOCOL}://${import.meta.env.VITE_MQTT_BROKER}:${import.meta.env.VITE_MQTT_PORT}/mqtt`
        const MQTT_OPTIONS = {
            username: import.meta.env.VITE_MQTT_USERNAME,
            password: import.meta.env.VITE_MQTT_PASSWORD,
            clientId: `device_monitoring_${Date.now()}`,
            clean: true,
            reconnectPeriod: 5000,
            connectTimeout: 30 * 1000,
        }

        console.log('🔌 連接到MQTT Broker:', MQTT_URL)

        const client = mqtt.connect(MQTT_URL, MQTT_OPTIONS)

        client.on('connect', () => {
            console.log('✅ MQTT連接成功')
            setIsMonitoring(true)
            setConnectionStatus({
                isConnected: true,
                connectedGateways: [gatewayId],
                lastMessageTime: new Date(),
                error: null
            })

            // 訂閱所有Topic
            topics.forEach(topic => {
                client.subscribe(topic, (err) => {
                    if (err) {
                        console.error(`❌ 訂閱Topic失敗 ${topic}:`, err)
                    } else {
                        console.log(`✅ 已訂閱 ${topic}`)
                    }
                })
            })
        })

        client.on('message', (topic: string, payload: Buffer) => {
            try {
                const message = JSON.parse(payload.toString())
                console.log(`📨 收到消息 [${topic}]:`, message)

                // 根據Topic類型處理數據
                if (topic.includes('Health')) {
                    handleHealthData(gatewayId, message)
                    addDebugMessage(topic, JSON.stringify(message), 'health', payload.toString(), message)
                } else if (topic.includes('Loca')) {
                    handleLocationData(gatewayId, message)
                    addDebugMessage(topic, JSON.stringify(message), 'location', payload.toString(), message)
                } else if (topic.includes('Ack')) {
                    handleAckData(gatewayId, message)
                    addDebugMessage(topic, JSON.stringify(message), 'ack', payload.toString(), message)
                } else if (topic.includes('Message')) {
                    handleMessageData(gatewayId, message)
                    addDebugMessage(topic, JSON.stringify(message), 'message', payload.toString(), message)
                } else {
                    addDebugMessage(topic, JSON.stringify(message), 'other', payload.toString(), message)
                }

                setConnectionStatus(prev => ({
                    ...prev,
                    lastMessageTime: new Date()
                }))
            } catch (error) {
                console.error('❌ 解析MQTT消息失敗:', error)
                addDebugMessage(topic, payload.toString(), 'other', payload.toString(), null)
            }
        })

        client.on('error', (error) => {
            console.error('❌ MQTT連接錯誤:', error)
            setConnectionStatus(prev => ({
                ...prev,
                error: error.message
            }))
        })

        client.on('close', () => {
            console.log('🔌 MQTT連接關閉')
            setIsMonitoring(false)
            setConnectionStatus(prev => ({
                ...prev,
                isConnected: false,
                connectedGateways: []
            }))
        })

        mqttClientRef.current = client
    }, [isMonitoring, generateDeviceTopics, handleHealthData, handleLocationData, handleAckData, handleMessageData, addDebugMessage])

    // 停止監控
    const stopMonitoring = useCallback(() => {
        console.log('🛑 停止監控')

        if (mqttClientRef.current) {
            mqttClientRef.current.end()
            mqttClientRef.current = null
        }

        if (reconnectTimeoutRef.current) {
            clearTimeout(reconnectTimeoutRef.current)
            reconnectTimeoutRef.current = null
        }

        setIsMonitoring(false)
        setConnectionStatus({
            isConnected: false,
            connectedGateways: [],
            lastMessageTime: null,
            error: null
        })
    }, [])

    // 清除調試消息
    const clearDebugMessages = useCallback(() => {
        setDebugMessages([])
        setStats({
            totalMessages: 0,
            healthMessages: 0,
            locationMessages: 0,
            ackMessages: 0
        })
    }, [])

    // 導出調試數據
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

    // 組件卸載時清理
    useEffect(() => {
        return () => {
            stopMonitoring()
        }
    }, [stopMonitoring])

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