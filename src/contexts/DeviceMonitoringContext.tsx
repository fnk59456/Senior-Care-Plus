import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react'
import mqtt from 'mqtt'
import { Device, DeviceStatus, DeviceUIDGenerator } from '@/types/device-types'
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
    healthData?: {
        hr?: number
        spO2?: number
        temperature?: number
        steps?: number
    }
    locationData?: {
        homeName: string
        floor: number
        room: string
        roomNumber: string
    }
}

// MQTT連接狀態
interface MQTTConnectionStatus {
    isConnected: boolean
    connectedGateways: string[]
    lastMessageTime: Date | null
    error: string | null
}

// 調試消息類型
export interface MQTTDebugMessage {
    id: string
    timestamp: Date
    topic: string
    gatewayId: string
    rawData: any
    parsedData: any
    deviceId?: string
    deviceName?: string
}

// 監控管理Context類型
interface DeviceMonitoringContextType {
    // 實時數據
    realTimeDevices: Map<string, RealTimeDeviceData>

    // 監控狀態
    isMonitoring: boolean
    connectionStatus: MQTTConnectionStatus

    // 調試數據
    debugMessages: MQTTDebugMessage[]

    // 監控管理
    startMonitoring: (gatewayIds: string[]) => Promise<void>
    stopMonitoring: () => void
    updateDeviceData: (deviceId: string, data: Partial<RealTimeDeviceData>) => void

    // 設備狀態查詢
    getDeviceStatus: (deviceId: string) => RealTimeDeviceData | undefined
    getDevicesByGateway: (gatewayId: string) => RealTimeDeviceData[]
    getOnlineDevices: () => RealTimeDeviceData[]
    getOfflineDevices: () => RealTimeDeviceData[]

    // 統計數據
    getMonitoringStats: () => {
        totalDevices: number
        onlineDevices: number
        offlineDevices: number
        errorDevices: number
        averageBatteryLevel: number
    }
}

const DeviceMonitoringContext = createContext<DeviceMonitoringContextType | undefined>(undefined)

// MQTT配置
const CLOUD_MQTT_URL = `${import.meta.env.VITE_MQTT_PROTOCOL}://${import.meta.env.VITE_MQTT_BROKER}:${import.meta.env.VITE_MQTT_PORT}/mqtt`
const CLOUD_MQTT_OPTIONS = {
    username: import.meta.env.VITE_MQTT_USERNAME,
    password: import.meta.env.VITE_MQTT_PASSWORD,
    keepalive: 60,
    reconnectPeriod: 5000,
    connectTimeout: 30 * 1000,
}

