import { create } from 'zustand'
import { mqttBus } from '@/services/mqttBus'
import { RoutePatterns } from '@/services/messageRouter'
import type { MQTTMessage } from '@/types/mqtt-types'

/**
 * Tag Message 記錄（content: "info", node: "TAG"）
 */
export type TagMessageRecord = {
    topic: string
    gatewayId?: string
    gatewayName?: string
    content: string
    node: string
    id: number
    id_hex?: string
    gateway_id: number
    fw_ver?: number
    battery_level?: number
    battery_voltage?: number
    led_on_time?: number
    led_off_time?: number
    bat_detect_time?: number
    five_v_plugged?: string
    uwb_tx_power_changed?: string
    uwb_tx_power?: any
    serial_no?: number
    payload: any
    receivedAt: Date
}

/**
 * Tag Location 記錄（content: "location", node: "TAG"）
 */
export type TagLocationRecord = {
    topic: string
    gatewayId?: string
    gatewayName?: string
    content: string
    node: string
    id: number
    gateway_id: number
    position: {
        x: number
        y: number
        z: number
        quality?: number
    }
    time?: string
    serial_no?: number
    payload: any
    receivedAt: Date
}

/**
 * Tag Config 記錄（content: "config", node: "TAG"）
 */
export type TagConfigRecord = {
    topic: string
    gatewayId?: string
    gatewayName?: string
    content: string
    node: string
    id: number
    name?: string
    gateway_id: number
    fw_update?: number
    led?: number
    ble?: number
    location_engine?: number
    responsive_mode?: number
    stationary_detect?: number
    nominal_udr?: number
    stationary_udr?: number
    payload: any
    receivedAt: Date
}

interface TagState {
    recentMessages: TagMessageRecord[]
    recentLocations: TagLocationRecord[]
    recentConfigs: TagConfigRecord[]
    max: number
    processTagMessage: (message: MQTTMessage) => void
    processTagLocation: (message: MQTTMessage) => void
    processTagConfig: (message: MQTTMessage) => void
    getMessagesByTopic: (topic: string, sinceMs?: number) => TagMessageRecord[]
    getLocationsByTopic: (topic: string, sinceMs?: number) => TagLocationRecord[]
    getConfigsByTopic: (topic: string, sinceMs?: number) => TagConfigRecord[]
}

