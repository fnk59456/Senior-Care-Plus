/**
 * SeniorCarePlusDataFlow 對應的 TypeScript 類型
 * 從 backend dataflow 專案複製，確保前後端共用同一份 schema
 * 最後同步：2025-11-17
 */

export interface FlattenedGatewayData {
    // 顶层字段保持原样（与 gateways copy.json 一致）
    id: string
    name: string
    macAddress?: string
    ipAddress?: string
    floorId?: string
    status: string
    position?: { x?: number; y?: number; z?: number }
    createdAt?: string
    lastSeen?: string
    // 只有 cloudData 中的字段被展平（使用 snake_case）
    // cloudData 相关字段（从 cloudData 展平）
    content?: string
    cloud_gateway_id?: number
    fw_version?: string
    fw_serial?: number
    uwb_hw_com_ok?: string
    uwb_joined?: string
    uwb_network_id?: number
    uwb_tx_power_boost_norm?: number
    uwb_tx_power_boost_500?: number
    uwb_tx_power_boost_250?: number
    uwb_tx_power_boost_125?: number
    uwb_tx_power_changed?: string
    connected_ap?: string
    wifi_tx_power?: number
    set_wifi_max_tx_power?: number
    ble_scan_time?: number
    ble_scan_pause_time?: number
    battery_voltage?: number
    five_v_plugged?: string
    pub_topic_anchor_config?: string
    pub_topic_tag_config?: string
    pub_topic_location?: string
    pub_topic_message?: string
    pub_topic_ack_from_node?: string
    pub_topic_health?: string
    sub_topic_downlink?: string
    discard_iot_data_time?: number
    discarded_iot_data?: number
    total_discarded_data?: number
    first_sync?: string
    last_sync?: string
    current?: string
    received_at?: string
    // 其他 cloudData 字段
    rssi?: number
    signal_quality?: string
    config_mode?: string
    timestamp?: string
    processing_timestamp?: string
    battery_level?: string
    // 用于标识和额外数据
    device_type?: 'gateway' // 可选，用于标识
    extra_data?: Record<string, any>
}

export interface FlattenedAnchorData {
    // 顶层字段保持原样（与 anchors copy.json 一致）
    id: string
    gatewayId?: string
    name: string
    macAddress?: string
    status: string
    position?: { x?: number; y?: number; z?: number }
    lastSeen?: string
    createdAt?: string
    cloudGatewayId?: number
    // 只有 cloudData 中的字段被展平（使用 snake_case）
    // cloudData 相关字段（从 cloudData 展平）
    content?: string
    cloud_gateway_id?: number
    node?: string
    cloud_anchor_id?: number
    received_at?: string
    fw_update?: boolean
    led_enabled?: boolean
    ble_enabled?: boolean
    is_initiator?: boolean
    cloud_position_x?: number
    cloud_position_y?: number
    cloud_position_z?: number
    // 其他 cloudData 字段
    battery_voltage?: number
    rssi?: number
    heart_rate?: number
    temperature?: number
    humidity?: number
    timestamp?: string
    processing_timestamp?: string
    battery_level?: string
    // 用于标识和额外数据
    device_type?: 'anchor' // 可选，用于标识
    extra_data?: Record<string, any>
}

export interface GatewayResponse {
    success: boolean
    data: FlattenedGatewayData
    message?: string
}

export interface GatewayListResponse {
    success: boolean
    data: FlattenedGatewayData[]
    count: number
    message?: string
}

export interface AnchorResponse {
    success: boolean
    data: FlattenedAnchorData
    message?: string
}

export interface AnchorListResponse {
    success: boolean
    data: FlattenedAnchorData[]
    count: number
    message?: string
}

export type DeviceData = FlattenedGatewayData | FlattenedAnchorData

export type SignalQuality = 'excellent' | 'good' | 'fair' | 'poor'

export const RSSI_THRESHOLDS = {
    EXCELLENT: -50,
    GOOD: -70,
    FAIR: -85,
    POOR: -100,
} as const

export const BATTERY_VOLTAGE_RANGES = {
    FULL: 4,
    GOOD: 3.5,
    MEDIUM: 3,
    LOW: 2.5,
}


