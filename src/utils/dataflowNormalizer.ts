import {
    FlattenedGatewayData,
    FlattenedAnchorData,
    RSSI_THRESHOLDS,
    BATTERY_VOLTAGE_RANGES,
} from '@/types/iot-devices'

type OptionalDate = string | Date | undefined | null

export interface GatewayLike {
    id: string
    name: string
    macAddress?: string
    ipAddress?: string
    floorId?: string
    status?: string
    createdAt?: OptionalDate
    lastSeen?: OptionalDate
    position?: { x?: number; y?: number; z?: number }
    cloudData?: Record<string, any>
}

export interface AnchorLike {
    id: string
    gatewayId?: string
    name: string
    macAddress?: string
    status?: string
    isBound?: boolean
    lastSeen?: OptionalDate
    position?: { x?: number; y?: number; z?: number }
    cloudData?: Record<string, any>
    createdAt?: OptionalDate
}

export interface PipelineError {
    deviceId: string
    errors: string[]
}

export interface GatewayPipelineResult {
    flattened: FlattenedGatewayData[]
    errors: PipelineError[]
}

export interface AnchorPipelineResult {
    flattened: FlattenedAnchorData[]
    errors: PipelineError[]
}

export interface RawGatewayInput {
    id: string
    name: string
    floorId?: string
    macAddress?: string
    ipAddress?: string
    status?: string
    createdAt?: OptionalDate
    lastSeen?: OptionalDate
    position?: { x?: number; y?: number; z?: number }
    cloudData?: Record<string, any>
}

export interface RawAnchorInput {
    id: string
    gatewayId?: string
    name: string
    macAddress?: string
    status?: string
    isBound?: boolean
    lastSeen?: OptionalDate
    position?: { x?: number; y?: number; z?: number }
    cloudData?: Record<string, any>
    cloudGatewayId?: number // 关联的 Gateway 云端 ID
}

export const runGatewayPipeline = (items: RawGatewayInput[]): GatewayPipelineResult => {
    const flattened: FlattenedGatewayData[] = []
    const errors: PipelineError[] = []

    items.forEach((item) => {
        const flat = enrichGateway(flattenGateway(item))
        const validationErrors = validateFlattenedGateway(flat)

        if (validationErrors.length > 0) {
            errors.push({
                deviceId: flat.device_id,
                errors: validationErrors,
            })
        } else {
            flattened.push(flat)
        }
    })

    return { flattened, errors }
}

export const runAnchorPipeline = (items: RawAnchorInput[]): AnchorPipelineResult => {
    const flattened: FlattenedAnchorData[] = []
    const errors: PipelineError[] = []

    items.forEach((item) => {
        const flat = enrichAnchor(flattenAnchor(item))
        const validationErrors = validateFlattenedAnchor(flat)

        if (validationErrors.length > 0) {
            errors.push({
                deviceId: flat.device_id,
                errors: validationErrors,
            })
        } else {
            flattened.push(flat)
        }
    })

    return { flattened, errors }
}

export const serializeGateway = (gateway: GatewayLike): FlattenedGatewayData => {
    const flattened = enrichGateway(flattenGateway(gateway))
    flattened.extra_data = flattened.extra_data || {}
    flattened.extra_data.raw_gateway = gateway
    return flattened
}

export const serializeAnchor = (anchor: AnchorLike): FlattenedAnchorData => {
    const flattened = enrichAnchor(flattenAnchor(anchor))
    flattened.extra_data = flattened.extra_data || {}
    flattened.extra_data.raw_anchor = anchor
    return flattened
}

