import React, { useState, useEffect } from "react"
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
    Battery
} from "lucide-react"

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
    mapImage?: string
    dimensions?: {
        width: number
        height: number
        realWidth: number // 實際寬度(米)
        realHeight: number // 實際高度(米)
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
        dimensions: {
            width: 800,
            height: 600,
            realWidth: 40,
            realHeight: 30
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

export default function UWBLocationPage() {
    // 狀態管理
    const [homes, setHomes] = useState<Home[]>(MOCK_HOMES)
    const [floors, setFloors] = useState<Floor[]>(MOCK_FLOORS)
    const [gateways, setGateways] = useState<Gateway[]>(MOCK_GATEWAYS)
    const [anchors, setAnchors] = useState<AnchorDevice[]>(MOCK_ANCHORS)
    const [tags, setTags] = useState<TagDevice[]>(MOCK_TAGS)
    const [selectedHome, setSelectedHome] = useState<string>(MOCK_HOMES[0]?.id || "")
    const [activeTab, setActiveTab] = useState("overview")

    // Anchor配對相關狀態
    const [pairingInProgress, setPairingInProgress] = useState(false)
    const [selectedGateway, setSelectedGateway] = useState<string>("")
    const [discoveredAnchors, setDiscoveredAnchors] = useState<string[]>([])

    // Tag管理相關狀態
    const [showTagForm, setShowTagForm] = useState(false)
    const [editingTag, setEditingTag] = useState<TagDevice | null>(null)

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
            const newGateway: Gateway = {
                id: `gw_${Date.now()}`,
                ...gatewayForm,
                status: "offline",
                createdAt: new Date()
            }
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
                </TabsContent>

                {/* 閘道器管理 */}
                <TabsContent value="gateways" className="space-y-6">
                    <div className="flex items-center justify-between">
                        <h2 className="text-xl font-semibold">閘道器管理</h2>
                        <Button onClick={() => setShowGatewayForm(true)} disabled={currentFloors.length === 0}>
                            <Plus className="h-4 w-4 mr-2" />
                            新增閘道器
                        </Button>
                    </div>

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
                                <CardTitle>{editingItem ? "編輯閘道器" : "新增閘道器"}</CardTitle>
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
                            <Select value={selectedGateway} onValueChange={setSelectedGateway}>
                                <SelectTrigger className="w-[200px]">
                                    <SelectValue placeholder="選擇閘道器" />
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
                            >
                                {pairingInProgress ? (
                                    <>
                                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                        配對中...
                                    </>
                                ) : (
                                    <>
                                        <Radio className="h-4 w-4 mr-2" />
                                        開始配對
                                    </>
                                )}
                            </Button>
                        </div>
                    </div>

                    {onlineGateways.length === 0 ? (
                        <Card>
                            <CardContent className="pt-6 text-center">
                                <AlertCircle className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                                <p className="text-muted-foreground">沒有在線的閘道器可進行配對</p>
                            </CardContent>
                        </Card>
                    ) : (
                        <>
                            {/* 配對進度區域 */}
                            {(pairingInProgress || discoveredAnchors.length > 0) && (
                                <Card>
                                    <CardHeader>
                                        <CardTitle className="flex items-center">
                                            <Radio className="mr-2 h-5 w-5" />
                                            配對進度
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
                                                    {anchor.position && (
                                                        <div className="flex items-center justify-between">
                                                            <span className="text-sm text-muted-foreground">位置座標</span>
                                                            <span className="text-sm">
                                                                ({anchor.position.x}, {anchor.position.y}, {anchor.position.z})
                                                            </span>
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