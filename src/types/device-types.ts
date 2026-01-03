// 基於 device_uid_topics_detail.md 的統一設備類型定義

// 設備唯一識別碼規則
export type DeviceUID =
    | `300B:${string}`      // 300B:<MAC>
    | `DIAPER:${string}`    // DIAPER:<MAC>
    | `PEDO:${string}`      // PEDO:<id>
    | `TAG:${string}`       // TAG:<id>
    | `ANCHOR:${string}`    // ANCHOR:<id>
    | `GATEWAY:${string}`   // GATEWAY:<gateway_id>

// 設備類型枚舉
export enum DeviceType {
    SMARTWATCH_300B = '300B',
    DIAPER_SENSOR = 'DIAPER',
    PEDOMETER = 'PEDO',
    UWB_TAG = 'TAG',
    UWB_ANCHOR = 'ANCHOR',
    GATEWAY = 'GATEWAY'
}

// 設備狀態
export enum DeviceStatus {
    ACTIVE = 'active',
    INACTIVE = 'inactive',
    OFFLINE = 'offline',
    ERROR = 'error'
}

// MQTT 監聽主題映射
export const DEVICE_TOPICS: Record<DeviceType, string[]> = {
    [DeviceType.SMARTWATCH_300B]: ['GWxxxx_Health'],
    [DeviceType.DIAPER_SENSOR]: ['GWxxxx_Health'],
    [DeviceType.PEDOMETER]: ['GWxxxx_Health'],
    [DeviceType.UWB_TAG]: ['GWxxxx_TagConf', 'GWxxxx_Loca', 'GWxxxx_Message'],
    [DeviceType.UWB_ANCHOR]: ['GWxxxx_AncConf', 'GWxxxx_Message'],
    [DeviceType.GATEWAY]: ['UWB/UWB_Gateway']
}

// 設備配置接口
interface DeviceTypeConfig {
    label: string
    icon: string
    color: string
    prefix: string
    uniqueFields: string[]
    dataTypes: string[]
}

// 設備類型配置
export const DEVICE_TYPE_CONFIG: Record<DeviceType, DeviceTypeConfig> = {
    [DeviceType.SMARTWATCH_300B]: {
        label: '健康監測手錶',
        icon: 'Watch',
        color: 'bg-blue-100 text-blue-700',
        prefix: '300B',
        uniqueFields: ['MAC', 'gateway id', 'serial no'],
        dataTypes: ['health', 'vitals', 'sleep', 'activity']
    },
    [DeviceType.DIAPER_SENSOR]: {
        label: '智能尿布傳感器',
        icon: 'Baby',
        color: 'bg-purple-100 text-purple-700',
        prefix: 'DIAPER',
        uniqueFields: ['MAC', 'gateway id', 'serial no'],
        dataTypes: ['moisture', 'temperature', 'humidity']
    },
    [DeviceType.PEDOMETER]: {
        label: '運動傳感器',
        icon: 'Activity',
        color: 'bg-green-100 text-green-700',
        prefix: 'PEDO',
        uniqueFields: ['id', 'gateway id', 'serial no'],
        dataTypes: ['step', 'fall', 'sleep', 'nap', 'seden']
    },
    [DeviceType.UWB_TAG]: {
        label: 'UWB定位標籤',
        icon: 'MapPin',
        color: 'bg-orange-100 text-orange-700',
        prefix: 'TAG',
        uniqueFields: ['id', 'gateway id', 'serial no'],
        dataTypes: ['location', 'config', 'info', 'tx_power']
    },
    [DeviceType.UWB_ANCHOR]: {
        label: 'UWB定位錨點',
        icon: 'Anchor',
        color: 'bg-indigo-100 text-indigo-700',
        prefix: 'ANCHOR',
        uniqueFields: ['id', 'gateway id', 'serial no'],
        dataTypes: ['config', 'info', '5V_status']
    },
    [DeviceType.GATEWAY]: {
        label: 'UWB閘道器',
        icon: 'Wifi',
        color: 'bg-cyan-100 text-cyan-700',
        prefix: 'GATEWAY',
        uniqueFields: ['gateway id', 'name', 'fw ver'],
        dataTypes: ['gateway topic', 'config', 'status', 'network']
    }
}