export const deserializeGateway = (flat: FlattenedGatewayData): GatewayLike => {
    if (flat.extra_data?.raw_gateway) {
        // 确保 raw_gateway 有正确的 id（优先使用顶层的 id）
        const rawGateway = flat.extra_data.raw_gateway
        // 优先使用顶层 id（如果存在），确保与后端存储的 id 一致
        const correctId = flat.id || rawGateway.id || rawGateway.macAddress || `gateway_${Date.now()}`
        return reviveGateway({
            ...rawGateway,
            id: correctId,
        })
    }

    // 重新组合 cloudData 对象
    const cloudData: Record<string, any> = {}

    // 基本字段
    if (flat.content !== undefined) cloudData.content = flat.content
    if (flat.fw_version !== undefined) cloudData.fw_ver = flat.fw_version
    if (flat.fw_serial !== undefined) cloudData.fw_serial = flat.fw_serial
    if (flat.battery_voltage !== undefined) cloudData.battery_voltage = flat.battery_voltage
    if (flat.rssi !== undefined) cloudData.rssi = flat.rssi
    if (flat.signal_quality !== undefined) cloudData.signal_quality = flat.signal_quality
    if (flat.config_mode !== undefined) cloudData.config_mode = flat.config_mode

    // UWB 相关字段
    if (flat.uwb_hw_com_ok !== undefined) cloudData.uwb_hw_com_ok = flat.uwb_hw_com_ok
    if (flat.uwb_joined !== undefined) cloudData.uwb_joined = flat.uwb_joined
    if (flat.uwb_network_id !== undefined) cloudData.uwb_network_id = flat.uwb_network_id
    if (flat.uwb_tx_power_changed !== undefined) cloudData.uwb_tx_power_changed = flat.uwb_tx_power_changed

    // 重新组合 uwb_tx_power 对象
    const uwbTxPower: Record<string, any> = {}
    if (flat.uwb_tx_power_boost_norm !== undefined) uwbTxPower.boost_norm = flat.uwb_tx_power_boost_norm
    if (flat.uwb_tx_power_boost_500 !== undefined) uwbTxPower.boost_500 = flat.uwb_tx_power_boost_500
    if (flat.uwb_tx_power_boost_250 !== undefined) uwbTxPower.boost_250 = flat.uwb_tx_power_boost_250
    if (flat.uwb_tx_power_boost_125 !== undefined) uwbTxPower.boost_125 = flat.uwb_tx_power_boost_125
    if (Object.keys(uwbTxPower).length > 0) cloudData.uwb_tx_power = uwbTxPower

    // WiFi 相关字段
    if (flat.connected_ap !== undefined) cloudData.connected_ap = flat.connected_ap
    if (flat.wifi_tx_power !== undefined) cloudData.wifi_tx_power = flat.wifi_tx_power
    if (flat.set_wifi_max_tx_power !== undefined) cloudData.set_wifi_max_tx_power = flat.set_wifi_max_tx_power

    // BLE 相关字段
    if (flat.ble_scan_time !== undefined) cloudData.ble_scan_time = flat.ble_scan_time
    if (flat.ble_scan_pause_time !== undefined) cloudData.ble_scan_pause_time = flat.ble_scan_pause_time

    // 电源相关
    if (flat.five_v_plugged !== undefined) cloudData.five_v_plugged = flat.five_v_plugged

    // 重新组合 pub_topic 对象
    const pubTopic: Record<string, any> = {}
    if (flat.pub_topic_anchor_config !== undefined) pubTopic.anchor_config = flat.pub_topic_anchor_config
    if (flat.pub_topic_tag_config !== undefined) pubTopic.tag_config = flat.pub_topic_tag_config
    if (flat.pub_topic_location !== undefined) pubTopic.location = flat.pub_topic_location
    if (flat.pub_topic_message !== undefined) pubTopic.message = flat.pub_topic_message
    if (flat.pub_topic_ack_from_node !== undefined) pubTopic.ack_from_node = flat.pub_topic_ack_from_node
    if (flat.pub_topic_health !== undefined) pubTopic.health = flat.pub_topic_health
    if (Object.keys(pubTopic).length > 0) cloudData.pub_topic = pubTopic

    // 重新组合 sub_topic 对象
    const subTopic: Record<string, any> = {}
    if (flat.sub_topic_downlink !== undefined) {
        subTopic.downlink = flat.sub_topic_downlink
        // 只要 downlink 字段存在（即使是空字符串），就创建 sub_topic 对象
        cloudData.sub_topic = subTopic
    }

    // 数据丢弃统计
    if (flat.discard_iot_data_time !== undefined) cloudData.discard_iot_data_time = flat.discard_iot_data_time
    if (flat.discarded_iot_data !== undefined) cloudData.discarded_iot_data = flat.discarded_iot_data
    if (flat.total_discarded_data !== undefined) cloudData.total_discarded_data = flat.total_discarded_data

    // 时间戳
    if (flat.first_sync !== undefined) cloudData.first_sync = flat.first_sync
    if (flat.last_sync !== undefined) cloudData.last_sync = flat.last_sync
    if (flat.current !== undefined) cloudData.current = flat.current
    if (flat.received_at !== undefined) cloudData.receivedAt = flat.received_at

    // 添加 cloud_gateway_id 和 name 到 cloudData（如果存在）
    if (flat.cloud_gateway_id !== undefined) cloudData.gateway_id = flat.cloud_gateway_id
    if (flat.name !== undefined) cloudData.name = flat.name // 还原 cloudData.name（从顶层 name）

    // 使用顶层字段（保持原样）
    // 如果 cloudData 为空，尝试从 extra_data.raw_gateway.cloudData 中获取
    let finalCloudData = cloudData
    if (Object.keys(cloudData).length === 0) {
        // 优先使用 extra_data.raw_gateway.cloudData，然后是 extra_data.cloudData
        finalCloudData = flat.extra_data?.raw_gateway?.cloudData || flat.extra_data?.cloudData || {}
    }

    const revived: GatewayLike = {
        id: flat.id,
        name: flat.name,
        macAddress: flat.macAddress,
        ipAddress: flat.ipAddress,
        floorId: flat.floorId,
        status: flat.status,
        createdAt: flat.createdAt,
        lastSeen: flat.lastSeen,
        position: flat.position, // 保持 position 对象原样
        cloudData: finalCloudData,
    }

    return reviveGateway(revived)
}

