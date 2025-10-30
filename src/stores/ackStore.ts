import React from 'react'
import { create } from 'zustand'
import { mqttBus } from '@/services/mqttBus'
import { RoutePatterns } from '@/services/messageRouter'
import type { MQTTMessage } from '@/types/mqtt-types'
import { toast } from '@/hooks/use-toast'
import AckNotification, { AckNotificationData } from '@/components/AckNotification'

type AckRecord = {
    gatewayName?: string
    gatewayId?: string
    deviceId?: string
    status?: string
    code?: string | number
    message?: string
    correlationId?: string | number
    timestamp: Date
    topic: string
    raw: any
}

interface AckState {
    recentAcks: AckRecord[]
    max: number
    listeners: Set<(ack: AckRecord) => void>
    addAck: (msg: MQTTMessage) => void
    onAck: (cb: (ack: AckRecord) => void) => () => void
}

function normalizeAck(message: MQTTMessage): AckRecord {
    const data = message.payload || {}
    const ack: AckRecord = {
        gatewayName: message.gateway?.name,
        gatewayId: message.gateway?.id,
        deviceId: data.node || data.id || data.MAC || undefined,
        status: data.status || data.result || undefined,
        code: data.code || data.err || undefined,
        message: data.message || data.info || undefined,
        correlationId: data.serial_no || data.correlationId || undefined,
        timestamp: message.timestamp,
        topic: message.topic,
        raw: data,
    }
    return ack
}

// 單例化訂閱（避免 HMR 重複註冊）
let ackSubscribed = false
// 簡易去重緩存（key -> lastTimestampMs）
const dedupeCache = new Map<string, number>()
const DEDUPE_WINDOW_MS = 4000

export const useAckStore = create<AckState>((set, get) => {
    // 延遲註冊，確保 MQTT Bus 啟動
    setTimeout(() => {
        if (ackSubscribed) return
        try {
            const handler = (message: MQTTMessage) => get().addAck(message)
            mqttBus.subscribe(RoutePatterns.ACK, handler)
            mqttBus.subscribe(RoutePatterns.ACK_FROM_NODE, handler)
            ackSubscribed = true
            console.log('✅ Ack 路由已註冊（單例）')
        } catch (e) {
            console.warn('⚠️ Ack 路由註冊失敗:', e)
        }
    }, 200)

    return {
        recentAcks: [],
        max: 100,
        listeners: new Set(),
        addAck: (message: MQTTMessage) => {
            const ack = normalizeAck(message)

            // 去重：同一 topic + deviceId/correlationId + 內容摘要 在時間窗內僅彈一次
            const idPart = String(ack.correlationId || ack.deviceId || '')
            const contentSig = (() => {
                try { return JSON.stringify({ s: ack.status, m: ack.message, r: ack.code }) } catch { return '' }
            })()
            const key = `${ack.topic}|${idPart}|${contentSig}`
            const now = Date.now()
            const last = dedupeCache.get(key) || 0
            // 清理過期
            for (const [k, t] of dedupeCache) {
                if (now - t > DEDUPE_WINDOW_MS) dedupeCache.delete(k)
            }
            if (now - last < DEDUPE_WINDOW_MS) {
                // 重複，忽略
                return
            }
            dedupeCache.set(key, now)
            set(state => {
                const list = [ack, ...state.recentAcks]
                return { recentAcks: list.slice(0, state.max) }
            })

            // 觸發外部監聽（全域通知）
            get().listeners.forEach(cb => {
                try { cb(ack) } catch { }
            })

            // 全域 toast（改用與頁內相同的卡片樣式）
            const data: AckNotificationData = {
                gatewayId: ack.gatewayName || ack.gatewayId || 'GW',
                command: String(ack.message || ack.status || 'ACK'),
                node: (ack.raw?.node || 'ANCHOR').toString(),
                id: String(ack.deviceId || ack.raw?.id || ''),
                idHex: String(ack.raw?.id_hex || ack.raw?.idHex || ''),
                receivedAt: ack.timestamp.toISOString(),
                topic: ack.topic,
            }

            toast({
                // 用 description 放自定義卡片（避免在 .ts 使用 JSX）
                description: React.createElement(AckNotification, { data }),
            })
        },
        onAck: (cb: (ack: AckRecord) => void) => {
            get().listeners.add(cb)
            return () => get().listeners.delete(cb)
        }
    }
})

export type { AckRecord }

