/**
 * Gateway 註冊表服務
 * 管理 Gateway 生命週期和 Topic 映射
 */

import type { Gateway, GatewayTopicConfig, GatewayEvent } from '@/types/mqtt-types'

type GatewayEventListener = (event: GatewayEvent) => void

export class GatewayRegistry {
    private gateways: Map<string, Gateway> = new Map()
    private topicMapping: Map<string, GatewayTopicConfig> = new Map()
    private listeners: Set<GatewayEventListener> = new Set()

    /**
     * 註冊 Gateway
     */
    registerGateway(gateway: Gateway): void {
        const existingGateway = this.gateways.get(gateway.id)

        if (existingGateway) {
            console.log(`⚠️ Gateway ${gateway.id} 已存在，將更新`)
            this.updateGateway(gateway)
            return
        }

        // 提取 Topics
        const topics = this.extractTopics(gateway)

        // 保存
        this.gateways.set(gateway.id, gateway)
        this.topicMapping.set(gateway.id, topics)

        console.log(`✅ 註冊 Gateway: ${gateway.name} (${gateway.id})`)
        console.log(`   Topics:`, topics)

        // 觸發事件
        this.emit({
            type: 'gateway_added',
            gateway,
            topics
        })
    }

    /**
     * 取消註冊 Gateway
     */
    unregisterGateway(gatewayId: string): void {
        const gateway = this.gateways.get(gatewayId)
        const topics = this.topicMapping.get(gatewayId)

        if (!gateway || !topics) {
            console.warn(`⚠️ Gateway ${gatewayId} 不存在`)
            return
        }

        this.gateways.delete(gatewayId)
        this.topicMapping.delete(gatewayId)

        console.log(`✅ 取消註冊 Gateway: ${gateway.name} (${gatewayId})`)

        // 觸發事件
        this.emit({
            type: 'gateway_removed',
            gateway,
            topics
        })
    }

    /**
     * 更新 Gateway
     */
    updateGateway(gateway: Gateway): void {
        const oldTopics = this.topicMapping.get(gateway.id)
        const newTopics = this.extractTopics(gateway)

        // 更新數據
        this.gateways.set(gateway.id, gateway)
        this.topicMapping.set(gateway.id, newTopics)

        console.log(`✅ 更新 Gateway: ${gateway.name} (${gateway.id})`)

        if (oldTopics) {
            const { added, removed } = this.diffTopics(oldTopics, newTopics)
            if (added.length > 0) {
                console.log(`   新增 Topics:`, added)
            }
            if (removed.length > 0) {
                console.log(`   移除 Topics:`, removed)
            }
        }

        // 觸發事件
        this.emit({
            type: 'gateway_updated',
            gateway,
            oldTopics: oldTopics || {},
            newTopics
        })
    }

    /**
     * 批量註冊 Gateways
     */
    registerGateways(gateways: Gateway[]): void {
        console.log(`📦 批量註冊 ${gateways.length} 個 Gateways`)
        gateways.forEach(gateway => this.registerGateway(gateway))
    }

    /**
     * 批量取消註冊 Gateways
     */
    unregisterGateways(gatewayIds: string[]): void {
        console.log(`📦 批量取消註冊 ${gatewayIds.length} 個 Gateways`)
        gatewayIds.forEach(id => this.unregisterGateway(id))
    }

    /**
     * 獲取 Gateway
     */
    getGateway(gatewayId: string): Gateway | null {
        return this.gateways.get(gatewayId) || null
    }

    /**
     * 獲取所有 Gateways
     */
    getAllGateways(): Gateway[] {
        return Array.from(this.gateways.values())
    }

    /**
     * 獲取 Gateway 的 Topics
     */
    getGatewayTopics(gatewayId: string): GatewayTopicConfig | null {
        return this.topicMapping.get(gatewayId) || null
    }

    /**
     * 獲取所有活躍的 Topics（去重）
     */
    getAllActiveTopics(): string[] {
        const allTopics = new Set<string>()

        this.topicMapping.forEach(topics => {
            Object.values(topics).forEach(topic => {
                if (topic) {
                    allTopics.add(topic)
                }
            })
        })

        return Array.from(allTopics)
    }

    /**
     * 根據 Topic 查找對應的 Gateway
     */
    findGatewayByTopic(topic: string): Gateway | null {
        for (const [gatewayId, topics] of this.topicMapping) {
            const topicValues = Object.values(topics)
            if (topicValues.includes(topic)) {
                return this.gateways.get(gatewayId) || null
            }
        }
        return null
    }

