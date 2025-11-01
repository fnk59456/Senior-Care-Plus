/**
 * 消息路由器
 * 根據 Topic 模式將 MQTT 消息路由到對應的處理器
 */

import type { MQTTMessage, MessageHandler } from '@/types/mqtt-types'

interface Route {
    pattern: RegExp
    handler: MessageHandler
    priority: number
    id: string
}

export class MessageRouter {
    private routes: Route[] = []
    private routeIdCounter = 0

    /**
     * 添加路由規則
     * @param pattern - Topic 匹配模式（正則表達式）
     * @param handler - 消息處理器
     * @param priority - 優先級（數字越大優先級越高）
     * @returns 取消註冊函數
     */
    addRoute(
        pattern: RegExp | string,
        handler: MessageHandler,
        priority: number = 0
    ): () => void {
        // 如果是字符串，轉換為精確匹配的正則
        const regexPattern = typeof pattern === 'string'
            ? new RegExp(`^${this.escapeRegex(pattern)}$`)
            : pattern

        const routeId = `route-${this.routeIdCounter++}`
        const route: Route = {
            pattern: regexPattern,
            handler,
            priority,
            id: routeId
        }

        this.routes.push(route)

        // 按優先級排序（優先級高的在前）
        this.routes.sort((a, b) => b.priority - a.priority)

        console.log(`✅ 添加路由: ${pattern.toString()} (優先級: ${priority})`)

        // 返回取消註冊函數
        return () => this.removeRoute(routeId)
    }

    /**
     * 移除路由規則
     */
    private removeRoute(routeId: string): void {
        const index = this.routes.findIndex(r => r.id === routeId)
        if (index > -1) {
            const route = this.routes[index]
            this.routes.splice(index, 1)
            console.log(`✅ 移除路由: ${route.pattern.toString()}`)
        }
    }

    /**
     * 路由消息到匹配的處理器
     */
    route(message: MQTTMessage): void {
        let matchedCount = 0

        for (const route of this.routes) {
            if (route.pattern.test(message.topic)) {
                try {
                    route.handler(message)
                    matchedCount++
                } catch (error) {
                    console.error(`❌ 路由處理器錯誤 [${message.topic}]:`, error)
                }
            }
        }

        if (matchedCount === 0) {
            console.warn(`⚠️ 未找到匹配的路由: ${message.topic}`)
        }
    }

    /**
     * 獲取匹配特定 Topic 的路由數量
     */
    getMatchingRoutesCount(topic: string): number {
        return this.routes.filter(route => route.pattern.test(topic)).length
    }

    /**
     * 獲取所有路由信息（用於調試）
     */
    getRoutesInfo(): Array<{ pattern: string, priority: number }> {
        return this.routes.map(route => ({
            pattern: route.pattern.toString(),
            priority: route.priority
        }))
    }

    /**
     * 清空所有路由
     */
    clear(): void {
        this.routes = []
        console.log('✅ 清空所有路由')
    }

    /**
     * 轉義正則表達式特殊字符
     */
    private escapeRegex(str: string): string {
        return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    }
}

/**
 * 預定義的路由模式
 */
export const RoutePatterns = {
    // 健康數據
    HEALTH: /_Health$/,

    // 位置數據
    LOCATION: /_Loca$/,

    // ACK 確認
    ACK: /_Ack$/,
    // 雲端 ack_from_node 主題
    ACK_FROM_NODE: /ack_from_node$/,

    // 消息
    MESSAGE: /_Message$/,

    // 所有 UWB 主題
    ALL_UWB: /^UWB\//,

    // 特定 Gateway（動態生成）
    forGateway: (gatewayName: string) => new RegExp(`^UWB/GW${gatewayName}_`),

    // 特定內容類型
    forContent: (contentType: string) => new RegExp(`"content"\\s*:\\s*"${contentType}"`),

    // Anchor 設定（AncConf）
    ANC_CONF: /_AncConf$/,
    // 雲端 anchor_config 主題
    ANCHOR_CONFIG: /anchor_config$/,

    // Tag 配置（TagConf）
    TAG_CONF: /_TagConf$/,
    // 雲端 tag_config 主題
    TAG_CONFIG: /tag_config$/,

    // 調試：匹配所有 Topics
    ALL_TOPICS: /.*/,
}

