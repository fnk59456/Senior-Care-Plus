// MQTT與後端數據同步服務
import mqtt from 'mqtt'
import { api } from './api'

// MQTT配置
const MQTT_URL = `${import.meta.env.VITE_MQTT_PROTOCOL}://${import.meta.env.VITE_MQTT_BROKER}:${import.meta.env.VITE_MQTT_PORT}/mqtt`
const MQTT_OPTIONS = {
    username: import.meta.env.VITE_MQTT_USERNAME,
    password: import.meta.env.VITE_MQTT_PASSWORD,
    reconnectPeriod: 5000,
    connectTimeout: 15000,
    keepalive: 60,
    clean: true,
}

// 實時位置數據類型
interface LocationData {
    tagId: string
    position: {
        x: number
        y: number
        z: number
    }
    floorId: string
    timestamp: Date
    signalStrength?: number
    batteryLevel?: number
}

// 設備狀態更新類型
interface DeviceStatusUpdate {
    deviceId: string
    deviceType: 'gateway' | 'anchor' | 'tag'
    status: 'online' | 'offline' | 'error'
    lastSeen: Date
    batteryLevel?: number
    signalStrength?: number
}

class MQTTBackendSync {
    private client: mqtt.MqttClient | null = null
    private isConnected = false
    private reconnectAttempts = 0
    private maxReconnectAttempts = 5

    // 事件回調
    private onLocationUpdate?: (data: LocationData) => void
    private onDeviceStatusUpdate?: (data: DeviceStatusUpdate) => void
    private onConnectionChange?: (connected: boolean) => void
    private onError?: (error: Error) => void

    constructor() {
        this.connect()
    }

    // 設置事件回調
    setCallbacks(callbacks: {
        onLocationUpdate?: (data: LocationData) => void
        onDeviceStatusUpdate?: (data: DeviceStatusUpdate) => void
        onConnectionChange?: (connected: boolean) => void
        onError?: (error: Error) => void
    }) {
        this.onLocationUpdate = callbacks.onLocationUpdate
        this.onDeviceStatusUpdate = callbacks.onDeviceStatusUpdate
        this.onConnectionChange = callbacks.onConnectionChange
        this.onError = callbacks.onError
    }

    // 連接MQTT
    private connect() {
        if (this.client && this.isConnected) {
            console.log('⚠️ MQTT已連接，跳過重複連接')
            return
        }

        console.log('🔄 連接MQTT...')
        this.client = mqtt.connect(MQTT_URL, {
            ...MQTT_OPTIONS,
            clientId: `uwb-backend-sync-${Math.random().toString(16).slice(2, 8)}`
        })

        this.client.on('connect', () => {
            console.log('✅ MQTT已連接')
            this.isConnected = true
            this.reconnectAttempts = 0
            this.onConnectionChange?.(true)
            this.subscribeToTopics()
        })

        this.client.on('reconnect', () => {
            console.log('🔄 MQTT重新連接中...')
            this.isConnected = false
            this.reconnectAttempts++
            this.onConnectionChange?.(false)

            if (this.reconnectAttempts >= this.maxReconnectAttempts) {
                console.error('❌ MQTT重連次數過多，停止重連')
                this.onError?.(new Error('MQTT重連失敗'))
            }
        })

        this.client.on('close', () => {
            console.log('🔌 MQTT連接已關閉')
            this.isConnected = false
            this.onConnectionChange?.(false)
        })

        this.client.on('error', (error) => {
            console.error('❌ MQTT連接錯誤:', error)
            this.isConnected = false
            this.onError?.(error)
        })

        this.client.on('offline', () => {
            console.log('📴 MQTT離線')
            this.isConnected = false
            this.onConnectionChange?.(false)
        })
    }

    // 訂閱主題
    private subscribeToTopics() {
        if (!this.client) return

        const topics = [
            'UWB/location/+',      // 位置數據
            'UWB/device/+/status', // 設備狀態
            'UWB/gateway/+/health', // 網關健康狀態
        ]

        topics.forEach(topic => {
            this.client!.subscribe(topic, (err) => {
                if (err) {
                    console.error(`❌ 訂閱主題失敗 ${topic}:`, err)
                } else {
                    console.log(`✅ 已訂閱主題: ${topic}`)
                }
            })
        })

        // 設置消息處理
        this.client.on('message', this.handleMessage.bind(this))
    }