export function DeviceMonitoringProvider({ children }: { children: React.ReactNode }) {
    const { devices, getResidentForDevice } = useDeviceManagement()
    const { gateways, refreshData } = useUWBLocation()

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

    // MQTT客戶端管理
    const mqttClients = useRef<Map<string, mqtt.MqttClient>>(new Map())
    const reconnectTimeouts = useRef<Map<string, NodeJS.Timeout>>(new Map())

    // 初始化時刷新Gateway數據
    useEffect(() => {
        console.log('🔄 DeviceMonitoringContext 初始化，刷新Gateway數據...')
        refreshData()
    }, [refreshData])

    // 生成設備監控Topics - 使用Gateway的實際pub_topic配置
    const generateDeviceTopics = useCallback((gatewayId: string) => {
        // 參考UWBLocationPage的查找邏輯，先檢查雲端發現的Gateway
        let selectedGatewayData = null
        let systemGateway = null

        // 先檢查雲端發現的閘道器（需要從UWBLocationContext獲取cloudGatewayData）
        // 這裡我們先檢查系統Gateway
        systemGateway = gateways.find(gw => {
            console.log(`🔍 檢查Gateway ${gw.name}:`, {
                gwId: gw.id,
                macAddress: gw.macAddress,
                targetGatewayId: gatewayId,
                hasCloudData: !!gw.cloudData
            })

            // 直接ID匹配
            if (gw.id === gatewayId) {
                console.log(`  ✅ 直接ID匹配`)
                return true
            }

            // MAC地址轉換匹配
            if (gw.macAddress.startsWith('GW:')) {
                const gatewayIdFromMac = parseInt(gw.macAddress.replace('GW:', ''), 16).toString()
                if (gatewayIdFromMac === gatewayId) {
                    console.log(`  ✅ MAC地址轉換匹配: ${gw.macAddress} -> ${gatewayIdFromMac}`)
                    return true
                }
            }

            // 檢查cloudData中的gateway_id
            if (gw.cloudData && gw.cloudData.gateway_id) {
                if (gw.cloudData.gateway_id.toString() === gatewayId) {
                    console.log(`  ✅ CloudData gateway_id匹配: ${gw.cloudData.gateway_id}`)
                    return true
                }
            }

            console.log(`  ❌ 未匹配`)
            return false
        })

        console.log(`🔍 查找Gateway ${gatewayId}:`, {
            systemGateway,
            allGateways: gateways.map(g => ({ id: g.id, name: g.name, macAddress: g.macAddress }))
        })

        if (systemGateway && systemGateway.cloudData && systemGateway.cloudData.pub_topic) {
            console.log(`✅ 使用Gateway ${gatewayId} 的雲端主題配置:`, systemGateway.cloudData.pub_topic)
            return [
                systemGateway.cloudData.pub_topic.health,
                systemGateway.cloudData.pub_topic.location,
                systemGateway.cloudData.pub_topic.message,
                systemGateway.cloudData.pub_topic.ack_from_node,
            ].filter(Boolean) // 過濾掉空字符串
        }

        // 如果沒有雲端數據，構建主題名稱（參考DiaperMonitoringPage的邏輯）
        if (systemGateway) {
            // DiaperMonitoringPage中使用的是從MAC地址提取後4位字符的邏輯
            // 從 "GW:F9E516B8" 中提取 "16B8"
            const macSuffix = systemGateway.macAddress.replace('GW:', '').slice(-4)
            console.log(`🔧 構建Gateway ${gatewayId} 的主題格式，MAC後綴: ${macSuffix}`)
            console.log(`🔧 MAC地址: ${systemGateway.macAddress} -> 後綴: ${macSuffix}`)
            return [
                `UWB/GW${macSuffix}_Health`,
                `UWB/GW${macSuffix}_Loca`,
                `UWB/GW${macSuffix}_Message`,
                `UWB/GW${macSuffix}_Ack`
            ]
        }

        // 如果連Gateway都找不到，使用默認格式
        console.log(`⚠️ Gateway ${gatewayId} 未找到，使用默認主題格式`)
        return [
            `UWB/UWB_Gateway/${gatewayId}/health`,
            `UWB/UWB_Gateway/${gatewayId}/location`,
            `UWB/UWB_Gateway/${gatewayId}/ack_from_node`,
            `UWB/UWB_Gateway/${gatewayId}/message`
        ]
    }, [gateways])

    // 處理MQTT訊息
    const handleMQTTMessage = useCallback((gatewayId: string, topic: string, payload: Uint8Array) => {
        try {
            const rawMessage = new TextDecoder().decode(payload)
            const data = JSON.parse(rawMessage)

            console.log(`📨 收到MQTT訊息 [${gatewayId}]:`, { topic, data })

            // 更新連接狀態
            setConnectionStatus(prev => ({
                ...prev,
                lastMessageTime: new Date(),
                error: null
            }))

            // 創建調試消息
            const debugMessage: MQTTDebugMessage = {
                id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                timestamp: new Date(),
                topic,
                gatewayId,
                rawData: data,
                parsedData: {
                    type: topic.includes('/health') ? 'health' :
                        topic.includes('/location') ? 'location' :
                            topic.includes('/ack') ? 'ack' : 'message',
                    gateway: gatewayId,
                    timestamp: new Date().toISOString(),
                    ...data
                },
                deviceId: data.id || data.MAC || data.device_id,
                deviceName: data.name || data.device_name
            }

            // 添加到調試消息列表（保留最新的50條）
            setDebugMessages(prev => {
                const newMessages = [debugMessage, ...prev].slice(0, 50)
                return newMessages
            })

            // 根據Topic類型處理數據
            if (topic.includes('/health')) {
                handleHealthData(gatewayId, data)
            } else if (topic.includes('/location')) {
                handleLocationData(gatewayId, data)
            } else if (topic.includes('/ack_from_node')) {
                handleAckData(gatewayId, data)
            } else if (topic.includes('/message')) {
                handleMessageData(gatewayId, data)
            }
        } catch (error) {
            console.error('❌ MQTT訊息解析錯誤:', error)
            setConnectionStatus(prev => ({
                ...prev,
                error: `訊息解析錯誤: ${error instanceof Error ? error.message : '未知錯誤'}`
            }))
        }
    }, [])

    // 處理健康數據
    const handleHealthData = useCallback((gatewayId: string, data: any) => {
        console.log(`🔋 處理健康數據 [${gatewayId}]:`, data)
        console.log(`🔍 當前設備列表:`, devices.map(d => ({
            id: d.id,
            name: d.name,
            hardwareId: d.hardwareId,
            deviceUid: d.deviceUid,
            gatewayId: d.gatewayId,
            deviceType: d.deviceType
        })))
        console.log(`🔍 MQTT數據:`, {
            MAC: data.MAC,
            serial_no: data.serial_no,
            name: data.name,
            id: data.id,
            'battery level': data['battery level']
        })

        // 改進設備查找邏輯 - 支持多種ID匹配方式
        const device = devices.find(d => {
            console.log(`🔍 檢查設備 ${d.name}:`)
            console.log(`  - Gateway ID: ${d.gatewayId} vs ${gatewayId}`)
            console.log(`  - MAC地址: ${d.hardwareId} vs ${data.MAC}`)
            console.log(`  - 設備UID: ${d.deviceUid}`)
            console.log(`  - 數據ID: ${data.id}`)
            console.log(`  - 序列號: ${data.serial_no}`)

            // 1. 通過Gateway ID匹配
            if (d.gatewayId === gatewayId) {
                console.log(`  ✅ 通過Gateway ID匹配`)
                return true
            }

            // 2. 通過MAC地址匹配
            if (data.MAC && d.hardwareId === data.MAC) {
                console.log(`  ✅ 通過MAC地址匹配`)
                return true
            }

            // 3. 通過設備UID中的ID匹配
            if (data.id) {
                const { identifier } = DeviceUIDGenerator.parse(d.deviceUid)
                if (identifier === String(data.id)) {
                    console.log(`  ✅ 通過設備UID ID匹配`)
                    return true
                }
            }

            // 4. 通過序列號匹配
            if (data.serial_no && d.hardwareId === String(data.serial_no)) {
                console.log(`  ✅ 通過序列號匹配`)
                return true
            }

            // 5. 通過設備名稱匹配（300B設備的特殊情況）
            if (data.name && d.name.includes(data.name)) {
                console.log(`  ✅ 通過設備名稱匹配`)
                return true
            }

            console.log(`  ❌ 未匹配`)
            return false
        })

        if (!device) {
            console.log(`⚠️ 未找到對應設備，數據:`, data)
            console.log(`🔍 嘗試的匹配條件:`)
            console.log(`  - Gateway ID: ${gatewayId}`)
            console.log(`  - MAC: ${data.MAC}`)
            console.log(`  - ID: ${data.id}`)
            console.log(`  - Serial: ${data.serial_no}`)
            console.log(`  - Name: ${data.name}`)
            return
        }

        console.log(`✅ 找到設備: ${device.name} (${device.deviceUid})`)

        const realTimeData: RealTimeDeviceData = {
            deviceId: device.id,
            deviceUid: device.deviceUid,
            batteryLevel: data['battery level'] || data.battery_level || data.battery || device.batteryLevel || 0,
            status: determineDeviceStatus(data, device),
            lastSeen: new Date(),
            signalStrength: data.signal_strength || data.signalStrength,
            healthData: {
                hr: data.hr,
                spO2: data.spO2 || data.SpO2,
                temperature: data.temperature || data['skin temp'] || data.skin_temp,
                steps: data.steps
            }
        }

        console.log(`🔋 更新設備電量: ${device.name} = ${realTimeData.batteryLevel}%`)
        console.log(`🔋 電量數據來源:`, {
            'battery level': data['battery level'],
            battery_level: data.battery_level,
            battery: data.battery,
            deviceBattery: device.batteryLevel,
            final: realTimeData.batteryLevel
        })
        setRealTimeDevices(prev => new Map(prev.set(device.id, realTimeData)))
    }, [devices])

    // 處理位置數據
    const handleLocationData = useCallback((gatewayId: string, data: any) => {
        if (data.content === "location" && data.id && data.position) {
            const deviceId = String(data.id)

            // 查找對應的設備
            const device = devices.find(d => {
                if (d.deviceUid.startsWith('TAG:')) {
                    const tagId = d.deviceUid.split(':')[1]
                    return tagId === deviceId || d.hardwareId === deviceId
                }
                return d.deviceUid === deviceId || d.hardwareId === deviceId
            })

            if (!device) return

            const resident = getResidentForDevice(device.id)

            const realTimeData: RealTimeDeviceData = {
                deviceId: device.id,
                deviceUid: device.deviceUid,
                batteryLevel: device.batteryLevel || 0,
                status: DeviceStatus.ACTIVE,
                lastSeen: new Date(),
                position: {
                    x: data.position.x,
                    y: data.position.y,
                    z: data.position.z,
                    quality: data.position.quality || 0
                },
                locationData: resident ? {
                    homeName: '群仁仁群',
                    floor: parseInt(resident.room?.split('/')[0]) || 0,
                    room: resident.room || '',
                    roomNumber: resident.room?.split('/')[1] || ''
                } : undefined
            }

            setRealTimeDevices(prev => new Map(prev.set(device.id, realTimeData)))
        }
    }, [devices, getResidentForDevice])

    // 處理ACK數據
    const handleAckData = useCallback((gatewayId: string, data: any) => {
        console.log(`📋 收到ACK確認 [${gatewayId}]:`, data)
        // 可以根據需要處理ACK數據
    }, [])

    // 處理訊息數據
    const handleMessageData = useCallback((gatewayId: string, data: any) => {
        console.log(`💬 收到設備訊息 [${gatewayId}]:`, data)
        // 可以根據需要處理訊息數據
    }, [])

    // 判斷設備狀態
    const determineDeviceStatus = (data: any, device: Device): DeviceStatus => {
        if (data.battery && data.battery < 10) return DeviceStatus.ERROR
        if (data.signal_strength && data.signal_strength < -80) return DeviceStatus.OFFLINE
        if (data.last_seen && Date.now() - new Date(data.last_seen).getTime() > 300000) {
            return DeviceStatus.OFFLINE
        }
        return DeviceStatus.ACTIVE
    }

    // 連接到Gateway
    const connectToGateway = useCallback(async (gatewayId: string): Promise<void> => {
        return new Promise((resolve, reject) => {
            try {
                const clientId = `monitor_${gatewayId}_${Date.now()}`
                const client = mqtt.connect(CLOUD_MQTT_URL, {
                    ...CLOUD_MQTT_OPTIONS,
                    clientId
                })

                client.on('connect', () => {
                    console.log(`✅ 已連接到Gateway ${gatewayId}`)

                    // 訂閱相關Topics
                    const topics = generateDeviceTopics(gatewayId)
                    topics.forEach(topic => {
                        client.subscribe(topic, (err) => {
                            if (err) {
                                console.error(`❌ 訂閱失敗 ${topic}:`, err)
                            } else {
                                console.log(`📡 已訂閱 ${topic}`)
                            }
                        })
                    })

                    mqttClients.current.set(gatewayId, client)

                    setConnectionStatus(prev => ({
                        ...prev,
                        isConnected: true,
                        connectedGateways: [...prev.connectedGateways, gatewayId],
                        error: null
                    }))

                    resolve()
                })

                client.on('message', (topic: string, payload: Uint8Array) => {
                    handleMQTTMessage(gatewayId, topic, payload)
                })

                client.on('error', (error) => {
                    console.error(`❌ MQTT連接錯誤 [${gatewayId}]:`, error)
                    setConnectionStatus(prev => ({
                        ...prev,
                        error: `連接錯誤: ${error.message}`
                    }))
                    reject(error)
                })

                client.on('close', () => {
                    console.log(`🔌 連接已關閉 [${gatewayId}]`)
                    setConnectionStatus(prev => ({
                        ...prev,
                        connectedGateways: prev.connectedGateways.filter(id => id !== gatewayId),
                        isConnected: prev.connectedGateways.length > 1
                    }))
                })

                client.on('reconnect', () => {
                    console.log(`🔄 重新連接中 [${gatewayId}]`)
                })

            } catch (error) {
                console.error(`❌ 創建MQTT連接失敗 [${gatewayId}]:`, error)
                reject(error)
            }
        })
    }, [handleMQTTMessage])

    // 啟動監控
    const startMonitoring = useCallback(async (gatewayIds: string[]) => {
        if (isMonitoring) {
            console.log('⚠️ 監控已啟動，先停止現有監控')
            stopMonitoring()
        }

        setIsMonitoring(true)
        setConnectionStatus(prev => ({
            ...prev,
            connectedGateways: [],
            error: null
        }))

        try {
            // 並行連接到所有Gateway
            const connectionPromises = gatewayIds.map(gatewayId => connectToGateway(gatewayId))
            await Promise.all(connectionPromises)

            console.log(`🚀 監控已啟動，連接了 ${gatewayIds.length} 個Gateway`)
        } catch (error) {
            console.error('❌ 啟動監控失敗:', error)
            setConnectionStatus(prev => ({
                ...prev,
                error: `啟動監控失敗: ${error instanceof Error ? error.message : '未知錯誤'}`
            }))
        }
    }, [isMonitoring, connectToGateway])

    // 停止監控
    const stopMonitoring = useCallback(() => {
        console.log('🛑 停止監控')

        // 關閉所有MQTT連接
        mqttClients.current.forEach((client, gatewayId) => {
            client.end(true)
            console.log(`🔌 已斷開Gateway ${gatewayId}`)
        })

        // 清除重連定時器
        reconnectTimeouts.current.forEach(timeout => clearTimeout(timeout))

        // 重置狀態
        mqttClients.current.clear()
        reconnectTimeouts.current.clear()
        setIsMonitoring(false)
        setConnectionStatus({
            isConnected: false,
            connectedGateways: [],
            lastMessageTime: null,
            error: null
        })
    }, [])

    // 更新設備數據
    const updateDeviceData = useCallback((deviceId: string, data: Partial<RealTimeDeviceData>) => {
        setRealTimeDevices(prev => {
            const current = prev.get(deviceId)
            if (current) {
                return new Map(prev.set(deviceId, { ...current, ...data }))
            }
            return prev
        })
    }, [])

    // 查詢方法
    const getDeviceStatus = useCallback((deviceId: string) => {
        return realTimeDevices.get(deviceId)
    }, [realTimeDevices])

    const getDevicesByGateway = useCallback((gatewayId: string) => {
        return Array.from(realTimeDevices.values()).filter(device => {
            const originalDevice = devices.find(d => d.id === device.deviceId)
            return originalDevice?.gatewayId === gatewayId
        })
    }, [realTimeDevices, devices])

    const getOnlineDevices = useCallback(() => {
        return Array.from(realTimeDevices.values()).filter(device => device.status === DeviceStatus.ACTIVE)
    }, [realTimeDevices])

    const getOfflineDevices = useCallback(() => {
        return Array.from(realTimeDevices.values()).filter(device => device.status === DeviceStatus.OFFLINE)
    }, [realTimeDevices])

    // 統計數據
    const getMonitoringStats = useCallback(() => {
        const devices = Array.from(realTimeDevices.values())
        const totalDevices = devices.length
        const onlineDevices = devices.filter(d => d.status === DeviceStatus.ACTIVE).length
        const offlineDevices = devices.filter(d => d.status === DeviceStatus.OFFLINE).length
        const errorDevices = devices.filter(d => d.status === DeviceStatus.ERROR).length
        const averageBatteryLevel = devices.length > 0
            ? devices.reduce((sum, d) => sum + d.batteryLevel, 0) / devices.length
            : 0

        return {
            totalDevices,
            onlineDevices,
            offlineDevices,
            errorDevices,
            averageBatteryLevel: Math.round(averageBatteryLevel)
        }
    }, [realTimeDevices])

    // 清理函數
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
        startMonitoring,
        stopMonitoring,
        updateDeviceData,
        getDeviceStatus,
        getDevicesByGateway,
        getOnlineDevices,
        getOfflineDevices,
        getMonitoringStats
    }

    return (
        <DeviceMonitoringContext.Provider value={value}>
            {children}
        </DeviceMonitoringContext.Provider>
    )
}

export function useDeviceMonitoring() {
    const context = useContext(DeviceMonitoringContext)
    if (context === undefined) {
        throw new Error('useDeviceMonitoring must be used within a DeviceMonitoringProvider')
    }
    return context
}
