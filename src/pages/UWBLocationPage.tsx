import React, { useState, useEffect, useRef, useCallback } from "react"
// @ts-ignore
import mqtt from "mqtt"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import {
    Building2,
    Plus,
    Edit,
    Trash2,
    Home,
    Layers3,
    Wifi,
    MapPin,
    Settings,
    Activity,
    AlertCircle,
    CheckCircle2,
    Download,
    Anchor,
    Tag,
    Radio,
    Loader2,
    Play,
    Square,
    RefreshCw,
    Signal,
    Battery,
    Upload,
    Map,
    Target,
    Crosshair,
    Save,
    RotateCcw,
    Image,
    Ruler,
    Loader2 as CloudIcon,
    RefreshCw as RefreshIcon
} from "lucide-react"

// 雲端 MQTT 設置
const CLOUD_MQTT_URL = `${import.meta.env.VITE_MQTT_PROTOCOL}://${import.meta.env.VITE_MQTT_BROKER}:${import.meta.env.VITE_MQTT_PORT}/mqtt`
const CLOUD_MQTT_TOPIC = "UWB/UWB_Gateway"
const CLOUD_MQTT_OPTIONS = {
    username: import.meta.env.VITE_MQTT_USERNAME,
    password: import.meta.env.VITE_MQTT_PASSWORD
}

// 數據類型定義
interface Home {
    id: string
    name: string
    description: string
    address: string
    createdAt: Date
}

interface Floor {
    id: string
    homeId: string
    name: string
    level: number
    mapImage?: string // base64圖片數據
    dimensions?: {
        width: number
        height: number
        realWidth: number // 實際寬度(米)
        realHeight: number // 實際高度(米)
    }
    calibration?: {
        originPixel: { x: number, y: number } // 原點的pixel坐標
        originCoordinates?: { x: number, y: number } // 原點的實際坐標
        pixelToMeterRatio: number // pixel/米比例
        scalePoints?: { // 比例標定的兩個點
            point1: { x: number, y: number } | null
            point2: { x: number, y: number } | null
        }
        realDistance?: number // 兩點之間的實際距離(米)
        isCalibrated: boolean // 是否已校準
    }
    createdAt: Date
}

interface Gateway {
    id: string
    floorId: string
    name: string
    macAddress: string
    ipAddress: string
    status: 'online' | 'offline' | 'error'
    lastSeen?: Date
    createdAt: Date
    // 新增：雲端 Gateway 的完整數據
    cloudData?: CloudGatewayData
}

interface AnchorDevice {
    id: string
    gatewayId: string
    name: string
    macAddress: string
    status: 'paired' | 'unpaired' | 'calibrating' | 'active' | 'error'
    position?: {
        x: number
        y: number
        z: number
    }
    signalStrength?: number
    batteryLevel?: number
    lastSeen?: Date
    createdAt: Date
    // 新增：雲端 Anchor 的完整數據
    cloudData?: CloudAnchorData
    // 新增：關聯的 Gateway 雲端 ID
    cloudGatewayId?: number
}

interface TagDevice {
    id: string
    gatewayId: string // 新增：关联的网关ID
    name: string
    macAddress: string
    type: 'person'
    status: 'active' | 'inactive' | 'low_battery' | 'lost'
    assignedTo?: string // 分配給誰
    batteryLevel?: number
    lastPosition?: {
        x: number
        y: number
        z: number
        floorId: string
        timestamp: Date
    }
    createdAt: Date
    // 新增：關聯的雲端 Gateway ID，參考錨點配對的實現
    cloudGatewayId?: number
}

