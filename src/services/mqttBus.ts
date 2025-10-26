/**
 * 統一 MQTT 總線服務
 * 整個應用的唯一 MQTT 連接管理器
 */

import mqtt, { MqttClient } from 'mqtt'
import { RingBuffer } from '@/utils/ringBuffer'
import { MessageRouter } from './messageRouter'
import { gatewayRegistry } from './gatewayRegistry'
import type {
    MQTTMessage,
    MessageHandler,
    MessageFilter,
    GatewayEvent
} from '@/types/mqtt-types'

type ConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'reconnecting' | 'error'

interface MQTTBusConfig {
    bufferSize?: number
    reconnectPeriod?: number
    connectTimeout?: number
    keepalive?: number
}

export class MQTTBus {
    private static instance: MQTTBus
    private client: MqttClient | null = null
    private status: ConnectionStatus = 'disconnected'

    // 訂閱管理
    private subscriptions = new Map<string, Set<MessageHandler>>()
    private activeTopics = new Set<string>()

    // 消息緩衝和路由
    private messageBuffer: RingBuffer<MQTTMessage>
    private router: MessageRouter

    // 連接配置
    private config: Required<MQTTBusConfig>

    // 狀態監聽器
    private statusListeners = new Set<(status: ConnectionStatus) => void>()

    // 統計信息
    private stats = {
        totalMessages: 0,
        messagesPerSecond: 0,
        lastMessageTime: null as Date | null,
        connectionAttempts: 0,
        successfulConnections: 0,
    }

    private constructor(config: MQTTBusConfig = {}) {
        this.config = {
            bufferSize: config.bufferSize || 500,
            reconnectPeriod: config.reconnectPeriod || 5000,
            connectTimeout: config.connectTimeout || 30000,
            keepalive: config.keepalive || 60,
        }

        this.messageBuffer = new RingBuffer<MQTTMessage>(this.config.bufferSize)
        this.router = new MessageRouter()

        // 監聽 Gateway 變化
        gatewayRegistry.on(this.handleGatewayEvent.bind(this))

        console.log('🚀 MQTT Bus 初始化完成')
    }

    /**
     * 獲取單例實例
     */
    static getInstance(config?: MQTTBusConfig): MQTTBus {
        if (!MQTTBus.instance) {
            MQTTBus.instance = new MQTTBus(config)
        }
        return MQTTBus.instance
    }

    /**
     * 連接到 MQTT Broker
     */
    connect(): void {
        if (this.client && this.status === 'connected') {
            console.log('✅ MQTT Bus 已連接')
            return
        }

        if (this.status === 'connecting') {
            console.log('⏳ MQTT Bus 正在連接中...')
            return
        }

        this.setStatus('connecting')
        this.stats.connectionAttempts++

        // 從環境變量獲取配置
        const MQTT_URL = `${import.meta.env.VITE_MQTT_PROTOCOL}://${import.meta.env.VITE_MQTT_BROKER}:${import.meta.env.VITE_MQTT_PORT}/mqtt`
        const MQTT_OPTIONS = {
            username: import.meta.env.VITE_MQTT_USERNAME,
            password: import.meta.env.VITE_MQTT_PASSWORD,
            clientId: `unified-mqtt-bus-${Date.now()}`,
            clean: true,
            reconnectPeriod: this.config.reconnectPeriod,
            connectTimeout: this.config.connectTimeout,
            keepalive: this.config.keepalive,
        }

        console.log(`🔌 連接到 MQTT Broker: ${MQTT_URL}`)

        this.client = mqtt.connect(MQTT_URL, MQTT_OPTIONS)

        // 設置事件監聽器
        this.client.on('connect', this.handleConnect.bind(this))
        this.client.on('message', this.handleMessage.bind(this))
        this.client.on('error', this.handleError.bind(this))
        this.client.on('close', this.handleClose.bind(this))
        this.client.on('reconnect', this.handleReconnect.bind(this))
        this.client.on('offline', this.handleOffline.bind(this))
    }

    /**
     * 處理連接成功
     */
    private handleConnect(): void {
        console.log('✅ MQTT Bus 已連接')
        this.setStatus('connected')
        this.stats.successfulConnections++

        // 訂閱所有已註冊的 Topics
        const topics = gatewayRegistry.getAllActiveTopics()
        console.log(`📋 準備訂閱 ${topics.length} 個 Topics`)

        topics.forEach(topic => this.subscribeToTopic(topic))
    }

