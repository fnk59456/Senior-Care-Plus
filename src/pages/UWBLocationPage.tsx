import React, { useState, useEffect, useRef } from "react"
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
const CLOUD_MQTT_URL = "wss://067ec32ef1344d3bb20c4e53abdde99a.s1.eu.hivemq.cloud:8884/mqtt"
const CLOUD_MQTT_TOPIC = "UWB/UWB_Gateway"
const CLOUD_MQTT_OPTIONS = {
    username: 'testweb1',
    password: 'Aa000000'
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
    name: string
    macAddress: string
    type: 'person' | 'asset' | 'equipment'
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
            floorId: "floor_1",
            timestamp: new Date(Date.now() - 30000) // 30秒前
        },
        createdAt: new Date("2024-01-22")
    },
    {
        id: "tag_2",
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
        name: "輪椅設備-01",
        macAddress: "AA:11:BB:22:CC:03",
        type: "equipment",
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
        name: "護理推車-A",
        macAddress: "AA:11:BB:22:CC:04",
        type: "asset",
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
    // 狀態管理
    const [homes, setHomes] = useState<Home[]>(MOCK_HOMES)
    const [floors, setFloors] = useState<Floor[]>(MOCK_FLOORS)
    const [gateways, setGateways] = useState<Gateway[]>(MOCK_GATEWAYS)
    const [anchors, setAnchors] = useState<AnchorDevice[]>(MOCK_ANCHORS)
    const [tags, setTags] = useState<TagDevice[]>(MOCK_TAGS)
    const [selectedHome, setSelectedHome] = useState<string>(MOCK_HOMES[0]?.id || "")
    const [activeTab, setActiveTab] = useState("overview")

    // 雲端 MQTT 相關狀態
    const [cloudConnected, setCloudConnected] = useState(false)
    const [cloudConnectionStatus, setCloudConnectionStatus] = useState<string>("未連線")
    const [cloudError, setCloudError] = useState<string>("")
    const [cloudReconnectAttempts, setCloudReconnectAttempts] = useState(0)
    const [cloudGatewayData, setCloudGatewayData] = useState<CloudGatewayData[]>([])
    const [discoveredGateways, setDiscoveredGateways] = useState<DiscoveredGateway[]>([])
    const [selectedDiscoveredGateway, setSelectedDiscoveredGateway] = useState<number | null>(null)
    const cloudClientRef = useRef<mqtt.MqttClient | null>(null)

    // Anchor 雲端 MQTT 相關狀態
    const [anchorCloudConnected, setAnchorCloudConnected] = useState(false)
    const [anchorCloudConnectionStatus, setAnchorCloudConnectionStatus] = useState<string>("未連線")
    const [anchorCloudError, setAnchorCloudError] = useState<string>("")
    const [cloudAnchorData, setCloudAnchorData] = useState<CloudAnchorData[]>([])
    const [discoveredCloudAnchors, setDiscoveredCloudAnchors] = useState<DiscoveredCloudAnchor[]>([])
    const [selectedGatewayForAnchors, setSelectedGatewayForAnchors] = useState<string>("")
    const [currentAnchorTopic, setCurrentAnchorTopic] = useState<string>("")
    const anchorCloudClientRef = useRef<mqtt.MqttClient | null>(null)

    // Anchor配對相關狀態
    const [pairingInProgress, setPairingInProgress] = useState(false)
    const [selectedGateway, setSelectedGateway] = useState<string>("")
    const [discoveredAnchors, setDiscoveredAnchors] = useState<string[]>([])

    // Tag管理相關狀態
    const [showTagForm, setShowTagForm] = useState(false)
    const [editingTag, setEditingTag] = useState<TagDevice | null>(null)

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
        type: "person" as TagDevice['type'],
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
            cloudClient.end()
        }
    }, [])

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

    // 將實際座標轉換為地圖像素座標
    const convertToMapPixels = (x: number, y: number, floor: Floor) => {
        if (!floor.calibration || !floor.calibration.isCalibrated) {
            return null
        }

        const { originPixel, originCoordinates, pixelToMeterRatio } = floor.calibration

        // 計算相對於原點的實際距離（米）
        const deltaX = x - (originCoordinates?.x || 0)
        const deltaY = y - (originCoordinates?.y || 0)

        // 轉換為像素距離
        const pixelX = originPixel.x + (deltaX * pixelToMeterRatio)
        const pixelY = originPixel.y + (deltaY * pixelToMeterRatio)

        return { x: pixelX, y: pixelY }
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

    // 地圖點擊處理
    const handleMapClick = (event: React.MouseEvent<HTMLImageElement>) => {
        const rect = event.currentTarget.getBoundingClientRect()
        const x = event.clientX - rect.left
        const y = event.clientY - rect.top

        if (calibrationStep === 'setOrigin') {
            setSelectedOrigin({ x, y })
            // 不自動跳轉，等用戶輸入座標後手動進入下一步
        } else if (calibrationStep === 'setScale') {
            if (!scalePoints.point1) {
                setScalePoints(prev => ({ ...prev, point1: { x, y } }))
            } else if (!scalePoints.point2) {
                setScalePoints(prev => ({ ...prev, point2: { x, y } }))
            } else {
                // 重新選擇第一個點
                setScalePoints({ point1: { x, y }, point2: null })
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
                    <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
                        <Card>
                            <CardContent className="pt-6">
                                <div className="flex items-center gap-3">
                                    <Home className="h-8 w-8 text-blue-500" />
                                    <div>
                                        <p className="text-sm font-medium text-muted-foreground">場域數量</p>
                                        <p className="text-2xl font-bold">{homes.length}</p>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardContent className="pt-6">
                                <div className="flex items-center gap-3">
                                    <Layers3 className="h-8 w-8 text-green-500" />
                                    <div>
                                        <p className="text-sm font-medium text-muted-foreground">樓層數量</p>
                                        <p className="text-2xl font-bold">{currentFloors.length}</p>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardContent className="pt-6">
                                <div className="flex items-center gap-3">
                                    <Wifi className="h-8 w-8 text-purple-500" />
                                    <div>
                                        <p className="text-sm font-medium text-muted-foreground">閘道器數量</p>
                                        <p className="text-2xl font-bold">{currentGateways.length}</p>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardContent className="pt-6">
                                <div className="flex items-center gap-3">
                                    <Anchor className="h-8 w-8 text-indigo-500" />
                                    <div>
                                        <p className="text-sm font-medium text-muted-foreground">錨點數量</p>
                                        <p className="text-2xl font-bold">{currentAnchors.length}</p>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardContent className="pt-6">
                                <div className="flex items-center gap-3">
                                    <Tag className="h-8 w-8 text-teal-500" />
                                    <div>
                                        <p className="text-sm font-medium text-muted-foreground">標籤數量</p>
                                        <p className="text-2xl font-bold">{tags.length}</p>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardContent className="pt-6">
                                <div className="flex items-center gap-3">
                                    <Activity className="h-8 w-8 text-orange-500" />
                                    <div>
                                        <p className="text-sm font-medium text-muted-foreground">活躍標籤</p>
                                        <p className="text-2xl font-bold text-green-600">
                                            {tags.filter(t => t.status === 'active').length}
                                        </p>
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
                                                                        left: `${(floor.calibration.originPixel.x / 400) * 100}%`,
                                                                        top: `${(floor.calibration.originPixel.y / 300) * 100}%`
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
                                                                            left: `${(pixelPos.x / 400) * 100}%`,
                                                                            top: `${(pixelPos.y / 300) * 100}%`
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
                                                    <div className="relative border rounded-lg overflow-hidden">
                                                        <img
                                                            src={uploadedImage}
                                                            alt="樓層地圖"
                                                            className="w-full max-h-96 object-contain cursor-crosshair"
                                                            onClick={handleMapClick}
                                                        />
                                                        {selectedOrigin && (
                                                            <div
                                                                className="absolute w-4 h-4 bg-red-500 rounded-full border-2 border-white transform -translate-x-2 -translate-y-2 animate-pulse"
                                                                style={{
                                                                    left: selectedOrigin.x,
                                                                    top: selectedOrigin.y
                                                                }}
                                                            />
                                                        )}
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
                                                            <div className="flex justify-end">
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
                                                    <div className="relative border rounded-lg overflow-hidden">
                                                        <img
                                                            src={uploadedImage}
                                                            alt="樓層地圖"
                                                            className="w-full max-h-96 object-contain cursor-crosshair"
                                                            onClick={handleMapClick}
                                                        />
                                                        {/* 顯示原點 */}
                                                        {selectedOrigin && (
                                                            <div
                                                                className="absolute w-3 h-3 bg-red-500 rounded-full border-2 border-white transform -translate-x-1.5 -translate-y-1.5"
                                                                style={{
                                                                    left: selectedOrigin.x,
                                                                    top: selectedOrigin.y
                                                                }}
                                                                title={`原點 (${originCoordinates.x}, ${originCoordinates.y})`}
                                                            />
                                                        )}
                                                        {/* 顯示比例標定點 */}
                                                        {scalePoints.point1 && (
                                                            <div
                                                                className="absolute w-4 h-4 bg-blue-500 rounded-full border-2 border-white transform -translate-x-2 -translate-y-2 animate-pulse"
                                                                style={{
                                                                    left: scalePoints.point1.x,
                                                                    top: scalePoints.point1.y
                                                                }}
                                                                title="比例點1"
                                                            />
                                                        )}
                                                        {scalePoints.point2 && (
                                                            <div
                                                                className="absolute w-4 h-4 bg-green-500 rounded-full border-2 border-white transform -translate-x-2 -translate-y-2 animate-pulse"
                                                                style={{
                                                                    left: scalePoints.point2.x,
                                                                    top: scalePoints.point2.y
                                                                }}
                                                                title="比例點2"
                                                            />
                                                        )}
                                                        {/* 顯示連線 */}
                                                        {scalePoints.point1 && scalePoints.point2 && (
                                                            <svg
                                                                className="absolute top-0 left-0 w-full h-full pointer-events-none"
                                                                style={{ zIndex: 10 }}
                                                            >
                                                                <line
                                                                    x1={scalePoints.point1.x}
                                                                    y1={scalePoints.point1.y}
                                                                    x2={scalePoints.point2.x}
                                                                    y2={scalePoints.point2.y}
                                                                    stroke="#f59e0b"
                                                                    strokeWidth="2"
                                                                    strokeDasharray="5,5"
                                                                />
                                                            </svg>
                                                        )}
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
                                                                最後更新: {gateway.lastSeen.toLocaleTimeString('zh-TW')}
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
                            <Select value={selectedGatewayForAnchors} onValueChange={setSelectedGatewayForAnchors}>
                                <SelectTrigger className="w-[200px]">
                                    <SelectValue placeholder="選擇雲端閘道器" />
                                </SelectTrigger>
                                <SelectContent>
                                    {/* 顯示雲端發現的閘道器 */}
                                    {discoveredGateways.filter(gw => gw.isOnline).map(gateway => (
                                        <SelectItem key={`discovered-${gateway.gateway_id}`} value={gateway.gateway_id.toString()}>
                                            <div className="flex items-center gap-2">
                                                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                                                {gateway.name} (ID: {gateway.gateway_id})
                                            </div>
                                        </SelectItem>
                                    ))}
                                    {/* 顯示已加入系統的閘道器 */}
                                    {currentGateways.filter(gw => gw.status === 'online').map(gateway => {
                                        // 提取 gateway ID（如果 MAC 地址包含 GW: 前綴）
                                        const gatewayIdFromMac = gateway.macAddress.startsWith('GW:')
                                            ? parseInt(gateway.macAddress.replace('GW:', ''), 16)
                                            : null

                                        // 檢查是否已經在雲端發現列表中
                                        const isAlreadyInDiscovered = gatewayIdFromMac &&
                                            discoveredGateways.some(dg => dg.gateway_id === gatewayIdFromMac)

                                        // 如果已經在雲端發現列表中，就不重複顯示
                                        if (isAlreadyInDiscovered) return null

                                        return (
                                            <SelectItem key={`system-${gateway.id}`} value={gatewayIdFromMac?.toString() || gateway.id}>
                                                <div className="flex items-center gap-2">
                                                    <div className={`w-2 h-2 rounded-full ${gateway.cloudData ? 'bg-green-500' : 'bg-blue-500'}`}></div>
                                                    {gateway.name} {gateway.cloudData ? '(雲端數據)' : '(本地)'}
                                                </div>
                                            </SelectItem>
                                        )
                                    })}
                                </SelectContent>
                            </Select>
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
                                                                最後更新: {anchor.lastSeen.toLocaleTimeString('zh-TW')}
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
                                                className="w-full h-full object-contain bg-gray-50"
                                            />

                                            {/* 座標原點 */}
                                            {floor.calibration?.originPixel && (
                                                <div
                                                    className="absolute w-3 h-3 bg-red-500 rounded-full border-2 border-white transform -translate-x-1/2 -translate-y-1/2 shadow-lg"
                                                    style={{
                                                        left: `${(floor.calibration.originPixel.x / 400) * 100}%`,
                                                        top: `${(floor.calibration.originPixel.y / 300) * 100}%`
                                                    }}
                                                    title={`座標原點 (${floor.calibration.originCoordinates?.x || 0}, ${floor.calibration.originCoordinates?.y || 0})`}
                                                />
                                            )}

                                            {/* Anchor 位置 */}
                                            {floorAnchors.map(anchor => {
                                                if (!anchor.position) return null
                                                const pixelPos = convertToMapPixels(anchor.position.x, anchor.position.y, floor)
                                                if (!pixelPos) return null

                                                return (
                                                    <div key={anchor.id} className="absolute transform -translate-x-1/2 -translate-y-1/2">
                                                        <div
                                                            className="relative"
                                                            style={{
                                                                left: `${(pixelPos.x / 400) * 100}%`,
                                                                top: `${(pixelPos.y / 300) * 100}%`
                                                            }}
                                                        >
                                                            {/* Anchor 圖標 */}
                                                            <div className={`w-6 h-6 rounded-full border-2 border-white shadow-lg flex items-center justify-center ${anchor.cloudData?.initiator === 1 ? 'bg-orange-500' : 'bg-blue-500'
                                                                }`}>
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

                    {/* 本地錨點管理（保留原有功能） */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-lg flex items-center">
                                <Radio className="mr-3 h-5 w-5 text-gray-500" />
                                本地錨點管理 (模擬)
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-4">
                                <div className="flex items-center gap-4">
                                    <Select value={selectedGateway} onValueChange={setSelectedGateway}>
                                        <SelectTrigger className="w-[200px]">
                                            <SelectValue placeholder="選擇本地閘道器" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {onlineGateways.map(gateway => (
                                                <SelectItem key={gateway.id} value={gateway.id}>
                                                    {gateway.name}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    <Button
                                        onClick={startAnchorPairing}
                                        disabled={!selectedGateway || pairingInProgress}
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
                                            {currentAnchors.map(anchor => {
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
                                                                        onClick={() => deleteAnchor(anchor.id)}
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
                                            })}
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
                        <Button onClick={() => setShowTagForm(true)}>
                            <Plus className="h-4 w-4 mr-2" />
                            新增標籤
                        </Button>
                    </div>

                    {/* 標籤統計 */}
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
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
                                    <Settings className="h-6 w-6 text-blue-500" />
                                    <div>
                                        <p className="text-sm text-muted-foreground">設備標籤</p>
                                        <p className="text-xl font-bold">{tags.filter(t => t.type === 'equipment').length}</p>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                        <Card>
                            <CardContent className="pt-6">
                                <div className="flex items-center gap-3">
                                    <MapPin className="h-6 w-6 text-purple-500" />
                                    <div>
                                        <p className="text-sm text-muted-foreground">資產標籤</p>
                                        <p className="text-xl font-bold">{tags.filter(t => t.type === 'asset').length}</p>
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
                    </div>

                    {/* 標籤列表 */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {tags.map(tag => {
                            const getTypeIcon = (type: TagDevice['type']) => {
                                switch (type) {
                                    case 'person': return <Tag className="h-5 w-5 text-green-500" />
                                    case 'equipment': return <Settings className="h-5 w-5 text-blue-500" />
                                    case 'asset': return <MapPin className="h-5 w-5 text-purple-500" />
                                    default: return <Tag className="h-5 w-5" />
                                }
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
                                                <span className="text-sm">
                                                    {tag.type === 'person' ? '人員' :
                                                        tag.type === 'equipment' ? '設備' : '資產'}
                                                </span>
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
                        })}
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
        </div>
    )
}