export const useTagStore = create<TagState>((set, get) => {
    let subscribedOnce = false

    // 延遲註冊，確保 MQTT Bus 已初始化
    const subscribeToTopics = () => {
        if (subscribedOnce) return
        subscribedOnce = true

        setTimeout(() => {
            try {
                // 訂閱 MESSAGE 主題（處理 info 類型）
                const messageHandler = (message: MQTTMessage) => {
                    const p = message.payload || {}
                    // 只處理 node === "TAG" 且 content === "info" 的訊息
                    if (p.node === 'TAG' && p.content === 'info') {
                        get().processTagMessage(message)
                    }
                }
                mqttBus.subscribe(RoutePatterns.MESSAGE, messageHandler)

                // 訂閱 LOCATION 主題（處理 location 類型）
                const locationHandler = (message: MQTTMessage) => {
                    const p = message.payload || {}
                    // 只處理 node === "TAG" 且 content === "location" 的訊息
                    if (p.node === 'TAG' && p.content === 'location') {
                        get().processTagLocation(message)
                    }
                }
                mqttBus.subscribe(RoutePatterns.LOCATION, locationHandler)

                // 訂閱 TAG_CONF 主題（處理 config 類型）
                const configHandler = (message: MQTTMessage) => {
                    const p = message.payload || {}
                    // 只處理 node === "TAG" 且 content === "config" 的訊息
                    if (p.node === 'TAG' && p.content === 'config') {
                        get().processTagConfig(message)
                    }
                }
                mqttBus.subscribe(RoutePatterns.TAG_CONF, configHandler)
                mqttBus.subscribe(RoutePatterns.TAG_CONFIG, configHandler)

                console.log('✅ Tag Store 路由已註冊')
            } catch (e) {
                console.warn('⚠️ Tag Store 路由註冊失敗:', e)
            }
        }, 200)
    }

    subscribeToTopics()

    // 處理 Tag Message（info 類型）
    const processTagMessage = (message: MQTTMessage) => {
        const p = message.payload || {}
        if (p.node !== 'TAG' || p.content !== 'info') return

        const rec: TagMessageRecord = {
            topic: message.topic,
            gatewayId: message.gateway?.id,
            gatewayName: message.gateway?.name,
            content: p.content || '',
            node: p.node || '',
            id: p.id || 0,
            id_hex: p['id(Hex)'] || p.id_hex || '',
            gateway_id: p['gateway id'] || p.gateway_id || 0,
            fw_ver: p['fw ver'] || p.fw_ver,
            battery_level: p['battery level'] || p.battery_level,
            battery_voltage: p['battery voltage'] || p.battery_voltage,
            led_on_time: p['led on time(1ms)'] || p.led_on_time,
            led_off_time: p['led off time(1ms)'] || p.led_off_time,
            bat_detect_time: p['bat detect time(1s)'] || p.bat_detect_time,
            five_v_plugged: p['5V plugged'] || p.five_v_plugged,
            uwb_tx_power_changed: p['uwb tx power changed'] || p.uwb_tx_power_changed,
            uwb_tx_power: p['uwb tx power'] || p.uwb_tx_power,
            serial_no: p['serial no'] || p.serial_no,
            payload: p,
            receivedAt: message.timestamp,
        }
        set(state => {
            const list = [rec, ...state.recentMessages]
            return { recentMessages: list.slice(0, state.max) }
        })
    }

    // 處理 Tag Location（location 類型）
    const processTagLocation = (message: MQTTMessage) => {
        const p = message.payload || {}
        if (p.node !== 'TAG' || p.content !== 'location') return

        const rec: TagLocationRecord = {
            topic: message.topic,
            gatewayId: message.gateway?.id,
            gatewayName: message.gateway?.name,
            content: p.content || '',
            node: p.node || '',
            id: p.id || 0,
            gateway_id: p['gateway id'] || p.gateway_id || 0,
            position: p.position || { x: 0, y: 0, z: 0 },
            time: p.time,
            serial_no: p['serial no'] || p.serial_no,
            payload: p,
            receivedAt: message.timestamp,
        }
        set(state => {
            const list = [rec, ...state.recentLocations]
            return { recentLocations: list.slice(0, state.max) }
        })
    }

    // 處理 Tag Config（config 類型）
    const processTagConfig = (message: MQTTMessage) => {
        const p = message.payload || {}
        if (p.node !== 'TAG' || p.content !== 'config') return

        const rec: TagConfigRecord = {
            topic: message.topic,
            gatewayId: message.gateway?.id,
            gatewayName: message.gateway?.name,
            content: p.content || '',
            node: p.node || '',
            id: p.id || 0,
            name: p.name || '',
            gateway_id: p['gateway id'] || p.gateway_id || 0,
            fw_update: p['fw update'] || p.fw_update,
            led: p.led,
            ble: p.ble,
            location_engine: p['location engine'] || p.location_engine,
            responsive_mode: p['responsive mode(0=On,1=Off)'] || p.responsive_mode,
            stationary_detect: p['stationary detect'] || p.stationary_detect,
            nominal_udr: p['nominal udr(hz)'] || p.nominal_udr,
            stationary_udr: p['stationary udr(hz)'] || p.stationary_udr,
            payload: p,
            receivedAt: message.timestamp,
        }
        set(state => {
            const list = [rec, ...state.recentConfigs]
            return { recentConfigs: list.slice(0, state.max) }
        })
    }

    return {
        recentMessages: [],
        recentLocations: [],
        recentConfigs: [],
        max: 200,
        processTagMessage,
        processTagLocation,
        processTagConfig,
        getMessagesByTopic: (topic: string, sinceMs?: number) => {
            const since = sinceMs ? Date.now() - sinceMs : 0
            return get().recentMessages.filter(
                r => r.topic === topic && r.receivedAt.getTime() >= since
            )
        },
        getLocationsByTopic: (topic: string, sinceMs?: number) => {
            const since = sinceMs ? Date.now() - sinceMs : 0
            return get().recentLocations.filter(
                r => r.topic === topic && r.receivedAt.getTime() >= since
            )
        },
        getConfigsByTopic: (topic: string, sinceMs?: number) => {
            const since = sinceMs ? Date.now() - sinceMs : 0
            return get().recentConfigs.filter(
                r => r.topic === topic && r.receivedAt.getTime() >= since
            )
        },
    }
})