export const deserializeAnchor = (flat: FlattenedAnchorData): AnchorLike => {
    if (flat.extra_data?.raw_anchor) {
        // 确保 raw_anchor 有正确的 id（优先使用顶层的 id）
        const rawAnchor = flat.extra_data.raw_anchor
        // 优先使用顶层 id（如果存在），确保与后端存储的 id 一致
        const correctId = flat.id || rawAnchor.id || rawAnchor.macAddress || `anchor_${Date.now()}`
        return reviveAnchor({
            ...rawAnchor,
            id: correctId,
        })
    }

    // 重新组合 cloudData 对象（从展平的 cloudData 字段）
    const cloudData: Record<string, any> = {}

    // 从展平的字段还原 cloudData
    if (flat.content !== undefined) cloudData.content = flat.content
    if (flat.cloud_gateway_id !== undefined) cloudData.gateway_id = flat.cloud_gateway_id
    if (flat.node !== undefined) cloudData.node = flat.node
    if (flat.name !== undefined) cloudData.name = flat.name // 还原 cloudData.name（从顶层 name）
    if (flat.cloud_anchor_id !== undefined) cloudData.id = flat.cloud_anchor_id
    if (flat.fw_update !== undefined) cloudData.fw_update = flat.fw_update ? 1 : 0
    if (flat.led_enabled !== undefined) cloudData.led = flat.led_enabled ? 1 : 0
    if (flat.ble_enabled !== undefined) cloudData.ble = flat.ble_enabled ? 1 : 0
    if (flat.is_initiator !== undefined) cloudData.initiator = flat.is_initiator ? 1 : 0
    // 从 cloud_position_x/y/z 还原 cloudData.position
    if (flat.cloud_position_x !== undefined || flat.cloud_position_y !== undefined || flat.cloud_position_z !== undefined) {
        cloudData.position = buildPosition(flat.cloud_position_x, flat.cloud_position_y, flat.cloud_position_z)
    }
    if (flat.received_at !== undefined) cloudData.receivedAt = flat.received_at
    if (flat.battery_voltage !== undefined) cloudData.battery_voltage = flat.battery_voltage
    if (flat.rssi !== undefined) cloudData.rssi = flat.rssi
    if (flat.heart_rate !== undefined) cloudData.heart_rate = flat.heart_rate
    if (flat.temperature !== undefined) cloudData.temperature = flat.temperature
    if (flat.humidity !== undefined) cloudData.humidity = flat.humidity

    // 使用顶层字段（保持原样）
    const revived: AnchorLike = {
        id: flat.id,
        gatewayId: flat.gatewayId,
        name: flat.name,
        macAddress: flat.macAddress,
        status: flat.status,
        isBound: Boolean(flat.gatewayId), // 从 gatewayId 推断
        lastSeen: flat.lastSeen,
        position: flat.position, // 保持 position 对象原样
        cloudData: Object.keys(cloudData).length > 0 ? cloudData : (flat.extra_data?.cloudData || {}),
        createdAt: flat.createdAt,
    }

    // 如果顶层有 cloudGatewayId，添加到返回对象中
    if (flat.cloudGatewayId !== undefined) {
        (revived as any).cloudGatewayId = flat.cloudGatewayId
    }

    return reviveAnchor(revived)
}