    /**
     * 根據 Topic 查找所有匹配的 Gateways（支持通配符）
     */
    findGatewaysByTopicPattern(pattern: RegExp): Gateway[] {
        const matchedGateways: Gateway[] = []

        for (const [gatewayId, topics] of this.topicMapping) {
            const topicValues = Object.values(topics).filter(t => t) as string[]

            if (topicValues.some(topic => pattern.test(topic))) {
                const gateway = this.gateways.get(gatewayId)
                if (gateway) {
                    matchedGateways.push(gateway)
                }
            }
        }

        return matchedGateways
    }

    /**
     * 提取 Gateway 的所有 Topics
     */
    private extractTopics(gateway: Gateway): GatewayTopicConfig {
        const pubTopics = gateway.cloudData?.pub_topic
        const subTopics = gateway.cloudData?.sub_topic

        if (pubTopics) {
            // 雲端模式：使用 cloudData
            return {
                health: pubTopics.health,
                location: pubTopics.location,
                ack: pubTopics.ack_from_node,
                message: pubTopics.message,
                tagConfig: pubTopics.tag_config,
                anchorConfig: pubTopics.anchor_config,
                downlink: subTopics?.downlink,
            }
        } else {
            // 本地模式：使用命名規則（從 MAC 地址提取最後4個字符）
            const extractGatewayId = (macAddress?: string, name?: string): string => {
                if (macAddress) {
                    // 移除 "GW:" 前綴（如果存在）
                    const macWithoutPrefix = macAddress.replace(/^GW:/i, '')
                    // 提取最後4個字符
                    if (macWithoutPrefix.length >= 4) {
                        return macWithoutPrefix.slice(-4).toUpperCase()
                    }
                }
                // 如果 MAC 地址不可用，回退到使用 name（移除空格）
                return name ? name.replace(/\s+/g, '') : 'Unknown'
            }

            const gwId = extractGatewayId(gateway.macAddress, gateway.name)
            return {
                health: `UWB/GW${gwId}_Health`,
                location: `UWB/GW${gwId}_Loca`,
                ack: `UWB/GW${gwId}_Ack`,
                message: `UWB/GW${gwId}_Message`,
            }
        }
    }

    /**
     * 計算兩個 Topic 配置的差異
     */
    private diffTopics(
        oldTopics: GatewayTopicConfig,
        newTopics: GatewayTopicConfig
    ): { added: string[], removed: string[] } {
        const oldSet = new Set(Object.values(oldTopics).filter(t => t))
        const newSet = new Set(Object.values(newTopics).filter(t => t))

        const added: string[] = []
        const removed: string[] = []

        // 找出新增的
        newSet.forEach(topic => {
            if (!oldSet.has(topic)) {
                added.push(topic)
            }
        })

        // 找出刪除的
        oldSet.forEach(topic => {
            if (!newSet.has(topic)) {
                removed.push(topic)
            }
        })

        return { added, removed }
    }

    /**
     * 監聽 Gateway 事件
     */
    on(listener: GatewayEventListener): () => void {
        this.listeners.add(listener)

        // 返回取消監聽函數
        return () => {
            this.listeners.delete(listener)
        }
    }

    /**
     * 觸發事件
     */
    private emit(event: GatewayEvent): void {
        this.listeners.forEach(listener => {
            try {
                listener(event)
            } catch (error) {
                console.error('❌ Gateway 事件監聽器錯誤:', error)
            }
        })
    }

    /**
     * 清空所有註冊
     */
    clear(): void {
        console.log('🗑️ 清空 Gateway Registry')
        this.gateways.clear()
        this.topicMapping.clear()
        // 不清空 listeners，保持訂閱
    }

    /**
     * 獲取統計信息
     */
    getStats(): {
        totalGateways: number
        totalTopics: number
        onlineGateways: number
        offlineGateways: number
    } {
        const gateways = Array.from(this.gateways.values())

        return {
            totalGateways: gateways.length,
            totalTopics: this.getAllActiveTopics().length,
            onlineGateways: gateways.filter(g => g.status === 'online').length,
            offlineGateways: gateways.filter(g => g.status === 'offline').length,
        }
    }

    /**
     * 調試信息
     */
    debug(): void {
        console.group('🔍 Gateway Registry Debug')
        console.log('Gateways:', Array.from(this.gateways.entries()))
        console.log('Topic Mapping:', Array.from(this.topicMapping.entries()))
        console.log('Active Topics:', this.getAllActiveTopics())
        console.log('Stats:', this.getStats())
        console.log('Listeners:', this.listeners.size)
        console.groupEnd()
    }
}

// 導出單例
export const gatewayRegistry = new GatewayRegistry()



