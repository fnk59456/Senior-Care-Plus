/**
 * WebSocket 服務 - 用於接收後端推送的實時數據
 * 替代前端直連 MQTT 的方案
 */

type ConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'reconnecting' | 'error'

interface WebSocketMessage {
    type: string
    topic?: string
    payload?: any
    timestamp?: string
    [key: string]: any
}

type MessageHandler = (message: WebSocketMessage) => void
type StatusHandler = (status: ConnectionStatus) => void

export class WebSocketService {
    private ws: WebSocket | null = null
    private status: ConnectionStatus = 'disconnected'
    private reconnectTimer: ReturnType<typeof setTimeout> | null = null
    private reconnectAttempts = 0
    private maxReconnectAttempts = 10
    private reconnectDelay = 1000

    // 消息處理器
    private messageHandlers = new Map<string, Set<MessageHandler>>()
    private statusHandlers = new Set<StatusHandler>()

    // 配置
    private wsUrl: string

    constructor(wsUrl?: string) {
        this.wsUrl = wsUrl || import.meta.env.VITE_WS_URL || 'ws://localhost:3002'
        console.log('🌐 WebSocket Service 初始化，URL:', this.wsUrl)
    }

    /**
     * 連接到 WebSocket 服務器
     */
    connect(): void {
        if (this.status === 'connected' || this.status === 'connecting') {
            console.log('⚠️ WebSocket 已經連接或正在連接中')
            return
        }

        this.setStatus('connecting')
        console.log(`🔌 正在連接 WebSocket: ${this.wsUrl}`)

        try {
            this.ws = new WebSocket(this.wsUrl)

            // 連接成功
            this.ws.onopen = () => {
                console.log('✅ WebSocket 連接已建立')
                this.setStatus('connected')
                this.reconnectAttempts = 0
                this.reconnectDelay = 1000
            }

            // 接收消息
            this.ws.onmessage = (event) => {
                try {
                    const message: WebSocketMessage = JSON.parse(event.data)

                    // 根據消息類型分發
                    if (message.type === 'connected') {
                        console.log('🎉 WebSocket 歡迎消息:', message.message)
                    } else if (message.type === 'mqtt_message') {
                        // MQTT 消息推送
                        this.handleMQTTMessage(message)
                    } else {
                        // 其他消息類型
                        this.notifyHandlers('*', message)
                    }

                } catch (error) {
                    console.error('❌ 解析 WebSocket 消息失敗:', error, event.data)
                }
            }

            // 連接關閉
            this.ws.onclose = (event) => {
                console.log(`🔌 WebSocket 連接已關閉 (code: ${event.code}, reason: ${event.reason})`)
                this.setStatus('disconnected')
                this.ws = null
                this.scheduleReconnect()
            }

            // 連接錯誤
            this.ws.onerror = (error) => {
                console.error('❌ WebSocket 錯誤:', error)
                this.setStatus('error')
            }

        } catch (error) {
            console.error('❌ WebSocket 連接失敗:', error)
            this.setStatus('disconnected')
            this.scheduleReconnect()
        }
    }

    /**
     * 處理 MQTT 消息
     */
    private handleMQTTMessage(message: WebSocketMessage): void {
        const { topic, payload } = message

        if (!topic) {
            console.warn('⚠️ 收到沒有 topic 的 MQTT 消息')
            return
        }

        console.log(`📨 收到 MQTT 消息 [${topic}]:`, payload)

        // 精確匹配的處理器
        this.notifyHandlers(topic, message)

        // 通配符處理器
        this.notifyHandlers('*', message)

        // 模式匹配處理器（如 "UWB/location/*"）
        this.messageHandlers.forEach((handlers, pattern) => {
            if (this.matchTopic(topic, pattern)) {
                handlers.forEach(handler => {
                    try {
                        handler(message)
                    } catch (error) {
                        console.error(`❌ 處理器錯誤 [${pattern}]:`, error)
                    }
                })
            }
        })
    }

    /**
     * Topic 模式匹配
     */
    private matchTopic(topic: string, pattern: string): boolean {
        if (pattern === '*') return true
        if (pattern === topic) return true

        // 支持簡單的通配符匹配
        const regex = new RegExp('^' + pattern.replace(/\*/g, '.*').replace(/\+/g, '[^/]+') + '$')
        return regex.test(topic)
    }