const flattenGateway = (raw: RawGatewayInput): FlattenedGatewayData => {
    const cloudData = raw.cloudData || {}
    const pubMsgData = cloudData?.pub?.msg?.data || {}

    const deviceId = raw.id || raw.macAddress || raw.name || `gateway_${Date.now()}`

    // 展开 pub_topic 对象
    const pubTopic = cloudData.pub_topic || {}
    // 展开 sub_topic 对象
    const subTopic = cloudData.sub_topic || {}
    // 展开 uwb_tx_power 对象
    const uwbTxPower = cloudData.uwb_tx_power || {}

    return {
        // 顶层字段保持原样（与 gateways copy.json 一致）
        id: deviceId,
        name: raw.name,
        macAddress: raw.macAddress,
        ipAddress: raw.ipAddress,
        floorId: raw.floorId,
        status: raw.status || 'unknown',
        position: raw.position, // 保持 position 对象原样
        createdAt: toIsoString(raw.createdAt),
        lastSeen: toIsoString(raw.lastSeen),
        // 只有 cloudData 中的字段被展平（使用 snake_case）
        // cloudData 相关字段（从 cloudData 展平）
        content: cloudData.content,
        cloud_gateway_id: numberOrUndefined(cloudData.gateway_id),
        fw_version: cloudData.fw_ver ?? cloudData.fw_version,
        fw_serial: numberOrUndefined(cloudData.fw_serial),
        uwb_hw_com_ok: cloudData.uwb_hw_com_ok,
        uwb_joined: cloudData.uwb_joined,
        uwb_network_id: numberOrUndefined(cloudData.uwb_network_id),
        uwb_tx_power_boost_norm: numberOrUndefined(uwbTxPower.boost_norm),
        uwb_tx_power_boost_500: numberOrUndefined(uwbTxPower.boost_500),
        uwb_tx_power_boost_250: numberOrUndefined(uwbTxPower.boost_250),
        uwb_tx_power_boost_125: numberOrUndefined(uwbTxPower.boost_125),
        uwb_tx_power_changed: cloudData.uwb_tx_power_changed,
        connected_ap: cloudData.connected_ap,
        wifi_tx_power: numberOrUndefined(cloudData.wifi_tx_power),
        set_wifi_max_tx_power: numberOrUndefined(cloudData.set_wifi_max_tx_power),
        ble_scan_time: numberOrUndefined(cloudData.ble_scan_time),
        ble_scan_pause_time: numberOrUndefined(cloudData.ble_scan_pause_time),
        battery_voltage: numberOrUndefined(cloudData.battery_voltage ?? pubMsgData.battery_voltage),
        five_v_plugged: cloudData.five_v_plugged,
        pub_topic_anchor_config: pubTopic.anchor_config,
        pub_topic_tag_config: pubTopic.tag_config,
        pub_topic_location: pubTopic.location,
        pub_topic_message: pubTopic.message,
        pub_topic_ack_from_node: pubTopic.ack_from_node,
        pub_topic_health: pubTopic.health,
        sub_topic_downlink: subTopic.downlink,
        discard_iot_data_time: numberOrUndefined(cloudData.discard_iot_data_time),
        discarded_iot_data: numberOrUndefined(cloudData.discarded_iot_data),
        total_discarded_data: numberOrUndefined(cloudData.total_discarded_data),
        first_sync: cloudData.first_sync,
        last_sync: cloudData.last_sync,
        current: cloudData.current,
        received_at: toIsoString(cloudData.receivedAt),
        // 其他 cloudData 字段
        rssi: numberOrUndefined(cloudData.rssi ?? pubMsgData.rssi),
        signal_quality: cloudData.signal_quality,
        config_mode: cloudData.config_mode,
        timestamp: toIsoString(cloudData.current ?? raw.lastSeen),
        processing_timestamp: new Date().toISOString(),
        // 用于标识
        device_type: 'gateway',
        extra_data: {
            raw_gateway: raw,
        },
    }
}

