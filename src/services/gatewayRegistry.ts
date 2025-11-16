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
            // 本地模式：從 MAC 地址提取後4位生成 topics
            const macSuffix = this.extractMacSuffix(gateway)
            return {
                health: `UWB/GW${macSuffix}_Health`,
                location: `UWB/GW${macSuffix}_Loca`,
                ack: `UWB/GW${macSuffix}_Ack`,
                message: `UWB/GW${macSuffix}_Message`,
                tagConfig: `UWB/GW${macSuffix}_TagConf`,
                anchorConfig: `UWB/GW${macSuffix}_AncConf`,
                downlink: `UWB/GW${macSuffix}_Downlink`,
            }
        }
    }

    /**
     * 從 Gateway 的 name 或 macAddress 中提取 MAC 地址的後4位
     *
     * 規則：
     * - name = "GwF9E516B8_197" → 提取 "F9E516B8" → 後4位 "16B8"
     * - macAddress = "GW:F9E516B8" → 提取 "F9E516B8" → 後4位 "16B8"
     *
     * @param gateway Gateway 對象
     * @returns MAC 地址的後4位（大寫，無冒號）
     */
    private extractMacSuffix(gateway: Gateway): string {
        let macAddress = ''

        // 優先從 macAddress 字段提取
        if (gateway.macAddress) {
            // 移除 "GW:" 前綴和所有冒號，轉為大寫
            macAddress = gateway.macAddress.replace(/^GW:/i, '').replace(/:/g, '').toUpperCase()
        } else if (gateway.name) {
            // 從 name 中提取：GwF9E516B8_197 → F9E516B8
            // 匹配模式：Gw + 8位十六進制數字 + 下劃線 + 數字
            const match = gateway.name.match(/^Gw([0-9A-Fa-f]{8})_/i)
            if (match) {
                macAddress = match[1].toUpperCase()
            }
        }

        // 提取後4位
        if (macAddress.length >= 4) {
            const suffix = macAddress.slice(-4).toUpperCase()
            console.log(`🔧 從 Gateway ${gateway.name} 提取 MAC 後綴: ${macAddress} → ${suffix}`)
            return suffix
        }

        // 如果無法提取，回退到使用 name（去除空格）
        console.warn(`⚠️ 無法從 Gateway ${gateway.name} 提取 MAC 地址，使用 name 作為後綴`)
        return gateway.name.replace(/\s+/g, '')
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