    /**
     * 處理接收到的消息
     */
    private handleMessage(topic: string, payload: Buffer): void {
        try {
            const rawMessage = payload.toString()
            let parsedData: any

            try {
                parsedData = JSON.parse(rawMessage)
            } catch {
                // 如果不是 JSON，使用原始字符串
                parsedData = rawMessage
            }

            // 查找對應的 Gateway
            const gateway = gatewayRegistry.findGatewayByTopic(topic)

            // 創建標準化消息
            const message: MQTTMessage = {
                topic,
                payload: parsedData,
                rawPayload: rawMessage,
                timestamp: new Date(),
                gateway,
            }

            // 更新統計
            this.stats.totalMessages++
            this.stats.lastMessageTime = message.timestamp

            // 存入緩衝區
            this.messageBuffer.push(message)

            // 通過路由器分發
            this.router.route(message)

            // 觸發訂閱的回調
            const handlers = this.subscriptions.get(topic) || new Set()
            handlers.forEach(handler => {
                try {
                    handler(message)
                } catch (error) {
                    console.error(`❌ 消息處理器錯誤 [${topic}]:`, error)
                }
            })

        } catch (error) {
            console.error('❌ 消息處理失敗:', error)
        }
    }

    /**
     * 處理錯誤
     */
    private handleError(error: Error): void {
        console.error('❌ MQTT Bus 錯誤:', error)
        this.setStatus('error')
    }

    /**
     * 處理連接關閉
     */
    private handleClose(): void {
        console.log('🔌 MQTT Bus 連接已關閉')
        this.setStatus('disconnected')
        this.activeTopics.clear()
    }

    /**
     * 處理重連
     */
    private handleReconnect(): void {
        console.log('🔄 MQTT Bus 正在重連...')
        this.setStatus('reconnecting')
        this.stats.connectionAttempts++
    }

    /**
     * 處理離線
     */
    private handleOffline(): void {
        console.log('📴 MQTT Bus 離線')
        this.setStatus('disconnected')
    }

    /**
     * 處理 Gateway 事件
     */
    private handleGatewayEvent(event: GatewayEvent): void {
        switch (event.type) {
            case 'gateway_added':
                this.handleGatewayAdded(event)
                break
            case 'gateway_removed':
                this.handleGatewayRemoved(event)
                break
            case 'gateway_updated':
                this.handleGatewayUpdated(event)
                break
        }
    }

    /**
     * 處理 Gateway 添加
     */
    private handleGatewayAdded(event: Extract<GatewayEvent, { type: 'gateway_added' }>): void {
        if (this.status !== 'connected') return

        const topics = Object.values(event.topics).filter(t => t) as string[]

        topics.forEach(topic => {
            if (!this.activeTopics.has(topic)) {
                this.subscribeToTopic(topic)
            }
        })
    }

    /**
     * 處理 Gateway 移除
     */
    private handleGatewayRemoved(event: Extract<GatewayEvent, { type: 'gateway_removed' }>): void {
        if (this.status !== 'connected') return

        const topics = Object.values(event.topics).filter(t => t) as string[]

        topics.forEach(topic => {
            // 檢查是否還有其他 Gateway 使用此 Topic
            const stillUsed = gatewayRegistry.getAllActiveTopics().includes(topic)
            if (!stillUsed) {
                this.unsubscribeFromTopic(topic)
            }
        })
    }

    /**
     * 處理 Gateway 更新
     */
    private handleGatewayUpdated(event: Extract<GatewayEvent, { type: 'gateway_updated' }>): void {
        if (this.status !== 'connected') return

        const oldTopics = new Set(Object.values(event.oldTopics).filter(t => t))
        const newTopics = new Set(Object.values(event.newTopics).filter(t => t))

        // 訂閱新增的 Topics
        newTopics.forEach(topic => {
            if (!oldTopics.has(topic) && !this.activeTopics.has(topic)) {
                this.subscribeToTopic(topic)
            }
        })

        // 取消訂閱移除的 Topics（如果沒有其他 Gateway 使用）
        oldTopics.forEach(topic => {
            if (!newTopics.has(topic)) {
                const stillUsed = gatewayRegistry.getAllActiveTopics().includes(topic)
                if (!stillUsed) {
                    this.unsubscribeFromTopic(topic)
                }
            }
        })
    }

    /**
     * 訂閱 Topic
     */
    private subscribeToTopic(topic: string): void {
        if (!this.client || this.status !== 'connected') return

        this.client.subscribe(topic, { qos: 0 }, (err) => {
            if (err) {
                console.error(`❌ 訂閱失敗 ${topic}:`, err)
            } else {
                console.log(`✅ 已訂閱 ${topic}`)
                this.activeTopics.add(topic)
            }
        })
    }

    /**
     * 取消訂閱 Topic
     */
    private unsubscribeFromTopic(topic: string): void {
        if (!this.client) return

        this.client.unsubscribe(topic, (err) => {
            if (err) {
                console.error(`❌ 取消訂閱失敗 ${topic}:`, err)
            } else {
                console.log(`✅ 已取消訂閱 ${topic}`)
                this.activeTopics.delete(topic)
            }
        })
    }