const flattenAnchor = (raw: RawAnchorInput): FlattenedAnchorData => {
    const cloudData = raw.cloudData || {}
    const pubMsgData = cloudData?.pub?.msg?.data || {}
    const cloudPosition = cloudData?.position || {}

    const deviceId = raw.id || raw.macAddress || raw.name || `anchor_${Date.now()}`

    // 获取 cloudGatewayId（从 raw 的 cloudGatewayId 或 cloudData.gateway_id）
    const cloudGatewayId = raw.cloudGatewayId ?? cloudData.gateway_id

    return {
        // 顶层字段保持原样（与 anchors copy.json 一致）
        id: deviceId,
        gatewayId: raw.gatewayId,
        name: raw.name,
        macAddress: raw.macAddress,
        status: raw.status || 'unknown',
        position: raw.position, // 保持 position 对象原样
        lastSeen: toIsoString(raw.lastSeen),
        createdAt: toIsoString((raw as any).createdAt),
        cloudGatewayId: cloudGatewayId,
        // 只有 cloudData 中的字段被展平（使用 snake_case）
        // cloudData 相关字段（从 cloudData 展平）
        content: cloudData.content,
        cloud_gateway_id: numberOrUndefined(cloudGatewayId ?? cloudData.gateway_id),
        node: cloudData.node,
        cloud_anchor_id: numberOrUndefined(cloudData.id),
        received_at: toIsoString(cloudData.receivedAt),
        fw_update: booleanFromFlag(cloudData.fw_update),
        led_enabled: booleanFromFlag(cloudData.led),
        ble_enabled: booleanFromFlag(cloudData.ble),
        is_initiator: booleanFromFlag(cloudData.initiator),
        cloud_position_x: numberOrUndefined(cloudPosition.x),
        cloud_position_y: numberOrUndefined(cloudPosition.y),
        cloud_position_z: numberOrUndefined(cloudPosition.z),
        // 其他 cloudData 字段
        battery_voltage: numberOrUndefined(cloudData.battery_voltage ?? pubMsgData.battery_voltage),
        rssi: numberOrUndefined(cloudData.rssi ?? pubMsgData.rssi),
        heart_rate: numberOrUndefined(pubMsgData.heart_rate),
        temperature: numberOrUndefined(pubMsgData.temperature),
        humidity: numberOrUndefined(pubMsgData.humidity),
        timestamp: toIsoString(cloudData.current ?? raw.lastSeen),
        processing_timestamp: new Date().toISOString(),
        // 用于标识
        device_type: 'anchor',
        extra_data: {
            raw_anchor: raw,
        },
    }
}

const enrichGateway = (flat: FlattenedGatewayData): FlattenedGatewayData => {
    const enriched: FlattenedGatewayData = {
        ...flat,
        processing_timestamp: new Date().toISOString(),
    }

    if (!enriched.signal_quality && typeof enriched.rssi === 'number') {
        enriched.signal_quality = resolveSignalQuality(enriched.rssi)
    }

    if (typeof enriched.battery_voltage === 'number') {
        enriched.battery_level = resolveBatteryLevel(enriched.battery_voltage)
    }

    return enriched
}

const enrichAnchor = (flat: FlattenedAnchorData): FlattenedAnchorData => {
    const enriched: FlattenedAnchorData = {
        ...flat,
        processing_timestamp: new Date().toISOString(),
    }

    // 计算 battery_level（如果 battery_voltage 存在）
    if (typeof enriched.battery_voltage === 'number') {
        enriched.battery_level = resolveBatteryLevel(enriched.battery_voltage)
    }

    return enriched
}

const validateFlattenedGateway = (flat: FlattenedGatewayData): string[] => {
    const errors: string[] = []

    // 使用顶层字段（保持原样）
    if (!flat.id) errors.push('id 缺失')
    if (!flat.name) errors.push('name 缺失')
    // device_type 是可选的，用于标识
    if (flat.device_type && flat.device_type !== 'gateway') {
        errors.push('device_type 必須為 gateway')
    }

    if (flat.rssi !== undefined && !(flat.rssi > -200 && flat.rssi < 0)) {
        errors.push(`RSSI 範圍錯誤: ${flat.rssi}`)
    }

    if (
        flat.battery_voltage !== undefined &&
        !(flat.battery_voltage > 2 && flat.battery_voltage < 5)
    ) {
        errors.push(`電壓範圍錯誤: ${flat.battery_voltage}`)
    }

    return errors
}