    // 處理MQTT消息
    private async handleMessage(topic: string, message: Buffer) {
        try {
            const data = JSON.parse(message.toString())
            console.log(`📨 收到MQTT消息 [${topic}]:`, data)

            // 根據主題類型處理不同的消息
            if (topic.startsWith('UWB/location/')) {
                await this.handleLocationData(data)
            } else if (topic.startsWith('UWB/device/') && topic.endsWith('/status')) {
                await this.handleDeviceStatus(data)
            } else if (topic.startsWith('UWB/gateway/') && topic.endsWith('/health')) {
                await this.handleGatewayHealth(data)
            }
        } catch (error) {
            console.error('❌ 處理MQTT消息失敗:', error)
            this.onError?.(error as Error)
        }
    }

    // 處理位置數據
    private async handleLocationData(data: any) {
        try {
            const locationData: LocationData = {
                tagId: data.tagId || data.tag_id,
                position: {
                    x: data.position?.x || data.x || 0,
                    y: data.position?.y || data.y || 0,
                    z: data.position?.z || data.z || 0,
                },
                floorId: data.floorId || data.floor_id,
                timestamp: new Date(data.timestamp || Date.now()),
                signalStrength: data.signalStrength || data.signal_strength,
                batteryLevel: data.batteryLevel || data.battery_level,
            }

            // 通知前端更新
            this.onLocationUpdate?.(locationData)

            // 可選：將位置數據保存到後端
            // await this.saveLocationToBackend(locationData)
        } catch (error) {
            console.error('❌ 處理位置數據失敗:', error)
        }
    }

    // 處理設備狀態更新
    private async handleDeviceStatus(data: any) {
        try {
            const statusUpdate: DeviceStatusUpdate = {
                deviceId: data.deviceId || data.device_id,
                deviceType: data.deviceType || data.device_type,
                status: data.status,
                lastSeen: new Date(data.lastSeen || data.last_seen || Date.now()),
                batteryLevel: data.batteryLevel || data.battery_level,
                signalStrength: data.signalStrength || data.signal_strength,
            }

            // 通知前端更新
            this.onDeviceStatusUpdate?.(statusUpdate)

            // 更新後端設備狀態
            await this.updateDeviceStatusInBackend(statusUpdate)
        } catch (error) {
            console.error('❌ 處理設備狀態失敗:', error)
        }
    }

    // 處理網關健康狀態
    private async handleGatewayHealth(data: any) {
        try {
            console.log('🏥 網關健康狀態:', data)
            // 這裡可以處理網關健康檢查數據
            // 例如：更新網關狀態、記錄健康日誌等
        } catch (error) {
            console.error('❌ 處理網關健康狀態失敗:', error)
        }
    }

    // 更新後端設備狀態
    private async updateDeviceStatusInBackend(statusUpdate: DeviceStatusUpdate) {
        try {
            // 根據設備類型調用不同的API
            switch (statusUpdate.deviceType) {
                case 'gateway':
                    await api.gateway.update(statusUpdate.deviceId, {
                        status: statusUpdate.status,
                        lastSeen: statusUpdate.lastSeen,
                    })
                    break
                case 'anchor':
                    await api.anchor.update(statusUpdate.deviceId, {
                        status: statusUpdate.status,
                        lastSeen: statusUpdate.lastSeen,
                        batteryLevel: statusUpdate.batteryLevel,
                        signalStrength: statusUpdate.signalStrength,
                    })
                    break
                case 'tag':
                    await api.tag.update(statusUpdate.deviceId, {
                        status: statusUpdate.status,
                        lastSeen: statusUpdate.lastSeen,
                        batteryLevel: statusUpdate.batteryLevel,
                    })
                    break
            }
        } catch (error) {
            console.error('❌ 更新後端設備狀態失敗:', error)
        }
    }

    // 發送設備配置到MQTT
    async sendDeviceConfig(deviceType: 'gateway' | 'anchor' | 'tag', deviceId: string, config: any) {
        if (!this.client || !this.isConnected) {
            throw new Error('MQTT未連接')
        }

        const topic = `UWB/${deviceType}/config/${deviceId}`
        const message = JSON.stringify(config)

        return new Promise<void>((resolve, reject) => {
            this.client!.publish(topic, message, { qos: 1 }, (err) => {
                if (err) {
                    console.error(`❌ 發送設備配置失敗 ${topic}:`, err)
                    reject(err)
                } else {
                    console.log(`✅ 設備配置已發送 ${topic}`)
                    resolve()
                }
            })
        })
    }

    // 斷開連接
    disconnect() {
        if (this.client) {
            this.client.end(true)
            this.client = null
            this.isConnected = false
            console.log('🔌 MQTT已斷開連接')
        }
    }

    // 獲取連接狀態
    getConnectionStatus() {
        return {
            connected: this.isConnected,
            reconnectAttempts: this.reconnectAttempts,
        }
    }
}

// 導出單例實例
export const mqttBackendSync = new MQTTBackendSync()
export default mqttBackendSync