    /**
     * 訂閱消息（給外部使用）
     * @param topicOrPattern - Topic 字符串或正則表達式
     * @param handler - 消息處理器
     * @returns 取消訂閱函數
     */
    subscribe(
        topicOrPattern: string | RegExp,
        handler: MessageHandler
    ): () => void {
        // 如果是正則表達式，添加到路由器
        if (topicOrPattern instanceof RegExp) {
            return this.router.addRoute(topicOrPattern, handler)
        }

        // 如果是具體 Topic
        if (!this.subscriptions.has(topicOrPattern)) {
            this.subscriptions.set(topicOrPattern, new Set())
        }
        this.subscriptions.get(topicOrPattern)!.add(handler)

        // 返回取消訂閱函數
        return () => {
            const handlers = this.subscriptions.get(topicOrPattern)
            if (handlers) {
                handlers.delete(handler)
                if (handlers.size === 0) {
                    this.subscriptions.delete(topicOrPattern)
                }
            }
        }
    }

    /**
     * 發布消息
     */
    publish(topic: string, message: any, qos: 0 | 1 | 2 = 0): Promise<void> {
        return new Promise((resolve, reject) => {
            if (!this.client || this.status !== 'connected') {
                reject(new Error('MQTT Bus 未連接'))
                return
            }

            const payload = typeof message === 'string' ? message : JSON.stringify(message)

            this.client.publish(topic, payload, { qos }, (err) => {
                if (err) {
                    console.error(`❌ 發布消息失敗 ${topic}:`, err)
                    reject(err)
                } else {
                    console.log(`✅ 已發布消息到 ${topic}`)
                    resolve()
                }
            })
        })
    }

    /**
     * 獲取歷史消息
     */
    getRecentMessages(filter?: MessageFilter): MQTTMessage[] {
        let messages = this.messageBuffer.getAll()

        if (!filter) return messages

        return messages.filter(msg => {
            if (filter.topic && msg.topic !== filter.topic) return false
            if (filter.gatewayId && msg.gateway?.id !== filter.gatewayId) return false
            if (filter.since && msg.timestamp < filter.since) return false
            if (filter.contentType && msg.payload?.content !== filter.contentType) return false
            return true
        })
    }

    /**
     * 獲取最新消息
     */
    getLatestMessage(topic?: string): MQTTMessage | null {
        if (!topic) {
            return this.messageBuffer.getLatest()
        }

        const messages = this.getRecentMessages({ topic })
        return messages.length > 0 ? messages[0] : null
    }

    /**
     * 監聽連接狀態變化
     */
    onStatusChange(listener: (status: ConnectionStatus) => void): () => void {
        this.statusListeners.add(listener)

        // 立即觸發當前狀態
        listener(this.status)

        // 返回取消監聽函數
        return () => {
            this.statusListeners.delete(listener)
        }
    }

    /**
     * 設置連接狀態
     */
    private setStatus(status: ConnectionStatus): void {
        if (this.status === status) return

        this.status = status
        console.log(`📊 MQTT Bus 狀態變更: ${status}`)

        // 觸發監聽器
        this.statusListeners.forEach(listener => {
            try {
                listener(status)
            } catch (error) {
                console.error('❌ 狀態監聽器錯誤:', error)
            }
        })
    }

    /**
     * 獲取當前狀態
     */
    getStatus(): ConnectionStatus {
        return this.status
    }

    /**
     * 檢查是否已連接
     */
    isConnected(): boolean {
        return this.status === 'connected'
    }

    /**
     * 獲取統計信息
     */
    getStats() {
        return {
            ...this.stats,
            bufferSize: this.messageBuffer.getSize(),
            bufferCapacity: this.messageBuffer.getCapacity(),
            activeTopics: this.activeTopics.size,
            subscriptions: this.subscriptions.size,
            routes: this.router.getRoutesInfo().length,
        }
    }

    /**
     * 清空消息緩衝
     */
    clearBuffer(): void {
        this.messageBuffer.clear()
        console.log('🗑️ 已清空消息緩衝')
    }

    /**
     * 斷開連接
     */
    disconnect(): void {
        if (this.client) {
            console.log('🔌 斷開 MQTT Bus 連接')
            this.client.end(true)
            this.client = null
            this.setStatus('disconnected')
            this.activeTopics.clear()
        }
    }

    /**
     * 調試信息
     */
    debug(): void {
        console.group('🔍 MQTT Bus Debug')
        console.log('Status:', this.status)
        console.log('Stats:', this.getStats())
        console.log('Active Topics:', Array.from(this.activeTopics))
        console.log('Subscriptions:', Array.from(this.subscriptions.keys()))
        console.log('Routes:', this.router.getRoutesInfo())
        console.log('Recent Messages:', this.messageBuffer.getRecent(10))
        console.groupEnd()
    }
}

// 導出單例實例（延遲初始化，在 App 啟動時調用）
let mqttBusInstance: MQTTBus | null = null

export const getMQTTBus = (config?: MQTTBusConfig): MQTTBus => {
    if (!mqttBusInstance) {
        mqttBusInstance = MQTTBus.getInstance(config)
    }
    return mqttBusInstance
}

// 導出便捷訪問（在 Context 中使用）
export const mqttBus = getMQTTBus()



