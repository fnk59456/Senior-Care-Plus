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
        // 优先从 payload 获取 gateway id，支持 'gateway id' 和 gateway_id 两种格式
        gatewayId: data['gateway id']?.toString() || data.gateway_id?.toString() || message.gateway?.id,
        // deviceId 应该从 id 字段获取，不是 node（node 是节点类型）
        deviceId: data.id?.toString() || data.MAC || undefined,
        status: data.status || data.result || undefined,
        code: data.code || data.err || undefined,
        message: data.message || data.info || undefined,
        // serial_no 支持多种格式：'serial no', serial_no, serialNo
        correlationId: data['serial no'] || data.serial_no || data.serialNo || data.correlationId || undefined,
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
            // 提取 command 字段（从 raw.command 获取，支持多种格式）
            const command = ack.raw?.command || ack.raw?.Command || ack.message || ack.status || 'ACK'

            // 提取 gateway ID（优先显示 Gateway 名称，更易读）
            // 如果 Gateway 名称不可用，再使用 payload 中的 gateway id 数字
            const gatewayId = ack.gatewayName
                || ack.raw?.['gateway id']?.toString()
                || ack.raw?.gateway_id?.toString()
                || ack.gatewayId
                || 'GW'

            // 提取 device ID（从 raw.id 获取）
            const deviceId = ack.raw?.id?.toString() || ack.deviceId || ''

            // 提取 idHex（支持多种格式）
            const idHex = ack.raw?.id_hex
                || ack.raw?.idHex
                || (ack.raw?.id ? `0x${parseInt(ack.raw.id.toString()).toString(16).toUpperCase()}` : '')

            // 提取 serial no（支持多种格式）
            const serialNo = ack.raw?.['serial no']?.toString()
                || ack.raw?.serial_no?.toString()
                || ack.raw?.serialNo?.toString()
                || (ack.correlationId ? ack.correlationId.toString() : undefined)

            // 提取 response（仅 NewFirmware Ack 有）
            const response = ack.raw?.response || undefined

            const data: AckNotificationData = {
                gatewayId: gatewayId,
                command: String(command),
                node: (ack.raw?.node || 'ANCHOR').toString(),
                id: deviceId,
                idHex: idHex || '',
                receivedAt: ack.timestamp.toISOString(),
                topic: ack.topic,
                response: response,
                serialNo: serialNo,
            }

            toast({
                // 用 description 放自定義卡片（避免在 .ts 使用 JSX）
                description: React.createElement(AckNotification, { data }),
                // 設置 duration 為 Infinity，不自動消失，需要手動點擊關閉
                duration: Infinity,
            })
        },
        onAck: (cb: (ack: AckRecord) => void) => {
            get().listeners.add(cb)
            return () => get().listeners.delete(cb)
        }
    }
})

export type { AckRecord }

