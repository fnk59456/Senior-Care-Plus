// MQTT 相關類型定義

// Gateway 配置的 Topic 映射
export interface GatewayTopicConfig {
    health?: string
    location?: string
    ack?: string
    message?: string
    tagConfig?: string
    anchorConfig?: string
    downlink?: string
}

// MQTT 消息標準格式
export interface MQTTMessage {
    topic: string
    payload: any
    rawPayload: string
    timestamp: Date
    gateway: Gateway | null
}

// Gateway 事件類型
export type GatewayEvent =
    | { type: 'gateway_added', gateway: Gateway, topics: GatewayTopicConfig }
    | { type: 'gateway_removed', gateway: Gateway, topics: GatewayTopicConfig }
    | { type: 'gateway_updated', gateway: Gateway, oldTopics: GatewayTopicConfig, newTopics: GatewayTopicConfig }

// 消息處理器
export type MessageHandler = (message: MQTTMessage) => void

// 消息過濾器
export interface MessageFilter {
    topic?: string
    gatewayId?: string
    since?: Date
    contentType?: string
}

// Gateway 類型（從 UWBLocationPage 提取）
export interface Gateway {
    id: string
    floorId: string
    name: string
    macAddress: string
    ipAddress: string
    status: 'online' | 'offline' | 'error'
    lastSeen?: Date
    createdAt: Date
    cloudData?: CloudGatewayData
}

// 雲端 Gateway 數據類型
export interface CloudGatewayData {
    content: string
    gateway_id: number
    name: string
    fw_ver: string
    fw_serial: number
    uwb_hw_com_ok: string
    uwb_joined: string
    uwb_network_id: number
    connected_ap: string
    wifi_tx_power: number
    set_wifi_max_tx_power: number
    ble_scan_time: number
    ble_scan_pause_time: number
    battery_voltage: number
    five_v_plugged: string
    uwb_tx_power_changed: string
    uwb_tx_power: {
        boost_norm: number
        boost_500: number
        boost_250: number
        boost_125: number
    }
    pub_topic: {
        anchor_config: string
        tag_config: string
        location: string
        message: string
        ack_from_node: string
        health: string
    }
    sub_topic?: {
        downlink: string
    }
    discard_iot_data_time: number
    discarded_iot_data: number
    total_discarded_data: number
    first_sync: string
    last_sync: string
    current: string
    receivedAt: Date
}

// 健康數據記錄
export interface HealthRecord {
    MAC: string
    gatewayId: string
    deviceName?: string
    heartRate?: number
    skinTemp?: number
    roomTemp?: number
    SpO2?: number
    bpSyst?: number
    bpDiast?: number
    steps?: number
    lightSleep?: number
    deepSleep?: number
    batteryLevel?: number
    signalStrength?: number
    timestamp: Date
    // 院友信息（可選）
    residentId?: string
    residentName?: string
    residentRoom?: string
}

// 位置數據記錄
export interface LocationRecord {
    deviceId: string
    gatewayId: string
    position: {
        x: number
        y: number
        z: number
        quality: number
    }
    floorId?: string
    timestamp: Date
    // 設備和院友信息
    deviceName?: string
    residentId?: string
    residentName?: string
    residentRoom?: string
}

// 尿布監控記錄
export interface DiaperRecord {
    MAC: string
    gatewayId: string
    deviceName?: string
    temp?: number
    humidity?: number
    buttonPressed?: boolean
    batteryLevel?: number
    timestamp: Date
    // 院友信息
    residentId?: string
    residentName?: string
    residentRoom?: string
}

// 設備狀態記錄
export interface DeviceStatusRecord {
    deviceId: string
    deviceUid: string
    deviceType: 'gateway' | 'anchor' | 'tag'
    status: 'online' | 'offline' | 'error' | 'active' | 'inactive'
    batteryLevel?: number
    signalStrength?: number
    lastSeen: Date
    position?: {
        x: number
        y: number
        z: number
        quality: number
    }
}


