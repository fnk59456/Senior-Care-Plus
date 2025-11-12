/**
 * 实时数据服务适配器
 * 支持通过环境变量切换 WebSocket 或 MQTT
 */

import { wsService, WebSocketService } from './websocketService'
import { mqttBus } from './mqttBus'
import type { MQTTMessage } from '@/types/mqtt-types'

type ConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'reconnecting' | 'error'
type MessageHandler = (message: any) => void
type StatusHandler = (status: ConnectionStatus) => void

interface RealtimeMessage {
    topic: string
    payload: any
    timestamp: Date
    gateway?: any
}

/**
 * 实时数据服务接口
 */
interface IRealtimeDataService {
    connect(): void
    subscribe(topicPattern: string | RegExp, handler: MessageHandler): () => void
    onStatusChange(handler: StatusHandler): () => void
    getStatus(): ConnectionStatus
    isConnected(): boolean
    disconnect(): void
}

/**
 * WebSocket 实现
 */
class WebSocketRealtimeService implements IRealtimeDataService {
    private wsService: WebSocketService

    constructor() {
        this.wsService = wsService
    }

    connect(): void {
        this.wsService.connect()
    }

    subscribe(topicPattern: string | RegExp, handler: MessageHandler): () => void {
        const pattern =
            typeof topicPattern === 'string'
                ? topicPattern
                : topicPattern.source // WebSocketService 期待字串；正規表達式將轉為其字面值

        return this.wsService.subscribe(pattern, (wsMessage) => {
            // 转换 WebSocket 消息格式为统一格式
            if (wsMessage.type === 'mqtt_message' && wsMessage.topic && wsMessage.payload) {
                const message: RealtimeMessage = {
                    topic: wsMessage.topic,
                    payload: wsMessage.payload,
                    timestamp: wsMessage.timestamp ? new Date(wsMessage.timestamp) : new Date(),
                    gateway: wsMessage.gateway
                }
                handler(message)
            }
        })
    }

    onStatusChange(handler: StatusHandler): () => void {
        return this.wsService.onStatusChange(handler)
    }

    getStatus(): ConnectionStatus {
        return this.wsService.getStatus()
    }

    isConnected(): boolean {
        return this.wsService.isConnected()
    }

    disconnect(): void {
        this.wsService.disconnect()
    }
}

/**
 * MQTT 实现（通过 mqttBus）
 */
class MQTTRealtimeService implements IRealtimeDataService {
    connect(): void {
        mqttBus.connect()
    }

    subscribe(topicPattern: string | RegExp, handler: MessageHandler): () => void {
        // mqttBus 支持字符串和正则表达式
        let pattern: string | RegExp = topicPattern

        if (typeof topicPattern === 'string') {
            pattern = topicPattern.includes('*') || topicPattern.includes('+')
                ? new RegExp('^' + topicPattern.replace(/\*/g, '.*').replace(/\+/g, '[^/]+') + '$')
                : topicPattern
        }

        return mqttBus.subscribe(pattern, (mqttMessage: MQTTMessage) => {
            const message: RealtimeMessage = {
                topic: mqttMessage.topic,
                payload: mqttMessage.payload,
                timestamp: mqttMessage.timestamp,
                gateway: mqttMessage.gateway
            }
            handler(message)
        })
    }

    onStatusChange(handler: StatusHandler): () => void {
        return mqttBus.onStatusChange(handler)
    }

    getStatus(): ConnectionStatus {
        return mqttBus.getStatus()
    }

    isConnected(): boolean {
        return mqttBus.isConnected()
    }

    disconnect(): void {
        mqttBus.disconnect()
    }
}

/**
 * 根据环境变量选择实现
 */
const USE_WEBSOCKET = import.meta.env.VITE_USE_WEBSOCKET === 'true'

export const realtimeDataService: IRealtimeDataService = USE_WEBSOCKET
    ? new WebSocketRealtimeService()
    : new MQTTRealtimeService()

// 导出类型
export type { IRealtimeDataService, RealtimeMessage, ConnectionStatus, MessageHandler, StatusHandler }

// 调试信息
if (USE_WEBSOCKET) {
    console.log('🌐 使用 WebSocket 实时数据服务')
} else {
    console.log('📡 使用 MQTT 实时数据服务')
}