// 雲端 Gateway 數據類型 (更新為正確的字段名稱)
type CloudGatewayData = {
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
    sub_topic: {
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

// 發現的 Gateway 類型
type DiscoveredGateway = {
    gateway_id: number
    name: string
    fw_ver: string
    uwb_joined: string
    uwb_network_id: number
    connected_ap: string
    battery_voltage: number
    five_v_plugged: string
    lastSeen: Date
    recordCount: number
    isOnline: boolean
}

// 模擬數據
const MOCK_HOMES: Home[] = [
    {
        id: "home_1",
        name: "陽光養老院",
        description: "專業的長者照護機構，提供全方位的照護服務",
        address: "台北市信義區信義路五段7號",
        createdAt: new Date("2024-01-15")
    },
    {
        id: "home_2",
        name: "康寧護理之家",
        description: "溫馨家庭式的護理照護環境",
        address: "台北市大安區復興南路一段390號",
        createdAt: new Date("2024-01-20")
    }
]

const MOCK_FLOORS: Floor[] = [
    {
        id: "floor_1",
        homeId: "home_1",
        name: "1樓大廳",
        level: 1,
        mapImage: "data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAwIiBoZWlnaHQ9IjMwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KICA8cmVjdCB3aWR0aD0iNDAwIiBoZWlnaHQ9IjMwMCIgZmlsbD0iI2Y5ZjlmOSIgc3Ryb2tlPSIjMzMzIiBzdHJva2Utd2lkdGg9IjIiLz4KICA8IS0tIERhaWw0dSBIYWxsIC0tPgogIDxyZWN0IHg9IjIwIiB5PSIyMCIgd2lkdGg9IjE2MCIgaGVpZ2h0PSIxMjAiIGZpbGw9IiNlZWUiIHN0cm9rZT0iIzY2NiIgc3Ryb2tlLXdpZHRoPSIxIi8+CiAgPHRleHQgeD0iMTAwIiB5PSI4MCIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZm9udC1mYW1pbHk9IkFyaWFsIiBmb250LXNpemU9IjE0IiBmaWxsPSIjMzMzIj7lpKflu4A8L3RleHQ+CiAgPCEtLSBNZWRpY2FsIFJvb20gLS0+CiAgPHJlY3QgeD0iMjAwIiB5PSIyMCIgd2lkdGg9IjE4MCIgaGVpZ2h0PSIxMjAiIGZpbGw9IiNmNWY1ZjUiIHN0cm9rZT0iIzY2NiIgc3Ryb2tlLXdpZHRoPSIxIi8+CiAgPHRleHQgeD0iMjkwIiB5PSI4MCIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZm9udC1mYW1pbHk9IkFyaWFsIiBmb250LXNpemU9IjE0IiBmaWxsPSIjMzMzIj7ljLvogYvlrqQ8L3RleHQ+CiAgPCEtLSBDb3JyaWRvciAtLT4KICA8cmVjdCB4PSIyMCIgeT0iMTYwIiB3aWR0aD0iMzYwIiBoZWlnaHQ9IjEyMCIgZmlsbD0iI2Y5ZjlmOSIgc3Ryb2tlPSIjNjY2IiBzdHJva2Utd2lkdGg9IjEiLz4KICA8dGV4dCB4PSIyMDAiIHk9IjIyMCIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZm9udC1mYW1pbHk9IkFyaWFsIiBmb250LXNpemU9IjE0IiBmaWxsPSIjMzMzIj7ot5DlubM8L3RleHQ+Cjwvc3ZnPg==", // 簡單的樓層示意圖
        dimensions: {
            width: 800,
            height: 600,
            realWidth: 40,
            realHeight: 30
        },
        calibration: {
            originPixel: { x: 50, y: 50 },
            pixelToMeterRatio: 10,
            isCalibrated: true
        },
        createdAt: new Date("2024-01-16")
    },
    {
        id: "floor_2",
        homeId: "home_1",
        name: "2樓住宿區A",
        level: 2,
        dimensions: {
            width: 1000,
            height: 800,
            realWidth: 50,
            realHeight: 40
        },
        createdAt: new Date("2024-01-16")
    }
]

const MOCK_GATEWAYS: Gateway[] = [
    {
        id: "gw_1",
        floorId: "floor_1",
        name: "大廳主要閘道器",
        macAddress: "AA:BB:CC:DD:EE:01",
        ipAddress: "192.168.1.101",
        status: "online",
        lastSeen: new Date(),
        createdAt: new Date("2024-01-17")
    },
    {
        id: "gw_2",
        floorId: "floor_2",
        name: "住宿區閘道器A",
        macAddress: "AA:BB:CC:DD:EE:02",
        ipAddress: "192.168.1.102",
        status: "offline",
        lastSeen: new Date(Date.now() - 300000), // 5分鐘前
        createdAt: new Date("2024-01-18")
    }
]

const MOCK_ANCHORS: AnchorDevice[] = [
    {
        id: "anchor_1",
        gatewayId: "gw_1",
        name: "大廳錨點A1",
        macAddress: "11:22:33:44:55:01",
        status: "active",
        position: { x: 5.0, y: 3.0, z: 2.8 },
        signalStrength: 85,
        batteryLevel: 92,
        lastSeen: new Date(),
        createdAt: new Date("2024-01-19")
    },
    {
        id: "anchor_2",
        gatewayId: "gw_1",
        name: "大廳錨點A2",
        macAddress: "11:22:33:44:55:02",
        status: "active",
        position: { x: 35.0, y: 3.0, z: 2.8 },
        signalStrength: 78,
        batteryLevel: 87,
        lastSeen: new Date(),
        createdAt: new Date("2024-01-19")
    },
    {
        id: "anchor_3",
        gatewayId: "gw_1",
        name: "大廳錨點A3",
        macAddress: "11:22:33:44:55:03",
        status: "calibrating",
        signalStrength: 65,
        batteryLevel: 45,
        lastSeen: new Date(Date.now() - 120000), // 2分鐘前
        createdAt: new Date("2024-01-20")
    },
    {
        id: "anchor_4",
        gatewayId: "gw_2",
        name: "住宿區錨點B1",
        macAddress: "11:22:33:44:55:04",
        status: "unpaired",
        signalStrength: 0,
        createdAt: new Date("2024-01-21")
    }
]

const MOCK_TAGS: TagDevice[] = [
    {
        id: "tag_1",
        gatewayId: "gw_1", // 关联到第一个网关
        name: "長者-張三",
        macAddress: "AA:11:BB:22:CC:01",
        type: "person",
        status: "active",
        assignedTo: "張三",
        batteryLevel: 78,
        lastPosition: {
            x: 12.5,
            y: 8.3,
            z: 1.2,
            floorId: "floor_1", // 對應 gw_1 的 floorId
            timestamp: new Date(Date.now() - 30000) // 30秒前
        },
        createdAt: new Date("2024-01-22")
    },
    {
        id: "tag_2",
        gatewayId: "gw_2", // 关联到第二个网关
        name: "長者-李四",
        macAddress: "AA:11:BB:22:CC:02",
        type: "person",
        status: "active",
        assignedTo: "李四",
        batteryLevel: 92,
        lastPosition: {
            x: 25.0,
            y: 15.7,
            z: 1.2,
            floorId: "floor_2",
            timestamp: new Date(Date.now() - 45000) // 45秒前
        },
        createdAt: new Date("2024-01-22")
    },
    {
        id: "tag_3",
        gatewayId: "gw_1", // 关联到第一个网关
        name: "輪椅設備-01",
        macAddress: "AA:11:BB:22:CC:03",
        type: "person",
        status: "inactive",
        batteryLevel: 23,
        lastPosition: {
            x: 8.0,
            y: 12.0,
            z: 0.8,
            floorId: "floor_1",
            timestamp: new Date(Date.now() - 1800000) // 30分鐘前
        },
        createdAt: new Date("2024-01-23")
    },
    {
        id: "tag_4",
        gatewayId: "gw_2", // 关联到第二个网关
        name: "護理推車-A",
        macAddress: "AA:11:BB:22:CC:04",
        type: "person",
        status: "low_battery",
        batteryLevel: 12,
        lastPosition: {
            x: 18.5,
            y: 6.2,
            z: 0.9,
            floorId: "floor_2",
            timestamp: new Date(Date.now() - 600000) // 10分鐘前
        },
        createdAt: new Date("2024-01-24")
    }
]



// 雲端 Anchor 數據類型
type CloudAnchorData = {
    content: string
    gateway_id: number
    node: string
    name: string
    id: number
    fw_update: number
    led: number
    ble: number
    initiator: number
    position: {
        x: number
        y: number
        z: number
    }
    receivedAt: Date
}

// 發現的雲端 Anchor 類型
type DiscoveredCloudAnchor = {
    id: number
    name: string
    gateway_id: number
    fw_update: number
    led: number
    ble: number
    initiator: number
    position: {
        x: number
        y: number
        z: number
    }
    lastSeen: Date
    recordCount: number
    isOnline: boolean
}

export default function UWBLocationPage() {
    // 從 localStorage 加載數據的輔助函數（含智能恢復）
    const loadFromStorage = <T,>(key: string, defaultValue: T): T => {
        try {
            const stored = localStorage.getItem(`uwb_${key}`)
            if (!stored) {
                console.log(`📭 ${key}: 無存儲數據，使用默認值`)
                return defaultValue
            }

            console.log(`📦 ${key}: 開始解析存儲數據`)
            const data = JSON.parse(stored)

            // 修復 Date 對象序列化問題
            const restored = restoreDateObjects(data, key)
            console.log(`✅ ${key}: 數據加載完成`)
            return restored
        } catch (error) {
            console.warn(`❌ 無法從 localStorage 加載 ${key}:`, error)

            // 🔄 智能恢復：嘗試從完整備份恢復
            try {
                const backup = localStorage.getItem('uwb_full_backup')
                if (backup) {
                    const backupData = JSON.parse(backup)
                    if (backupData[key]) {
                        console.log(`🔄 從完整備份恢復 ${key}`)
                        return restoreDateObjects(backupData[key], key)
                    }
                }
            } catch (backupError) {
                console.warn(`❌ 備份恢復也失敗:`, backupError)
            }

            return defaultValue
        }
    }

    // 恢復 Date 對象的輔助函數
    const restoreDateObjects = (data: any, key: string): any => {
        if (!data) return data

        // console.log(`🔄 正在恢復 ${key} 的 Date 對象...`) // 簡化日誌

        try {
            if (key === 'homes' && Array.isArray(data)) {
                return data.map((home: any) => ({
                    ...home,
                    createdAt: new Date(home.createdAt)
                }))
            }

            if (key === 'floors' && Array.isArray(data)) {
                return data.map((floor: any) => ({
                    ...floor,
                    createdAt: new Date(floor.createdAt)
                }))
            }

            if (key === 'gateways' && Array.isArray(data)) {
                return data.map((gateway: any) => ({
                    ...gateway,
                    lastSeen: gateway.lastSeen ? new Date(gateway.lastSeen) : undefined,
                    createdAt: new Date(gateway.createdAt),
                    cloudData: gateway.cloudData ? {
                        ...gateway.cloudData,
                        receivedAt: new Date(gateway.cloudData.receivedAt)
                    } : undefined
                }))
            }

            if (key === 'anchors' && Array.isArray(data)) {
                // console.log(`- 處理 ${data.length} 個錨點`) // 簡化日誌
                return data.map((anchor: any, index: number) => {
                    try {
                        const result = {
                            ...anchor,
                            lastSeen: anchor.lastSeen ? new Date(anchor.lastSeen) : new Date(),
                            createdAt: new Date(anchor.createdAt),
                            cloudData: anchor.cloudData ? {
                                ...anchor.cloudData,
                                receivedAt: new Date(anchor.cloudData.receivedAt)
                            } : undefined
                        }
                        // console.log(`  ✅ 錨點 ${index + 1}: Date 對象已恢復`) // 簡化日誌
                        return result
                    } catch (error) {
                        console.warn(`  ❌ 錨點 ${index + 1} Date 轉換失敗:`, error)
                        return {
                            ...anchor,
                            lastSeen: new Date(),
                            createdAt: new Date(),
                            cloudData: anchor.cloudData ? {
                                ...anchor.cloudData,
                                receivedAt: new Date()
                            } : undefined
                        }
                    }
                })
            }

            if (key === 'tags' && Array.isArray(data)) {
                return data.map((tag: any) => ({
                    ...tag,
                    createdAt: new Date(tag.createdAt),
                    lastPosition: tag.lastPosition ? {
                        ...tag.lastPosition,
                        timestamp: new Date(tag.lastPosition.timestamp)
                    } : undefined
                }))
            }

            if (key === 'cloudGatewayData' && Array.isArray(data)) {
                return data.map((item: any) => ({
                    ...item,
                    receivedAt: new Date(item.receivedAt)
                }))
            }

            if (key === 'discoveredGateways' && Array.isArray(data)) {
                // console.log(`- 處理 ${data.length} 個發現的閘道器`) // 簡化日誌
                return data.map((gateway: any, index: number) => {
                    try {
                        const result = {
                            ...gateway,
                            lastSeen: gateway.lastSeen ? new Date(gateway.lastSeen) : new Date()
                        }
                        // console.log(`  ✅ 閘道器 ${index + 1}: lastSeen 已轉換為 Date`) // 簡化日誌
                        return result
                    } catch (error) {
                        console.warn(`  ❌ 閘道器 ${index + 1} Date 轉換失敗:`, error)
                        return {
                            ...gateway,
                            lastSeen: new Date() // 使用當前時間作為備用
                        }
                    }
                })
            }

            return data
        } catch (error) {
            console.warn(`恢復 ${key} 的 Date 對象時發生錯誤:`, error)
            return data
        }
    }

    // 保存到 localStorage 的輔助函數
    const saveToStorage = <T,>(key: string, data: T) => {
        try {
            localStorage.setItem(`uwb_${key}`, JSON.stringify(data))
            console.log(`✅ 已保存 ${key} 到 localStorage`)
        } catch (error) {
            console.warn(`無法保存 ${key} 到 localStorage:`, error)
        }
    }

    // 手動強制保存
    const forceSave = () => {
        if (saveTimeoutRef.current) {
            clearTimeout(saveTimeoutRef.current)
        }
        batchSave()
        console.log('🔄 手動觸發強制保存')
    }

    // 📡 獲取並遞增全域 serial_no (防止亂跳)
    const getNextSerialNo = (): number => {
        const currentSerial = globalSerialNo

        // 確保 serial_no 在合理範圍內
        let validSerial = currentSerial
        if (currentSerial < 1306 || currentSerial > 9999) {
            console.warn(`⚠️ Serial No 異常: ${currentSerial}，重置為 1306`)
            validSerial = 1306
            setGlobalSerialNo(1306)
            return 1306
        }

        const nextSerial = validSerial >= 9999 ? 1306 : validSerial + 1

        console.log(`📡 Serial No: ${validSerial} → ${nextSerial} ${nextSerial === 1306 ? '(重置)' : ''}`)
        setGlobalSerialNo(nextSerial)

        return validSerial
    }

    // 清除所有存儲數據的函數
    const clearAllStorage = () => {
        const keys = ['homes', 'floors', 'gateways', 'anchors', 'tags', 'selectedHome', 'activeTab', 'cloudGatewayData', 'discoveredGateways', 'version', 'lastSave', 'globalSerialNo']
        keys.forEach(key => {
            localStorage.removeItem(`uwb_${key}`)
        })
        // 也清除完整備份
        localStorage.removeItem('uwb_full_backup')
        console.log('🗑️ 已清除所有 localStorage 數據和備份')

        // 重新加載頁面以重置狀態
        window.location.reload()
    }

    // 調試：檢查當前存儲數據
    const debugStorage = () => {
        console.log('🔍 當前 localStorage 數據:')
        const keys = ['homes', 'floors', 'gateways', 'anchors', 'tags', 'selectedHome', 'activeTab', 'cloudGatewayData', 'discoveredGateways', 'globalSerialNo']
        keys.forEach(key => {
            const data = localStorage.getItem(`uwb_${key}`)
            if (data) {
                try {
                    const parsed = JSON.parse(data)
                    console.log(`- ${key}:`, Array.isArray(parsed) ? `${parsed.length} 個項目` : parsed)
                } catch {
                    console.log(`- ${key}:`, data)
                }
            } else {
                console.log(`- ${key}: 無數據`)
            }
        })
        console.log(`📡 當前 Serial No: ${globalSerialNo} (下次將使用: ${globalSerialNo >= 9999 ? 1306 : globalSerialNo + 1})`)
    }

    // 導出數據到 JSON 文件
    const exportData = () => {
        const data = {
            homes,
            floors,
            gateways,
            anchors,
            tags,
            selectedHome,
            cloudGatewayData,
            discoveredGateways,
            exportDate: new Date().toISOString()
        }

        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `uwb-data-${new Date().toISOString().split('T')[0]}.json`
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        URL.revokeObjectURL(url)

        console.log('📤 數據已導出')
    }

    // 導入數據從 JSON 文件
    const importData = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0]
        if (!file) return

        const reader = new FileReader()
        reader.onload = (e) => {
            try {
                const data = JSON.parse(e.target?.result as string)

                // 驗證數據結構
                if (data.homes && data.floors && data.gateways && data.anchors && data.tags) {
                    setHomes(data.homes)
                    setFloors(data.floors)
                    setGateways(data.gateways)
                    setAnchors(data.anchors)
                    setTags(data.tags)
                    if (data.selectedHome) setSelectedHome(data.selectedHome)
                    if (data.cloudGatewayData) setCloudGatewayData(data.cloudGatewayData)
                    if (data.discoveredGateways) setDiscoveredGateways(data.discoveredGateways)

                    console.log('📥 數據已導入')
                    alert('✅ 數據導入成功！')
                } else {
                    alert('❌ 無效的數據格式')
                }
            } catch (error) {
                console.error('導入數據失敗:', error)
                alert('❌ 導入數據失敗')
            }
        }
        reader.readAsText(file)

        // 清除文件選擇
        event.target.value = ''
    }

    // 加載狀態
    const [isLoading, setIsLoading] = useState(true)
    const [loadError, setLoadError] = useState<string | null>(null)

    // 狀態管理 - 從 localStorage 初始化
    const [homes, setHomes] = useState<Home[]>([])
    const [floors, setFloors] = useState<Floor[]>([])
    const [gateways, setGateways] = useState<Gateway[]>([])
    const [anchors, setAnchors] = useState<AnchorDevice[]>([])
    const [tags, setTags] = useState<TagDevice[]>([])

    // 初始化數據加載
    useEffect(() => {
        const initializeData = async () => {
            try {
                setIsLoading(true)
                setLoadError(null)

                console.log('🔄 開始加載本地存儲數據...')

                // 異步加載數據以避免阻塞 UI
                const [
                    loadedHomes,
                    loadedFloors,
                    loadedGateways,
                    loadedAnchors,
                    loadedTags
                ] = await Promise.all([
                    Promise.resolve(loadFromStorage('homes', MOCK_HOMES)),
                    Promise.resolve(loadFromStorage('floors', MOCK_FLOORS)),
                    Promise.resolve(loadFromStorage('gateways', MOCK_GATEWAYS)),
                    Promise.resolve(loadFromStorage('anchors', MOCK_ANCHORS)),
                    Promise.resolve(loadFromStorage('tags', MOCK_TAGS))
                ])

                setHomes(loadedHomes)
                setFloors(loadedFloors)
                setGateways(loadedGateways)
                setAnchors(loadedAnchors)
                setTags(loadedTags)

                // 設置 selectedHome - 優先使用存儲的值，否則使用第一個場域
                const storedSelectedHome = loadFromStorage('selectedHome', '')
                const finalSelectedHome = storedSelectedHome && loadedHomes.find(h => h.id === storedSelectedHome)
                    ? storedSelectedHome
                    : loadedHomes[0]?.id || ""
                setSelectedHome(finalSelectedHome)

                // 初始化錨點配對的預設選擇
                setSelectedHomeForAnchors(finalSelectedHome)
                if (finalSelectedHome) {
                    const firstFloor = loadedFloors.find(f => f.homeId === finalSelectedHome)
                    if (firstFloor) {
                        setSelectedFloorForAnchors(firstFloor.id)
                    }
                }

                // 初始化標籤管理的預設選擇
                setSelectedHomeForTags(finalSelectedHome)
                if (finalSelectedHome) {
                    const firstFloor = loadedFloors.find(f => f.homeId === finalSelectedHome)
                    if (firstFloor) {
                        setSelectedFloorForTags(firstFloor.id)
                        
                        // 移除自動選擇 Gateway 的邏輯，讓用戶手動選擇
                        // 這樣標籤設備管理頁面就不會在載入時自動連線 MQTT
                    }
                }

                console.log('✅ 數據加載完成')
                console.log(`- 場域: ${loadedHomes.length} 個`)
                console.log(`- 樓層: ${loadedFloors.length} 個`)
                console.log(`- 閘道器: ${loadedGateways.length} 個`)
                console.log(`- 錨點: ${loadedAnchors.length} 個`)
                console.log(`- 標籤: ${loadedTags.length} 個`)
                console.log(`- 選中場域: ${finalSelectedHome}`)

                setIsLoading(false)
            } catch (error) {
                console.error('❌ 數據加載失敗:', error)
                setLoadError(error instanceof Error ? error.message : '未知錯誤')

                // 加載失敗時使用預設數據
                console.log('🔄 使用預設數據')
                setHomes(MOCK_HOMES)
                setFloors(MOCK_FLOORS)
                setGateways(MOCK_GATEWAYS)
                setAnchors(MOCK_ANCHORS)
                setTags(MOCK_TAGS)
                setSelectedHome(MOCK_HOMES[0]?.id || "")

                setIsLoading(false)
            }
        }

        initializeData()
    }, [])
    const [selectedHome, setSelectedHome] = useState<string>("")
    const [activeTab, setActiveTab] = useState(() => loadFromStorage('activeTab', "overview"))

    // 🚀 智能自動持久化系統 - 狀態聲明
    const [lastSaveTime, setLastSaveTime] = useState<Date>(new Date())
    const [pendingSave, setPendingSave] = useState<boolean>(false)
    const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null)

    // 📡 全域 serial_no 管理 (1306-9999 循環)
    const [globalSerialNo, setGlobalSerialNo] = useState<number>(() => loadFromStorage('globalSerialNo', 1306))

    // 雲端 MQTT 相關狀態
    const [cloudConnected, setCloudConnected] = useState(false)
    const [cloudConnectionStatus, setCloudConnectionStatus] = useState<string>("未連線")
    const [cloudError, setCloudError] = useState<string>("")
    const [cloudReconnectAttempts, setCloudReconnectAttempts] = useState(0)
    const [cloudGatewayData, setCloudGatewayData] = useState<CloudGatewayData[]>(() => loadFromStorage('cloudGatewayData', []))
    const [discoveredGateways, setDiscoveredGateways] = useState<DiscoveredGateway[]>(() => loadFromStorage('discoveredGateways', []))
    const [selectedDiscoveredGateway, setSelectedDiscoveredGateway] = useState<number | null>(null)
    const cloudClientRef = useRef<mqtt.MqttClient | null>(null)

    // 🚀 智能批量保存函數 - 避免頻繁寫入
    const batchSave = useCallback(() => {
        if (saveTimeoutRef.current) {
            clearTimeout(saveTimeoutRef.current)
        }

        setPendingSave(true)
        saveTimeoutRef.current = setTimeout(() => {
            try {
                // 批量保存所有數據
                const dataToSave = {
                    homes,
                    floors,
                    gateways,
                    anchors,
                    tags,
                    selectedHome,
                    activeTab,
                    cloudGatewayData,
                    discoveredGateways,
                    globalSerialNo,
                    version: Date.now(), // 添加版本號
                    lastSave: new Date().toISOString()
                }

                // 保存到 localStorage
                Object.entries(dataToSave).forEach(([key, value]) => {
                    if (key === 'selectedHome' && !value) return // 跳過空值
                    if (key === 'version' || key === 'lastSave') return // 跳過元數據
                    saveToStorage(key, value)
                })

                // 額外保存完整備份和元數據
                saveToStorage('version', dataToSave.version)
                saveToStorage('lastSave', dataToSave.lastSave)
                localStorage.setItem('uwb_full_backup', JSON.stringify(dataToSave))

                setLastSaveTime(new Date())
                setPendingSave(false)
                console.log(`💾 自動保存完成 ${new Date().toLocaleTimeString()} - ${Object.keys(dataToSave).filter(k => !['version', 'lastSave'].includes(k)).length} 個數據類型`)
            } catch (error) {
                console.error('❌ 自動保存失敗:', error)
                setPendingSave(false)
            }
        }, 500) // 500ms延遲，避免頻繁保存
    }, [homes, floors, gateways, anchors, tags, selectedHome, activeTab, cloudGatewayData, discoveredGateways])

    // 監聽所有數據變化，觸發批量保存
    useEffect(() => {
        if (homes.length > 0 || floors.length > 0 || gateways.length > 0 || anchors.length > 0 || tags.length > 0) {
            batchSave()
        }
    }, [homes, floors, gateways, anchors, tags, batchSave])

    useEffect(() => {
        if (selectedHome || activeTab !== 'overview') {
            batchSave()
        }
    }, [selectedHome, activeTab, batchSave])

    useEffect(() => {
        if (cloudGatewayData.length > 0 || discoveredGateways.length > 0) {
            batchSave()
        }
    }, [cloudGatewayData, discoveredGateways, batchSave])

    // 自動保存 globalSerialNo
    useEffect(() => {
        saveToStorage('globalSerialNo', globalSerialNo)
    }, [globalSerialNo])

    // 清理定時器
    useEffect(() => {
        return () => {
            if (saveTimeoutRef.current) {
                clearTimeout(saveTimeoutRef.current)
            }
        }
    }, [])

    // 🎹 開發者快捷鍵 (Ctrl+Shift+D 調試, Ctrl+Shift+S 強制保存, Ctrl+Shift+R 重置)
    useEffect(() => {
        const handleKeydown = (e: KeyboardEvent) => {
            if (e.ctrlKey && e.shiftKey) {
                switch (e.key) {
                    case 'D':
                        e.preventDefault()
                        debugStorage()
                        break
                    case 'S':
                        e.preventDefault()
                        forceSave()
                        break
                    case 'R':
                        e.preventDefault()
                        if (confirm('確定要重置所有數據嗎？此操作不可撤銷！')) {
                            clearAllStorage()
                        }
                        break
                }
            }
        }

        window.addEventListener('keydown', handleKeydown)
        return () => window.removeEventListener('keydown', handleKeydown)
    }, [])

    // Anchor 雲端 MQTT 相關狀態
    const [anchorCloudConnected, setAnchorCloudConnected] = useState(false)
    const [anchorCloudConnectionStatus, setAnchorCloudConnectionStatus] = useState<string>("未連線")
    const [anchorCloudError, setAnchorCloudError] = useState<string>("")
    const [cloudAnchorData, setCloudAnchorData] = useState<CloudAnchorData[]>([])
    const [discoveredCloudAnchors, setDiscoveredCloudAnchors] = useState<DiscoveredCloudAnchor[]>([])
    const [selectedGatewayForAnchors, setSelectedGatewayForAnchors] = useState<string>("")
    const [selectedHomeForAnchors, setSelectedHomeForAnchors] = useState<string>("")
    const [selectedFloorForAnchors, setSelectedFloorForAnchors] = useState<string>("")
    const [currentAnchorTopic, setCurrentAnchorTopic] = useState<string>("")
    const anchorCloudClientRef = useRef<mqtt.MqttClient | null>(null)

    // Anchor配對相關狀態
    const [pairingInProgress, setPairingInProgress] = useState(false)
    const [selectedGateway, setSelectedGateway] = useState<string>("")
    const [discoveredAnchors, setDiscoveredAnchors] = useState<string[]>([])

    // Tag管理相關狀態
    const [showTagForm, setShowTagForm] = useState(false)
    const [editingTag, setEditingTag] = useState<TagDevice | null>(null)

    // Tag 雲端 MQTT 相關狀態
    const [tagCloudConnected, setTagCloudConnected] = useState(false)
    const [tagCloudConnectionStatus, setTagCloudConnectionStatus] = useState<string>("未連線")
    const [tagCloudError, setTagCloudError] = useState<string>("")
    const [cloudTagData, setCloudTagData] = useState<any[]>([])
    const [discoveredCloudTags, setDiscoveredCloudTags] = useState<any[]>([])
    const [currentTagTopic, setCurrentTagTopic] = useState<string>("")
    const [selectedHomeForTags, setSelectedHomeForTags] = useState<string>("")
    const [selectedFloorForTags, setSelectedFloorForTags] = useState<string>("")
    const [selectedGatewayForTags, setSelectedGatewayForTags] = useState<string>("")

    const tagCloudClientRef = useRef<mqtt.MqttClient | null>(null)

    // 移除自動選擇邏輯，讓用戶必須手動選擇 Gateway
    // 這樣可以確保 MQTT 連線真正依賴用戶的選擇

    // 地圖相關狀態
    const [showMapCalibration, setShowMapCalibration] = useState(false)
    const [calibratingFloor, setCalibratingFloor] = useState<Floor | null>(null)
    const [uploadedImage, setUploadedImage] = useState<string>("")
    const [calibrationStep, setCalibrationStep] = useState<'upload' | 'setOrigin' | 'setScale' | 'complete'>('upload')
    const [selectedOrigin, setSelectedOrigin] = useState<{ x: number, y: number } | null>(null)
    const [originCoordinates, setOriginCoordinates] = useState<{ x: number, y: number }>({ x: 0, y: 0 })
    const [scalePoints, setScalePoints] = useState<{ point1: { x: number, y: number } | null, point2: { x: number, y: number } | null }>({ point1: null, point2: null })
    const [realDistance, setRealDistance] = useState<number>(1)
    const [pixelToMeterRatio, setPixelToMeterRatio] = useState<number>(100)

    // 表單狀態
    const [showHomeForm, setShowHomeForm] = useState(false)
    const [showFloorForm, setShowFloorForm] = useState(false)
    const [showGatewayForm, setShowGatewayForm] = useState(false)
    const [editingItem, setEditingItem] = useState<any>(null)

    // 表單數據
    const [homeForm, setHomeForm] = useState({ name: "", description: "", address: "" })
    const [floorForm, setFloorForm] = useState({ name: "", level: 1, realWidth: 0, realHeight: 0 })
    const [gatewayForm, setGatewayForm] = useState({
        name: "",
        macAddress: "",
        ipAddress: "",
        floorId: ""
    })
    const [tagForm, setTagForm] = useState({
        name: "",
        macAddress: "",
        type: "person" as const,
        assignedTo: ""
    })

    // 獲取當前選中場域的樓層
    const currentFloors = floors.filter(floor => floor.homeId === selectedHome)

    // 獲取當前場域的所有閘道器
    const currentGateways = gateways.filter(gateway =>
        currentFloors.some(floor => floor.id === gateway.floorId)
    )

    // 獲取當前場域的所有錨點
    const currentAnchors = anchors.filter(anchor =>
        currentGateways.some(gateway => gateway.id === anchor.gatewayId)
    )

    // 獲取在線的Gateway列表（用於Anchor配對）
    const onlineGateways = currentGateways.filter(gw => gw.status === 'online')

    // 雲端 MQTT 連接
    useEffect(() => {
        // 檢查是否已經有連線，避免重複連線
        if (cloudClientRef.current && cloudConnected) {
            console.log("⚠️ 雲端 MQTT 已連線，跳過重複連線")
            return
        }

        setCloudConnectionStatus("連接中...")
        setCloudError("")

        const cloudClient = mqtt.connect(CLOUD_MQTT_URL, {
            ...CLOUD_MQTT_OPTIONS,
            reconnectPeriod: 5000,
            connectTimeout: 15000,
            keepalive: 60,
            clean: true,
            clientId: `uwb-web-client-${Math.random().toString(16).slice(2, 8)}`
        })
        cloudClientRef.current = cloudClient

        cloudClient.on("connect", () => {
            console.log("雲端 MQTT 已連接，Client ID:", cloudClient.options.clientId)
            setCloudConnected(true)
            setCloudConnectionStatus("已連線")
            setCloudError("")
            setCloudReconnectAttempts(0)
        })

        cloudClient.on("reconnect", () => {
            console.log("雲端 MQTT 重新連接中...")
            setCloudConnected(false)
            setCloudReconnectAttempts(prev => prev + 1)
            setCloudConnectionStatus(`重新連接中... (第${cloudReconnectAttempts + 1}次嘗試)`)
        })

        cloudClient.on("close", () => {
            console.log("雲端 MQTT 連接關閉")
            setCloudConnected(false)
            setCloudConnectionStatus("連接已關閉")
        })

        cloudClient.on("error", (error) => {
            console.error("雲端 MQTT 連接錯誤:", error)
            setCloudConnected(false)
            setCloudError(error.message || "連接錯誤")
            setCloudConnectionStatus("連接錯誤")
        })

        cloudClient.on("offline", () => {
            console.log("雲端 MQTT 離線")
            setCloudConnected(false)
            setCloudConnectionStatus("離線")
        })

        cloudClient.subscribe(CLOUD_MQTT_TOPIC, (err) => {
            if (err) {
                console.error("雲端 MQTT 訂閱失敗:", err)
            } else {
                console.log("已訂閱雲端主題:", CLOUD_MQTT_TOPIC)
            }
        })

        cloudClient.on("message", (topic: string, payload: Uint8Array) => {
            if (topic !== CLOUD_MQTT_TOPIC) return
            try {
                const rawMessage = new TextDecoder().decode(payload)
                const msg = JSON.parse(rawMessage)
                console.log("收到雲端 Gateway MQTT 消息:", msg)

                // 處理 Gateway Topic 數據
                if (msg.content === "gateway topic") {
                    console.log("處理 Gateway Topic 數據...")

                    const gatewayData: CloudGatewayData = {
                        content: msg.content,
                        gateway_id: msg["gateway id"] || 0,
                        name: msg.name || "",
                        fw_ver: msg["fw ver"] || "",
                        fw_serial: msg["fw serial"] || 0,
                        uwb_hw_com_ok: msg["UWB HW Com OK"] || "",
                        uwb_joined: msg["UWB Joined"] || "",
                        uwb_network_id: msg["UWB Network ID"] || 0,
                        connected_ap: msg["connected AP"] || "",
                        wifi_tx_power: msg["Wifi tx power(dBm)"] || 0,
                        set_wifi_max_tx_power: msg["set Wifi max tx power(dBm)"] || 0,
                        ble_scan_time: msg["ble scan time"] || 0,
                        ble_scan_pause_time: msg["ble scan pause time"] || 0,
                        battery_voltage: msg["battery voltage"] || 0,
                        five_v_plugged: msg["5V plugged"] || "",
                        uwb_tx_power_changed: msg["uwb tx power changed"] || "",
                        uwb_tx_power: {
                            boost_norm: msg["uwb tx power"]?.["boost norm(5.0~30.5dB)"] || 0,
                            boost_500: msg["uwb tx power"]?.["boost 500(5.0~30.5dB)"] || 0,
                            boost_250: msg["uwb tx power"]?.["boost 250(5.0~30.5dB)"] || 0,
                            boost_125: msg["uwb tx power"]?.["boost 125(5.0~30.5dB)"] || 0
                        },
                        pub_topic: {
                            anchor_config: msg["pub topic"]?.["anchor config"] || "",
                            tag_config: msg["pub topic"]?.["tag config"] || "",
                            location: msg["pub topic"]?.["location"] || "",
                            message: msg["pub topic"]?.["message"] || "",
                            ack_from_node: msg["pub topic"]?.["ack from node"] || "",
                            health: msg["pub topic"]?.["health"] || ""
                        },
                        sub_topic: {
                            downlink: msg["sub topic"]?.["downlink"] || ""
                        },
                        discard_iot_data_time: msg["discard IOT data time(0.1s)"] || 0,
                        discarded_iot_data: msg["discarded IOT data"] || 0,
                        total_discarded_data: msg["total discarded data"] || 0,
                        first_sync: msg["1st sync"] || "",
                        last_sync: msg["last sync"] || "",
                        current: msg.current || "",
                        receivedAt: new Date()
                    }

                    console.log("解析的 Gateway 數據:", gatewayData)

                    // 更新原始數據列表
                    setCloudGatewayData(prev => {
                        const newData = [gatewayData, ...prev].slice(0, 50)
                        return newData
                    })

                    // 檢查並更新發現的 Gateway 列表
                    if (gatewayData.gateway_id && gatewayData.name) {
                        setDiscoveredGateways(prev => {
                            const existingGateway = prev.find(g => g.gateway_id === gatewayData.gateway_id)

                            if (existingGateway) {
                                // 更新現有 Gateway
                                const updatedGateways = prev.map(g =>
                                    g.gateway_id === gatewayData.gateway_id
                                        ? {
                                            ...g,
                                            name: gatewayData.name,
                                            fw_ver: gatewayData.fw_ver,
                                            uwb_joined: gatewayData.uwb_joined,
                                            uwb_network_id: gatewayData.uwb_network_id,
                                            connected_ap: gatewayData.connected_ap,
                                            battery_voltage: gatewayData.battery_voltage,
                                            five_v_plugged: gatewayData.five_v_plugged,
                                            lastSeen: new Date(),
                                            recordCount: g.recordCount + 1,
                                            isOnline: gatewayData.uwb_joined === "yes" // 只需要 UWB 已加入即可認為在線
                                        }
                                        : g
                                )
                                console.log("更新現有 Gateway，總數:", updatedGateways.length)
                                return updatedGateways
                            } else {
                                // 添加新 Gateway
                                const newGateway: DiscoveredGateway = {
                                    gateway_id: gatewayData.gateway_id,
                                    name: gatewayData.name,
                                    fw_ver: gatewayData.fw_ver,
                                    uwb_joined: gatewayData.uwb_joined,
                                    uwb_network_id: gatewayData.uwb_network_id,
                                    connected_ap: gatewayData.connected_ap,
                                    battery_voltage: gatewayData.battery_voltage,
                                    five_v_plugged: gatewayData.five_v_plugged,
                                    lastSeen: new Date(),
                                    recordCount: 1,
                                    isOnline: gatewayData.uwb_joined === "yes" // 只需要 UWB 已加入即可認為在線
                                }
                                const updatedGateways = [...prev, newGateway]
                                console.log("添加新 Gateway:", newGateway)
                                console.log("更新後總 Gateway 數:", updatedGateways.length)
                                return updatedGateways
                            }
                        })

                        // 如果還沒有選擇 Gateway，自動選擇第一個
                        setSelectedDiscoveredGateway(prev => {
                            if (prev === null) {
                                console.log("自動選擇 Gateway:", gatewayData.gateway_id)
                                return gatewayData.gateway_id
                            }
                            return prev
                        })
                    }
                } else {
                    console.log("⚠️ 非 Gateway Topic 數據，內容:", msg.content)
                }

            } catch (error) {
                console.error('雲端 Gateway MQTT 訊息解析錯誤:', error)
            }
        })

        return () => {
            console.log("清理雲端 Gateway MQTT 連接")
            if (cloudClientRef.current) {
                cloudClientRef.current.end()
            }
        }
    }, []) // 空依賴數組，只在組件掛載時執行一次

    // Anchor 雲端 MQTT 連接 - 根據選擇的 Gateway 動態訂閱
    useEffect(() => {
        if (!selectedGatewayForAnchors) {
            // 如果沒有選擇 Gateway，清理連接
            if (anchorCloudClientRef.current) {
                anchorCloudClientRef.current.end()
                anchorCloudClientRef.current = null
            }
            setAnchorCloudConnected(false)
            setAnchorCloudConnectionStatus("未選擇閘道器")
            setCurrentAnchorTopic("")
            setCloudAnchorData([])
            setDiscoveredCloudAnchors([])
            return
        }

        // 獲取 Gateway 配置的函數
        const getGatewayConfig = () => {
            // 先檢查雲端發現的閘道器
            let selectedGatewayData = cloudGatewayData.find(gw => gw.gateway_id.toString() === selectedGatewayForAnchors)
            if (selectedGatewayData && selectedGatewayData.pub_topic.anchor_config) {
                return {
                    topic: selectedGatewayData.pub_topic.anchor_config,
                    source: "雲端發現"
                }
            }

            // 再檢查系統閘道器
            const systemGateway = currentGateways.find(gw => {
                const gatewayIdFromMac = gw.macAddress.startsWith('GW:')
                    ? parseInt(gw.macAddress.replace('GW:', ''), 16).toString()
                    : null
                return gatewayIdFromMac === selectedGatewayForAnchors || gw.id === selectedGatewayForAnchors
            })

            if (systemGateway && systemGateway.cloudData && systemGateway.cloudData.pub_topic.anchor_config) {
                return {
                    topic: systemGateway.cloudData.pub_topic.anchor_config,
                    source: "系統閘道器(雲端數據)"
                }
            } else if (systemGateway) {
                const gatewayName = systemGateway.name.replace(/\s+/g, '')
                return {
                    topic: `UWB/${gatewayName}_AncConf`,
                    source: "系統閘道器(構建)"
                }
            }

            return null
        }

        const gatewayConfig = getGatewayConfig()
        if (!gatewayConfig) {
            setAnchorCloudConnectionStatus("無法找到閘道器配置 - 請確保已選擇有效的閘道器")
            console.log("❌ 無法找到 Gateway 配置")
            console.log("- 選擇的 Gateway ID:", selectedGatewayForAnchors)
            console.log("- 雲端 Gateway 數量:", cloudGatewayData.length)
            console.log("- 系統 Gateway 數量:", currentGateways.length)
            return
        }

        const anchorTopic = gatewayConfig.topic
        console.log(`${gatewayConfig.source}的閘道器，使用 anchor topic:`, anchorTopic)

        // 檢查是否已經連接到相同的主題，避免重複連接
        if (anchorCloudClientRef.current &&
            currentAnchorTopic === anchorTopic &&
            (anchorCloudConnected || anchorCloudConnectionStatus === "連接中...")) {
            console.log("⚠️ 已連接到相同主題或正在連接中，跳過重複連接:", anchorTopic)
            console.log("- 當前狀態:", anchorCloudConnectionStatus)
            console.log("- 連接狀態:", anchorCloudConnected)
            return
        }

        // 如果有現有連接，先清理
        if (anchorCloudClientRef.current) {
            console.log("清理現有 Anchor MQTT 連接")
            anchorCloudClientRef.current.end()
            anchorCloudClientRef.current = null
        }

        setCurrentAnchorTopic(anchorTopic)
        setAnchorCloudConnectionStatus("連接中...")
        setAnchorCloudError("")

        console.log("🚀 開始連接 Anchor MQTT")
        console.log("- MQTT URL:", CLOUD_MQTT_URL)
        console.log("- MQTT 用戶名:", CLOUD_MQTT_OPTIONS.username)
        console.log("- 訂閱主題:", anchorTopic)
        console.log("- Client ID 前綴: uwb-anchor-client-")
        console.log("- 觸發原因: selectedGatewayForAnchors 變化或數據更新")

        const anchorClient = mqtt.connect(CLOUD_MQTT_URL, {
            ...CLOUD_MQTT_OPTIONS,
            reconnectPeriod: 3000,     // 縮短重連間隔
            connectTimeout: 30000,     // 增加連接超時時間
            keepalive: 30,             // 縮短心跳間隔
            clean: true,
            resubscribe: true,         // 重連時自動重新訂閱
            clientId: `uwb-anchor-client-${Math.random().toString(16).slice(2, 8)}`
        })

        console.log("Anchor MQTT Client 已創建，Client ID:", anchorClient.options.clientId)
        anchorCloudClientRef.current = anchorClient

        anchorClient.on("connect", () => {
            console.log("✅ Anchor 雲端 MQTT 已連接成功！")
            console.log("- Client ID:", anchorClient.options.clientId)
            console.log("- 準備訂閱主題:", anchorTopic)
            setAnchorCloudConnected(true)
            setAnchorCloudConnectionStatus("已連線")
            setAnchorCloudError("")
        })

        anchorClient.on("reconnect", () => {
            console.log("Anchor 雲端 MQTT 重新連接中...")
            setAnchorCloudConnected(false)
            setAnchorCloudConnectionStatus("重新連接中...")
        })

        anchorClient.on("close", () => {
            console.log("Anchor 雲端 MQTT 連接關閉")
            setAnchorCloudConnected(false)
            setAnchorCloudConnectionStatus("連接已關閉")
        })

        anchorClient.on("error", (error) => {
            console.error("❌ Anchor 雲端 MQTT 連接錯誤:", error)
            console.error("- 錯誤類型:", error.name)
            console.error("- 錯誤消息:", error.message)
            console.error("- 可能原因: HiveMQ 連接限制或網絡問題")

            setAnchorCloudConnected(false)
            setAnchorCloudError(`${error.message} (可能是雲端服務限制)`)
            setAnchorCloudConnectionStatus("連接錯誤 - 雲端服務問題")
        })

        anchorClient.on("offline", () => {
            console.log("Anchor 雲端 MQTT 離線")
            setAnchorCloudConnected(false)
            setAnchorCloudConnectionStatus("離線")
        })

        anchorClient.subscribe(anchorTopic, (err) => {
            if (err) {
                console.error("❌ Anchor 雲端 MQTT 訂閱失敗:", err)
                console.error("- 訂閱主題:", anchorTopic)
                console.error("- 錯誤詳情:", err)
                setAnchorCloudError(`訂閱失敗: ${err.message}`)
                setAnchorCloudConnectionStatus("訂閱失敗")
            } else {
                console.log("✅ 已成功訂閱 Anchor 主題:", anchorTopic)
                console.log("- 等待接收 Anchor 數據...")
                setAnchorCloudConnectionStatus("已連線並訂閱")
            }
        })

        anchorClient.on("message", (topic: string, payload: Uint8Array) => {
            console.log("📨 收到 MQTT 消息")
            console.log("- 接收主題:", topic)
            console.log("- 預期主題:", anchorTopic)
            console.log("- 主題匹配:", topic === anchorTopic)

            if (topic !== anchorTopic) {
                console.log("⚠️ 主題不匹配，忽略消息")
                return
            }

            try {
                const rawMessage = new TextDecoder().decode(payload)
                console.log("📄 原始消息內容:", rawMessage)
                const msg = JSON.parse(rawMessage)
                console.log("📋 解析後的 JSON:", msg)

                // 處理 Anchor Config 數據
                if (msg.content === "config" && msg.node === "ANCHOR") {
                    console.log("處理 Anchor Config 數據...")

                    const anchorData: CloudAnchorData = {
                        content: msg.content,
                        gateway_id: msg["gateway id"] || 0,
                        node: msg.node || "",
                        name: msg.name || "",
                        id: msg.id || 0,
                        fw_update: msg["fw update"] || 0,
                        led: msg.led || 0,
                        ble: msg.ble || 0,
                        initiator: msg.initiator || 0,
                        position: {
                            x: msg.position?.x || 0,
                            y: msg.position?.y || 0,
                            z: msg.position?.z || 0
                        },
                        receivedAt: new Date()
                    }

                    console.log("解析的 Anchor 數據:", anchorData)

                    // 更新原始數據列表
                    setCloudAnchorData(prev => {
                        const newData = [anchorData, ...prev].slice(0, 50)
                        return newData
                    })

                    // 檢查並更新發現的 Anchor 列表
                    if (anchorData.id && anchorData.name) {
                        setDiscoveredCloudAnchors(prev => {
                            const existingAnchor = prev.find(a => a.id === anchorData.id)

                            if (existingAnchor) {
                                // 更新現有 Anchor
                                const updatedAnchors = prev.map(a =>
                                    a.id === anchorData.id
                                        ? {
                                            ...a,
                                            name: anchorData.name,
                                            gateway_id: anchorData.gateway_id,
                                            fw_update: anchorData.fw_update,
                                            led: anchorData.led,
                                            ble: anchorData.ble,
                                            initiator: anchorData.initiator,
                                            position: anchorData.position,
                                            lastSeen: new Date(),
                                            recordCount: a.recordCount + 1,
                                            isOnline: true
                                        }
                                        : a
                                )
                                console.log("更新現有 Anchor，總數:", updatedAnchors.length)
                                return updatedAnchors
                            } else {
                                // 添加新 Anchor
                                const newAnchor: DiscoveredCloudAnchor = {
                                    id: anchorData.id,
                                    name: anchorData.name,
                                    gateway_id: anchorData.gateway_id,
                                    fw_update: anchorData.fw_update,
                                    led: anchorData.led,
                                    ble: anchorData.ble,
                                    initiator: anchorData.initiator,
                                    position: anchorData.position,
                                    lastSeen: new Date(),
                                    recordCount: 1,
                                    isOnline: true
                                }
                                const updatedAnchors = [...prev, newAnchor]
                                console.log("添加新 Anchor:", newAnchor)
                                console.log("更新後總 Anchor 數:", updatedAnchors.length)
                                return updatedAnchors
                            }
                        })
                    }
                } else {
                    console.log("⚠️ 非 Anchor Config 數據，內容:", msg.content, "節點:", msg.node)
                }

            } catch (error) {
                console.error('Anchor 雲端 MQTT 訊息解析錯誤:', error)
            }
        })

        return () => {
            console.log("清理 Anchor 雲端 MQTT 連接")
            anchorClient.end()
        }
    }, [selectedGatewayForAnchors]) // 只在選擇的 Gateway 改變時重新連接，避免 cloudGatewayData 觸發循環

    // 監聽養老院和樓層變化，自動更新錨點配對的選擇
    useEffect(() => {
        if (selectedHomeForAnchors && selectedFloorForAnchors) {
            // 檢查選中的樓層是否仍然屬於選中的養老院
            const floor = floors.find(f => f.id === selectedFloorForAnchors)
            if (floor && floor.homeId !== selectedHomeForAnchors) {
                // 如果樓層不屬於選中的養老院，重置樓層選擇
                setSelectedFloorForAnchors("")
                setSelectedGatewayForAnchors("")
            }
        }
    }, [selectedHomeForAnchors, selectedFloorForAnchors, floors])

    // Tag 雲端 MQTT 連接 - 根據選擇的 Gateway 動態訂閱
    useEffect(() => {
        if (!selectedGatewayForTags) {
            // 如果沒有選擇 Gateway，清理連接
            if (tagCloudClientRef.current) {
                tagCloudClientRef.current.end()
                tagCloudClientRef.current = null
            }
            setTagCloudConnected(false)
            setTagCloudConnectionStatus("未選擇閘道器")
            setCurrentTagTopic("")
            setCloudTagData([])
            setDiscoveredCloudTags([])
            return
        }

        // 獲取 Gateway 配置的函數
        const getGatewayConfig = () => {
            // 先檢查雲端發現的閘道器
            let selectedGatewayData = cloudGatewayData.find(gw => gw.gateway_id.toString() === selectedGatewayForTags)
            if (selectedGatewayData && selectedGatewayData.pub_topic.message && selectedGatewayData.pub_topic.location) {
                return {
                    messageTopic: selectedGatewayData.pub_topic.message,
                    locationTopic: selectedGatewayData.pub_topic.location,
                    source: "雲端發現"
                }
            }

            // 再檢查系統閘道器
            const systemGateway = currentGateways.find(gw => {
                const gatewayIdFromMac = gw.macAddress.startsWith('GW:')
                    ? parseInt(gw.macAddress.replace('GW:', ''), 16).toString()
                    : null
                return gatewayIdFromMac === selectedGatewayForTags || gw.id === selectedGatewayForTags
            })

            if (systemGateway && systemGateway.cloudData && systemGateway.cloudData.pub_topic.message && systemGateway.cloudData.pub_topic.location) {
                return {
                    messageTopic: systemGateway.cloudData.pub_topic.message,
                    locationTopic: systemGateway.cloudData.pub_topic.location,
                    source: "系統閘道器(雲端數據)"
                }
            } else if (systemGateway) {
                const gatewayName = systemGateway.name.replace(/\s+/g, '')
                return {
                    messageTopic: `UWB/${gatewayName}_Message`,
                    locationTopic: `UWB/${gatewayName}_Loca`,
                    source: "系統閘道器(構建)"
                }
            }

            return null
        }

        const gatewayConfig = getGatewayConfig()
        if (!gatewayConfig) {
            setTagCloudConnectionStatus("無法找到閘道器配置 - 請確保已選擇有效的閘道器")
            console.log("❌ 無法找到 Gateway 配置")
            console.log("- 選擇的 Gateway ID:", selectedGatewayForTags)
            console.log("- 雲端 Gateway 數量:", cloudGatewayData.length)
            console.log("- 系統 Gateway 數量:", currentGateways.length)
            return
        }

        const messageTopic = gatewayConfig.messageTopic
        const locationTopic = gatewayConfig.locationTopic
        console.log(`${gatewayConfig.source}的閘道器，使用 message topic:`, messageTopic)
        console.log(`${gatewayConfig.source}的閘道器，使用 location topic:`, locationTopic)

        // 檢查是否已經連接到相同的主題，避免重複連接
        if (tagCloudClientRef.current &&
            currentTagTopic === `${messageTopic}+${locationTopic}` &&
            (tagCloudConnected || tagCloudConnectionStatus === "連接中...")) {
            console.log("⚠️ 已連接到相同主題或正在連接中，跳過重複連接")
            console.log("- 當前狀態:", tagCloudConnectionStatus)
            console.log("- 連接狀態:", tagCloudConnected)
            return
        }

        // 如果有現有連接，先清理
        if (tagCloudClientRef.current) {
            console.log("清理現有 Tag MQTT 連接")
            tagCloudClientRef.current.end()
            tagCloudClientRef.current = null
        }

        setCurrentTagTopic(`${messageTopic}+${locationTopic}`)
        setTagCloudConnectionStatus("連接中...")
        setTagCloudError("")

        console.log("🚀 開始連接 Tag MQTT")
        console.log("- MQTT URL:", CLOUD_MQTT_URL)
        console.log("- MQTT 用戶名:", CLOUD_MQTT_OPTIONS.username)
        console.log("- 訂閱主題:", messageTopic, "和", locationTopic)
        console.log("- Client ID 前綴: uwb-tag-client-")
        console.log("- 觸發原因: selectedGatewayForTags 變化或數據更新")

        const tagClient = mqtt.connect(CLOUD_MQTT_URL, {
            ...CLOUD_MQTT_OPTIONS,
            reconnectPeriod: 3000,     // 縮短重連間隔
            connectTimeout: 30000,     // 增加連接超時時間
            keepalive: 30,             // 縮短心跳間隔
            clean: true,
            resubscribe: true,         // 重連時自動重新訂閱
            clientId: `uwb-tag-client-${Math.random().toString(16).slice(2, 8)}`
        })

        console.log("Tag MQTT Client 已創建，Client ID:", tagClient.options.clientId)
        tagCloudClientRef.current = tagClient

        tagClient.on("connect", () => {
            console.log("✅ Tag 雲端 MQTT 已連接成功！")
            console.log("- Client ID:", tagClient.options.clientId)
            console.log("- 準備訂閱主題:", messageTopic, "和", locationTopic)
            setTagCloudConnected(true)
            setTagCloudConnectionStatus("已連線")
            setTagCloudError("")
        })

        tagClient.on("reconnect", () => {
            console.log("Tag 雲端 MQTT 重新連接中...")
            setTagCloudConnected(false)
            setTagCloudConnectionStatus("重新連接中...")
        })

        tagClient.on("close", () => {
            console.log("Tag 雲端 MQTT 連接關閉")
            setTagCloudConnected(false)
            setTagCloudConnectionStatus("連接已關閉")
        })

        tagClient.on("error", (error) => {
            console.error("❌ Tag 雲端 MQTT 連接錯誤:", error)
            console.error("- 錯誤類型:", error.name)
            console.error("- 錯誤消息:", error.message)
            console.error("- 可能原因: HiveMQ 連接限制或網絡問題")

            setTagCloudConnected(false)
            setTagCloudError(`${error.message} (可能是雲端服務限制)`)
            setTagCloudConnectionStatus("連接錯誤 - 雲端服務問題")
        })

        tagClient.on("offline", () => {
            console.log("Tag 雲端 MQTT 離線")
            setTagCloudConnected(false)
            setTagCloudConnectionStatus("離線")
        })

        // 訂閱兩個主題
        tagClient.subscribe(messageTopic, (err) => {
            if (err) {
                console.error("❌ Tag message 主題訂閱失敗:", err)
                setTagCloudError(`message 主題訂閱失敗: ${err.message}`)
            } else {
                console.log("✅ 已成功訂閱 message 主題:", messageTopic)
            }
        })

        tagClient.subscribe(locationTopic, (err) => {
            if (err) {
                console.error("❌ Tag location 主題訂閱失敗:", err)
                setTagCloudError(`location 主題訂閱失敗: ${err.message}`)
            } else {
                console.log("✅ 已成功訂閱 location 主題:", locationTopic)
            }
        })

        // 檢查兩個主題是否都訂閱成功
        setTimeout(() => {
            if (!tagCloudError.includes("訂閱失敗")) {
                setTagCloudConnectionStatus("已連線並訂閱")
                console.log("✅ 兩個主題都已訂閱成功")
            }
        }, 1000)

        tagClient.on("message", (topic: string, payload: Uint8Array) => {
            console.log("📨 收到 Tag MQTT 消息")
            console.log("- 接收主題:", topic)
            console.log("- 預期主題:", messageTopic, "或", locationTopic)

            if (topic !== messageTopic && topic !== locationTopic) {
                console.log("⚠️ 主題不匹配，忽略消息")
                return
            }

            try {
                const rawMessage = new TextDecoder().decode(payload)
                console.log("📄 原始消息內容:", rawMessage)
                const msg = JSON.parse(rawMessage)
                console.log("📋 解析後的 JSON:", msg)

                // 處理 message 主題數據 (content: "info", node: "TAG")
                if (topic === messageTopic && msg.content === "info" && msg.node === "TAG") {
                    console.log("處理 Tag message 數據...")

                    const tagData = {
                        content: msg.content,
                        gateway_id: msg["gateway id"] || 0,
                        node: msg.node || "",
                        id: msg.id || 0,
                        id_hex: msg["id(Hex)"] || "",
                        fw_ver: msg["fw ver"] || 0,
                        battery_level: msg["battery level"] || 0,
                        battery_voltage: msg["battery voltage"] || 0,
                        led_on_time: msg["led on time(1ms)"] || 0,
                        led_off_time: msg["led off time(1ms)"] || 0,
                        bat_detect_time: msg["bat detect time(1s)"] || 0,
                        five_v_plugged: msg["5V plugged"] || "",
                        uwb_tx_power_changed: msg["uwb tx power changed"] || "",
                        uwb_tx_power: msg["uwb tx power"] || {},
                        serial_no: msg["serial no"] || 0,
                        receivedAt: new Date(),
                        topic: "message"
                    }

                    console.log("解析的 Tag message 數據:", tagData)

                    // 更新原始數據列表
                    setCloudTagData(prev => {
                        const newData = [tagData, ...prev].slice(0, 50)
                        return newData
                    })

                    // 檢查並更新發現的 Tag 列表
                    if (tagData.id) {
                        setDiscoveredCloudTags(prev => {
                            const existingTag = prev.find(t => t.id === tagData.id)

                            if (existingTag) {
                                // 更新現有 Tag
                                const updatedTags = prev.map(t =>
                                    t.id === tagData.id
                                        ? {
                                            ...t,
                                            battery_level: tagData.battery_level,
                                            battery_voltage: tagData.battery_voltage,
                                            lastSeen: new Date(),
                                            recordCount: t.recordCount + 1,
                                            isOnline: true
                                        }
                                        : t
                                )
                                console.log("更新現有 Tag，總數:", updatedTags.length)
                                return updatedTags
                            } else {
                                // 添加新 Tag
                                const newTag = {
                                    id: tagData.id,
                                    id_hex: tagData.id_hex,
                                    gateway_id: tagData.gateway_id,
                                    fw_ver: tagData.fw_ver,
                                    battery_level: tagData.battery_level,
                                    battery_voltage: tagData.battery_voltage,
                                    lastSeen: new Date(),
                                    recordCount: 1,
                                    isOnline: true,
                                    topic: "message"
                                }
                                const updatedTags = [...prev, newTag]
                                console.log("添加新 Tag:", newTag)
                                console.log("更新後總 Tag 數:", updatedTags.length)
                                return updatedTags
                            }
                        })

                        // 自動加入系統功能
                        const tagId = tagData.id.toString()
                        
                        setTags(prev => {
                            const existingLocalTag = prev.find(t => t.id === tagId)
                            
                            if (existingLocalTag) {
                                // 更新現有本地標籤信息
                                console.log("✅ 自動更新本地標籤信息:", tagId)
                                return prev.map(t => 
                                    t.id === tagId ? {
                                        ...t,
                                        status: tagData.battery_level > 20 ? 'active' : 'low_battery',
                                        batteryLevel: tagData.battery_level,
                                        lastPosition: t.lastPosition ? {
                                            ...t.lastPosition,
                                            timestamp: new Date()
                                        } : undefined
                                    } : t
                                )
                            } else {
                                // 自動創建新標籤並加入系統 - 參考錨點配對的實現方式
                                // 找到對應的本地 Gateway
                                const relatedGateway = currentGateways.find(gw => {
                                    // 檢查是否有雲端數據且 gateway_id 匹配
                                    if (gw.cloudData && gw.cloudData.gateway_id === tagData.gateway_id) {
                                        return true
                                    }
                                    // 檢查 MAC 地址是否匹配 (如果 MAC 格式為 GW:xxxxx)
                                    if (gw.macAddress.startsWith('GW:')) {
                                        const gatewayIdFromMac = parseInt(gw.macAddress.replace('GW:', ''), 16)
                                        return gatewayIdFromMac === tagData.gateway_id
                                    }
                                    return false
                                })

                                const newLocalTag: TagDevice = {
                                    id: tagId,
                                    gatewayId: relatedGateway?.id || selectedGatewayForTags || "default", // 優先使用關聯的本地 Gateway
                                    name: `ID_${tagData.id}`,
                                    macAddress: tagData.id_hex || `0x${tagData.id.toString(16).toUpperCase()}`,
                                    type: 'person',
                                    status: tagData.battery_level > 20 ? 'active' : 'low_battery',
                                    batteryLevel: tagData.battery_level,
                                    lastPosition: undefined,
                                    createdAt: new Date(),
                                    // 新增：保存雲端 Gateway ID 信息，參考錨點配對的實現
                                    cloudGatewayId: tagData.gateway_id
                                }
                                
                                console.log("✅ 自動加入新標籤到系統:", newLocalTag)
                                console.log("- 關聯的本地 Gateway:", relatedGateway?.name || "未找到")
                                console.log("- 雲端 Gateway ID:", tagData.gateway_id)
                                return [...prev, newLocalTag]
                            }
                        })
                    }
                }
                // 處理 location 主題數據 (content: "location", node: "TAG")
                else if (topic === locationTopic && msg.content === "location" && msg.node === "TAG") {
                    console.log("處理 Tag location 數據...")

                    const tagData = {
                        content: msg.content,
                        gateway_id: msg["gateway id"] || 0,
                        node: msg.node || "",
                        id: msg.id || 0,
                        position: msg.position || { x: 0, y: 0, z: 0, quality: 0 },
                        time: msg.time || "",
                        serial_no: msg["serial no"] || 0,
                        receivedAt: new Date(),
                        topic: "location"
                    }

                    console.log("解析的 Tag location 數據:", tagData)

                    // 更新原始數據列表
                    setCloudTagData(prev => {
                        const newData = [tagData, ...prev].slice(0, 50)
                        return newData
                    })

                    // 檢查並更新發現的 Tag 列表
                    if (tagData.id) {
                        setDiscoveredCloudTags(prev => {
                            const existingTag = prev.find(t => t.id === tagData.id)

                            if (existingTag) {
                                // 更新現有 Tag
                                const updatedTags = prev.map(t =>
                                    t.id === tagData.id
                                        ? {
                                            ...t,
                                            position: tagData.position,
                                            time: tagData.time,
                                            lastSeen: new Date(),
                                            recordCount: t.recordCount + 1,
                                            isOnline: true
                                        }
                                        : t
                                )
                                console.log("更新現有 Tag，總數:", updatedTags.length)
                                return updatedTags
                            } else {
                                // 添加新 Tag
                                const newTag = {
                                    id: tagData.id,
                                    gateway_id: tagData.gateway_id,
                                    position: tagData.position,
                                    time: tagData.time,
                                    lastSeen: new Date(),
                                    recordCount: 1,
                                    isOnline: true,
                                    topic: "location"
                                }
                                const updatedTags = [...prev, newTag]
                                console.log("添加新 Tag:", newTag)
                                console.log("更新後總 Tag 數:", updatedTags.length)
                                return updatedTags
                            }
                        })

                        // 自動加入系統功能
                        const tagId = tagData.id.toString()
                        
                        setTags(prev => {
                            const existingLocalTag = prev.find(t => t.id === tagId)
                            
                            if (existingLocalTag) {
                                // 更新現有本地標籤的位置信息
                                console.log("✅ 自動更新本地標籤位置信息:", tagId)
                                return prev.map(t => 
                                    t.id === tagId ? {
                                        ...t,
                                        lastPosition: {
                                            x: tagData.position.x,
                                            y: tagData.position.y,
                                            z: tagData.position.z,
                                            floorId: selectedFloorForTags,
                                            timestamp: tagData.time ? new Date(tagData.time) : new Date()
                                        }
                                    } : t
                                )
                            } else {
                                // 自動創建新標籤並加入系統 - 參考錨點配對的實現方式
                                // 找到對應的本地 Gateway
                                const relatedGateway = currentGateways.find(gw => {
                                    // 檢查是否有雲端數據且 gateway_id 匹配
                                    if (gw.cloudData && gw.cloudData.gateway_id === tagData.gateway_id) {
                                        return true
                                    }
                                    // 檢查 MAC 地址是否匹配 (如果 MAC 格式為 GW:xxxxx)
                                    if (gw.macAddress.startsWith('GW:')) {
                                        const gatewayIdFromMac = parseInt(gw.macAddress.replace('GW:', ''), 16)
                                        return gatewayIdFromMac === tagData.gateway_id
                                    }
                                    return false
                                })

                                const newLocalTag: TagDevice = {
                                    id: tagId,
                                    gatewayId: relatedGateway?.id || selectedGatewayForTags || "default", // 優先使用關聯的本地 Gateway
                                    name: `ID_${tagData.id}`,
                                    macAddress: `0x${tagData.id.toString(16).toUpperCase()}`,
                                    type: 'person',
                                    status: 'active',
                                    batteryLevel: 100, // 默認電量
                                    lastPosition: {
                                        x: tagData.position.x,
                                        y: tagData.position.y,
                                        z: tagData.position.z,
                                        floorId: selectedFloorForTags,
                                        timestamp: tagData.time ? new Date(tagData.time) : new Date()
                                    },
                                    createdAt: new Date(),
                                    // 新增：保存雲端 Gateway ID 信息，參考錨點配對的實現
                                    cloudGatewayId: tagData.gateway_id
                                }
                                
                                console.log("✅ 自動加入新標籤到系統:", newLocalTag)
                                console.log("- 關聯的本地 Gateway:", relatedGateway?.name || "未找到")
                                console.log("- 雲端 Gateway ID:", tagData.gateway_id)
                                return [...prev, newLocalTag]
                            }
                        })
                    }
                } else {
                    console.log("⚠️ 非 Tag 相關數據，內容:", msg.content, "節點:", msg.node, "主題:", topic)
                }

            } catch (error) {
                console.error('Tag 雲端 MQTT 訊息解析錯誤:', error)
            }
        })

        return () => {
            console.log("清理 Tag 雲端 MQTT 連接")
            tagClient.end()
        }
    }, [selectedGatewayForTags]) // 只在選擇的 Gateway 改變時重新連接

    // 監聽養老院和樓層變化，自動更新標籤管理的選擇
    useEffect(() => {
        if (selectedHomeForTags && selectedFloorForTags) {
            // 檢查選中的樓層是否仍然屬於選中的養老院
            const floor = floors.find(f => f.id === selectedFloorForTags)
            if (floor && floor.homeId !== selectedHomeForTags) {
                // 如果樓層不屬於選中的養老院，重置樓層選擇
                setSelectedFloorForTags("")
                setSelectedGatewayForTags("")
            }
        }
    }, [selectedHomeForTags, selectedFloorForTags, floors])

    // 處理表單提交
    const handleHomeSubmit = () => {
        if (editingItem) {
            setHomes(prev => prev.map(home =>
                home.id === editingItem.id
                    ? { ...home, ...homeForm }
                    : home
            ))
        } else {
            const newHome: Home = {
                id: `home_${Date.now()}`,
                ...homeForm,
                createdAt: new Date()
            }
            setHomes(prev => [...prev, newHome])
            setSelectedHome(newHome.id)
        }
        resetHomeForm()
    }

    const handleFloorSubmit = () => {
        if (!selectedHome) return

        if (editingItem) {
            setFloors(prev => prev.map(floor =>
                floor.id === editingItem.id
                    ? {
                        ...floor,
                        ...floorForm,
                        dimensions: {
                            width: 800, // 預設畫布大小
                            height: 600,
                            realWidth: floorForm.realWidth,
                            realHeight: floorForm.realHeight
                        }
                    }
                    : floor
            ))
        } else {
            const newFloor: Floor = {
                id: `floor_${Date.now()}`,
                homeId: selectedHome,
                ...floorForm,
                dimensions: {
                    width: 800,
                    height: 600,
                    realWidth: floorForm.realWidth,
                    realHeight: floorForm.realHeight
                },
                createdAt: new Date()
            }
            setFloors(prev => [...prev, newFloor])
        }
        resetFloorForm()
    }

    const handleGatewaySubmit = () => {
        if (!gatewayForm.floorId) return

        if (editingItem) {
            setGateways(prev => prev.map(gateway =>
                gateway.id === editingItem.id
                    ? { ...gateway, ...gatewayForm }
                    : gateway
            ))
        } else {
            // 查找是否為雲端發現的 Gateway
            let cloudData = null
            if (selectedDiscoveredGateway) {
                cloudData = cloudGatewayData.find(gw => gw.gateway_id === selectedDiscoveredGateway)
            }

            const newGateway: Gateway = {
                id: `gw_${Date.now()}`,
                ...gatewayForm,
                status: cloudData?.uwb_joined === "yes" ? "online" : "offline",
                createdAt: new Date(),
                cloudData: cloudData || undefined // 保存完整的雲端數據
            }

            console.log("新增 Gateway，包含雲端數據:", newGateway)
            setGateways(prev => [...prev, newGateway])
        }
        resetGatewayForm()
    }

    // 重置表單
    const resetHomeForm = () => {
        setHomeForm({ name: "", description: "", address: "" })
        setShowHomeForm(false)
        setEditingItem(null)
    }

    const resetFloorForm = () => {
        setFloorForm({ name: "", level: 1, realWidth: 0, realHeight: 0 })
        setShowFloorForm(false)
        setEditingItem(null)
    }

    const resetGatewayForm = () => {
        setGatewayForm({ name: "", macAddress: "", ipAddress: "", floorId: "" })
        setShowGatewayForm(false)
        setEditingItem(null)
        setSelectedDiscoveredGateway(null)
    }

    // 從雲端發現的 Anchor 加入系統
    const handleAddAnchorFromCloud = (cloudAnchor: DiscoveredCloudAnchor) => {
        // 找到對應的 Gateway
        const relatedGateway = gateways.find(gw => {
            // 檢查是否有雲端數據且 gateway_id 匹配
            if (gw.cloudData && gw.cloudData.gateway_id === cloudAnchor.gateway_id) {
                return true
            }
            // 檢查 MAC 地址是否匹配 (如果 MAC 格式為 GW:xxxxx)
            if (gw.macAddress.startsWith('GW:')) {
                const gatewayIdFromMac = parseInt(gw.macAddress.replace('GW:', ''), 16)
                return gatewayIdFromMac === cloudAnchor.gateway_id
            }
            return false
        })

        if (!relatedGateway) {
            console.error("找不到對應的 Gateway，無法加入 Anchor")
            return
        }

        const newAnchor: AnchorDevice = {
            id: `anchor_${Date.now()}`,
            gatewayId: relatedGateway.id,
            name: cloudAnchor.name,
            macAddress: `ANCHOR:${cloudAnchor.id}`, // 使用 Anchor ID 作為 MAC
            status: 'active',
            position: {
                x: cloudAnchor.position.x,
                y: cloudAnchor.position.y,
                z: cloudAnchor.position.z
            },
            lastSeen: cloudAnchor.lastSeen,
            createdAt: new Date(),
            cloudData: {
                content: "config",
                gateway_id: cloudAnchor.gateway_id,
                node: "ANCHOR",
                name: cloudAnchor.name,
                id: cloudAnchor.id,
                fw_update: cloudAnchor.fw_update,
                led: cloudAnchor.led,
                ble: cloudAnchor.ble,
                initiator: cloudAnchor.initiator,
                position: cloudAnchor.position,
                receivedAt: cloudAnchor.lastSeen
            },
            cloudGatewayId: cloudAnchor.gateway_id
        }

        console.log("加入雲端 Anchor 到系統:", newAnchor)
        setAnchors(prev => [...prev, newAnchor])
    }

    // 獲取圖片在 object-contain 模式下的實際顯示信息
    const getImageDisplayInfo = (imgElement: HTMLImageElement) => {
        const naturalWidth = imgElement.naturalWidth
        const naturalHeight = imgElement.naturalHeight
        const containerWidth = imgElement.clientWidth
        const containerHeight = imgElement.clientHeight

        const aspectRatio = naturalWidth / naturalHeight
        const containerAspectRatio = containerWidth / containerHeight

        let actualImageWidth, actualImageHeight, offsetX, offsetY

        if (aspectRatio > containerAspectRatio) {
            // 圖片較寬，以容器寬度為準
            actualImageWidth = containerWidth
            actualImageHeight = containerWidth / aspectRatio
            offsetX = 0
            offsetY = (containerHeight - actualImageHeight) / 2
        } else {
            // 圖片較高，以容器高度為準
            actualImageWidth = containerHeight * aspectRatio
            actualImageHeight = containerHeight
            offsetX = (containerWidth - actualImageWidth) / 2
            offsetY = 0
        }

        return {
            naturalWidth,
            naturalHeight,
            containerWidth,
            containerHeight,
            actualImageWidth,
            actualImageHeight,
            offsetX,
            offsetY
        }
    }

    // 將圖片自然座標轉換為顯示座標
    const convertNaturalToDisplayCoords = (naturalX: number, naturalY: number, imgElement: HTMLImageElement) => {
        const info = getImageDisplayInfo(imgElement)

        console.log(`🔧 convertNaturalToDisplayCoords 調試:`)
        console.log(`- 圖片自然尺寸: ${info.naturalWidth} x ${info.naturalHeight}`)
        console.log(`- 圖片容器尺寸: ${info.containerWidth} x ${info.containerHeight}`)
        console.log(`- 圖片實際顯示尺寸: ${info.actualImageWidth.toFixed(1)} x ${info.actualImageHeight.toFixed(1)}`)
        console.log(`- 圖片偏移: (${info.offsetX.toFixed(1)}, ${info.offsetY.toFixed(1)})`)
        console.log(`- 輸入自然座標: (${naturalX.toFixed(1)}, ${naturalY.toFixed(1)})`)

        const displayX = info.offsetX + (naturalX / info.naturalWidth) * info.actualImageWidth
        const displayY = info.offsetY + (naturalY / info.naturalHeight) * info.actualImageHeight

        console.log(`- 輸出顯示座標: (${displayX.toFixed(1)}, ${displayY.toFixed(1)})`)
        console.log(`---`)

        return { x: displayX, y: displayY }
    }

    // 將實際座標轉換為地圖像素座標（自然尺寸）
    const convertToMapPixels = (x: number, y: number, floor: Floor) => {
        if (!floor.calibration || !floor.calibration.isCalibrated) {
            return null
        }

        const { originPixel, originCoordinates, pixelToMeterRatio } = floor.calibration

        // 計算相對於原點的實際距離（米）
        const deltaX = x - (originCoordinates?.x || 0)
        const deltaY = y - (originCoordinates?.y || 0)

        // 轉換為像素距離
        // 注意：Y軸需要反向，因為圖像座標系Y軸向下為正，而實際座標系Y軸向上為正
        const pixelX = originPixel.x + (deltaX * pixelToMeterRatio)
        const pixelY = originPixel.y - (deltaY * pixelToMeterRatio) // 注意這裡是減號

        console.log(`🎯 座標轉換調試:`)
        console.log(`- 實際座標: (${x}, ${y}) 米`)
        console.log(`- 原點實際座標: (${originCoordinates?.x || 0}, ${originCoordinates?.y || 0}) 米`)
        console.log(`- 原點像素座標: (${originPixel.x}, ${originPixel.y}) px`)
        console.log(`- 距離差值: (${deltaX}, ${deltaY}) 米`)
        console.log(`- 比例: ${pixelToMeterRatio.toFixed(2)} 像素/米`)
        console.log(`- X計算: ${originPixel.x} + (${deltaX} * ${pixelToMeterRatio.toFixed(2)}) = ${pixelX.toFixed(1)}`)
        console.log(`- Y計算: ${originPixel.y} - (${deltaY} * ${pixelToMeterRatio.toFixed(2)}) = ${pixelY.toFixed(1)} (注意Y軸反向)`)
        console.log(`- 轉換後像素座標: (${pixelX.toFixed(1)}, ${pixelY.toFixed(1)}) px`)

        // 邊界檢查
        if (pixelX < -100 || pixelX > 2000 || pixelY < -100 || pixelY > 2000) {
            console.warn(`⚠️ 座標超出合理範圍: (${pixelX.toFixed(1)}, ${pixelY.toFixed(1)})`)
        }
        console.log(`---`)

        return { x: pixelX, y: pixelY }
    }

    // 將實際座標轉換為地圖顯示座標（考慮圖片縮放）
    const convertRealToDisplayCoords = (x: number, y: number, floor: Floor, imgElement: HTMLImageElement) => {
        // 首先轉換為自然尺寸的像素座標
        const naturalPixelCoords = convertToMapPixels(x, y, floor)
        if (!naturalPixelCoords) return null

        // 然後將自然座標轉換為顯示座標
        const displayCoords = convertNaturalToDisplayCoords(naturalPixelCoords.x, naturalPixelCoords.y, imgElement)

        console.log(`🔄 實際座標到顯示座標轉換:`)
        console.log(`- 實際座標: (${x}, ${y}) 米`)
        console.log(`- 自然像素座標: (${naturalPixelCoords.x.toFixed(1)}, ${naturalPixelCoords.y.toFixed(1)}) px`)
        console.log(`- 顯示座標: (${displayCoords.x.toFixed(1)}, ${displayCoords.y.toFixed(1)}) px`)
        console.log(`---`)

        return displayCoords
    }

    // 獲取指定樓層的 Anchor 列表
    const getAnchorsForFloor = (floorId: string) => {
        return anchors.filter(anchor => {
            // 通過 Gateway 關聯找到樓層
            const gateway = gateways.find(gw => gw.id === anchor.gatewayId)
            return gateway?.floorId === floorId
        })
    }

    // 刪除功能
    const deleteHome = (id: string) => {
        setHomes(prev => prev.filter(home => home.id !== id))
        if (selectedHome === id && homes.length > 1) {
            setSelectedHome(homes.find(h => h.id !== id)?.id || "")
        }
    }

    const deleteFloor = (id: string) => {
        setFloors(prev => prev.filter(floor => floor.id !== id))
        // 同時刪除該樓層的所有閘道器
        setGateways(prev => prev.filter(gateway => gateway.floorId !== id))
    }

    const deleteGateway = (id: string) => {
        setGateways(prev => prev.filter(gateway => gateway.id !== id))
        // 同時刪除該Gateway的所有Anchor
        setAnchors(prev => prev.filter(anchor => anchor.gatewayId !== id))
    }

    // Anchor配對流程（模擬）
    const startAnchorPairing = async () => {
        if (!selectedGateway) return

        setPairingInProgress(true)
        setDiscoveredAnchors([])

        // 模擬配對過程
        const mockDiscovery = [
            "11:22:33:44:55:05",
            "11:22:33:44:55:06",
            "11:22:33:44:55:07"
        ]

        for (let i = 0; i < mockDiscovery.length; i++) {
            await new Promise(resolve => setTimeout(resolve, 1000))
            setDiscoveredAnchors(prev => [...prev, mockDiscovery[i]])
        }

        setPairingInProgress(false)
    }

    // 添加發現的Anchor到系統
    const addDiscoveredAnchor = (macAddress: string) => {
        const newAnchor: AnchorDevice = {
            id: `anchor_${Date.now()}`,
            gatewayId: selectedGateway,
            name: `新錨點 ${macAddress.slice(-5)}`,
            macAddress: macAddress,
            status: 'paired',
            signalStrength: Math.floor(Math.random() * 40) + 60, // 60-100
            batteryLevel: Math.floor(Math.random() * 30) + 70, // 70-100
            createdAt: new Date()
        }

        setAnchors(prev => [...prev, newAnchor])
        setDiscoveredAnchors(prev => prev.filter(mac => mac !== macAddress))
    }

    // Tag管理函數
    const handleTagSubmit = () => {
        if (editingTag) {
            setTags(prev => prev.map(tag =>
                tag.id === editingTag.id
                    ? { ...tag, ...tagForm }
                    : tag
            ))
        } else {
            const newTag: TagDevice = {
                id: `tag_${Date.now()}`,
                gatewayId: selectedGatewayForTags || "default", // 使用当前选择的网关
                ...tagForm,
                status: 'inactive',
                batteryLevel: 100,
                createdAt: new Date()
            }
            setTags(prev => [...prev, newTag])
        }
        resetTagForm()
    }

    const resetTagForm = () => {
        setTagForm({ name: "", macAddress: "", type: "person", assignedTo: "" })
        setShowTagForm(false)
        setEditingTag(null)
    }

    const deleteTag = (id: string) => {
        setTags(prev => prev.filter(tag => tag.id !== id))
    }

    const deleteAnchor = (id: string) => {
        setAnchors(prev => prev.filter(anchor => anchor.id !== id))
    }

    // 開始 Anchor 座標校正（手動輸入模式）
    const startAnchorCalibration = (anchor: AnchorDevice) => {
        setCalibratingAnchor(anchor)
        setAnchorPositionInput({
            x: anchor.position?.x.toString() || '',
            y: anchor.position?.y.toString() || '',
            z: anchor.position?.z.toString() || '',
            coordinateType: 'real'
        })
    }

    // 地圖上雙擊 Anchor 開始校正
    const startAnchorMapCalibration = (anchor: AnchorDevice, mapClickEvent: React.MouseEvent) => {
        console.log(`🎯 開始 Anchor 地圖雙擊校正: ${anchor.name}`)

        // 阻止事件冒泡
        mapClickEvent.preventDefault()
        mapClickEvent.stopPropagation()

        // 直接查詢圖片元素
        const imgElement = document.querySelector('.anchor-map-image') as HTMLImageElement
        if (!imgElement) {
            console.error('❌ 找不到地圖圖片元素')
            return
        }

        // 找到 Anchor 所屬的樓層
        const gateway = gateways.find(g => g.id === anchor.gatewayId)
        const floor = floors.find(f => f.id === gateway?.floorId)
        if (!floor || !floor.calibration?.isCalibrated) {
            console.error('❌ 找不到樓層或樓層未校準')
            return
        }

        console.log(`📍 找到樓層: ${floor.name}, Gateway: ${gateway?.name}`)

        // 獲取當前 Anchor 在地圖上的顯示位置，然後模擬點擊該位置
        const displayPos = convertRealToDisplayCoords(anchor.position!.x, anchor.position!.y, floor, imgElement)
        if (!displayPos) {
            console.error('❌ 無法計算 Anchor 顯示位置')
            return
        }

        console.log(`📍 Anchor 當前顯示位置: (${displayPos.x.toFixed(1)}, ${displayPos.y.toFixed(1)})`)

        // 進入地圖點擊校正模式
        setCalibratingAnchor(anchor)
        setAnchorPositionInput({
            x: anchor.position?.x.toString() || '',
            y: anchor.position?.y.toString() || '',
            z: anchor.position?.z.toString() || '',
            coordinateType: 'real'
        })

        console.log(`✅ 已進入 ${anchor.name} 的地圖點擊校正模式`)
        console.log(`📍 請在地圖上點擊新的位置來設定 Anchor 座標`)
    }

    // 地圖點擊校正處理
    const handleMapClickCalibration = (event: React.MouseEvent<HTMLImageElement>) => {
        if (!calibratingAnchor) return

        console.log(`🎯 地圖點擊校正: ${calibratingAnchor.name}`)

        const imgElement = event.currentTarget
        // 找到 Anchor 所屬的樓層
        const gateway = gateways.find(g => g.id === calibratingAnchor.gatewayId)
        const floor = floors.find(f => f.id === gateway?.floorId)
        if (!floor || !floor.calibration?.isCalibrated) {
            console.error('❌ 找不到樓層或樓層未校準')
            return
        }

        const info = getImageDisplayInfo(imgElement)
        const rect = imgElement.getBoundingClientRect()

        // 計算點擊位置
        const clickX = event.clientX - rect.left
        const clickY = event.clientY - rect.top

        // 檢查是否點擊在圖片區域內
        if (clickX < info.offsetX || clickY < info.offsetY ||
            clickX > info.offsetX + info.actualImageWidth || clickY > info.offsetY + info.actualImageHeight) {
            console.warn('點擊位置超出圖片區域')
            return
        }

        // 轉換為圖片自然座標
        const relativeX = (clickX - info.offsetX) / info.actualImageWidth
        const relativeY = (clickY - info.offsetY) / info.actualImageHeight
        const naturalX = relativeX * info.naturalWidth
        const naturalY = relativeY * info.naturalHeight

        // 轉換為真實座標
        const realCoords = convertPixelToMeter({ x: naturalX, y: naturalY }, floor)
        if (!realCoords) {
            console.error('❌ 無法轉換為真實座標')
            return
        }

        console.log(`📍 地圖點擊校正結果:`)
        console.log(`- 點擊位置: (${clickX.toFixed(1)}, ${clickY.toFixed(1)})`)
        console.log(`- 自然座標: (${naturalX.toFixed(1)}, ${naturalY.toFixed(1)})`)
        console.log(`- 真實座標: (${realCoords.x.toFixed(2)}, ${realCoords.y.toFixed(2)})`)

        // 直接更新 Anchor 位置（保持原有的 Z 座標）
        const newPosition = {
            x: realCoords.x,
            y: realCoords.y,
            z: calibratingAnchor.position?.z || 2.5 // 如果沒有 Z 座標，預設 2.5 米
        }

        setAnchors(prev => prev.map(a =>
            a.id === calibratingAnchor.id
                ? { ...a, position: newPosition }
                : a
        ))

        console.log(`✅ Anchor 座標已更新:`)
        console.log(`- 新座標: (${newPosition.x.toFixed(2)}, ${newPosition.y.toFixed(2)}, ${newPosition.z.toFixed(2)})`)

        // 顯示成功提示
        console.log(`🎉 ${calibratingAnchor.name} 座標校正完成！`)

        // 詢問是否要發送配置到雲端
        const shouldSendToCloud = confirm(`✅ ${calibratingAnchor.name} 座標已更新！\n\n是否要將新座標發送到雲端硬體？\n\n點擊「確定」可進一步配置參數並發送`)

        if (shouldSendToCloud) {
            // 開啟配置對話框
            openConfigDialog(calibratingAnchor, newPosition)
        } else {
            // 清理校正狀態
            setCalibratingAnchor(null)
        }
    }

    // 取消 Anchor 座標校正
    const cancelAnchorCalibration = () => {
        setCalibratingAnchor(null)
        setAnchorPositionInput({ x: '', y: '', z: '', coordinateType: 'real' })
    }



    // 保存 Anchor 座標校正
    const saveAnchorCalibration = () => {
        if (!calibratingAnchor) return

        const x = parseFloat(anchorPositionInput.x)
        const y = parseFloat(anchorPositionInput.y)
        const z = parseFloat(anchorPositionInput.z)

        if (isNaN(x) || isNaN(y) || isNaN(z)) {
            alert('請輸入有效的座標數值')
            return
        }

        let finalCoords = { x, y, z }

        // 如果輸入的是像素座標，需要轉換為真實座標
        if (anchorPositionInput.coordinateType === 'pixel') {
            const gateway = gateways.find(g => g.id === calibratingAnchor.gatewayId)
            const floor = floors.find(f => f.id === gateway?.floorId)
            if (floor && floor.calibration?.isCalibrated) {
                const realCoords = convertPixelToMeter({ x, y }, floor)
                if (realCoords) {
                    finalCoords = { x: realCoords.x, y: realCoords.y, z }
                }
            }
        }

        // 更新 Anchor 位置
        setAnchors(prev => prev.map(anchor =>
            anchor.id === calibratingAnchor.id
                ? { ...anchor, position: finalCoords }
                : anchor
        ))

        console.log(`✅ Anchor 座標已更新:`)
        console.log(`- Anchor: ${calibratingAnchor.name}`)
        console.log(`- 新座標: (${finalCoords.x.toFixed(2)}, ${finalCoords.y.toFixed(2)}, ${finalCoords.z.toFixed(2)})`)

        // 詢問是否要發送配置到雲端
        const shouldSendToCloud = confirm(`✅ ${calibratingAnchor.name} 座標已更新！\n\n是否要將新座標發送到雲端硬體？\n\n點擊「確定」可進一步配置參數並發送`)

        if (shouldSendToCloud) {
            // 開啟配置對話框
            openConfigDialog(calibratingAnchor, finalCoords)
        } else {
            // 清理狀態
            cancelAnchorCalibration()
        }
    }

    // 發送 Anchor 配置到雲端
    const sendAnchorConfigToCloud = async (anchor: AnchorDevice, position: { x: number, y: number, z: number }) => {
        try {
            setSendingConfig(true)

            // 找到對應的 Gateway 來獲取 downlink topic
            const gateway = gateways.find(g => g.id === anchor.gatewayId)
            if (!gateway || !gateway.cloudData?.sub_topic?.downlink) {
                console.error('❌ 找不到 Gateway 或 downlink 主題')
                alert('找不到對應的 Gateway 下行鏈路主題')
                return false
            }

            // 檢查 downlink 是否已包含 UWB/ 前綴
            const downlinkValue = gateway.cloudData.sub_topic.downlink
            const downlinkTopic = downlinkValue.startsWith('UWB/') ? downlinkValue : `UWB/${downlinkValue}`

            console.log(`🔍 MQTT 主題檢查:`)
            console.log(`- 原始 downlink 值: "${downlinkValue}"`)
            console.log(`- 最終主題: "${downlinkTopic}"`)

            // 構建配置訊息 (使用表單中的 serial_no)
            const configMessage = {
                content: "configChange",
                gateway_id: gateway.cloudData.gateway_id,
                node: "ANCHOR",
                name: anchor.cloudData?.name || anchor.name,
                id: anchor.cloudData?.id || parseInt(anchor.macAddress.replace(/[^0-9]/g, '')),
                fw_update: anchorConfigForm.fw_update,
                led: anchorConfigForm.led,
                ble: anchorConfigForm.ble,
                initiator: anchorConfigForm.initiator,
                position: {
                    x: position.x,
                    y: position.y,
                    z: position.z
                },
                serial_no: anchorConfigForm.serial_no
            }

            console.log(`🚀 準備發送 Anchor 配置到雲端:`)
            console.log(`- 主題: ${downlinkTopic}`)
            console.log(`- Gateway ID: ${gateway.cloudData.gateway_id}`)
            console.log(`- Anchor 名稱: ${configMessage.name} (來源: ${anchor.cloudData?.name ? '雲端' : '本地'})`)
            console.log(`- Anchor ID: ${configMessage.id} (來源: ${anchor.cloudData?.id ? '雲端' : 'MAC轉換'})`)
            console.log(`- MAC 地址: ${anchor.macAddress}`)
            console.log(`- 位置: (${position.x}, ${position.y}, ${position.z})`)
            console.log(`- Serial No: ${anchorConfigForm.serial_no}`)
            console.log(`- 配置參數:`, anchorConfigForm)

            // 使用雲端 MQTT 客戶端發送
            if (cloudClientRef.current && cloudConnected) {
                const messageJson = JSON.stringify(configMessage)

                cloudClientRef.current.publish(downlinkTopic, messageJson, (error) => {
                    if (error) {
                        console.error('❌ 發送配置失敗:', error)
                        alert('發送配置失敗: ' + error.message)
                    } else {
                        console.log('✅ Anchor 配置已成功發送到雲端')
                        alert(`✅ 已將 ${anchor.name} 的新座標發送到雲端硬體`)

                        // 發送成功後，更新全域 serial_no 為下一個值
                        const nextSerial = anchorConfigForm.serial_no >= 9999 ? 1306 : anchorConfigForm.serial_no + 1
                        setGlobalSerialNo(nextSerial)
                        console.log(`📡 Serial No 已更新: ${anchorConfigForm.serial_no} → ${nextSerial}`)

                        // 記錄發送的完整訊息
                        console.log('📤 發送的完整訊息:')
                        console.log(JSON.stringify(configMessage, null, 2))
                    }
                })
            } else {
                console.error('❌ 雲端 MQTT 未連接')
                alert('雲端 MQTT 未連接，無法發送配置')
                return false
            }

            return true

        } catch (error) {
            console.error('❌ 發送 Anchor 配置時發生錯誤:', error)
            alert('發送配置時發生錯誤: ' + error)
            return false
        } finally {
            setSendingConfig(false)
        }
    }

    // 開啟配置發送對話框
    const openConfigDialog = (anchor: AnchorDevice, newPosition: { x: number, y: number, z: number }) => {
        const nextSerial = getNextSerialNo() // 獲取下一個 serial_no
        setAnchorConfigForm({
            fw_update: anchor.cloudData?.fw_update || 0,
            led: anchor.cloudData?.led || 1,
            ble: anchor.cloudData?.ble || 1,
            initiator: anchor.cloudData?.initiator || 0,
            serial_no: nextSerial // 使用獲取的 serial_no
        })

        // 先關閉校正彈窗，再開啟配置發送對話框
        setCalibratingAnchor(null)
        setShowConfigDialog(true)

        // 保存當前 anchor 和位置信息到臨時狀態，以便發送時使用
        setAnchorPositionInput({
            x: newPosition.x.toString(),
            y: newPosition.y.toString(),
            z: newPosition.z.toString(),
            coordinateType: 'real'
        })

        // 將 anchor 信息保存到配置表單中，但不設置 calibratingAnchor
        // 我們需要一個新的狀態來保存正在配置的 anchor
        setConfigAnchor(anchor)
    }

    // 關閉配置對話框
    const closeConfigDialog = () => {
        setShowConfigDialog(false)
        setConfigAnchor(null)
        setAnchorConfigForm({
            fw_update: 0,
            led: 1,
            ble: 1,
            initiator: 0,
            serial_no: 1306
        })
    }

    // 地圖上傳處理
    const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0]
        if (file) {
            const reader = new FileReader()
            reader.onload = (e) => {
                const result = e.target?.result as string
                setUploadedImage(result)
                setCalibrationStep('setOrigin')
            }
            reader.readAsDataURL(file)
        }
    }

    // 開始地圖標定流程
    const startMapCalibration = (floor: Floor) => {
        setCalibratingFloor(floor)
        setShowMapCalibration(true)
        setCalibrationStep('upload')
        setUploadedImage(floor.mapImage || "")
        setSelectedOrigin(floor.calibration?.originPixel || null)
        setOriginCoordinates(floor.calibration?.originCoordinates || { x: 0, y: 0 })
        setScalePoints(floor.calibration?.scalePoints || { point1: null, point2: null })
        setRealDistance(floor.calibration?.realDistance || 1)
        setPixelToMeterRatio(floor.calibration?.pixelToMeterRatio || 100)

        if (floor.mapImage) {
            setCalibrationStep(floor.calibration?.isCalibrated ? 'complete' : 'setOrigin')
        }
    }

    // 圖片加載狀態和引用
    const [imageLoaded, setImageLoaded] = useState(false)
    const mapImageRef = useRef<HTMLImageElement>(null)
    const scaleImageRef = useRef<HTMLImageElement>(null)

    // Anchor 座標校正相關狀態
    const [calibratingAnchor, setCalibratingAnchor] = useState<AnchorDevice | null>(null)
    const [anchorCalibrationMode, setAnchorCalibrationMode] = useState<'manual'>('manual') // 移除地圖點選模式
    const [anchorPositionInput, setAnchorPositionInput] = useState({
        x: '',
        y: '',
        z: '',
        coordinateType: 'real' as 'real' | 'pixel' // 座標類型：真實座標或像素座標
    })

    // Anchor 配置發送相關狀態
    const [sendingConfig, setSendingConfig] = useState(false)
    const [showConfigDialog, setShowConfigDialog] = useState(false)
    const [configAnchor, setConfigAnchor] = useState<AnchorDevice | null>(null) // 正在配置的 Anchor
    const [anchorConfigForm, setAnchorConfigForm] = useState({
        fw_update: 0,
        led: 1,
        ble: 1,
        initiator: 0,
        serial_no: 1306 // 用戶可修改的 serial_no
    })

    // 地圖點擊處理
    const handleMapClick = (event: React.MouseEvent<HTMLImageElement>) => {
        const imgElement = event.currentTarget
        const rect = imgElement.getBoundingClientRect()
        const info = getImageDisplayInfo(imgElement)

        // 計算相對於容器的點擊位置
        const clickX = event.clientX - rect.left
        const clickY = event.clientY - rect.top

        // 檢查是否點擊在實際圖片區域內
        if (clickX < info.offsetX || clickY < info.offsetY ||
            clickX > info.offsetX + info.actualImageWidth || clickY > info.offsetY + info.actualImageHeight) {
            console.warn(`點擊位置超出圖片區域: (${clickX.toFixed(1)}, ${clickY.toFixed(1)})`)
            console.warn(`圖片實際區域: ${info.offsetX.toFixed(1)}-${(info.offsetX + info.actualImageWidth).toFixed(1)} x ${info.offsetY.toFixed(1)}-${(info.offsetY + info.actualImageHeight).toFixed(1)}`)
            return
        }

        // 轉換為圖片內的相對座標，然後縮放到自然尺寸
        const relativeX = (clickX - info.offsetX) / info.actualImageWidth
        const relativeY = (clickY - info.offsetY) / info.actualImageHeight
        const imageX = relativeX * info.naturalWidth
        const imageY = relativeY * info.naturalHeight

        console.log(`🎯 地圖點擊詳細信息:`)
        console.log(`- 容器尺寸: ${info.containerWidth} x ${info.containerHeight}`)
        console.log(`- 圖片自然尺寸: ${info.naturalWidth} x ${info.naturalHeight}`)
        console.log(`- 圖片實際顯示尺寸: ${info.actualImageWidth.toFixed(1)} x ${info.actualImageHeight.toFixed(1)}`)
        console.log(`- 圖片偏移: (${info.offsetX.toFixed(1)}, ${info.offsetY.toFixed(1)})`)
        console.log(`- 點擊位置(容器): (${clickX.toFixed(1)}, ${clickY.toFixed(1)})`)
        console.log(`- 點擊位置(圖片): (${imageX.toFixed(1)}, ${imageY.toFixed(1)})`)

        if (calibrationStep === 'setOrigin') {
            setSelectedOrigin({ x: imageX, y: imageY })
            console.log(`✅ 設定原點: (${imageX.toFixed(1)}, ${imageY.toFixed(1)}) px`)
        } else if (calibrationStep === 'setScale') {
            if (!scalePoints.point1) {
                setScalePoints(prev => ({ ...prev, point1: { x: imageX, y: imageY } }))
                console.log(`✅ 設定比例點1: (${imageX.toFixed(1)}, ${imageY.toFixed(1)}) px`)
            } else if (!scalePoints.point2) {
                setScalePoints(prev => ({ ...prev, point2: { x: imageX, y: imageY } }))
                console.log(`✅ 設定比例點2: (${imageX.toFixed(1)}, ${imageY.toFixed(1)}) px`)
            } else {
                // 重新選擇第一個點
                setScalePoints({ point1: { x: imageX, y: imageY }, point2: null })
                console.log(`✅ 重新設定比例點1: (${imageX.toFixed(1)}, ${imageY.toFixed(1)}) px`)
            }
        }
    }

    // 保存地圖標定
    const saveMapCalibration = () => {
        if (!calibratingFloor || !selectedOrigin || !uploadedImage || !scalePoints.point1 || !scalePoints.point2) return

        // 計算兩點之間的像素距離
        const pixelDistance = Math.sqrt(
            Math.pow(scalePoints.point2.x - scalePoints.point1.x, 2) +
            Math.pow(scalePoints.point2.y - scalePoints.point1.y, 2)
        )

        // 計算像素/公尺比例
        const calculatedRatio = pixelDistance / realDistance

        const updatedFloor: Floor = {
            ...calibratingFloor,
            mapImage: uploadedImage,
            calibration: {
                originPixel: selectedOrigin,
                originCoordinates: originCoordinates,
                pixelToMeterRatio: calculatedRatio,
                scalePoints: scalePoints,
                realDistance: realDistance,
                isCalibrated: true
            }
        }

        setFloors(prev => prev.map(floor =>
            floor.id === calibratingFloor.id ? updatedFloor : floor
        ))

        // 同步更新狀態中的比例值
        setPixelToMeterRatio(calculatedRatio)

        setCalibrationStep('complete')
    }

    // 重置地圖標定
    const resetMapCalibration = () => {
        setShowMapCalibration(false)
        setCalibratingFloor(null)
        setUploadedImage("")
        setCalibrationStep('upload')
        setSelectedOrigin(null)
        setOriginCoordinates({ x: 0, y: 0 })
        setScalePoints({ point1: null, point2: null })
        setRealDistance(1)
        setPixelToMeterRatio(100)
    }

    // 坐標系轉換工具
    const convertPixelToMeter = (pixelCoord: { x: number, y: number }, floor: Floor) => {
        if (!floor.calibration?.isCalibrated) return null

        const { originPixel, pixelToMeterRatio } = floor.calibration
        return {
            x: (pixelCoord.x - originPixel.x) / pixelToMeterRatio,
            y: (originPixel.y - pixelCoord.y) / pixelToMeterRatio // Y軸反向
        }
    }

    const convertMeterToPixel = (meterCoord: { x: number, y: number }, floor: Floor) => {
        if (!floor.calibration?.isCalibrated) return null

        const { originPixel, pixelToMeterRatio } = floor.calibration
        return {
            x: originPixel.x + (meterCoord.x * pixelToMeterRatio),
            y: originPixel.y - (meterCoord.y * pixelToMeterRatio) // Y軸反向
        }
    }

    // 加載狀態顯示
    if (isLoading) {
        return (
            <div className="container mx-auto p-6">
                <div className="flex items-center justify-center min-h-screen">
                    <Card className="w-full max-w-md">
                        <CardContent className="pt-6">
                            <div className="flex flex-col items-center space-y-4">
                                <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
                                <div className="text-center">
                                    <h3 className="text-lg font-medium">正在加載數據...</h3>
                                    <p className="text-sm text-muted-foreground mt-2">
                                        正在從本地存儲恢復您的數據
                                    </p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
        )
    }

    // 錯誤狀態顯示
    if (loadError) {
        return (
            <div className="container mx-auto p-6">
                <div className="flex items-center justify-center min-h-screen">
                    <Card className="w-full max-w-md border-red-200">
                        <CardContent className="pt-6">
                            <div className="flex flex-col items-center space-y-4">
                                <AlertCircle className="h-8 w-8 text-red-500" />
                                <div className="text-center">
                                    <h3 className="text-lg font-medium text-red-800">數據加載失敗</h3>
                                    <p className="text-sm text-red-600 mt-2">
                                        {loadError}
                                    </p>
                                    <Button
                                        onClick={() => window.location.reload()}
                                        className="mt-4"
                                        size="sm"
                                    >
                                        重新加載
                                    </Button>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
        )
    }

    return (
        <div className="space-y-6">
            {/* 標題區域 */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold flex items-center">
                        <Building2 className="mr-3 h-8 w-8 text-cyan-500" />
                        養老院管理
                    </h1>
                    <p className="text-muted-foreground mt-2">
                        UWB定位系統的場域、樓層和閘道器配置管理
                    </p>
                </div>

                {/* 場域選擇 */}
                <div className="flex items-center gap-4">
                    <Select value={selectedHome} onValueChange={setSelectedHome}>
                        <SelectTrigger className="w-[240px]">
                            <SelectValue placeholder="選擇場域" />
                        </SelectTrigger>
                        <SelectContent>
                            {homes.map(home => (
                                <SelectItem key={home.id} value={home.id}>
                                    <div className="flex items-center gap-2">
                                        <Home className="h-4 w-4" />
                                        {home.name}
                                    </div>
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
            </div>

            {/* 主要內容標籤頁 */}
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                <TabsList className="grid w-full grid-cols-6">
                    <TabsTrigger value="overview">系統總覽</TabsTrigger>
                    <TabsTrigger value="homes">場域管理</TabsTrigger>
                    <TabsTrigger value="floors">樓層管理</TabsTrigger>
                    <TabsTrigger value="gateways">閘道器管理</TabsTrigger>
                    <TabsTrigger value="anchors">錨點配對</TabsTrigger>
                    <TabsTrigger value="tags">標籤管理</TabsTrigger>
                </TabsList>

                {/* 系統總覽 */}
                <TabsContent value="overview" className="space-y-6">

                    <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-7 gap-4">
                        <Card>
                            <CardContent className="pt-8 pb-6">
                                <div className="flex flex-col items-center text-center space-y-3">
                                    <Home className="h-12 w-12 text-blue-500" />
                                    <div>
                                        <p className="text-sm font-medium text-muted-foreground mb-1">場域數量</p>
                                        <p className="text-3xl font-bold text-blue-600">{homes.length}</p>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardContent className="pt-8 pb-6">
                                <div className="flex flex-col items-center text-center space-y-3">
                                    <Layers3 className="h-12 w-12 text-green-500" />
                                    <div>
                                        <p className="text-sm font-medium text-muted-foreground mb-1">樓層數量</p>
                                        <p className="text-3xl font-bold text-green-600">{currentFloors.length}</p>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardContent className="pt-8 pb-6">
                                <div className="flex flex-col items-center text-center space-y-3">
                                    <Wifi className="h-12 w-12 text-purple-500" />
                                    <div>
                                        <p className="text-sm font-medium text-muted-foreground mb-1">閘道器數量</p>
                                        <p className="text-3xl font-bold text-purple-600">{currentGateways.length}</p>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardContent className="pt-8 pb-6">
                                <div className="flex flex-col items-center text-center space-y-3">
                                    <Anchor className="h-12 w-12 text-indigo-500" />
                                    <div>
                                        <p className="text-sm font-medium text-muted-foreground mb-1">錨點數量</p>
                                        <p className="text-3xl font-bold text-indigo-600">{currentAnchors.length}</p>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardContent className="pt-8 pb-6">
                                <div className="flex flex-col items-center text-center space-y-3">
                                    <Tag className="h-12 w-12 text-teal-500" />
                                    <div>
                                        <p className="text-sm font-medium text-muted-foreground mb-1">標籤數量</p>
                                        <p className="text-3xl font-bold text-teal-600">{tags.length}</p>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardContent className="pt-8 pb-6">
                                <div className="flex flex-col items-center text-center space-y-3">
                                    <Activity className="h-12 w-12 text-orange-500" />
                                    <div>
                                        <p className="text-sm font-medium text-muted-foreground mb-1">活躍標籤</p>
                                        <p className="text-3xl font-bold text-orange-600">
                                            {tags.filter(t => t.status === 'active').length}
                                        </p>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardContent className="pt-8 pb-6">
                                <div className="flex flex-col items-center text-center space-y-3">
                                    <Save className="h-12 w-12 text-blue-500" />
                                    <div>
                                        <p className="text-sm font-medium text-muted-foreground mb-2">數據狀態</p>
                                        <div className="flex justify-center mb-2">
                                            {pendingSave ? (
                                                <Badge className="bg-orange-100 text-orange-700 border-orange-200 text-sm px-3 py-1">
                                                    保存中...
                                                </Badge>
                                            ) : (
                                                <Badge className="bg-green-100 text-green-700 border-green-200 text-sm px-3 py-1">
                                                    已同步
                                                </Badge>
                                            )}
                                        </div>
                                        <p className="text-xs text-muted-foreground">
                                            {lastSaveTime.toLocaleTimeString('zh-TW')}
                                        </p>
                                        {process.env.NODE_ENV === 'development' && (
                                            <p className="text-xs text-gray-400 mt-1">
                                                Ctrl+Shift+D 調試
                                            </p>
                                        )}
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    {/* 系統狀態概覽 */}
                    {selectedHome && (
                        <>
                            <Card>
                                <CardHeader>
                                    <CardTitle>當前場域狀態 - {homes.find(h => h.id === selectedHome)?.name}</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div className="space-y-4">
                                        {currentFloors.map(floor => {
                                            const floorGateways = gateways.filter(g => g.floorId === floor.id)
                                            const onlineCount = floorGateways.filter(g => g.status === 'online').length

                                            return (
                                                <div key={floor.id} className="flex items-center justify-between p-4 border rounded-lg">
                                                    <div className="flex items-center gap-3">
                                                        <Layers3 className="h-5 w-5 text-blue-500" />
                                                        <div>
                                                            <div className="font-medium">{floor.name}</div>
                                                            <div className="text-sm text-muted-foreground">
                                                                樓層 {floor.level} | {floor.dimensions?.realWidth}m × {floor.dimensions?.realHeight}m
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        <Badge
                                                            variant="secondary"
                                                            className={
                                                                floor.calibration?.isCalibrated ? "bg-green-100 text-green-700 border-green-200" :
                                                                    floor.mapImage ? "bg-yellow-100 text-yellow-700 border-yellow-200" : "bg-gray-100 text-gray-600"
                                                            }
                                                        >
                                                            {
                                                                floor.calibration?.isCalibrated ? "地圖已標定" :
                                                                    floor.mapImage ? "地圖已上傳" : "無地圖"
                                                            }
                                                        </Badge>
                                                        <Badge
                                                            variant="secondary"
                                                            className={onlineCount > 0 ? "bg-green-100 text-green-700 border-green-200" : ""}
                                                        >
                                                            {onlineCount}/{floorGateways.length} 閘道器在線
                                                        </Badge>
                                                    </div>
                                                </div>
                                            )
                                        })}
                                    </div>
                                </CardContent>
                            </Card>

                            {/* 地圖標定進度統計 */}
                            <Card>
                                <CardHeader>
                                    <CardTitle className="flex items-center">
                                        <Map className="mr-2 h-5 w-5 text-cyan-500" />
                                        地圖標定進度
                                    </CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                        <div className="text-center p-4 bg-green-50 rounded-lg">
                                            <div className="text-2xl font-bold text-green-600">
                                                {currentFloors.filter(f => f.calibration?.isCalibrated).length}
                                            </div>
                                            <div className="text-sm text-green-700">已完成標定</div>
                                        </div>
                                        <div className="text-center p-4 bg-yellow-50 rounded-lg">
                                            <div className="text-2xl font-bold text-yellow-600">
                                                {currentFloors.filter(f => f.mapImage && !f.calibration?.isCalibrated).length}
                                            </div>
                                            <div className="text-sm text-yellow-700">待標定</div>
                                        </div>
                                        <div className="text-center p-4 bg-gray-50 rounded-lg">
                                            <div className="text-2xl font-bold text-gray-600">
                                                {currentFloors.filter(f => !f.mapImage).length}
                                            </div>
                                            <div className="text-sm text-gray-700">未上傳地圖</div>
                                        </div>
                                    </div>

                                    {/* 標定進度條 */}
                                    <div className="mt-4">
                                        <div className="flex items-center justify-between mb-2">
                                            <span className="text-sm font-medium">整體進度</span>
                                            <span className="text-sm text-muted-foreground">
                                                {currentFloors.length > 0
                                                    ? Math.round((currentFloors.filter(f => f.calibration?.isCalibrated).length / currentFloors.length) * 100)
                                                    : 0}%
                                            </span>
                                        </div>
                                        <div className="w-full bg-gray-200 rounded-full h-2">
                                            <div
                                                className="bg-green-600 h-2 rounded-full transition-all duration-300"
                                                style={{
                                                    width: `${currentFloors.length > 0
                                                        ? (currentFloors.filter(f => f.calibration?.isCalibrated).length / currentFloors.length) * 100
                                                        : 0}%`
                                                }}
                                            />
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        </>
                    )}
                </TabsContent>

                {/* 場域管理 */}
                <TabsContent value="homes" className="space-y-6">
                    <div className="flex items-center justify-between">
                        <h2 className="text-xl font-semibold">場域管理</h2>
                        <Button onClick={() => setShowHomeForm(true)}>
                            <Plus className="h-4 w-4 mr-2" />
                            新增場域
                        </Button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {homes.map(home => (
                            <Card key={home.id}>
                                <CardHeader className="pb-3">
                                    <div className="flex items-center justify-between">
                                        <CardTitle className="flex items-center">
                                            <Home className="mr-2 h-5 w-5 text-blue-500" />
                                            {home.name}
                                        </CardTitle>
                                        <div className="flex gap-2">
                                            <Button
                                                size="sm"
                                                variant="outline"
                                                onClick={() => {
                                                    setEditingItem(home)
                                                    setHomeForm({
                                                        name: home.name,
                                                        description: home.description,
                                                        address: home.address
                                                    })
                                                    setShowHomeForm(true)
                                                }}
                                            >
                                                <Edit className="h-4 w-4" />
                                            </Button>
                                            <Button
                                                size="sm"
                                                variant="outline"
                                                onClick={() => deleteHome(home.id)}
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    </div>
                                </CardHeader>
                                <CardContent>
                                    <div className="space-y-2">
                                        <p className="text-sm text-muted-foreground">{home.description}</p>
                                        <p className="text-xs text-muted-foreground flex items-center">
                                            <MapPin className="h-3 w-3 mr-1" />
                                            {home.address}
                                        </p>
                                        <div className="flex items-center gap-4 pt-2">
                                            <span className="text-xs text-muted-foreground">
                                                樓層: {floors.filter(f => f.homeId === home.id).length}
                                            </span>
                                            <span className="text-xs text-muted-foreground">
                                                閘道器: {gateways.filter(g =>
                                                    floors.some(f => f.homeId === home.id && f.id === g.floorId)
                                                ).length}
                                            </span>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                    </div>

                    {/* 新增/編輯場域表單 */}
                    {showHomeForm && (
                        <Card>
                            <CardHeader>
                                <CardTitle>{editingItem ? "編輯場域" : "新增場域"}</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div>
                                    <label className="text-sm font-medium">場域名稱</label>
                                    <Input
                                        value={homeForm.name}
                                        onChange={(e) => setHomeForm(prev => ({ ...prev, name: e.target.value }))}
                                        placeholder="請輸入場域名稱"
                                    />
                                </div>
                                <div>
                                    <label className="text-sm font-medium">場域描述</label>
                                    <Textarea
                                        value={homeForm.description}
                                        onChange={(e) => setHomeForm(prev => ({ ...prev, description: e.target.value }))}
                                        placeholder="請輸入場域描述"
                                    />
                                </div>
                                <div>
                                    <label className="text-sm font-medium">場域地址</label>
                                    <Input
                                        value={homeForm.address}
                                        onChange={(e) => setHomeForm(prev => ({ ...prev, address: e.target.value }))}
                                        placeholder="請輸入場域地址"
                                    />
                                </div>
                                <div className="flex gap-2">
                                    <Button onClick={handleHomeSubmit}>
                                        {editingItem ? "更新" : "新增"}
                                    </Button>
                                    <Button variant="outline" onClick={resetHomeForm}>
                                        取消
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>
                    )}
                </TabsContent>

                {/* 樓層管理 */}
                <TabsContent value="floors" className="space-y-6">
                    <div className="flex items-center justify-between">
                        <h2 className="text-xl font-semibold">樓層管理</h2>
                        <Button onClick={() => setShowFloorForm(true)} disabled={!selectedHome}>
                            <Plus className="h-4 w-4 mr-2" />
                            新增樓層
                        </Button>
                    </div>

                    {!selectedHome ? (
                        <Card>
                            <CardContent className="pt-6 text-center">
                                <AlertCircle className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                                <p className="text-muted-foreground">請先選擇一個場域</p>
                            </CardContent>
                        </Card>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {currentFloors.map(floor => {
                                const floorGateways = gateways.filter(g => g.floorId === floor.id)

                                return (
                                    <Card key={floor.id}>
                                        <CardHeader className="pb-3">
                                            <div className="flex items-center justify-between">
                                                <CardTitle className="flex items-center">
                                                    <Layers3 className="mr-2 h-5 w-5 text-green-500" />
                                                    {floor.name}
                                                </CardTitle>
                                                <div className="flex gap-2">
                                                    <Button
                                                        size="sm"
                                                        variant="outline"
                                                        onClick={() => startMapCalibration(floor)}
                                                        title="地圖標定"
                                                    >
                                                        <Map className="h-4 w-4" />
                                                    </Button>
                                                    <Button
                                                        size="sm"
                                                        variant="outline"
                                                        onClick={() => {
                                                            setEditingItem(floor)
                                                            setFloorForm({
                                                                name: floor.name,
                                                                level: floor.level,
                                                                realWidth: floor.dimensions?.realWidth || 0,
                                                                realHeight: floor.dimensions?.realHeight || 0
                                                            })
                                                            setShowFloorForm(true)
                                                        }}
                                                    >
                                                        <Edit className="h-4 w-4" />
                                                    </Button>
                                                    <Button
                                                        size="sm"
                                                        variant="outline"
                                                        onClick={() => deleteFloor(floor.id)}
                                                    >
                                                        <Trash2 className="h-4 w-4" />
                                                    </Button>
                                                </div>
                                            </div>
                                        </CardHeader>
                                        <CardContent>
                                            <div className="space-y-2">
                                                <div className="flex items-center justify-between">
                                                    <span className="text-sm text-muted-foreground">樓層</span>
                                                    <span className="font-medium">{floor.level}F</span>
                                                </div>
                                                {floor.dimensions && (
                                                    <div className="flex items-center justify-between">
                                                        <span className="text-sm text-muted-foreground">實際大小</span>
                                                        <span className="font-medium">
                                                            {floor.dimensions.realWidth}m × {floor.dimensions.realHeight}m
                                                        </span>
                                                    </div>
                                                )}
                                                <div className="flex items-center justify-between">
                                                    <span className="text-sm text-muted-foreground">地圖狀態</span>
                                                    <Badge
                                                        variant="secondary"
                                                        className={
                                                            floor.calibration?.isCalibrated ? "bg-green-100 text-green-700 border-green-200" :
                                                                floor.mapImage ? "bg-yellow-100 text-yellow-700 border-yellow-200" : ""
                                                        }
                                                    >
                                                        {
                                                            floor.calibration?.isCalibrated ? "已標定" :
                                                                floor.mapImage ? "已上傳" : "未上傳"
                                                        }
                                                    </Badge>
                                                </div>
                                                <div className="flex items-center justify-between">
                                                    <span className="text-sm text-muted-foreground">閘道器數量</span>
                                                    <Badge variant="outline">{floorGateways.length}</Badge>
                                                </div>
                                                <div className="flex items-center justify-between">
                                                    <span className="text-sm text-muted-foreground">在線狀態</span>
                                                    <Badge
                                                        variant="secondary"
                                                        className={floorGateways.some(g => g.status === 'online') ? "bg-green-100 text-green-700 border-green-200" : ""}
                                                    >
                                                        {floorGateways.filter(g => g.status === 'online').length}/{floorGateways.length}
                                                    </Badge>
                                                </div>

                                                {/* 顯示地圖預覽 */}
                                                {floor.mapImage && (
                                                    <div className="mt-3 pt-3 border-t">
                                                        <div className="flex items-center justify-between mb-2">
                                                            <span className="text-sm font-medium">地圖預覽</span>
                                                            <div className="flex items-center gap-2">
                                                                {floor.calibration?.isCalibrated && (
                                                                    <Badge variant="outline" className="text-xs">
                                                                        比例: {floor.calibration.pixelToMeterRatio.toFixed(2)}px/m
                                                                    </Badge>
                                                                )}
                                                                {getAnchorsForFloor(floor.id).length > 0 && (
                                                                    <Badge variant="outline" className="text-xs bg-blue-50 text-blue-700">
                                                                        {getAnchorsForFloor(floor.id).length} 個錨點
                                                                    </Badge>
                                                                )}
                                                            </div>
                                                        </div>
                                                        <div className="relative">
                                                            <img
                                                                src={floor.mapImage}
                                                                alt={`${floor.name} 地圖`}
                                                                className="w-full h-24 object-cover rounded border cursor-pointer hover:opacity-80"
                                                                onClick={() => startMapCalibration(floor)}
                                                            />
                                                            {floor.calibration?.originPixel && (
                                                                <div
                                                                    className="absolute w-2 h-2 bg-red-500 rounded-full border border-white transform -translate-x-1 -translate-y-1"
                                                                    style={{
                                                                        left: `${floor.calibration.originPixel.x}px`,
                                                                        top: `${floor.calibration.originPixel.y}px`
                                                                    }}
                                                                    title="座標原點"
                                                                />
                                                            )}
                                                            {/* 顯示該樓層的 Anchor 位置 */}
                                                            {floor.calibration?.isCalibrated && getAnchorsForFloor(floor.id).map(anchor => {
                                                                if (!anchor.position) return null
                                                                const pixelPos = convertToMapPixels(anchor.position.x, anchor.position.y, floor)
                                                                if (!pixelPos) return null

                                                                return (
                                                                    <div
                                                                        key={anchor.id}
                                                                        className="absolute w-3 h-3 bg-blue-500 rounded-full border-2 border-white transform -translate-x-1/2 -translate-y-1/2 shadow-sm"
                                                                        style={{
                                                                            left: `${pixelPos.x}px`,
                                                                            top: `${pixelPos.y}px`
                                                                        }}
                                                                        title={`${anchor.name} (${anchor.position.x.toFixed(1)}, ${anchor.position.y.toFixed(1)}, ${anchor.position.z.toFixed(1)})`}
                                                                    />
                                                                )
                                                            })}
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        </CardContent>
                                    </Card>
                                )
                            })}
                        </div>
                    )}

                    {/* 新增/編輯樓層表單 */}
                    {showFloorForm && (
                        <Card>
                            <CardHeader>
                                <CardTitle>{editingItem ? "編輯樓層" : "新增樓層"}</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="text-sm font-medium">樓層名稱</label>
                                        <Input
                                            value={floorForm.name}
                                            onChange={(e) => setFloorForm(prev => ({ ...prev, name: e.target.value }))}
                                            placeholder="請輸入樓層名稱"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-sm font-medium">樓層編號</label>
                                        <Input
                                            type="number"
                                            value={floorForm.level}
                                            onChange={(e) => setFloorForm(prev => ({ ...prev, level: parseInt(e.target.value) }))}
                                        />
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="text-sm font-medium">實際寬度 (米)</label>
                                        <Input
                                            type="number"
                                            step="0.1"
                                            value={floorForm.realWidth}
                                            onChange={(e) => setFloorForm(prev => ({ ...prev, realWidth: parseFloat(e.target.value) }))}
                                            placeholder="0.0"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-sm font-medium">實際高度 (米)</label>
                                        <Input
                                            type="number"
                                            step="0.1"
                                            value={floorForm.realHeight}
                                            onChange={(e) => setFloorForm(prev => ({ ...prev, realHeight: parseFloat(e.target.value) }))}
                                            placeholder="0.0"
                                        />
                                    </div>
                                </div>
                                <div className="flex gap-2">
                                    <Button onClick={handleFloorSubmit}>
                                        {editingItem ? "更新" : "新增"}
                                    </Button>
                                    <Button variant="outline" onClick={resetFloorForm}>
                                        取消
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>
                    )}

                    {/* 地圖標定模態框 */}
                    {showMapCalibration && calibratingFloor && (
                        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                            <div className="bg-white rounded-lg max-w-4xl max-h-[90vh] overflow-auto m-4">
                                <div className="p-6">
                                    <div className="flex items-center justify-between mb-6">
                                        <h2 className="text-2xl font-bold flex items-center">
                                            <Map className="mr-3 h-6 w-6" />
                                            {calibratingFloor.name} - 地圖標定
                                        </h2>
                                        <Button variant="outline" onClick={resetMapCalibration}>
                                            <Trash2 className="h-4 w-4 mr-1" />
                                            關閉
                                        </Button>
                                    </div>

                                    {/* 步驟指示器 */}
                                    <div className="flex items-center mb-6">
                                        <div className={`flex items-center ${calibrationStep === 'upload' ? 'text-blue-600' : 'text-green-600'}`}>
                                            <div className={`w-8 h-8 rounded-full flex items-center justify-center border-2 ${calibrationStep === 'upload' ? 'border-blue-600 bg-blue-50' : 'border-green-600 bg-green-50'
                                                }`}>
                                                {calibrationStep === 'upload' ? '1' : <CheckCircle2 className="h-5 w-5" />}
                                            </div>
                                            <span className="ml-2">上傳地圖</span>
                                        </div>
                                        <div className="flex-1 h-0.5 bg-gray-200 mx-4" />
                                        <div className={`flex items-center ${calibrationStep === 'setOrigin' ? 'text-blue-600' :
                                            ['setScale', 'complete'].includes(calibrationStep) ? 'text-green-600' : 'text-gray-400'
                                            }`}>
                                            <div className={`w-8 h-8 rounded-full flex items-center justify-center border-2 ${calibrationStep === 'setOrigin' ? 'border-blue-600 bg-blue-50' :
                                                ['setScale', 'complete'].includes(calibrationStep) ? 'border-green-600 bg-green-50' : 'border-gray-300'
                                                }`}>
                                                {calibrationStep === 'setOrigin' ? '2' :
                                                    ['setScale', 'complete'].includes(calibrationStep) ? <CheckCircle2 className="h-5 w-5" /> : '2'}
                                            </div>
                                            <span className="ml-2">設定原點</span>
                                        </div>
                                        <div className="flex-1 h-0.5 bg-gray-200 mx-4" />
                                        <div className={`flex items-center ${calibrationStep === 'setScale' ? 'text-blue-600' :
                                            calibrationStep === 'complete' ? 'text-green-600' : 'text-gray-400'
                                            }`}>
                                            <div className={`w-8 h-8 rounded-full flex items-center justify-center border-2 ${calibrationStep === 'setScale' ? 'border-blue-600 bg-blue-50' :
                                                calibrationStep === 'complete' ? 'border-green-600 bg-green-50' : 'border-gray-300'
                                                }`}>
                                                {calibrationStep === 'setScale' ? '3' :
                                                    calibrationStep === 'complete' ? <CheckCircle2 className="h-5 w-5" /> : '3'}
                                            </div>
                                            <span className="ml-2">設定比例</span>
                                        </div>
                                    </div>

                                    {/* 步驟1: 上傳地圖 */}
                                    {calibrationStep === 'upload' && (
                                        <Card>
                                            <CardHeader>
                                                <CardTitle className="flex items-center">
                                                    <Upload className="mr-2 h-5 w-5" />
                                                    上傳樓層地圖
                                                </CardTitle>
                                            </CardHeader>
                                            <CardContent>
                                                <div className="space-y-4">
                                                    <p className="text-sm text-muted-foreground">
                                                        請上傳 {calibratingFloor.name} 的室內地圖。支援 PNG、JPG、SVG 格式。
                                                    </p>
                                                    <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
                                                        <Image className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                                                        <input
                                                            type="file"
                                                            accept="image/*"
                                                            onChange={handleImageUpload}
                                                            className="hidden"
                                                            id="map-upload"
                                                        />
                                                        <label
                                                            htmlFor="map-upload"
                                                            className="cursor-pointer inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                                                        >
                                                            <Upload className="h-4 w-4 mr-2" />
                                                            選擇地圖文件
                                                        </label>
                                                        <p className="text-sm text-muted-foreground mt-2">
                                                            或拖拽圖片到此區域
                                                        </p>
                                                    </div>
                                                </div>
                                            </CardContent>
                                        </Card>
                                    )}

                                    {/* 步驟2: 設定原點 */}
                                    {calibrationStep === 'setOrigin' && uploadedImage && (
                                        <Card>
                                            <CardHeader>
                                                <CardTitle className="flex items-center">
                                                    <Target className="mr-2 h-5 w-5" />
                                                    設定座標原點
                                                </CardTitle>
                                            </CardHeader>
                                            <CardContent>
                                                <div className="space-y-4">
                                                    <p className="text-sm text-muted-foreground">
                                                        請點擊地圖上的任意位置設定為座標原點，然後輸入該點的實際座標。通常建議選擇房間或走廊的角落作為參考點。
                                                    </p>
                                                    <div className="relative border-2 border-blue-300 rounded-lg overflow-hidden bg-blue-50">
                                                        <img
                                                            ref={mapImageRef}
                                                            src={uploadedImage}
                                                            alt="樓層地圖"
                                                            className="w-full max-h-96 object-contain cursor-crosshair hover:opacity-90 transition-opacity map-calibration-image"
                                                            onClick={handleMapClick}
                                                            onLoad={() => setImageLoaded(true)}
                                                        />
                                                        {/* 點擊提示 */}
                                                        <div className="absolute top-2 left-2 bg-blue-600 text-white text-xs px-2 py-1 rounded shadow-sm">
                                                            點擊地圖設定原點
                                                        </div>
                                                        {selectedOrigin && imageLoaded && (() => {
                                                            const imgElement = mapImageRef.current

                                                            if (!imgElement || imgElement.naturalWidth === 0) {
                                                                console.warn('圖片元素未找到或未加載完成')
                                                                return null
                                                            }

                                                            const displayCoords = convertNaturalToDisplayCoords(selectedOrigin.x, selectedOrigin.y, imgElement)

                                                            return (
                                                                <div
                                                                    className="absolute w-4 h-4 bg-red-500 rounded-full border-2 border-white transform -translate-x-2 -translate-y-2 animate-pulse shadow-lg"
                                                                    style={{
                                                                        left: displayCoords.x,
                                                                        top: displayCoords.y
                                                                    }}
                                                                    title={`原點: 自然座標(${selectedOrigin.x.toFixed(0)}, ${selectedOrigin.y.toFixed(0)}) 顯示座標(${displayCoords.x.toFixed(0)}, ${displayCoords.y.toFixed(0)})`}
                                                                />
                                                            )
                                                        })()}
                                                    </div>
                                                    {selectedOrigin && (
                                                        <div className="space-y-4 p-4 bg-green-50 rounded-lg">
                                                            <div className="flex items-center">
                                                                <Crosshair className="h-5 w-5 text-green-600 mr-2" />
                                                                <span className="text-sm font-medium">
                                                                    原點像素位置: ({selectedOrigin.x.toFixed(0)}, {selectedOrigin.y.toFixed(0)})
                                                                </span>
                                                            </div>
                                                            <div className="grid grid-cols-2 gap-4">
                                                                <div>
                                                                    <label className="text-sm font-medium mb-2 block">
                                                                        實際 X 座標 (米)
                                                                    </label>
                                                                    <Input
                                                                        type="number"
                                                                        value={originCoordinates.x}
                                                                        onChange={(e) => setOriginCoordinates(prev => ({
                                                                            ...prev,
                                                                            x: parseFloat(e.target.value) || 0
                                                                        }))}
                                                                        placeholder="0"
                                                                        step="0.1"
                                                                    />
                                                                </div>
                                                                <div>
                                                                    <label className="text-sm font-medium mb-2 block">
                                                                        實際 Y 座標 (米)
                                                                    </label>
                                                                    <Input
                                                                        type="number"
                                                                        value={originCoordinates.y}
                                                                        onChange={(e) => setOriginCoordinates(prev => ({
                                                                            ...prev,
                                                                            y: parseFloat(e.target.value) || 0
                                                                        }))}
                                                                        placeholder="0"
                                                                        step="0.1"
                                                                    />
                                                                </div>
                                                            </div>
                                                            <div className="flex justify-between">
                                                                <Button
                                                                    size="sm"
                                                                    variant="outline"
                                                                    onClick={() => {
                                                                        setSelectedOrigin(null)
                                                                        setOriginCoordinates({ x: 0, y: 0 })
                                                                    }}
                                                                >
                                                                    <RotateCcw className="h-4 w-4 mr-1" />
                                                                    重選原點
                                                                </Button>
                                                                <Button
                                                                    size="sm"
                                                                    onClick={() => setCalibrationStep('setScale')}
                                                                >
                                                                    下一步
                                                                </Button>
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            </CardContent>
                                        </Card>
                                    )}

                                    {/* 步驟3: 設定比例 */}
                                    {calibrationStep === 'setScale' && (
                                        <Card>
                                            <CardHeader>
                                                <CardTitle className="flex items-center">
                                                    <Ruler className="mr-2 h-5 w-5" />
                                                    設定座標比例
                                                </CardTitle>
                                            </CardHeader>
                                            <CardContent>
                                                <div className="space-y-4">
                                                    <p className="text-sm text-muted-foreground">
                                                        請在地圖上點選兩個點，然後輸入這兩點之間的實際距離。系統將自動計算像素與公尺的轉換比例。
                                                    </p>
                                                    <div className="relative border-2 border-green-300 rounded-lg overflow-hidden bg-green-50">
                                                        <img
                                                            ref={scaleImageRef}
                                                            src={uploadedImage}
                                                            alt="樓層地圖"
                                                            className="w-full max-h-96 object-contain cursor-crosshair hover:opacity-90 transition-opacity map-calibration-image"
                                                            onClick={handleMapClick}
                                                            onLoad={() => setImageLoaded(true)}
                                                        />
                                                        {/* 點擊提示 */}
                                                        <div className="absolute top-2 left-2 bg-green-600 text-white text-xs px-2 py-1 rounded shadow-sm">
                                                            點擊兩個點設定比例
                                                        </div>
                                                        {/* 顯示原點 */}
                                                        {selectedOrigin && (() => {
                                                            const imgElement = scaleImageRef.current
                                                            if (!imgElement) return null

                                                            const displayCoords = convertNaturalToDisplayCoords(selectedOrigin.x, selectedOrigin.y, imgElement)

                                                            return (
                                                                <div
                                                                    className="absolute w-4 h-4 bg-red-500 rounded-full border-2 border-white transform -translate-x-2 -translate-y-2 shadow-lg"
                                                                    style={{
                                                                        left: displayCoords.x,
                                                                        top: displayCoords.y
                                                                    }}
                                                                    title={`原點: 自然座標(${selectedOrigin.x.toFixed(0)}, ${selectedOrigin.y.toFixed(0)}) 實際(${originCoordinates.x}, ${originCoordinates.y})米`}
                                                                />
                                                            )
                                                        })()}
                                                        {/* 顯示比例標定點 */}
                                                        {scalePoints.point1 && (() => {
                                                            const imgElement = scaleImageRef.current
                                                            if (!imgElement) return null

                                                            const displayCoords = convertNaturalToDisplayCoords(scalePoints.point1.x, scalePoints.point1.y, imgElement)

                                                            return (
                                                                <div
                                                                    className="absolute w-4 h-4 bg-blue-500 rounded-full border-2 border-white transform -translate-x-2 -translate-y-2 animate-pulse"
                                                                    style={{
                                                                        left: displayCoords.x,
                                                                        top: displayCoords.y
                                                                    }}
                                                                    title="比例點1"
                                                                />
                                                            )
                                                        })()}
                                                        {scalePoints.point2 && (() => {
                                                            const imgElement = scaleImageRef.current
                                                            if (!imgElement) return null

                                                            const displayCoords = convertNaturalToDisplayCoords(scalePoints.point2.x, scalePoints.point2.y, imgElement)

                                                            return (
                                                                <div
                                                                    className="absolute w-4 h-4 bg-green-500 rounded-full border-2 border-white transform -translate-x-2 -translate-y-2 animate-pulse"
                                                                    style={{
                                                                        left: displayCoords.x,
                                                                        top: displayCoords.y
                                                                    }}
                                                                    title="比例點2"
                                                                />
                                                            )
                                                        })()}
                                                        {/* 顯示連線 */}
                                                        {scalePoints.point1 && scalePoints.point2 && (() => {
                                                            const imgElement = scaleImageRef.current
                                                            if (!imgElement) return null

                                                            const displayCoords1 = convertNaturalToDisplayCoords(scalePoints.point1.x, scalePoints.point1.y, imgElement)
                                                            const displayCoords2 = convertNaturalToDisplayCoords(scalePoints.point2.x, scalePoints.point2.y, imgElement)

                                                            return (
                                                                <svg
                                                                    className="absolute top-0 left-0 w-full h-full pointer-events-none"
                                                                    style={{ zIndex: 10 }}
                                                                >
                                                                    <line
                                                                        x1={displayCoords1.x}
                                                                        y1={displayCoords1.y}
                                                                        x2={displayCoords2.x}
                                                                        y2={displayCoords2.y}
                                                                        stroke="#f59e0b"
                                                                        strokeWidth="2"
                                                                        strokeDasharray="5,5"
                                                                    />
                                                                </svg>
                                                            )
                                                        })()}
                                                    </div>

                                                    {/* 點選狀態顯示 */}
                                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                        <div className="space-y-2">
                                                            <div className="text-sm font-medium">選擇的點:</div>
                                                            <div className="space-y-1 text-xs">
                                                                <div className={`flex items-center ${scalePoints.point1 ? 'text-blue-600' : 'text-gray-400'}`}>
                                                                    <div className="w-3 h-3 bg-blue-500 rounded-full mr-2"></div>
                                                                    點1: {scalePoints.point1 ?
                                                                        `(${scalePoints.point1.x.toFixed(0)}, ${scalePoints.point1.y.toFixed(0)})` :
                                                                        '請點擊地圖選擇'}
                                                                </div>
                                                                <div className={`flex items-center ${scalePoints.point2 ? 'text-green-600' : 'text-gray-400'}`}>
                                                                    <div className="w-3 h-3 bg-green-500 rounded-full mr-2"></div>
                                                                    點2: {scalePoints.point2 ?
                                                                        `(${scalePoints.point2.x.toFixed(0)}, ${scalePoints.point2.y.toFixed(0)})` :
                                                                        '請點擊地圖選擇'}
                                                                </div>
                                                                {scalePoints.point1 && scalePoints.point2 && (
                                                                    <div className="text-amber-600 font-medium">
                                                                        像素距離: {Math.sqrt(
                                                                            Math.pow(scalePoints.point2.x - scalePoints.point1.x, 2) +
                                                                            Math.pow(scalePoints.point2.y - scalePoints.point1.y, 2)
                                                                        ).toFixed(1)} px
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </div>
                                                        <div>
                                                            <label className="text-sm font-medium mb-2 block">
                                                                實際距離 (米)
                                                            </label>
                                                            <Input
                                                                type="number"
                                                                value={realDistance}
                                                                onChange={(e) => {
                                                                    const value = parseFloat(e.target.value)
                                                                    if (!isNaN(value) && value > 0) {
                                                                        setRealDistance(value)
                                                                    }
                                                                }}
                                                                placeholder="1.0"
                                                                min="0.01"
                                                                step="0.1"
                                                                disabled={!scalePoints.point1 || !scalePoints.point2}
                                                            />
                                                            <p className="text-xs text-muted-foreground mt-1">
                                                                輸入兩點之間的實際距離
                                                            </p>
                                                            {scalePoints.point1 && scalePoints.point2 && realDistance > 0 && (
                                                                <div className="mt-2 p-2 bg-blue-50 rounded text-xs">
                                                                    <div className="font-medium text-blue-800">計算結果:</div>
                                                                    <div className="text-blue-700">
                                                                        比例: {(Math.sqrt(
                                                                            Math.pow(scalePoints.point2.x - scalePoints.point1.x, 2) +
                                                                            Math.pow(scalePoints.point2.y - scalePoints.point1.y, 2)
                                                                        ) / realDistance).toFixed(2)} 像素/公尺
                                                                    </div>
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>

                                                    <div className="flex gap-2">
                                                        <Button
                                                            variant="outline"
                                                            onClick={() => setCalibrationStep('setOrigin')}
                                                        >
                                                            <RotateCcw className="h-4 w-4 mr-2" />
                                                            上一步
                                                        </Button>
                                                        <Button
                                                            variant="outline"
                                                            onClick={() => setScalePoints({ point1: null, point2: null })}
                                                            disabled={!scalePoints.point1 && !scalePoints.point2}
                                                        >
                                                            重選點
                                                        </Button>
                                                        <Button
                                                            onClick={saveMapCalibration}
                                                            disabled={!scalePoints.point1 || !scalePoints.point2 || realDistance <= 0}
                                                        >
                                                            <Save className="h-4 w-4 mr-2" />
                                                            保存標定
                                                        </Button>
                                                    </div>
                                                </div>
                                            </CardContent>
                                        </Card>
                                    )}

                                    {/* 步驟4: 完成 */}
                                    {calibrationStep === 'complete' && (
                                        <Card>
                                            <CardHeader>
                                                <CardTitle className="flex items-center text-green-600">
                                                    <CheckCircle2 className="mr-2 h-5 w-5" />
                                                    標定完成
                                                </CardTitle>
                                            </CardHeader>
                                            <CardContent>
                                                <div className="space-y-4">
                                                    <div className="p-4 bg-green-50 rounded-lg">
                                                        <h3 className="font-medium text-green-800 mb-2">標定資訊</h3>
                                                        <div className="space-y-1 text-sm text-green-700">
                                                            <div>樓層: {calibratingFloor.name}</div>
                                                            {selectedOrigin && (
                                                                <div>原點像素位置: ({selectedOrigin.x.toFixed(0)}, {selectedOrigin.y.toFixed(0)})</div>
                                                            )}
                                                            <div>原點實際座標: ({originCoordinates.x}, {originCoordinates.y}) 米</div>
                                                            {scalePoints.point1 && scalePoints.point2 && (
                                                                <>
                                                                    <div>標定點1: ({scalePoints.point1.x.toFixed(0)}, {scalePoints.point1.y.toFixed(0)}) 像素</div>
                                                                    <div>標定點2: ({scalePoints.point2.x.toFixed(0)}, {scalePoints.point2.y.toFixed(0)}) 像素</div>
                                                                    <div>實際距離: {realDistance} 米</div>
                                                                    <div>像素距離: {Math.sqrt(
                                                                        Math.pow(scalePoints.point2.x - scalePoints.point1.x, 2) +
                                                                        Math.pow(scalePoints.point2.y - scalePoints.point1.y, 2)
                                                                    ).toFixed(1)} 像素</div>
                                                                </>
                                                            )}
                                                            <div>比例: {pixelToMeterRatio.toFixed(2)} 像素/公尺</div>
                                                        </div>
                                                    </div>
                                                    <div className="relative border rounded-lg overflow-hidden">
                                                        <img
                                                            src={uploadedImage}
                                                            alt="已標定地圖"
                                                            className="w-full max-h-64 object-contain"
                                                        />
                                                        {selectedOrigin && (
                                                            <div
                                                                className="absolute w-4 h-4 bg-red-500 rounded-full border-2 border-white transform -translate-x-2 -translate-y-2"
                                                                style={{
                                                                    left: selectedOrigin.x,
                                                                    top: selectedOrigin.y
                                                                }}
                                                            />
                                                        )}
                                                    </div>
                                                    <div className="flex gap-2">
                                                        <Button variant="outline" onClick={resetMapCalibration}>
                                                            完成
                                                        </Button>
                                                        <Button
                                                            variant="outline"
                                                            onClick={() => setCalibrationStep('setOrigin')}
                                                        >
                                                            重新標定
                                                        </Button>
                                                    </div>
                                                </div>
                                            </CardContent>
                                        </Card>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}
                </TabsContent>

                {/* 閘道器管理 */}
                <TabsContent value="gateways" className="space-y-6">
                    <div className="flex items-center justify-between">
                        <h2 className="text-xl font-semibold">閘道器管理</h2>
                        <div className="flex gap-2">
                            <Button onClick={() => setShowGatewayForm(true)} disabled={currentFloors.length === 0}>
                                <Plus className="h-4 w-4 mr-2" />
                                手動新增
                            </Button>
                            <Button
                                variant="outline"
                                onClick={() => {
                                    if (cloudClientRef.current) {
                                        console.log("手動重連雲端MQTT...")
                                        setCloudConnectionStatus("手動重連中...")
                                        cloudClientRef.current.reconnect()
                                    }
                                }}
                                disabled={cloudConnected}
                            >
                                <RefreshIcon className="h-4 w-4 mr-2" />
                                重連雲端
                            </Button>
                        </div>
                    </div>

                    {/* 雲端 MQTT 連線狀態 */}
                    <Card>
                        <CardHeader className="pb-3">
                            <div className="flex items-center justify-between">
                                <CardTitle className="text-lg flex items-center">
                                    <CloudIcon className="mr-3 h-5 w-5 text-blue-500" />
                                    雲端閘道器發現
                                </CardTitle>
                                <div className="text-sm">
                                    {cloudConnected ? (
                                        <span className="text-green-600 flex items-center">
                                            <div className="w-2 h-2 bg-green-500 rounded-full mr-2 animate-pulse"></div>
                                            連線正常
                                        </span>
                                    ) : (
                                        <span className="text-red-500 flex items-center">
                                            <div className="w-2 h-2 bg-red-500 rounded-full mr-2"></div>
                                            {cloudConnectionStatus}
                                        </span>
                                    )}
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-4">
                                <div className="text-sm space-y-2 bg-gray-50 p-4 rounded-lg">
                                    <div className="font-semibold">雲端 MQTT 狀態</div>
                                    <div className="flex items-center justify-between">
                                        <span>伺服器 ({CLOUD_MQTT_URL.split('.')[0]}...):</span>
                                        <span className={cloudConnected ? "text-green-600 font-medium" : "text-red-500 font-medium"}>
                                            {cloudConnectionStatus}
                                        </span>
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <span>主題 ({CLOUD_MQTT_TOPIC}):</span>
                                        <span className="text-xs text-muted-foreground">
                                            等待 content: "gateway topic"
                                        </span>
                                    </div>
                                    {cloudError && (
                                        <div className="text-xs text-red-500">
                                            錯誤: {cloudError}
                                        </div>
                                    )}
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                                    <div className="bg-blue-50 p-3 rounded-lg">
                                        <div className="font-medium text-blue-800">發現的閘道器</div>
                                        <div className="text-2xl font-bold text-blue-600">{discoveredGateways.length}</div>
                                    </div>
                                    <div className="bg-green-50 p-3 rounded-lg">
                                        <div className="font-medium text-green-800">在線閘道器</div>
                                        <div className="text-2xl font-bold text-green-600">
                                            {discoveredGateways.filter(g => g.isOnline).length}
                                        </div>
                                    </div>
                                    <div className="bg-purple-50 p-3 rounded-lg">
                                        <div className="font-medium text-purple-800">MQTT消息</div>
                                        <div className="text-2xl font-bold text-purple-600">{cloudGatewayData.length}</div>
                                    </div>
                                </div>

                                {/* 發現的閘道器列表 */}
                                {discoveredGateways.length > 0 ? (
                                    <div className="space-y-3">
                                        <div className="font-medium">發現的雲端閘道器：</div>
                                        <div className="space-y-2 max-h-60 overflow-y-auto">
                                            {discoveredGateways.map(gateway => (
                                                <div key={gateway.gateway_id} className="flex items-center justify-between p-3 border rounded-lg bg-white">
                                                    <div className="flex items-center gap-3">
                                                        <div className={`p-2 rounded-full ${gateway.isOnline
                                                            ? 'bg-green-100 text-green-600'
                                                            : 'bg-gray-100 text-gray-600'
                                                            }`}>
                                                            <Wifi className="h-4 w-4" />
                                                        </div>
                                                        <div>
                                                            <div className="font-medium flex items-center gap-2">
                                                                {gateway.name}
                                                                <Badge
                                                                    variant="secondary"
                                                                    className={gateway.isOnline
                                                                        ? "bg-green-100 text-green-700 border-green-200"
                                                                        : "bg-gray-100 text-gray-700 border-gray-200"
                                                                    }
                                                                >
                                                                    {gateway.isOnline ? '在線' : '離線'}
                                                                </Badge>
                                                            </div>
                                                            <div className="text-sm text-muted-foreground">
                                                                ID: {gateway.gateway_id} | 韌體: {gateway.fw_ver} | 網路: {gateway.uwb_network_id}
                                                            </div>
                                                            <div className="text-xs text-muted-foreground">
                                                                AP: {gateway.connected_ap} | 電壓: {gateway.battery_voltage}V |
                                                                最後更新: {gateway.lastSeen instanceof Date ? gateway.lastSeen.toLocaleTimeString('zh-TW') : '未知'}
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        <Button
                                                            size="sm"
                                                            variant="outline"
                                                            onClick={() => {
                                                                setSelectedDiscoveredGateway(gateway.gateway_id)
                                                                // 填入閘道器表單
                                                                setGatewayForm({
                                                                    name: gateway.name,
                                                                    macAddress: `GW:${gateway.gateway_id.toString(16).toUpperCase()}`,
                                                                    ipAddress: "192.168.1.100", // 預設IP
                                                                    floorId: currentFloors[0]?.id || ""
                                                                })
                                                                setShowGatewayForm(true)
                                                            }}
                                                            disabled={currentFloors.length === 0}
                                                        >
                                                            <Plus className="h-4 w-4 mr-1" />
                                                            加入系統
                                                        </Button>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                ) : (
                                    <div className="text-center py-8 text-muted-foreground">
                                        <AlertCircle className="mx-auto h-8 w-8 mb-2 opacity-50" />
                                        <p className="font-medium">尚未發現任何雲端閘道器</p>
                                        <div className="text-xs space-y-1 mt-2">
                                            <p>請確認：</p>
                                            <p>1. 雲端 MQTT 模擬器已啟動</p>
                                            <p>2. 模擬器發送 content: "gateway topic" 格式的數據</p>
                                            <p>3. 數據包含 "gateway id" 和 name 字段</p>
                                        </div>
                                    </div>
                                )}

                                {/* 原始數據檢視器 - 用於調試 */}
                                <div className="mt-6">
                                    <details className="group">
                                        <summary className="cursor-pointer font-medium text-sm text-muted-foreground hover:text-foreground">
                                            🔍 查看原始 Gateway MQTT 數據 (調試用)
                                        </summary>
                                        <div className="mt-2 space-y-2 text-xs">
                                            <div className="text-muted-foreground">
                                                點擊下方數據可展開查看完整內容
                                            </div>
                                            <div className="max-h-60 overflow-y-auto space-y-2">
                                                {cloudGatewayData.slice(0, 5).map((data, index) => (
                                                    <details key={index} className="border rounded p-2 bg-slate-50">
                                                        <summary className="cursor-pointer font-mono text-xs hover:bg-slate-100 p-1 rounded">
                                                            [{index + 1}] {data.content} - Gateway ID: {data.gateway_id} - {data.receivedAt.toLocaleString('zh-TW')}
                                                        </summary>
                                                        <pre className="mt-2 text-xs overflow-x-auto whitespace-pre-wrap bg-white p-2 rounded border">
                                                            {JSON.stringify(data, null, 2)}
                                                        </pre>
                                                    </details>
                                                ))}
                                            </div>
                                            <div className="text-xs text-amber-600 bg-amber-50 p-2 rounded border border-amber-200">
                                                <div className="font-semibold mb-1">閘道器發現條件：</div>
                                                <div>• 必須有 content: "gateway topic"</div>
                                                <div>• 必須有 "gateway id" 和 name 字段</div>
                                                <div>• UWB Joined: "yes" 且 5V plugged: "yes" 視為在線</div>
                                            </div>
                                        </div>
                                    </details>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {currentFloors.length === 0 ? (
                        <Card>
                            <CardContent className="pt-6 text-center">
                                <AlertCircle className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                                <p className="text-muted-foreground">請先新增樓層才能配置閘道器</p>
                            </CardContent>
                        </Card>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {currentGateways.map(gateway => {
                                const floor = floors.find(f => f.id === gateway.floorId)

                                return (
                                    <Card key={gateway.id}>
                                        <CardHeader className="pb-3">
                                            <div className="flex items-center justify-between">
                                                <CardTitle className="flex items-center">
                                                    <Wifi className="mr-2 h-5 w-5 text-purple-500" />
                                                    {gateway.name}
                                                </CardTitle>
                                                <div className="flex items-center gap-2">
                                                    <Badge
                                                        variant={
                                                            gateway.status === 'error' ? 'destructive' : 'secondary'
                                                        }
                                                        className={
                                                            gateway.status === 'online' ? 'bg-green-100 text-green-700 border-green-200' : ''
                                                        }
                                                    >
                                                        {gateway.status === 'online' ? '在線' :
                                                            gateway.status === 'error' ? '錯誤' : '離線'}
                                                    </Badge>
                                                    <div className="flex gap-1">
                                                        <Button
                                                            size="sm"
                                                            variant="outline"
                                                            onClick={() => {
                                                                setEditingItem(gateway)
                                                                setGatewayForm({
                                                                    name: gateway.name,
                                                                    macAddress: gateway.macAddress,
                                                                    ipAddress: gateway.ipAddress,
                                                                    floorId: gateway.floorId
                                                                })
                                                                setShowGatewayForm(true)
                                                            }}
                                                        >
                                                            <Edit className="h-4 w-4" />
                                                        </Button>
                                                        <Button
                                                            size="sm"
                                                            variant="outline"
                                                            onClick={() => deleteGateway(gateway.id)}
                                                        >
                                                            <Trash2 className="h-4 w-4" />
                                                        </Button>
                                                    </div>
                                                </div>
                                            </div>
                                        </CardHeader>
                                        <CardContent>
                                            <div className="space-y-2">
                                                <div className="flex items-center justify-between">
                                                    <span className="text-sm text-muted-foreground">所屬樓層</span>
                                                    <span className="font-medium">{floor?.name}</span>
                                                </div>
                                                <div className="flex items-center justify-between">
                                                    <span className="text-sm text-muted-foreground">MAC 地址</span>
                                                    <span className="font-mono text-sm">{gateway.macAddress}</span>
                                                </div>
                                                <div className="flex items-center justify-between">
                                                    <span className="text-sm text-muted-foreground">IP 地址</span>
                                                    <span className="font-mono text-sm">{gateway.ipAddress}</span>
                                                </div>
                                                {gateway.lastSeen && (
                                                    <div className="flex items-center justify-between">
                                                        <span className="text-sm text-muted-foreground">最後連線</span>
                                                        <span className="text-sm">{gateway.lastSeen.toLocaleString('zh-TW')}</span>
                                                    </div>
                                                )}
                                            </div>
                                        </CardContent>
                                    </Card>
                                )
                            })}
                        </div>
                    )}

                    {/* 新增/編輯閘道器表單 */}
                    {showGatewayForm && (
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center">
                                    {selectedDiscoveredGateway ? (
                                        <>
                                            <CloudIcon className="mr-2 h-5 w-5 text-blue-500" />
                                            {editingItem ? "編輯閘道器" : "加入雲端閘道器到系統"}
                                        </>
                                    ) : (
                                        <>
                                            <Plus className="mr-2 h-5 w-5" />
                                            {editingItem ? "編輯閘道器" : "手動新增閘道器"}
                                        </>
                                    )}
                                </CardTitle>
                                {selectedDiscoveredGateway && (
                                    <div className="text-sm text-muted-foreground mt-2">
                                        從雲端發現的閘道器 (ID: {selectedDiscoveredGateway}) 加入到選定的樓層
                                    </div>
                                )}
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div>
                                    <label className="text-sm font-medium">閘道器名稱</label>
                                    <Input
                                        value={gatewayForm.name}
                                        onChange={(e) => setGatewayForm(prev => ({ ...prev, name: e.target.value }))}
                                        placeholder="請輸入閘道器名稱"
                                    />
                                </div>
                                <div>
                                    <label className="text-sm font-medium">所屬樓層</label>
                                    <Select
                                        value={gatewayForm.floorId}
                                        onValueChange={(value) => setGatewayForm(prev => ({ ...prev, floorId: value }))}
                                    >
                                        <SelectTrigger>
                                            <SelectValue placeholder="選擇樓層" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {currentFloors.map(floor => (
                                                <SelectItem key={floor.id} value={floor.id}>
                                                    {floor.name}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="text-sm font-medium">MAC 地址</label>
                                        <Input
                                            value={gatewayForm.macAddress}
                                            onChange={(e) => setGatewayForm(prev => ({ ...prev, macAddress: e.target.value }))}
                                            placeholder="AA:BB:CC:DD:EE:FF"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-sm font-medium">IP 地址</label>
                                        <Input
                                            value={gatewayForm.ipAddress}
                                            onChange={(e) => setGatewayForm(prev => ({ ...prev, ipAddress: e.target.value }))}
                                            placeholder="192.168.1.100"
                                        />
                                    </div>
                                </div>
                                <div className="flex gap-2">
                                    <Button onClick={handleGatewaySubmit}>
                                        {editingItem ? "更新" : "新增"}
                                    </Button>
                                    <Button variant="outline" onClick={resetGatewayForm}>
                                        取消
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>
                    )}
                </TabsContent>

                {/* 錨點配對管理 */}
                <TabsContent value="anchors" className="space-y-6">
                    <div className="flex items-center justify-between">
                        <h2 className="text-xl font-semibold">錨點配對與管理</h2>
                        <div className="flex items-center gap-4">
                            {/* 三層巢狀選擇：養老院 -> 樓層 -> Gateway */}
                            <div className="flex items-center gap-2">
                                {/* 養老院選擇 */}
                                <Select 
                                    value={selectedHomeForAnchors} 
                                    onValueChange={(value) => {
                                        setSelectedHomeForAnchors(value)
                                        setSelectedFloorForAnchors("")
                                        setSelectedGatewayForAnchors("")
                                    }}
                                >
                                    <SelectTrigger className="w-[180px]">
                                        <SelectValue placeholder="選擇養老院" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {homes.map(home => (
                                            <SelectItem key={home.id} value={home.id}>
                                                {home.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>

                                {/* 樓層選擇 */}
                                <Select 
                                    value={selectedFloorForAnchors} 
                                    onValueChange={(value) => {
                                        setSelectedFloorForAnchors(value)
                                        setSelectedGatewayForAnchors("")
                                    }}
                                    disabled={!selectedHomeForAnchors}
                                >
                                    <SelectTrigger className="w-[150px]">
                                        <SelectValue placeholder="選擇樓層" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {floors
                                            .filter(floor => floor.homeId === selectedHomeForAnchors)
                                            .map(floor => (
                                                <SelectItem key={floor.id} value={floor.id}>
                                                    {floor.name}
                                                </SelectItem>
                                            ))}
                                    </SelectContent>
                                </Select>

                                {/* Gateway 選擇 */}
                                <Select 
                                    value={selectedGatewayForAnchors} 
                                    onValueChange={setSelectedGatewayForAnchors}
                                    disabled={!selectedFloorForAnchors}
                                >
                                    <SelectTrigger className="w-[200px]">
                                        <SelectValue placeholder="選擇閘道器" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {/* 顯示該樓層下的系統閘道器 */}
                                        {currentGateways
                                            .filter(gw => gw.floorId === selectedFloorForAnchors && gw.status === 'online')
                                            .map(gateway => {
                                                // 提取 gateway ID（如果 MAC 地址包含 GW: 前綴）
                                                const gatewayIdFromMac = gateway.macAddress.startsWith('GW:')
                                                    ? parseInt(gateway.macAddress.replace('GW:', ''), 16)
                                                    : null

                                                return (
                                                    <SelectItem key={`system-${gateway.id}`} value={gatewayIdFromMac?.toString() || gateway.id}>
                                                        <div className="flex items-center gap-2">
                                                            <div className={`w-2 h-2 rounded-full ${gateway.cloudData ? 'bg-green-500' : 'bg-blue-500'}`}></div>
                                                            {gateway.name} {gateway.cloudData ? '' : '(本地)'}
                                                        </div>
                                                    </SelectItem>
                                                )
                                            })}
                                        
                                        {/* 如果該樓層沒有閘道器，顯示提示訊息 */}
                                        {currentGateways.filter(gw => gw.floorId === selectedFloorForAnchors && gw.status === 'online').length === 0 && (
                                            <div className="px-2 py-1.5 text-sm text-gray-500">
                                                該樓層暫無可用的閘道器
                                            </div>
                                        )}
                                    </SelectContent>
                                </Select>
                            </div>
                            <Button
                                variant="outline"
                                onClick={() => {
                                    console.log("🔄 手動重連 Anchor MQTT...")
                                    console.log("- 當前選擇的 Gateway:", selectedGatewayForAnchors)

                                    // 強制清理現有連接
                                    if (anchorCloudClientRef.current) {
                                        console.log("- 清理現有連接")
                                        anchorCloudClientRef.current.end()
                                        anchorCloudClientRef.current = null
                                    }

                                    // 重置狀態
                                    setAnchorCloudConnected(false)
                                    setAnchorCloudConnectionStatus("手動重連中...")
                                    setAnchorCloudError("")

                                    // 觸發重新連接（通過重新設置選擇的 Gateway）
                                    const currentGateway = selectedGatewayForAnchors
                                    setSelectedGatewayForAnchors("")
                                    setTimeout(() => {
                                        console.log("- 恢復 Gateway 選擇，觸發重連")
                                        setSelectedGatewayForAnchors(currentGateway)
                                    }, 100)
                                }}
                            >
                                <RefreshIcon className="h-4 w-4 mr-2" />
                                重連錨點
                            </Button>
                        </div>
                    </div>

                    {/* 雲端錨點發現狀態 */}
                    <Card>
                        <CardHeader className="pb-3">
                            <div className="flex items-center justify-between">
                                <CardTitle className="text-lg flex items-center">
                                    <Anchor className="mr-3 h-5 w-5 text-indigo-500" />
                                    雲端錨點發現
                                </CardTitle>
                                <div className="text-sm">
                                    {anchorCloudConnected ? (
                                        <span className="text-green-600 flex items-center">
                                            <div className="w-2 h-2 bg-green-500 rounded-full mr-2 animate-pulse"></div>
                                            連線正常
                                        </span>
                                    ) : (
                                        <span className="text-red-500 flex items-center">
                                            <div className="w-2 h-2 bg-red-500 rounded-full mr-2"></div>
                                            {anchorCloudConnectionStatus}
                                        </span>
                                    )}
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-4">
                                <div className="text-sm space-y-2 bg-gray-50 p-4 rounded-lg">
                                    <div className="font-semibold">錨點 MQTT 狀態</div>
                                    <div className="flex items-center justify-between">
                                        <span>選擇的閘道器:</span>
                                        <span className="font-medium">
                                            {selectedGatewayForAnchors ? (() => {
                                                // 先檢查雲端發現的閘道器
                                                const discoveredGateway = discoveredGateways.find(gw => gw.gateway_id.toString() === selectedGatewayForAnchors)
                                                if (discoveredGateway) {
                                                    return `${discoveredGateway.name} (雲端)`
                                                }

                                                // 再檢查系統閘道器
                                                const systemGateway = currentGateways.find(gw => {
                                                    const gatewayIdFromMac = gw.macAddress.startsWith('GW:')
                                                        ? parseInt(gw.macAddress.replace('GW:', ''), 16).toString()
                                                        : null
                                                    return gatewayIdFromMac === selectedGatewayForAnchors || gw.id === selectedGatewayForAnchors
                                                })
                                                if (systemGateway) {
                                                    const hasCloudData = systemGateway.cloudData ? " (雲端數據)" : " (本地)"
                                                    return `${systemGateway.name}${hasCloudData}`
                                                }

                                                return selectedGatewayForAnchors
                                            })() : "未選擇"}
                                        </span>
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <span>監聽主題:</span>
                                        <span className="text-xs font-mono text-muted-foreground">
                                            {currentAnchorTopic || "無"}
                                        </span>
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <span>連線狀態:</span>
                                        <span className={anchorCloudConnected ? "text-green-600 font-medium" : "text-red-500 font-medium"}>
                                            {anchorCloudConnectionStatus}
                                        </span>
                                    </div>
                                    {anchorCloudError && (
                                        <div className="text-xs text-red-500">
                                            錯誤: {anchorCloudError}
                                        </div>
                                    )}
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                                    <div className="bg-indigo-50 p-3 rounded-lg">
                                        <div className="font-medium text-indigo-800">發現的錨點</div>
                                        <div className="text-2xl font-bold text-indigo-600">{discoveredCloudAnchors.length}</div>
                                    </div>
                                    <div className="bg-green-50 p-3 rounded-lg">
                                        <div className="font-medium text-green-800">在線錨點</div>
                                        <div className="text-2xl font-bold text-green-600">
                                            {discoveredCloudAnchors.filter(a => a.isOnline).length}
                                        </div>
                                    </div>
                                    <div className="bg-purple-50 p-3 rounded-lg">
                                        <div className="font-medium text-purple-800">MQTT消息</div>
                                        <div className="text-2xl font-bold text-purple-600">{cloudAnchorData.length}</div>
                                    </div>
                                </div>

                                {/* 發現的錨點列表 */}
                                {discoveredCloudAnchors.length > 0 ? (
                                    <div className="space-y-3">
                                        <div className="font-medium">發現的雲端錨點：</div>
                                        <div className="space-y-2 max-h-60 overflow-y-auto">
                                            {discoveredCloudAnchors.map(anchor => (
                                                <div key={anchor.id} className="flex items-center justify-between p-3 border rounded-lg bg-white">
                                                    <div className="flex items-center gap-3">
                                                        <div className={`p-2 rounded-full ${anchor.isOnline
                                                            ? 'bg-green-100 text-green-600'
                                                            : 'bg-gray-100 text-gray-600'
                                                            }`}>
                                                            <Anchor className="h-4 w-4" />
                                                        </div>
                                                        <div>
                                                            <div className="font-medium flex items-center gap-2">
                                                                {anchor.name}
                                                                <Badge
                                                                    variant="secondary"
                                                                    className={anchor.isOnline
                                                                        ? "bg-green-100 text-green-700 border-green-200"
                                                                        : "bg-gray-100 text-gray-700 border-gray-200"
                                                                    }
                                                                >
                                                                    {anchor.isOnline ? '在線' : '離線'}
                                                                </Badge>
                                                                {anchor.initiator === 1 && (
                                                                    <Badge variant="secondary" className="bg-blue-100 text-blue-700 border-blue-200">
                                                                        主錨點
                                                                    </Badge>
                                                                )}
                                                            </div>
                                                            <div className="text-sm text-muted-foreground">
                                                                ID: {anchor.id} | 閘道器: {anchor.gateway_id} | LED: {anchor.led ? '開' : '關'} | BLE: {anchor.ble ? '開' : '關'}
                                                            </div>
                                                            <div className="text-xs text-muted-foreground">
                                                                位置: ({anchor.position.x.toFixed(2)}, {anchor.position.y.toFixed(2)}, {anchor.position.z.toFixed(2)}) |
                                                                最後更新: {anchor.lastSeen instanceof Date ? anchor.lastSeen.toLocaleTimeString('zh-TW') : '未知'}
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        <Button
                                                            size="sm"
                                                            variant="outline"
                                                            onClick={() => {
                                                                // 加入系統邏輯
                                                                handleAddAnchorFromCloud(anchor)
                                                            }}
                                                            disabled={!anchor.isOnline}
                                                        >
                                                            <Plus className="h-4 w-4 mr-1" />
                                                            加入系統
                                                        </Button>
                                                        <Button
                                                            size="sm"
                                                            variant="outline"
                                                            onClick={() => {
                                                                // TODO: 實現錨點配置功能
                                                                console.log("配置錨點:", anchor)
                                                            }}
                                                            disabled={!anchor.isOnline}
                                                        >
                                                            <Settings className="h-4 w-4 mr-1" />
                                                            配置
                                                        </Button>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                ) : (
                                    <div className="text-center py-8 text-muted-foreground">
                                        <Anchor className="mx-auto h-8 w-8 mb-2 opacity-50" />
                                        <p className="font-medium">
                                            {selectedGatewayForAnchors ? "尚未發現任何錨點" : "請先選擇閘道器"}
                                        </p>
                                        {selectedGatewayForAnchors && (
                                            <div className="text-xs space-y-1 mt-2">
                                                <p>請確認：</p>
                                                <p>1. 閘道器的錨點配置主題正確</p>
                                                <p>2. 模擬器發送 content: "config", node: "ANCHOR" 格式的數據</p>
                                                <p>3. 數據包含 id 和 name 字段</p>
                                            </div>
                                        )}
                                    </div>
                                )}

                                {/* 原始數據檢視器 - 用於調試 */}
                                <div className="mt-6">
                                    <details className="group">
                                        <summary className="cursor-pointer font-medium text-sm text-muted-foreground hover:text-foreground">
                                            🔍 查看原始 Anchor MQTT 數據 (調試用)
                                        </summary>
                                        <div className="mt-2 space-y-2 text-xs">
                                            <div className="text-muted-foreground">
                                                點擊下方數據可展開查看完整內容
                                            </div>
                                            <div className="max-h-60 overflow-y-auto space-y-2">
                                                {cloudAnchorData.slice(0, 5).map((data, index) => (
                                                    <details key={index} className="border rounded p-2 bg-slate-50">
                                                        <summary className="cursor-pointer font-mono text-xs hover:bg-slate-100 p-1 rounded">
                                                            [{index + 1}] {data.content} - {data.name} (ID: {data.id}) - {data.receivedAt.toLocaleString('zh-TW')}
                                                        </summary>
                                                        <pre className="mt-2 text-xs overflow-x-auto whitespace-pre-wrap bg-white p-2 rounded border">
                                                            {JSON.stringify(data, null, 2)}
                                                        </pre>
                                                    </details>
                                                ))}
                                            </div>
                                            <div className="text-xs text-amber-600 bg-amber-50 p-2 rounded border border-amber-200">
                                                <div className="font-semibold mb-1">錨點發現條件：</div>
                                                <div>• 必須有 content: "config"</div>
                                                <div>• 必須有 node: "ANCHOR"</div>
                                                <div>• 必須有 id 和 name 字段</div>
                                                <div>• initiator: 1 表示主錨點</div>
                                            </div>
                                        </div>
                                    </details>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Anchor 位置地圖視圖 */}
                    {selectedGatewayForAnchors && (() => {
                        // 找到選擇的 Gateway
                        const selectedGateway = gateways.find(gw => {
                            const gatewayIdFromMac = gw.macAddress.startsWith('GW:')
                                ? parseInt(gw.macAddress.replace('GW:', ''), 16).toString()
                                : null
                            return gatewayIdFromMac === selectedGatewayForAnchors || gw.id === selectedGatewayForAnchors
                        })

                        if (!selectedGateway) return null

                        // 找到對應的樓層
                        const floor = floors.find(f => f.id === selectedGateway.floorId)
                        if (!floor || !floor.mapImage || !floor.calibration?.isCalibrated) return null

                        // 獲取該樓層的 Anchor
                        const floorAnchors = getAnchorsForFloor(floor.id)
                        if (floorAnchors.length === 0) return null

                        return (
                            <Card>
                                <CardHeader>
                                    <CardTitle className="text-lg flex items-center">
                                        <Map className="mr-3 h-5 w-5 text-green-500" />
                                        Anchor 位置地圖 - {floor.name}
                                    </CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div className="space-y-4">
                                        <div className="flex items-center justify-between">
                                            <div className="text-sm text-muted-foreground">
                                                顯示已加入系統的 Anchor 在地圖上的位置
                                            </div>
                                            <Badge variant="outline">
                                                {floorAnchors.length} 個 Anchor
                                            </Badge>
                                        </div>

                                        <div className="relative border rounded-lg overflow-hidden" style={{ height: '400px' }}>
                                            <img
                                                src={floor.mapImage}
                                                alt={`${floor.name} 地圖`}
                                                className={`w-full h-full object-contain bg-gray-50 anchor-map-image ${calibratingAnchor ? 'cursor-crosshair' : ''}`}
                                                onClick={calibratingAnchor ? handleMapClickCalibration : undefined}
                                                onLoad={(e) => {
                                                    // 圖片加載完成後觸發重新渲染
                                                    setImageLoaded(prev => !prev)
                                                }}
                                            />

                                            {/* 操作提示 */}
                                            {calibratingAnchor ? (
                                                <div className="absolute top-2 left-2 bg-green-600 text-white text-sm px-3 py-1 rounded shadow-sm animate-pulse">
                                                    點擊地圖設定 {calibratingAnchor.name} 的新位置
                                                </div>
                                            ) : (
                                                <div className="absolute top-2 left-2 bg-blue-600 text-white text-sm px-3 py-1 rounded shadow-sm">
                                                    雙擊 Anchor 點可快速校正位置
                                                </div>
                                            )}

                                            {/* 座標原點 */}
                                            {floor.calibration?.originPixel && (() => {
                                                const imgElement = document.querySelector('.anchor-map-image') as HTMLImageElement
                                                if (!imgElement || imgElement.naturalWidth === 0) return null

                                                // 將原點的自然座標轉換為當前圖片的顯示座標
                                                const displayCoords = convertNaturalToDisplayCoords(
                                                    floor.calibration.originPixel.x,
                                                    floor.calibration.originPixel.y,
                                                    imgElement
                                                )

                                                console.log(`🎯 Anchor地圖原點顯示:`)
                                                console.log(`- 原點自然座標: (${floor.calibration.originPixel.x}, ${floor.calibration.originPixel.y})`)
                                                console.log(`- 原點顯示座標: (${displayCoords.x.toFixed(1)}, ${displayCoords.y.toFixed(1)})`)

                                                return (
                                                    <div
                                                        className="absolute w-3 h-3 bg-red-500 rounded-full border-2 border-white transform -translate-x-1/2 -translate-y-1/2 shadow-lg"
                                                        style={{
                                                            left: `${displayCoords.x}px`,
                                                            top: `${displayCoords.y}px`
                                                        }}
                                                        title={`座標原點 (${floor.calibration.originCoordinates?.x || 0}, ${floor.calibration.originCoordinates?.y || 0})`}
                                                    />
                                                )
                                            })()}

                                            {/* Anchor 位置 */}
                                            {floorAnchors.map(anchor => {
                                                if (!anchor.position) return null

                                                const imgElement = document.querySelector('.anchor-map-image') as HTMLImageElement
                                                if (!imgElement || imgElement.naturalWidth === 0) return null

                                                const displayPos = convertRealToDisplayCoords(anchor.position.x, anchor.position.y, floor, imgElement)
                                                if (!displayPos) return null

                                                return (
                                                    <div
                                                        key={anchor.id}
                                                        className="absolute transform -translate-x-1/2 -translate-y-1/2"
                                                        style={{
                                                            left: `${displayPos.x}px`,
                                                            top: `${displayPos.y}px`
                                                        }}
                                                    >
                                                        {/* Anchor 圖標 */}
                                                        <div
                                                            className={`w-6 h-6 rounded-full border-2 shadow-lg flex items-center justify-center cursor-pointer hover:scale-110 transition-all duration-200 ${calibratingAnchor?.id === anchor.id
                                                                ? 'border-yellow-400 bg-yellow-500 animate-pulse'
                                                                : anchor.cloudData?.initiator === 1
                                                                    ? 'border-white bg-orange-500 hover:bg-orange-600'
                                                                    : 'border-white bg-blue-500 hover:bg-blue-600'
                                                                }`}
                                                            onDoubleClick={(e) => startAnchorMapCalibration(anchor, e)}
                                                            title={calibratingAnchor?.id === anchor.id ? "正在校正中..." : "雙擊校正位置"}
                                                        >
                                                            <Anchor className="w-3 h-3 text-white" />
                                                        </div>

                                                        {/* Anchor 標籤 */}
                                                        <div className="absolute top-7 left-1/2 transform -translate-x-1/2 bg-white/90 px-2 py-1 rounded text-xs whitespace-nowrap shadow-sm border">
                                                            <div className="font-medium">{anchor.name}</div>
                                                            <div className="text-muted-foreground">
                                                                ({anchor.position.x.toFixed(1)}, {anchor.position.y.toFixed(1)}, {anchor.position.z.toFixed(1)})
                                                            </div>
                                                            {anchor.cloudData?.initiator === 1 && (
                                                                <div className="text-orange-600 text-xs">主錨點</div>
                                                            )}
                                                        </div>
                                                    </div>
                                                )
                                            })}
                                        </div>

                                        {/* 圖例 */}
                                        <div className="flex items-center gap-6 text-sm">
                                            <div className="flex items-center gap-2">
                                                <div className="w-3 h-3 bg-red-500 rounded-full border border-white"></div>
                                                <span>座標原點</span>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <div className="w-3 h-3 bg-blue-500 rounded-full border border-white"></div>
                                                <span>一般錨點</span>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <div className="w-3 h-3 bg-orange-500 rounded-full border border-white"></div>
                                                <span>主錨點</span>
                                            </div>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        )
                    })()}

                    {/* 本地錨點管理（已加入的錨點） */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-lg flex items-center">
                                <Radio className="mr-3 h-5 w-5 text-gray-500" />
                                本地錨點管理 (已加入的錨點)
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-4">
                                {selectedGatewayForAnchors ? (
                                    <div className="flex items-center gap-4">
                                        <div className="text-sm text-muted-foreground">
                                            當前選擇的閘道器: <span className="font-medium">{selectedGatewayForAnchors}</span>
                                        </div>
                                        <Button
                                            onClick={startAnchorPairing}
                                            disabled={pairingInProgress}
                                            variant="outline"
                                        >
                                            {pairingInProgress ? (
                                                <>
                                                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                                    配對中...
                                                </>
                                            ) : (
                                                <>
                                                    <Radio className="h-4 w-4 mr-2" />
                                                    開始模擬配對
                                                </>
                                            )}
                                        </Button>
                                    </div>
                                ) : (
                                    <div className="text-center py-4 text-muted-foreground">
                                        <AlertCircle className="mx-auto h-6 w-6 mb-2 opacity-50" />
                                        <p className="text-sm">請先在上方選擇閘道器以管理錨點</p>
                                    </div>
                                )}

                                {onlineGateways.length === 0 ? (
                                    <div className="text-center py-4 text-muted-foreground">
                                        <AlertCircle className="mx-auto h-6 w-6 mb-2 opacity-50" />
                                        <p className="text-sm">沒有在線的本地閘道器可進行配對</p>
                                    </div>
                                ) : (
                                    <>
                                        {/* 配對進度區域 */}
                                        {(pairingInProgress || discoveredAnchors.length > 0) && (
                                            <Card>
                                                <CardHeader>
                                                    <CardTitle className="flex items-center">
                                                        <Radio className="mr-2 h-5 w-5" />
                                                        模擬配對進度
                                                    </CardTitle>
                                                </CardHeader>
                                                <CardContent>
                                                    <div className="space-y-3">
                                                        {pairingInProgress && (
                                                            <div className="flex items-center gap-2 text-blue-600">
                                                                <Loader2 className="h-4 w-4 animate-spin" />
                                                                <span>正在掃描附近的錨點設備...</span>
                                                            </div>
                                                        )}

                                                        {discoveredAnchors.map((macAddress, index) => (
                                                            <div key={macAddress} className="flex items-center justify-between p-3 border rounded-lg">
                                                                <div className="flex items-center gap-3">
                                                                    <CheckCircle2 className="h-5 w-5 text-green-500" />
                                                                    <div>
                                                                        <div className="font-medium">發現新錨點</div>
                                                                        <div className="text-sm text-muted-foreground font-mono">{macAddress}</div>
                                                                    </div>
                                                                </div>
                                                                <Button
                                                                    size="sm"
                                                                    onClick={() => addDiscoveredAnchor(macAddress)}
                                                                >
                                                                    <Plus className="h-4 w-4 mr-1" />
                                                                    添加
                                                                </Button>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </CardContent>
                                            </Card>
                                        )}

                                        {/* 已配對錨點列表 */}
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            {(() => {
                                                // 根据选择的网关过滤锚点
                                                const filteredAnchors = currentAnchors.filter(anchor => 
                                                    anchor.gatewayId === selectedGatewayForAnchors || 
                                                    anchor.cloudGatewayId?.toString() === selectedGatewayForAnchors
                                                )
                                                
                                                if (filteredAnchors.length === 0) {
                                                    return (
                                                        <div className="col-span-2 text-center py-8 text-muted-foreground">
                                                            <Anchor className="mx-auto h-12 w-12 mb-3 opacity-30" />
                                                            <p className="text-sm">該閘道器下暫無已配對的錨點</p>
                                                        </div>
                                                    )
                                                }
                                                
                                                return filteredAnchors.map(anchor => {
                                                    const gateway = gateways.find(g => g.id === anchor.gatewayId)

                                                    return (
                                                        <Card key={anchor.id}>
                                                            <CardHeader className="pb-3">
                                                                <div className="flex items-center justify-between">
                                                                    <CardTitle className="flex items-center">
                                                                        <Anchor className="mr-2 h-5 w-5 text-indigo-500" />
                                                                        {anchor.name}
                                                                    </CardTitle>
                                                                    <div className="flex items-center gap-2">
                                                                        <Badge
                                                                            variant={
                                                                                anchor.status === 'active' ? 'default' :
                                                                                    anchor.status === 'error' ? 'destructive' : 'secondary'
                                                                            }
                                                                            className={
                                                                                anchor.status === 'active' ? 'bg-green-100 text-green-700 border-green-200' :
                                                                                    anchor.status === 'calibrating' ? 'bg-yellow-100 text-yellow-700 border-yellow-200' : ''
                                                                            }
                                                                        >
                                                                            {anchor.status === 'active' ? '運行中' :
                                                                                anchor.status === 'paired' ? '已配對' :
                                                                                    anchor.status === 'calibrating' ? '標定中' :
                                                                                        anchor.status === 'unpaired' ? '未配對' : '錯誤'}
                                                                        </Badge>
                                                                        <Button
                                                                            size="sm"
                                                                            variant="outline"
                                                                            onClick={() => startAnchorCalibration(anchor)}
                                                                            disabled={calibratingAnchor !== null}
                                                                            title="校正座標"
                                                                        >
                                                                            <Target className="h-4 w-4" />
                                                                        </Button>
                                                                        {anchor.position && (
                                                                            <Button
                                                                                size="sm"
                                                                                variant="outline"
                                                                                onClick={() => openConfigDialog(anchor, anchor.position!)}
                                                                                disabled={sendingConfig}
                                                                                title="發送配置到雲端"
                                                                            >
                                                                                <Upload className="h-4 w-4" />
                                                                            </Button>
                                                                        )}
                                                                        <Button
                                                                            size="sm"
                                                                            variant="outline"
                                                                            onClick={() => deleteAnchor(anchor.id)}
                                                                            title="刪除錨點"
                                                                        >
                                                                            <Trash2 className="h-4 w-4" />
                                                                        </Button>
                                                                    </div>
                                                                </div>
                                                            </CardHeader>
                                                            <CardContent>
                                                                <div className="space-y-2">
                                                                    <div className="flex items-center justify-between">
                                                                        <span className="text-sm text-muted-foreground">所屬閘道器</span>
                                                                        <span className="font-medium">{gateway?.name}</span>
                                                                    </div>
                                                                    <div className="flex items-center justify-between">
                                                                        <span className="text-sm text-muted-foreground">MAC 地址</span>
                                                                        <span className="font-mono text-sm">{anchor.macAddress}</span>
                                                                    </div>
                                                                    {anchor.cloudData && (
                                                                        <div className="flex items-center justify-between">
                                                                            <span className="text-sm text-muted-foreground">雲端 ID</span>
                                                                            <span className="text-sm">{anchor.cloudData.id}</span>
                                                                        </div>
                                                                    )}
                                                                    {anchor.position && (
                                                                        <div className="flex items-center justify-between">
                                                                            <span className="text-sm text-muted-foreground">位置座標</span>
                                                                            <span className="text-sm">
                                                                                ({anchor.position.x.toFixed(2)}, {anchor.position.y.toFixed(2)}, {anchor.position.z.toFixed(2)})
                                                                            </span>
                                                                        </div>
                                                                    )}
                                                                    {anchor.cloudData && (
                                                                        <div className="flex items-center justify-between">
                                                                            <span className="text-sm text-muted-foreground">功能狀態</span>
                                                                            <div className="flex items-center gap-2">
                                                                                <span className="text-xs">LED: {anchor.cloudData.led ? '開' : '關'}</span>
                                                                                <span className="text-xs">BLE: {anchor.cloudData.ble ? '開' : '關'}</span>
                                                                                {anchor.cloudData.initiator === 1 && (
                                                                                    <Badge variant="secondary" className="text-xs bg-orange-100 text-orange-700">
                                                                                        主錨點
                                                                                    </Badge>
                                                                                )}
                                                                            </div>
                                                                        </div>
                                                                    )}
                                                                    <div className="flex items-center justify-between">
                                                                        <span className="text-sm text-muted-foreground">信號強度</span>
                                                                        <div className="flex items-center gap-2">
                                                                            <Signal className="h-4 w-4" />
                                                                            <span className="text-sm">{anchor.signalStrength || 0}%</span>
                                                                        </div>
                                                                    </div>
                                                                    <div className="flex items-center justify-between">
                                                                        <span className="text-sm text-muted-foreground">電池電量</span>
                                                                        <div className="flex items-center gap-2">
                                                                            <Battery className="h-4 w-4" />
                                                                            <span className="text-sm">{anchor.batteryLevel || 0}%</span>
                                                                        </div>
                                                                    </div>
                                                                    {anchor.lastSeen && (
                                                                        <div className="flex items-center justify-between">
                                                                            <span className="text-sm text-muted-foreground">最後連線</span>
                                                                            <span className="text-sm">{anchor.lastSeen.toLocaleString('zh-TW')}</span>
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            </CardContent>
                                                        </Card>
                                                    )
                                                })
                                            })()}
                                        </div>
                                    </>
                                )}
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* 標籤管理 */}
                <TabsContent value="tags" className="space-y-6">
                    <div className="flex items-center justify-between">
                        <h2 className="text-xl font-semibold">標籤設備管理</h2>
                        <div className="flex items-center gap-4">
                            {/* 三層巢狀選擇：養老院 -> 樓層 -> Gateway */}
                            <div className="flex items-center gap-2">
                                {/* 養老院選擇 */}
                                <Select 
                                    value={selectedHomeForTags} 
                                    onValueChange={(value) => {
                                        setSelectedHomeForTags(value)
                                        setSelectedFloorForTags("")
                                        setSelectedGatewayForTags("")
                                    }}
                                >
                                    <SelectTrigger className="w-[180px]">
                                        <SelectValue placeholder="選擇養老院" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {homes.map(home => (
                                            <SelectItem key={home.id} value={home.id}>
                                                {home.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>

                                {/* 樓層選擇 */}
                                <Select 
                                    value={selectedFloorForTags} 
                                    onValueChange={(value) => {
                                        setSelectedFloorForTags(value)
                                        setSelectedGatewayForTags("")
                                    }}
                                    disabled={!selectedHomeForTags}
                                >
                                    <SelectTrigger className="w-[150px]">
                                        <SelectValue placeholder="選擇樓層" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {floors
                                            .filter(floor => floor.homeId === selectedHomeForTags)
                                            .map(floor => (
                                                <SelectItem key={floor.id} value={floor.id}>
                                                    {floor.name}
                                                </SelectItem>
                                            ))}
                                    </SelectContent>
                                </Select>

                                {/* Gateway 選擇 */}
                                <Select 
                                    value={selectedGatewayForTags} 
                                    onValueChange={setSelectedGatewayForTags}
                                    disabled={!selectedFloorForTags}
                                >
                                    <SelectTrigger className="w-[200px]">
                                        <SelectValue placeholder="選擇閘道器" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {/* 顯示該樓層下的系統閘道器 */}
                                        {currentGateways
                                            .filter(gw => gw.floorId === selectedFloorForTags && gw.status === 'online')
                                            .map(gateway => {
                                                // 提取 gateway ID（如果 MAC 地址包含 GW: 前綴）
                                                const gatewayIdFromMac = gateway.macAddress.startsWith('GW:')
                                                    ? parseInt(gateway.macAddress.replace('GW:', ''), 16)
                                                    : null

                                                return (
                                                    <SelectItem key={`system-${gateway.id}`} value={gatewayIdFromMac?.toString() || gateway.id}>
                                                        <div className="flex items-center gap-2">
                                                            <div className={`w-2 h-2 rounded-full ${gateway.cloudData ? 'bg-green-500' : 'bg-blue-500'}`}></div>
                                                            {gateway.name} {gateway.cloudData ? '' : '(本地)'}
                                                        </div>
                                                    </SelectItem>
                                                )
                                            })}
                                        
                                        {/* 如果該樓層沒有閘道器，顯示提示訊息 */}
                                        {currentGateways.filter(gw => gw.floorId === selectedFloorForTags && gw.status === 'online').length === 0 && (
                                            <div className="px-2 py-1.5 text-sm text-gray-500">
                                                該樓層暫無可用的閘道器
                                            </div>
                                        )}
                                    </SelectContent>
                                </Select>
                            </div>
                            <Button
                                variant="outline"
                                onClick={() => {
                                    console.log("🔄 手動重連 Tag MQTT...")
                                    console.log("- 當前選擇的 Gateway:", selectedGatewayForTags)

                                    // 強制清理現有連接
                                    if (tagCloudClientRef.current) {
                                        console.log("- 清理現有連接")
                                        tagCloudClientRef.current.end()
                                        tagCloudClientRef.current = null
                                    }

                                    // 重置狀態
                                    setTagCloudConnected(false)
                                    setTagCloudConnectionStatus("手動重連中...")
                                    setTagCloudError("")

                                    // 觸發重新連接（通過重新設置選擇的 Gateway）
                                    const currentGateway = selectedGatewayForTags
                                    setSelectedGatewayForTags("")
                                    setTimeout(() => {
                                        console.log("- 恢復 Gateway 選擇，觸發重連")
                                        setSelectedGatewayForTags(currentGateway)
                                    }, 100)
                                }}
                                disabled={!selectedGatewayForTags}
                            >
                                <RefreshIcon className="h-4 w-4 mr-2" />
                                重連標籤
                            </Button>
                            <Button onClick={() => setShowTagForm(true)}>
                                <Plus className="h-4 w-4 mr-2" />
                                新增標籤
                            </Button>
                        </div>
                    </div>

                    {/* 標籤統計 */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <Card>
                            <CardContent className="pt-6">
                                <div className="flex items-center gap-3">
                                    <Tag className="h-6 w-6 text-green-500" />
                                    <div>
                                        <p className="text-sm text-muted-foreground">人員標籤</p>
                                        <p className="text-xl font-bold">{tags.filter(t => t.type === 'person').length}</p>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                        <Card>
                            <CardContent className="pt-6">
                                <div className="flex items-center gap-3">
                                    <Activity className="h-6 w-6 text-orange-500" />
                                    <div>
                                        <p className="text-sm text-muted-foreground">活躍中</p>
                                        <p className="text-xl font-bold text-green-600">{tags.filter(t => t.status === 'active').length}</p>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                        <Card>
                            <CardContent className="pt-6">
                                <div className="flex items-center gap-3">
                                    <CloudIcon className="h-6 w-6 text-blue-500" />
                                    <div>
                                        <p className="text-sm text-muted-foreground">雲端標籤</p>
                                        <p className="text-xl font-bold text-blue-600">{discoveredCloudTags.length}</p>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    {/* 雲端標籤發現狀態 */}
                    <Card>
                        <CardHeader className="pb-3">
                            <div className="flex items-center justify-between">
                                <CardTitle className="text-lg flex items-center">
                                    <Tag className="mr-3 h-5 w-5 text-teal-500" />
                                    雲端標籤發現
                                </CardTitle>
                                <div className="text-sm">
                                    {tagCloudConnected ? (
                                        <span className="text-green-600 flex items-center">
                                            <div className="w-2 h-2 bg-green-500 rounded-full mr-2 animate-pulse"></div>
                                            連線正常
                                        </span>
                                    ) : (
                                        <span className="text-red-500 flex items-center">
                                            <div className="w-2 h-2 bg-red-500 rounded-full mr-2"></div>
                                            {tagCloudConnectionStatus}
                                        </span>
                                    )}
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-4">
                                <div className="text-sm space-y-2 bg-gray-50 p-4 rounded-lg">
                                    <div className="font-semibold">標籤 MQTT 狀態</div>
                                    <div className="flex items-center justify-between">
                                        <span>選擇的閘道器:</span>
                                        <span className="font-medium">
                                            {selectedGatewayForTags ? (() => {
                                                // 先檢查雲端發現的閘道器
                                                const discoveredGateway = discoveredGateways.find(gw => gw.gateway_id.toString() === selectedGatewayForTags)
                                                if (discoveredGateway) {
                                                    return `${discoveredGateway.name} (雲端)`
                                                }

                                                // 再檢查系統閘道器
                                                const systemGateway = currentGateways.find(gw => {
                                                    const gatewayIdFromMac = gw.macAddress.startsWith('GW:')
                                                        ? parseInt(gw.macAddress.replace('GW:', ''), 16).toString()
                                                        : null
                                                    return gatewayIdFromMac === selectedGatewayForTags || gw.id === selectedGatewayForTags
                                                })
                                                if (systemGateway) {
                                                    const hasCloudData = systemGateway.cloudData ? " (雲端數據)" : " (本地)"
                                                    return `${systemGateway.name}${hasCloudData}`
                                                }

                                                return selectedGatewayForTags
                                            })() : "未選擇"}
                                        </span>
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <span>監聽主題:</span>
                                        <span className="text-xs font-mono text-muted-foreground">
                                            {currentTagTopic || "無"}
                                        </span>
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <span>連線狀態:</span>
                                        <span className={tagCloudConnected ? "text-green-600 font-medium" : "text-red-500 font-medium"}>
                                            {tagCloudConnectionStatus}
                                        </span>
                                    </div>
                                    {tagCloudError && (
                                        <div className="text-xs text-red-500">
                                            錯誤: {tagCloudError}
                                        </div>
                                    )}
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                                    <div className="bg-teal-50 p-3 rounded-lg">
                                        <div className="font-medium text-teal-800">發現的標籤</div>
                                        <div className="text-2xl font-bold text-teal-600">{discoveredCloudTags.length}</div>
                                    </div>
                                    <div className="bg-green-50 p-3 rounded-lg">
                                        <div className="font-medium text-green-800">在線標籤</div>
                                        <div className="text-2xl font-bold text-green-600">
                                            {discoveredCloudTags.filter(t => t.isOnline).length}
                                        </div>
                                    </div>
                                    <div className="bg-purple-50 p-3 rounded-lg">
                                        <div className="font-medium text-purple-800">MQTT消息</div>
                                        <div className="text-2xl font-bold text-purple-600">{cloudTagData.length}</div>
                                    </div>
                                </div>

                                {/* 發現的標籤列表 */}
                                {discoveredCloudTags.length > 0 ? (
                                    <div className="space-y-3">
                                        <div className="font-medium">發現的雲端標籤：</div>
                                        <div className="space-y-2 max-h-60 overflow-y-auto">
                                            {discoveredCloudTags.map(tag => (
                                                <div key={tag.id} className="flex items-center justify-between p-3 border rounded-lg bg-white">
                                                    <div className="flex items-center gap-3">
                                                        <div className={`p-2 rounded-full ${tag.isOnline
                                                            ? 'bg-green-100 text-green-600'
                                                            : 'bg-gray-100 text-gray-600'
                                                            }`}>
                                                            <Tag className="h-4 w-4" />
                                                        </div>
                                                        <div>
                                                            <div className="font-medium flex items-center gap-2">
                                                                ID: {tag.id}
                                                                {tag.id_hex && (
                                                                    <span className="text-xs text-muted-foreground font-mono">
                                                                        ({tag.id_hex})
                                                                    </span>
                                                                )}
                                                                <Badge
                                                                    variant="secondary"
                                                                    className={tag.isOnline
                                                                        ? "bg-green-100 text-green-700 border-green-200"
                                                                        : "bg-gray-100 text-gray-700 border-gray-200"
                                                                    }
                                                                >
                                                                    {tag.isOnline ? '在線' : '離線'}
                                                                </Badge>
                                                            </div>
                                                            <div className="text-sm text-muted-foreground">
                                                                閘道器: {tag.gateway_id} | 韌體: {tag.fw_ver || '未知'}
                                                            </div>
                                                            <div className="text-xs text-muted-foreground">
                                                                {tag.battery_level !== undefined && (
                                                                    <>電池: {tag.battery_level}% | </>
                                                                )}
                                                                {tag.position && (
                                                                    <>位置: ({tag.position.x.toFixed(2)}, {tag.position.y.toFixed(2)}, {tag.position.z.toFixed(2)}) | </>
                                                                )}
                                                                {tag.time && (
                                                                    <>時間: {tag.time} | </>
                                                                )}
                                                                最後更新: {tag.lastSeen instanceof Date ? tag.lastSeen.toLocaleTimeString('zh-TW') : '未知'}
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <div className="text-sm text-gray-500">
                                                        已自動加入系統
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                ) : (
                                    <div className="text-center py-8 text-muted-foreground">
                                        <Tag className="mx-auto h-8 w-8 mb-2 opacity-50" />
                                        <p className="font-medium">
                                            {selectedGatewayForTags ? "尚未發現任何標籤" : "請先選擇閘道器"}
                                        </p>
                                        {selectedGatewayForTags && (
                                            <div className="text-xs space-y-1 mt-2">
                                                <p>請確認：</p>
                                                <p>1. 閘道器的 message 和 location 主題正確</p>
                                                <p>2. 模擬器發送 content: "info"/"location", node: "TAG" 格式的數據</p>
                                                <p>3. 數據包含 id、battery level、position、time 等字段</p>
                                            </div>
                                        )}
                                    </div>
                                )}

                                {/* 原始數據檢視器 - 用於調試 */}
                                <div className="mt-6">
                                    <details className="group">
                                        <summary className="cursor-pointer font-medium text-sm text-muted-foreground hover:text-foreground">
                                            🔍 查看原始 Tag MQTT 數據 (調試用)
                                        </summary>
                                        <div className="mt-2 space-y-2 text-xs">
                                            <div className="text-muted-foreground">
                                                點擊下方數據可展開查看完整內容
                                            </div>
                                            <div className="max-h-60 overflow-y-auto space-y-2">
                                                {cloudTagData.slice(0, 5).map((data, index) => (
                                                    <details key={index} className="border rounded p-2 bg-slate-50">
                                                        <summary className="cursor-pointer font-mono text-xs hover:bg-slate-100 p-1 rounded">
                                                            [{index + 1}] {data.content} - ID: {data.id} - {data.topic} - {data.receivedAt.toLocaleString('zh-TW')}
                                                        </summary>
                                                        <pre className="mt-2 text-xs overflow-x-auto whitespace-pre-wrap bg-white p-2 rounded border">
                                                            {JSON.stringify(data, null, 2)}
                                                        </pre>
                                                    </details>
                                                ))}
                                            </div>
                                            <div className="text-xs text-amber-600 bg-amber-50 p-2 rounded border border-amber-200">
                                                <div className="font-semibold mb-1">標籤發現條件：</div>
                                                <div>• message 主題: content: "info", node: "TAG"</div>
                                                <div>• location 主題: content: "location", node: "TAG"</div>
                                                <div>• 必須有 id 字段</div>
                                                <div>• message 包含 battery level 信息</div>
                                                <div>• location 包含 position 和 time 信息</div>
                                            </div>
                                        </div>
                                    </details>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* 標籤列表 */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {(() => {
                            // 根据选择的网关过滤标签，参考锚点配对的过滤逻辑
                            console.log("🔍 標籤過濾調試:")
                            console.log("- 選擇的閘道器:", selectedGatewayForTags, "類型:", typeof selectedGatewayForTags)
                            console.log("- 總標籤數量:", tags.length)
                            console.log("- 所有標籤:", tags.map(t => ({ 
                                id: t.id, 
                                name: t.name,
                                gatewayId: t.gatewayId, 
                                gatewayIdType: typeof t.gatewayId,
                                cloudGatewayId: t.cloudGatewayId,
                                cloudGatewayIdType: typeof t.cloudGatewayId
                            })))
                            
                            const filteredTags = tags.filter(tag => {
                                const match1 = tag.gatewayId === selectedGatewayForTags
                                const match2 = tag.cloudGatewayId?.toString() === selectedGatewayForTags
                                const match3 = tag.cloudGatewayId === parseInt(selectedGatewayForTags)
                                
                                console.log(`標籤 ${tag.id}: gatewayId="${tag.gatewayId}" vs selected="${selectedGatewayForTags}" => match1:${match1}, match2:${match2}, match3:${match3}`)
                                
                                return match1 || match2 || match3
                            })
                            
                            console.log("🔍 過濾結果:")
                            console.log("- 過濾後的標籤數量:", filteredTags.length)
                            console.log("- 過濾後的標籤:", filteredTags.map(t => ({ id: t.id, name: t.name })))
                            
                            if (filteredTags.length === 0) {
                                console.log("⚠️ 沒有標籤匹配，顯示空狀態")
                                return (
                                    <div className="col-span-2 text-center py-8 text-muted-foreground">
                                        <Tag className="mx-auto h-12 w-12 mb-3 opacity-30" />
                                        <p className="text-sm">該閘道器下暫無標籤設備</p>
                                    </div>
                                )
                            }
                            
                            console.log("🎨 開始渲染標籤列表...")
                            console.log("- 即將渲染的標籤數量:", filteredTags.length)
                            
                            return filteredTags.map(tag => {
                                console.log(`🎨 渲染標籤: ${tag.id} - ${tag.name}`)
                                
                                const getTypeIcon = (type: TagDevice['type']) => {
                                    return <Tag className="h-5 w-5 text-green-500" />
                                }

                                const getStatusColor = (status: TagDevice['status']) => {
                                    switch (status) {
                                        case 'active': return 'bg-green-100 text-green-700 border-green-200'
                                        case 'low_battery': return 'bg-yellow-100 text-yellow-700 border-yellow-200'
                                        case 'lost': return 'bg-red-100 text-red-700 border-red-200'
                                        default: return ''
                                    }
                                }

                                const getStatusText = (status: TagDevice['status']) => {
                                    switch (status) {
                                        case 'active': return '運行中'
                                        case 'inactive': return '未激活'
                                        case 'low_battery': return '電量不足'
                                        case 'lost': return '失聯'
                                        default: return status
                                    }
                                }

                            return (
                                <Card key={tag.id}>
                                    <CardHeader className="pb-3">
                                        <div className="flex items-center justify-between">
                                            <CardTitle className="flex items-center">
                                                {getTypeIcon(tag.type)}
                                                <span className="ml-2">{tag.name}</span>
                                            </CardTitle>
                                            <div className="flex items-center gap-2">
                                                <Badge
                                                    variant="secondary"
                                                    className={getStatusColor(tag.status)}
                                                >
                                                    {getStatusText(tag.status)}
                                                </Badge>
                                                {/* 顯示標籤來源 */}
                                                {discoveredCloudTags.some(cloudTag => cloudTag.id.toString() === tag.id) && (
                                                    <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                                                        <CloudIcon className="h-3 w-3 mr-1" />
                                                        雲端
                                                    </Badge>
                                                )}
                                                <div className="flex gap-1">
                                                    <Button
                                                        size="sm"
                                                        variant="outline"
                                                        onClick={() => {
                                                            setEditingTag(tag)
                                                            setTagForm({
                                                                name: tag.name,
                                                                macAddress: tag.macAddress,
                                                                type: tag.type,
                                                                assignedTo: tag.assignedTo || ""
                                                            })
                                                            setShowTagForm(true)
                                                        }}
                                                    >
                                                        <Edit className="h-4 w-4" />
                                                    </Button>
                                                    <Button
                                                        size="sm"
                                                        variant="outline"
                                                        onClick={() => deleteTag(tag.id)}
                                                    >
                                                        <Trash2 className="h-4 w-4" />
                                                    </Button>
                                                </div>
                                            </div>
                                        </div>
                                    </CardHeader>
                                    <CardContent>
                                        <div className="space-y-2">
                                            <div className="flex items-center justify-between">
                                                <span className="text-sm text-muted-foreground">MAC 地址</span>
                                                <span className="font-mono text-sm">{tag.macAddress}</span>
                                            </div>
                                            <div className="flex items-center justify-between">
                                                <span className="text-sm text-muted-foreground">類型</span>
                                                <span className="text-sm">人員</span>
                                            </div>
                                            {tag.assignedTo && (
                                                <div className="flex items-center justify-between">
                                                    <span className="text-sm text-muted-foreground">分配給</span>
                                                    <span className="text-sm">{tag.assignedTo}</span>
                                                </div>
                                            )}
                                            <div className="flex items-center justify-between">
                                                <span className="text-sm text-muted-foreground">電池電量</span>
                                                <div className="flex items-center gap-2">
                                                    <Battery className="h-4 w-4" />
                                                    <span className="text-sm">{tag.batteryLevel || 0}%</span>
                                                </div>
                                            </div>
                                            {tag.lastPosition && (
                                                <div className="space-y-1">
                                                    <div className="flex items-center justify-between">
                                                        <span className="text-sm text-muted-foreground">最後位置</span>
                                                        <span className="text-sm">
                                                            ({tag.lastPosition.x.toFixed(1)}, {tag.lastPosition.y.toFixed(1)})
                                                        </span>
                                                    </div>
                                                    <div className="flex items-center justify-between">
                                                        <span className="text-sm text-muted-foreground">更新時間</span>
                                                        <span className="text-sm">
                                                            {tag.lastPosition.timestamp.toLocaleString('zh-TW')}
                                                        </span>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </CardContent>
                                </Card>
                            )
                        })
                    })()}
                    </div>

                    {/* 新增/編輯標籤表單 */}
                    {showTagForm && (
                        <Card>
                            <CardHeader>
                                <CardTitle>{editingTag ? "編輯標籤" : "新增標籤"}</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="text-sm font-medium">標籤名稱</label>
                                        <Input
                                            value={tagForm.name}
                                            onChange={(e) => setTagForm(prev => ({ ...prev, name: e.target.value }))}
                                            placeholder="請輸入標籤名稱"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-sm font-medium">MAC 地址</label>
                                        <Input
                                            value={tagForm.macAddress}
                                            onChange={(e) => setTagForm(prev => ({ ...prev, macAddress: e.target.value }))}
                                            placeholder="AA:BB:CC:DD:EE:FF"
                                        />
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="text-sm font-medium">標籤類型</label>
                                        <Select
                                            value={tagForm.type}
                                            onValueChange={(value) => setTagForm(prev => ({ ...prev, type: value as TagDevice['type'] }))}
                                        >
                                            <SelectTrigger>
                                                <SelectValue placeholder="選擇類型" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="person">人員</SelectItem>
                                                <SelectItem value="equipment">設備</SelectItem>
                                                <SelectItem value="asset">資產</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div>
                                        <label className="text-sm font-medium">分配給</label>
                                        <Input
                                            value={tagForm.assignedTo}
                                            onChange={(e) => setTagForm(prev => ({ ...prev, assignedTo: e.target.value }))}
                                            placeholder="分配給誰（可選）"
                                        />
                                    </div>
                                </div>
                                <div className="flex gap-2">
                                    <Button onClick={handleTagSubmit}>
                                        {editingTag ? "更新" : "新增"}
                                    </Button>
                                    <Button variant="outline" onClick={resetTagForm}>
                                        取消
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>
                    )}
                </TabsContent>
            </Tabs>

            {/* Anchor 座標校正彈窗 */}
            {calibratingAnchor && !showConfigDialog && (
                <div className="fixed top-4 right-4 z-50 w-80">
                    <Card className="w-full shadow-2xl border-2 border-green-200">
                        <CardHeader className="pb-3">
                            <div className="flex items-center justify-between">
                                <CardTitle className="flex items-center">
                                    <Target className="mr-2 h-5 w-5 text-green-500" />
                                    校正 {calibratingAnchor.name}
                                </CardTitle>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={cancelAnchorCalibration}
                                    className="h-8 w-8 p-0 hover:bg-gray-100"
                                >
                                    ✕
                                </Button>
                            </div>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            {/* 說明文字 */}
                            <div className="text-sm bg-gradient-to-r from-green-50 to-blue-50 p-4 rounded-lg border border-green-200">
                                <div className="font-medium mb-2 text-green-800 flex items-center">
                                    🎯 地圖點擊校正模式
                                    <span className="ml-2 inline-block w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                                </div>
                                <div className="mb-3 text-green-700">
                                    <strong>👆 直接點擊左側地圖</strong> 來設定 <span className="font-medium bg-yellow-100 px-1 rounded">{calibratingAnchor.name}</span> 的新位置
                                </div>
                                <div className="text-xs text-blue-600 bg-blue-50 p-2 rounded border-l-2 border-blue-300">
                                    💡 或者在下方手動輸入精確座標值
                                </div>
                            </div>
                            <div className="space-y-3">
                                <div>
                                    <label className="text-sm font-medium">座標類型</label>
                                    <Select
                                        value={anchorPositionInput.coordinateType}
                                        onValueChange={(value: 'real' | 'pixel') =>
                                            setAnchorPositionInput(prev => ({ ...prev, coordinateType: value as 'real' | 'pixel' }))
                                        }
                                    >
                                        <SelectTrigger>
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="real">真實座標 (米)</SelectItem>
                                            <SelectItem value="pixel">像素座標 (px)</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>

                                <div className="grid grid-cols-3 gap-2">
                                    <div>
                                        <label className="text-sm font-medium">X 座標</label>
                                        <Input
                                            type="number"
                                            step="0.01"
                                            value={anchorPositionInput.x}
                                            onChange={(e) => setAnchorPositionInput(prev => ({ ...prev, x: e.target.value }))}
                                            placeholder="X"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-sm font-medium">Y 座標</label>
                                        <Input
                                            type="number"
                                            step="0.01"
                                            value={anchorPositionInput.y}
                                            onChange={(e) => setAnchorPositionInput(prev => ({ ...prev, y: e.target.value }))}
                                            placeholder="Y"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-sm font-medium">Z 座標 (米)</label>
                                        <Input
                                            type="number"
                                            step="0.01"
                                            value={anchorPositionInput.z}
                                            onChange={(e) => setAnchorPositionInput(prev => ({ ...prev, z: e.target.value }))}
                                            placeholder="Z"
                                        />
                                    </div>
                                </div>

                                <div className="text-xs text-muted-foreground bg-gray-50 p-2 rounded">
                                    {anchorPositionInput.coordinateType === 'real' ?
                                        '💡 輸入真實世界的座標（單位：米）' :
                                        '💡 輸入圖片上的像素座標，系統會自動轉換為真實座標'
                                    }
                                </div>
                            </div>

                            {/* 按鈕 */}
                            <div className="flex gap-2 pt-2">
                                <Button onClick={saveAnchorCalibration} className="flex-1">
                                    <Save className="h-4 w-4 mr-2" />
                                    保存手動輸入座標
                                </Button>
                                <Button variant="outline" onClick={cancelAnchorCalibration}>
                                    取消校正
                                </Button>
                            </div>

                            {/* 快速操作提示 */}
                            <div className="text-xs text-center bg-gradient-to-r from-yellow-50 to-orange-50 p-3 rounded border border-yellow-200">
                                <div className="font-medium text-orange-700 mb-1">⚡ 快速操作</div>
                                <div className="text-orange-600">
                                    點擊左側地圖 = 快速設定 | 手動輸入 = 精確座標
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            )}

            {/* Anchor 配置發送對話框 */}
            {showConfigDialog && configAnchor && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <Card className="w-full max-w-lg mx-4">
                        <CardHeader>
                            <div className="flex items-center justify-between">
                                <CardTitle className="flex items-center">
                                    <Upload className="mr-2 h-5 w-5 text-blue-500" />
                                    發送配置到雲端 - {configAnchor.name}
                                </CardTitle>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={closeConfigDialog}
                                    className="h-8 w-8 p-0 hover:bg-gray-100"
                                >
                                    ✕
                                </Button>
                            </div>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            {/* 座標預覽 */}
                            <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                                <div className="font-medium text-blue-800 mb-2">📍 新座標位置</div>
                                <div className="grid grid-cols-3 gap-4 text-sm">
                                    <div className="text-center">
                                        <div className="text-blue-600 font-medium">X 座標</div>
                                        <div className="text-lg font-bold text-blue-800">{parseFloat(anchorPositionInput.x).toFixed(3)}</div>
                                    </div>
                                    <div className="text-center">
                                        <div className="text-blue-600 font-medium">Y 座標</div>
                                        <div className="text-lg font-bold text-blue-800">{parseFloat(anchorPositionInput.y).toFixed(3)}</div>
                                    </div>
                                    <div className="text-center">
                                        <div className="text-blue-600 font-medium">Z 座標</div>
                                        <div className="text-lg font-bold text-blue-800">{parseFloat(anchorPositionInput.z).toFixed(3)}</div>
                                    </div>
                                </div>
                            </div>

                            {/* 配置參數 */}
                            <div className="space-y-3">
                                <div className="font-medium text-gray-800">🔧 Anchor 配置參數</div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="text-sm font-medium">韌體更新</label>
                                        <Select
                                            value={anchorConfigForm.fw_update.toString()}
                                            onValueChange={(value) => setAnchorConfigForm(prev => ({ ...prev, fw_update: parseInt(value) }))}
                                        >
                                            <SelectTrigger>
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="0">關閉</SelectItem>
                                                <SelectItem value="1">開啟</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>

                                    <div>
                                        <label className="text-sm font-medium">LED 狀態</label>
                                        <Select
                                            value={anchorConfigForm.led.toString()}
                                            onValueChange={(value) => setAnchorConfigForm(prev => ({ ...prev, led: parseInt(value) }))}
                                        >
                                            <SelectTrigger>
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="0">關閉</SelectItem>
                                                <SelectItem value="1">開啟</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>

                                    <div>
                                        <label className="text-sm font-medium">BLE 狀態</label>
                                        <Select
                                            value={anchorConfigForm.ble.toString()}
                                            onValueChange={(value) => setAnchorConfigForm(prev => ({ ...prev, ble: parseInt(value) }))}
                                        >
                                            <SelectTrigger>
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="0">關閉</SelectItem>
                                                <SelectItem value="1">開啟</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>

                                    <div>
                                        <label className="text-sm font-medium">發起者</label>
                                        <Select
                                            value={anchorConfigForm.initiator.toString()}
                                            onValueChange={(value) => setAnchorConfigForm(prev => ({ ...prev, initiator: parseInt(value) }))}
                                        >
                                            <SelectTrigger>
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="0">一般錨點</SelectItem>
                                                <SelectItem value="1">主錨點</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>

                                    <div>
                                        <label className="text-sm font-medium">Serial No</label>
                                        <Input
                                            type="number"
                                            min="1306"
                                            max="9999"
                                            value={anchorConfigForm.serial_no}
                                            onChange={(e) => {
                                                const value = parseInt(e.target.value) || 1306
                                                const clampedValue = Math.min(Math.max(value, 1306), 9999)
                                                setAnchorConfigForm(prev => ({ ...prev, serial_no: clampedValue }))
                                            }}
                                            className="mt-1"
                                            placeholder="1306-9999"
                                        />
                                        <p className="text-xs text-muted-foreground mt-1">
                                            範圍: 1306-9999，每次發送後會自動遞增
                                        </p>
                                    </div>
                                </div>
                            </div>

                            {/* Anchor 信息顯示 */}
                            <div className="bg-yellow-50 p-3 rounded border border-yellow-200 text-xs">
                                <div className="font-medium mb-2 text-yellow-800">🏷️ Anchor 設備信息:</div>
                                <div className="grid grid-cols-2 gap-2 text-yellow-700">
                                    <div>
                                        <span className="font-medium">設備名稱:</span> {configAnchor.cloudData?.name || configAnchor.name}
                                    </div>
                                    <div>
                                        <span className="font-medium">設備 ID:</span> {configAnchor.cloudData?.id || parseInt(configAnchor.macAddress.replace(/[^0-9]/g, '')) || '未知'}
                                    </div>
                                    <div>
                                        <span className="font-medium">MAC 地址:</span> {configAnchor.macAddress}
                                    </div>
                                    <div>
                                        <span className="font-medium">當前狀態:</span> {configAnchor.cloudData?.initiator === 1 ? '主錨點' : '一般錨點'}
                                    </div>
                                </div>
                            </div>

                            {/* 發送信息預覽 */}
                            <div className="bg-gray-50 p-3 rounded border text-xs">
                                <div className="font-medium mb-2">📤 將發送到:</div>
                                <div className="text-gray-600">
                                    主題: {(() => {
                                        const gateway = gateways.find(g => g.id === configAnchor.gatewayId)
                                        const downlinkValue = gateway?.cloudData?.sub_topic?.downlink || '未知'
                                        return downlinkValue === '未知' ? 'UWB/未知' :
                                            downlinkValue.startsWith('UWB/') ? downlinkValue : `UWB/${downlinkValue}`
                                    })()}
                                </div>
                                <div className="text-gray-600">
                                    Gateway ID: {gateways.find(g => g.id === configAnchor.gatewayId)?.cloudData?.gateway_id || '未知'}
                                </div>
                            </div>

                            {/* 按鈕 */}
                            <div className="flex gap-2 pt-2">
                                <Button
                                    onClick={async () => {
                                        if (!configAnchor) return

                                        const position = {
                                            x: parseFloat(anchorPositionInput.x),
                                            y: parseFloat(anchorPositionInput.y),
                                            z: parseFloat(anchorPositionInput.z)
                                        }
                                        const success = await sendAnchorConfigToCloud(configAnchor, position)
                                        if (success) {
                                            closeConfigDialog()
                                        }
                                    }}
                                    className="flex-1"
                                    disabled={sendingConfig}
                                >
                                    {sendingConfig ? (
                                        <>
                                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                            發送中...
                                        </>
                                    ) : (
                                        <>
                                            <Upload className="h-4 w-4 mr-2" />
                                            發送到雲端硬體
                                        </>
                                    )}
                                </Button>
                                <Button variant="outline" onClick={closeConfigDialog} disabled={sendingConfig}>
                                    取消
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            )}
        </div >
    )
}