    /**
     * 通知處理器
     */
    private notifyHandlers(pattern: string, message: WebSocketMessage): void {
        const handlers = this.messageHandlers.get(pattern)
        if (handlers) {
            handlers.forEach(handler => {
                try {
                    handler(message)
                } catch (error) {
                    console.error(`❌ 處理器錯誤 [${pattern}]:`, error)
                }
            })
        }
    }

    /**
     * 訂閱消息
     * @param topicPattern - Topic 模式（支持通配符 * 和 +）
     * @param handler - 消息處理器
     * @returns 取消訂閱函數
     */
    subscribe(topicPattern: string, handler: MessageHandler): () => void {
        if (!this.messageHandlers.has(topicPattern)) {
            this.messageHandlers.set(topicPattern, new Set())
        }

        this.messageHandlers.get(topicPattern)!.add(handler)
        console.log(`✅ 已訂閱 WebSocket 消息: ${topicPattern}`)

        // 如果已連接，發送訂閱請求到後端
        if (this.status === 'connected' && this.ws) {
            this.send({
                type: 'subscribe',
                topics: [topicPattern]
            })
        }

        // 返回取消訂閱函數
        return () => {
            const handlers = this.messageHandlers.get(topicPattern)
            if (handlers) {
                handlers.delete(handler)
                if (handlers.size === 0) {
                    this.messageHandlers.delete(topicPattern)
                }
            }
            console.log(`🗑️ 已取消訂閱 WebSocket 消息: ${topicPattern}`)
        }
    }

    /**
     * 監聽連接狀態變化
     */
    onStatusChange(handler: StatusHandler): () => void {
        this.statusHandlers.add(handler)

        // 立即觸發當前狀態
        handler(this.status)

        // 返回取消監聽函數
        return () => {
            this.statusHandlers.delete(handler)
        }
    }

    /**
     * 發送消息到後端
     */
    private send(message: any): void {
        if (this.ws && this.status === 'connected') {
            try {
                this.ws.send(JSON.stringify(message))
            } catch (error) {
                console.error('❌ 發送 WebSocket 消息失敗:', error)
            }
        }
    }

    /**
     * 設置連接狀態
     */
    private setStatus(status: ConnectionStatus): void {
        if (this.status === status) return

        this.status = status
        console.log(`📊 WebSocket 狀態變更: ${status}`)

        // 觸發狀態監聽器
        this.statusHandlers.forEach(handler => {
            try {
                handler(status)
            } catch (error) {
                console.error('❌ 狀態監聽器錯誤:', error)
            }
        })
    }

    /**
     * 計劃重連
     */
    private scheduleReconnect(): void {
        if (this.reconnectAttempts >= this.maxReconnectAttempts) {
            console.error(`❌ 達到最大重連次數 (${this.maxReconnectAttempts})，停止重連`)
            return
        }

        // 清除現有的重連計時器
        if (this.reconnectTimer) {
            clearTimeout(this.reconnectTimer)
        }

        this.reconnectAttempts++
        this.setStatus('reconnecting')

        // 指數退避策略
        const delay = Math.min(this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1), 30000)

        console.log(`🔄 ${delay}ms 後嘗試重連 (第 ${this.reconnectAttempts}/${this.maxReconnectAttempts} 次)`)

        this.reconnectTimer = setTimeout(() => {
            this.connect()
        }, delay)
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
     * 斷開連接
     */
    disconnect(): void {
        console.log('🔌 主動斷開 WebSocket 連接')

        // 清除重連計時器
        if (this.reconnectTimer) {
            clearTimeout(this.reconnectTimer)
            this.reconnectTimer = null
        }

        // 關閉連接
        if (this.ws) {
            try {
                this.ws.close(1000, '用戶主動斷開')
            } catch (error) {
                console.error('❌ 關閉 WebSocket 失敗:', error)
            }
            this.ws = null
        }

        this.setStatus('disconnected')
        this.reconnectAttempts = 0
    }

    /**
     * 調試信息
     */
    debug(): void {
        console.group('🔍 WebSocket Service Debug')
        console.log('Status:', this.status)
        console.log('URL:', this.wsUrl)
        console.log('Reconnect Attempts:', this.reconnectAttempts)
        console.log('Subscriptions:', Array.from(this.messageHandlers.keys()))
        console.log('Status Handlers:', this.statusHandlers.size)
        console.groupEnd()
    }
}

// 創建全局單例實例
export const wsService = new WebSocketService()