// 院友接口
export interface Resident {
    id: string
    patientCode?: string
    name: string
    age: number
    gender: string
    room: string
    status: 'good' | 'attention' | 'critical'
    emergencyContact: {
        name: string
        relationship: string
        phone: string
    }
    careNotes: string
    avatar?: string
    expectedHome?: string
    expectedFloor?: string
}

// 設備接口
export interface Device {
    id: string
    deviceUid: DeviceUID
    deviceType: DeviceType
    name: string
    hardwareId: string
    status: DeviceStatus
    residentId?: string
    lastData?: Record<string, any>
    lastSeen?: string
    gatewayId?: string
    firmwareVersion?: string
    batteryLevel?: number
    createdAt: string
    updatedAt: string
}

// 設備綁定接口
export interface DeviceBinding {
    id: string
    residentId: string
    deviceId: string
    bindingType: 'primary' | 'secondary'
    createdAt: string
    updatedAt: string
    notes?: string
}

// 設備數據接口
export interface DeviceData {
    id: string
    deviceId: string
    deviceUid: DeviceUID
    dataType: string
    content: string
    payload: Record<string, any>
    timestamp: string
    topic: string
    gatewayId?: string
    serialNo?: string
}

// 健康數據類型
export interface HealthData {
    heartRate?: number
    bloodPressure?: {
        systolic: number
        diastolic: number
    }
    spO2?: number
    temperature?: number
    steps?: number
    sleep?: {
        totalTime: number
        deepSleep: number
        lightSleep: number
        sleepQuality: number
    }
    battery?: number
    wear?: boolean
}

// 位置數據類型
export interface LocationData {
    x: number
    y: number
    z: number
    quality: number
    timestamp: string
}

// 設備唯一識別碼生成工具
export class DeviceUIDGenerator {
    static generate300B(mac: string): DeviceUID {
        return `300B:${mac}` as DeviceUID
    }

    static generateDiaper(mac: string): DeviceUID {
        return `DIAPER:${mac}` as DeviceUID
    }

    static generatePedo(id: string): DeviceUID {
        return `PEDO:${id}` as DeviceUID
    }

    static generateTag(id: string): DeviceUID {
        return `TAG:${id}` as DeviceUID
    }

    static generateAnchor(id: string): DeviceUID {
        return `ANCHOR:${id}` as DeviceUID
    }

    static generateGateway(gatewayId: string | number): DeviceUID {
        return `GATEWAY:${gatewayId}` as DeviceUID
    }

    static parse(deviceUid: DeviceUID): { type: DeviceType; identifier: string } {
        const [type, identifier] = deviceUid.split(':')
        return {
            type: type as DeviceType,
            identifier
        }
    }
}

// 數據驗證工具
export class DeviceDataValidator {
    static validate300B(data: any): boolean {
        return data.content === '300B' &&
            data.MAC &&
            data['gateway id'] !== undefined
    }

    static validateDiaper(data: any): boolean {
        return data.content === 'diaper DV1' &&
            data.MAC &&
            data['gateway id'] !== undefined
    }

    static validatePedo(data: any): boolean {
        return data.content?.startsWith('motion info') &&
            data.id !== undefined &&
            data['gateway id'] !== undefined
    }

    static validateTag(data: any): boolean {
        return ['config', 'location', 'info', 'tx power config'].some(type =>
            data.content?.includes(type)
        ) && data.id !== undefined
    }

    static validateAnchor(data: any): boolean {
        return data.node === 'ANCHOR' &&
            (data.content === 'config' || data.content === 'info') &&
            data.id !== undefined
    }

    static validateGateway(data: any): boolean {
        return data.content === 'gateway topic' &&
            (data['gateway id'] !== undefined || data.gateway_id !== undefined) &&
            data.name !== undefined
    }
}
