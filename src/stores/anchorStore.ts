import { create } from 'zustand'
import { mqttBus } from '@/services/mqttBus'
import { RoutePatterns } from '@/services/messageRouter'
import type { MQTTMessage } from '@/types/mqtt-types'

export type AnchorConfigRecord = {
    topic: string
    gatewayId?: string
    gatewayName?: string
    node?: string
    id?: number | string
    name?: string
    position?: { x: number; y: number; z?: number }
    payload: any
    receivedAt: Date
}

interface AnchorState {
    recentConfigs: AnchorConfigRecord[]
    max: number
    processAnchorConfig: (message: MQTTMessage) => void
    getConfigsByTopic: (topic: string, sinceMs?: number) => AnchorConfigRecord[]
}

export const useAnchorStore = create<AnchorState>((set, get) => {
    // 延遲註冊，確保 MQTT Bus 已初始化
    setTimeout(() => {
        try {
            const handler = (message: MQTTMessage) => get().processAnchorConfig(message)
            mqttBus.subscribe(RoutePatterns.ANC_CONF, handler)
            mqttBus.subscribe(RoutePatterns.ANCHOR_CONFIG, handler)
            console.log('✅ Anchor Store 路由已註冊')
        } catch (e) {
            console.warn('⚠️ Anchor Store 路由註冊失敗:', e)
        }
    }, 200)

    return {
        recentConfigs: [],
        max: 200,
        processAnchorConfig: (message: MQTTMessage) => {
            const p = message.payload || {}
            const rec: AnchorConfigRecord = {
                topic: message.topic,
                gatewayId: message.gateway?.id,
                gatewayName: message.gateway?.name,
                node: p.node,
                id: p.id,
                name: p.name,
                position: p.position,
                payload: p,
                receivedAt: message.timestamp,
            }
            set(state => {
                const list = [rec, ...state.recentConfigs]
                return { recentConfigs: list.slice(0, state.max) }
            })
        },
        getConfigsByTopic: (topic: string, sinceMs?: number) => {
            const since = sinceMs ? Date.now() - sinceMs : 0
            return get().recentConfigs.filter(r => r.topic === topic && r.receivedAt.getTime() >= since)
        },
    }
})


