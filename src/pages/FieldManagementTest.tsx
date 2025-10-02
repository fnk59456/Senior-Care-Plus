// 場域管理測試頁面
import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { useToast } from "@/hooks/use-toast"
import { Toaster } from "@/components/ui/toaster"
import {
    Plus,
    Edit,
    Trash2,
    CheckCircle2,
    XCircle,
    Loader2,
    Building2,
    MapPin,
    Calendar,
    AlertCircle
} from 'lucide-react'

interface Home {
    id: string
    name: string
    description: string
    address: string
    createdAt: string
}

interface Floor {
    id: string
    homeId: string
    name: string
    level: number
    realWidth: number
    realHeight: number
    createdAt: string
}

export default function FieldManagementTest() {
    const { toast } = useToast()
    const [homes, setHomes] = useState<Home[]>([])
    const [floors, setFloors] = useState<Floor[]>([])
    const [loading, setLoading] = useState(false)
    const [selectedHome, setSelectedHome] = useState<string>('')

    // 表單狀態
    const [homeForm, setHomeForm] = useState({
        name: '',
        description: '',
        address: ''
    })
    const [floorForm, setFloorForm] = useState({
        name: '',
        level: 1,
        realWidth: 20,
        realHeight: 15
    })
    const [editingItem, setEditingItem] = useState<Home | Floor | null>(null)
    const [isEditing, setIsEditing] = useState(false)

    // 載入數據
    const loadData = async () => {
        setLoading(true)
        try {
            // 載入場域數據
            const homesResponse = await fetch(`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001/api'}/homes`)
            if (homesResponse.ok) {
                const homesData = await homesResponse.json()
                setHomes(homesData)
                if (homesData.length > 0 && !selectedHome) {
                    setSelectedHome(homesData[0].id)
                }
            }

            // 載入樓層數據
            const floorsResponse = await fetch(`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001/api'}/floors`)
            if (floorsResponse.ok) {
                const floorsData = await floorsResponse.json()
                setFloors(floorsData)
            }
        } catch (error) {
            console.error('載入數據失敗:', error)
            toast({
                title: "載入失敗",
                description: "無法從後端載入數據",
                variant: "destructive"
            })
        } finally {
            setLoading(false)
        }
    }

    // 組件掛載時載入數據
    useEffect(() => {
        loadData()
    }, [])

    // 處理場域表單提交
    const handleHomeSubmit = async () => {
        if (!homeForm.name.trim()) {
            toast({
                title: "驗證失敗",
                description: "請輸入場域名稱",
                variant: "destructive"
            })
            return
        }

        try {
            if (isEditing && editingItem && 'address' in editingItem) {
                // 更新場域
                const response = await fetch(`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001/api'}/homes/${editingItem.id}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(homeForm)
                })

                if (response.ok) {
                    const updatedHome = await response.json()
                    setHomes(prev => prev.map(h => h.id === editingItem.id ? updatedHome : h))
                    toast({
                        title: "更新成功",
                        description: "場域信息已更新"
                    })
                } else {
                    throw new Error(`HTTP ${response.status}`)
                }
            } else {
                // 創建場域
                const response = await fetch(`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001/api'}/homes`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(homeForm)
                })

                if (response.ok) {
                    const newHome = await response.json()
                    setHomes(prev => [...prev, newHome])
                    setSelectedHome(newHome.id)
                    toast({
                        title: "創建成功",
                        description: "場域已創建"
                    })
                } else {
                    throw new Error(`HTTP ${response.status}`)
                }
            }

            resetHomeForm()
        } catch (error) {
            console.error('場域操作失敗:', error)
            toast({
                title: "操作失敗",
                description: error instanceof Error ? error.message : "未知錯誤",
                variant: "destructive"
            })
        }
    }

    // 處理樓層表單提交
    const handleFloorSubmit = async () => {
        if (!floorForm.name.trim() || !selectedHome) {
            toast({
                title: "驗證失敗",
                description: "請輸入樓層名稱並選擇場域",
                variant: "destructive"
            })
            return
        }

        try {
            if (isEditing && editingItem && 'level' in editingItem) {
                // 更新樓層
                const response = await fetch(`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001/api'}/floors/${editingItem.id}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(floorForm)
                })

                if (response.ok) {
                    const updatedFloor = await response.json()
                    setFloors(prev => prev.map(f => f.id === editingItem.id ? updatedFloor : f))
                    toast({
                        title: "更新成功",
                        description: "樓層信息已更新"
                    })
                } else {
                    throw new Error(`HTTP ${response.status}`)
                }
            } else {
                // 創建樓層
                const response = await fetch(`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001/api'}/floors`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        ...floorForm,
                        homeId: selectedHome
                    })
                })

                if (response.ok) {
                    const newFloor = await response.json()
                    setFloors(prev => [...prev, newFloor])
                    toast({
                        title: "創建成功",
                        description: "樓層已創建"
                    })
                } else {
                    throw new Error(`HTTP ${response.status}`)
                }
            }

            resetFloorForm()
        } catch (error) {
            console.error('樓層操作失敗:', error)
            toast({
                title: "操作失敗",
                description: error instanceof Error ? error.message : "未知錯誤",
                variant: "destructive"
            })
        }
    }

    // 刪除場域
    const deleteHome = async (id: string) => {
        try {
            const response = await fetch(`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001/api'}/homes/${id}`, {
                method: 'DELETE'
            })

            if (response.ok) {
                setHomes(prev => prev.filter(h => h.id !== id))
                if (selectedHome === id) {
                    setSelectedHome(homes.find(h => h.id !== id)?.id || '')
                }
                toast({
                    title: "刪除成功",
                    description: "場域已刪除"
                })
            } else {
                throw new Error(`HTTP ${response.status}`)
            }
        } catch (error) {
            console.error('場域刪除失敗:', error)
            toast({
                title: "刪除失敗",
                description: error instanceof Error ? error.message : "未知錯誤",
                variant: "destructive"
            })
        }
    }

    // 刪除樓層
    const deleteFloor = async (id: string) => {
        try {
            const response = await fetch(`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001/api'}/floors/${id}`, {
                method: 'DELETE'
            })

            if (response.ok) {
                setFloors(prev => prev.filter(f => f.id !== id))
                toast({
                    title: "刪除成功",
                    description: "樓層已刪除"
                })
            } else {
                throw new Error(`HTTP ${response.status}`)
            }
        } catch (error) {
            console.error('樓層刪除失敗:', error)
            toast({
                title: "刪除失敗",
                description: error instanceof Error ? error.message : "未知錯誤",
                variant: "destructive"
            })
        }
    }

    // 重置表單
    const resetHomeForm = () => {
        setHomeForm({ name: '', description: '', address: '' })
        setEditingItem(null)
        setIsEditing(false)
    }

    const resetFloorForm = () => {
        setFloorForm({ name: '', level: 1, realWidth: 20, realHeight: 15 })
        setEditingItem(null)
        setIsEditing(false)
    }

    // 編輯場域
    const editHome = (home: Home) => {
        setHomeForm({
            name: home.name,
            description: home.description,
            address: home.address
        })
        setEditingItem(home)
        setIsEditing(true)
    }

    // 編輯樓層
    const editFloor = (floor: Floor) => {
        setFloorForm({
            name: floor.name,
            level: floor.level,
            realWidth: floor.realWidth,
            realHeight: floor.realHeight
        })
        setEditingItem(floor)
        setIsEditing(true)
    }

    // 獲取場域的樓層
    const getFloorsByHome = (homeId: string) => {
        return floors.filter(f => f.homeId === homeId)
    }

    return (
        <div className="container mx-auto p-6 space-y-6">
            <Toaster />

            {/* 頁面標題 */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold">場域管理測試</h1>
                    <p className="text-muted-foreground mt-2">
                        測試場域和樓層的增刪改查功能
                    </p>
                </div>
                <Button onClick={loadData} disabled={loading} className="flex items-center space-x-2">
                    {loading ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                        <Building2 className="h-4 w-4" />
                    )}
                    <span>重新載入</span>
                </Button>
            </div>

            {/* 場域管理 */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center space-x-2">
                        <Building2 className="h-5 w-5" />
                        <span>場域管理</span>
                        <Badge variant="outline">{homes.length} 個場域</Badge>
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    {/* 場域表單 */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 border rounded-lg bg-muted/50">
                        <Input
                            placeholder="場域名稱"
                            value={homeForm.name}
                            onChange={(e) => setHomeForm(prev => ({ ...prev, name: e.target.value }))}
                        />
                        <Input
                            placeholder="描述"
                            value={homeForm.description}
                            onChange={(e) => setHomeForm(prev => ({ ...prev, description: e.target.value }))}
                        />
                        <Input
                            placeholder="地址"
                            value={homeForm.address}
                            onChange={(e) => setHomeForm(prev => ({ ...prev, address: e.target.value }))}
                        />
                        <div className="flex space-x-2">
                            <Button onClick={handleHomeSubmit} className="flex-1">
                                {isEditing ? '更新' : '創建'}場域
                            </Button>
                            {isEditing && (
                                <Button variant="outline" onClick={resetHomeForm}>
                                    取消
                                </Button>
                            )}
                        </div>
                    </div>

                    {/* 場域列表 */}
                    <div className="space-y-2">
                        {homes.map((home) => (
                            <div key={home.id} className="flex items-center justify-between p-3 border rounded-lg">
                                <div className="flex-1">
                                    <div className="font-medium">{home.name}</div>
                                    <div className="text-sm text-muted-foreground">{home.description}</div>
                                    <div className="text-xs text-muted-foreground flex items-center space-x-1">
                                        <MapPin className="h-3 w-3" />
                                        <span>{home.address}</span>
                                    </div>
                                </div>
                                <div className="flex items-center space-x-2">
                                    <Badge variant="outline" className="text-xs">
                                        {getFloorsByHome(home.id).length} 樓層
                                    </Badge>
                                    <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={() => editHome(home)}
                                    >
                                        <Edit className="h-3 w-3" />
                                    </Button>
                                    <Button
                                        size="sm"
                                        variant="destructive"
                                        onClick={() => deleteHome(home.id)}
                                    >
                                        <Trash2 className="h-3 w-3" />
                                    </Button>
                                </div>
                            </div>
                        ))}
                    </div>
                </CardContent>
            </Card>

            {/* 樓層管理 */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center space-x-2">
                        <MapPin className="h-5 w-5" />
                        <span>樓層管理</span>
                        <Badge variant="outline">{floors.length} 個樓層</Badge>
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    {/* 樓層表單 */}
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 p-4 border rounded-lg bg-muted/50">
                        <Input
                            placeholder="樓層名稱"
                            value={floorForm.name}
                            onChange={(e) => setFloorForm(prev => ({ ...prev, name: e.target.value }))}
                        />
                        <Input
                            type="number"
                            placeholder="樓層"
                            value={floorForm.level}
                            onChange={(e) => setFloorForm(prev => ({ ...prev, level: parseInt(e.target.value) || 1 }))}
                        />
                        <Input
                            type="number"
                            placeholder="寬度(米)"
                            value={floorForm.realWidth}
                            onChange={(e) => setFloorForm(prev => ({ ...prev, realWidth: parseFloat(e.target.value) || 0 }))}
                        />
                        <Input
                            type="number"
                            placeholder="高度(米)"
                            value={floorForm.realHeight}
                            onChange={(e) => setFloorForm(prev => ({ ...prev, realHeight: parseFloat(e.target.value) || 0 }))}
                        />
                        <div className="flex space-x-2">
                            <Button onClick={handleFloorSubmit} className="flex-1">
                                {isEditing ? '更新' : '創建'}樓層
                            </Button>
                            {isEditing && (
                                <Button variant="outline" onClick={resetFloorForm}>
                                    取消
                                </Button>
                            )}
                        </div>
                    </div>

                    {/* 樓層列表 */}
                    <div className="space-y-2">
                        {floors.map((floor) => {
                            const home = homes.find(h => h.id === floor.homeId)
                            return (
                                <div key={floor.id} className="flex items-center justify-between p-3 border rounded-lg">
                                    <div className="flex-1">
                                        <div className="font-medium">{floor.name}</div>
                                        <div className="text-sm text-muted-foreground">
                                            {home?.name} - {floor.level}樓
                                        </div>
                                        <div className="text-xs text-muted-foreground">
                                            {floor.realWidth}m × {floor.realHeight}m
                                        </div>
                                    </div>
                                    <div className="flex items-center space-x-2">
                                        <Button
                                            size="sm"
                                            variant="outline"
                                            onClick={() => editFloor(floor)}
                                        >
                                            <Edit className="h-3 w-3" />
                                        </Button>
                                        <Button
                                            size="sm"
                                            variant="destructive"
                                            onClick={() => deleteFloor(floor.id)}
                                        >
                                            <Trash2 className="h-3 w-3" />
                                        </Button>
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                </CardContent>
            </Card>

            {/* 使用說明 */}
            <Card>
                <CardHeader>
                    <CardTitle>使用說明</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                    <p className="text-sm text-muted-foreground">
                        1. 確保後端服務器正在運行 (node test-backend-with-db.js)
                    </p>
                    <p className="text-sm text-muted-foreground">
                        2. 創建場域：填寫場域信息並點擊「創建場域」
                    </p>
                    <p className="text-sm text-muted-foreground">
                        3. 創建樓層：選擇場域後填寫樓層信息並點擊「創建樓層」
                    </p>
                    <p className="text-sm text-muted-foreground">
                        4. 編輯：點擊編輯按鈕修改現有項目
                    </p>
                    <p className="text-sm text-muted-foreground">
                        5. 刪除：點擊刪除按鈕移除項目
                    </p>
                </CardContent>
            </Card>
        </div>
    )
}