const validateFlattenedAnchor = (flat: FlattenedAnchorData): string[] => {
    const errors: string[] = []

    // 使用顶层字段（保持原样）
    if (!flat.id) errors.push('id 缺失')
    if (!flat.name) errors.push('name 缺失')
    // device_type 是可选的，用于标识
    if (flat.device_type && flat.device_type !== 'anchor') {
        errors.push('device_type 必須為 anchor')
    }

    if (flat.rssi !== undefined && !(flat.rssi > -200 && flat.rssi < 0)) {
        errors.push(`RSSI 範圍錯誤: ${flat.rssi}`)
    }

    if (
        flat.battery_voltage !== undefined &&
        !(flat.battery_voltage > 2 && flat.battery_voltage < 5)
    ) {
        errors.push(`電壓範圍錯誤: ${flat.battery_voltage}`)
    }

    if (flat.heart_rate !== undefined && !(flat.heart_rate > 30 && flat.heart_rate < 200)) {
        errors.push(`心率範圍錯誤: ${flat.heart_rate}`)
    }

    if (flat.temperature !== undefined && !(flat.temperature > 35 && flat.temperature < 42)) {
        errors.push(`溫度範圍錯誤: ${flat.temperature}`)
    }

    return errors
}

const toIsoString = (value: OptionalDate): string | undefined => {
    if (!value) return undefined
    const date = value instanceof Date ? value : new Date(value)
    if (Number.isNaN(date.getTime())) return undefined
    return date.toISOString()
}

const numberOrUndefined = (value: any): number | undefined => {
    if (typeof value === 'number') return value
    if (typeof value === 'string' && value.trim() !== '') {
        const parsed = Number(value)
        if (!Number.isNaN(parsed)) {
            return parsed
        }
    }
    return undefined
}

const booleanFromFlag = (value: any): boolean | undefined => {
    if (typeof value === 'boolean') return value
    if (typeof value === 'number') return value === 1
    if (typeof value === 'string') {
        if (value.toLowerCase() === 'true') return true
        if (value === '1') return true
        if (value === '0') return false
        if (value.toLowerCase() === 'false') return false
    }
    return undefined
}

const resolveSignalQuality = (rssi: number): string => {
    if (rssi >= RSSI_THRESHOLDS.EXCELLENT) return 'excellent'
    if (rssi >= RSSI_THRESHOLDS.GOOD) return 'good'
    if (rssi >= RSSI_THRESHOLDS.FAIR) return 'fair'
    if (rssi >= RSSI_THRESHOLDS.POOR) return 'poor'
    return 'poor'
}

const resolveBatteryLevel = (voltage: number): string => {
    if (voltage >= BATTERY_VOLTAGE_RANGES.FULL) return 'high'
    if (voltage >= BATTERY_VOLTAGE_RANGES.GOOD) return 'medium'
    if (voltage >= BATTERY_VOLTAGE_RANGES.MEDIUM) return 'low'
    if (voltage >= BATTERY_VOLTAGE_RANGES.LOW) return 'critical'
    return 'critical'
}

const reviveGateway = (gateway: GatewayLike): GatewayLike => ({
    ...gateway,
    createdAt: reviveDate(gateway.createdAt),
    lastSeen: reviveDate(gateway.lastSeen),
})

const reviveAnchor = (anchor: AnchorLike): AnchorLike => ({
    ...anchor,
    lastSeen: reviveDate(anchor.lastSeen),
    createdAt: reviveDate(anchor.createdAt),
})

const reviveDate = (value: OptionalDate): Date | undefined => {
    if (!value) return undefined
    if (value instanceof Date) return Number.isNaN(value.getTime()) ? undefined : value
    const parsed = new Date(value)
    return Number.isNaN(parsed.getTime()) ? undefined : parsed
}

const buildPosition = (x?: number, y?: number, z?: number) => {
    if (x === undefined && y === undefined && z === undefined) return undefined
    return { x, y, z }
}


