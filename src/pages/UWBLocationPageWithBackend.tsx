// 整合後端的UWBLocationPage範例 - 以新增場域功能為例
import React, { useState, useEffect, useRef, useCallback } from "react"
import { useTranslation } from 'react-i18next'
// @ts-ignore
import mqtt from "mqtt"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { useToast } from "@/hooks/use-toast"
import { Toaster } from "@/components/ui/toaster"
import { Building2, Plus, Edit, Trash2, Home, Loader2, CheckCircle2, AlertCircle } from "lucide-react"

// 導入API服務和Hook
import { api } from '@/services/api'
import { useDataSync } from '@/hooks/useDataSync'

// 數據類型定義 (保持原有)
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
        realWidth: number
        realHeight: number
    }
    calibration?: {
        originPixel: { x: number, y: number }
        originCoordinates?: { x: number, y: number }
        pixelToMeterRatio: number
        scalePoints?: {
            point1: { x: number, y: number } | null
            point2: { x: number, y: number } | null
        }
        realDistance?: number
        isCalibrated: boolean
    }
    createdAt: Date
}

// 表單狀態
interface HomeForm {
    name: string
    description: string
    address: string
}

export default function UWBLocationPageWithBackend() {
    const { t } = useTranslation()
    const { toast } = useToast()

    // 使用數據同步Hook
    const {
        isLoading,
        lastSyncTime,
        error: syncError,
        syncHomes,
        syncFloors,
        clearError
    } = useDataSync({
        enableAutoSync: true,
        syncInterval: 30000,
        onError: (error) => {
            toast({
                title: "同步錯誤",
                description: error.message,
                variant: "destructive",
            })
        }
    })

    // 狀態管理
    const [homes, setHomes] = useState<Home[]>([])
    const [floors, setFloors] = useState<Floor[]>([])
    const [selectedHome, setSelectedHome] = useState<string | null>(null)
    const [editingItem, setEditingItem] = useState<Home | null>(null)
    const [isSubmitting, setIsSubmitting] = useState(false)

    // 表單狀態
    const [homeForm, setHomeForm] = useState<HomeForm>({
        name: '',
        description: '',
        address: ''
    })

    // 初始化數據 - 從後端加載
    useEffect(() => {
        const initializeData = async () => {
            try {
                console.log('🔄 從後端初始化數據...')
                const homesData = await syncHomes()
                setHomes(homesData)

                if (homesData.length > 0) {
                    setSelectedHome(homesData[0].id)
                    // 加載第一個場域的樓層數據
                    const floorsData = await syncFloors(homesData[0].id)
                    setFloors(floorsData)
                }

                toast({
                    title: "數據加載成功",
                    description: `已加載 ${homesData.length} 個場域`,
                })
            } catch (error) {
                console.error('❌ 初始化數據失敗:', error)
                toast({
                    title: "數據加載失敗",
                    description: "無法從後端加載數據，請檢查網絡連接",
                    variant: "destructive",
                })
            }
        }

        initializeData()
    }, [])

    // 當選中場域改變時，加載對應的樓層數據
    useEffect(() => {
        if (!selectedHome) return

        const loadFloorsForHome = async () => {
            try {
                const floorsData = await syncFloors(selectedHome)
                setFloors(floorsData)
            } catch (error) {
                console.error('❌ 加載樓層數據失敗:', error)
            }
        }

        loadFloorsForHome()
    }, [selectedHome, syncFloors])

    // 處理場域表單提交 - 整合後端API
    const handleHomeSubmit = async () => {
        if (!homeForm.name.trim()) {
            toast({
                title: "驗證失敗",
                description: "請輸入場域名稱",
                variant: "destructive",
            })
            return
        }

        setIsSubmitting(true)
        clearError()

        try {
            if (editingItem) {
                // 更新現有場域
                console.log('🔄 更新場域:', editingItem.id)
                const updatedHome = await api.home.update(editingItem.id, homeForm)

                setHomes(prev => prev.map(home =>
                    home.id === editingItem.id ? updatedHome : home
                ))

                toast({
                    title: "更新成功",
                    description: `場域 "${updatedHome.name}" 已更新`,
                })
            } else {
                // 創建新場域
                console.log('➕ 創建新場域:', homeForm.name)
                const newHome = await api.home.create(homeForm)

                setHomes(prev => [...prev, newHome])
                setSelectedHome(newHome.id)

                toast({
                    title: "創建成功",
                    description: `場域 "${newHome.name}" 已創建`,
                })
            }

            resetHomeForm()
        } catch (error) {
            console.error('❌ 場域操作失敗:', error)
            const errorMessage = error instanceof Error ? error.message : '操作失敗'

            toast({
                title: "操作失敗",
                description: errorMessage,
                variant: "destructive",
            })
        } finally {
            setIsSubmitting(false)
        }
    }

    // 刪除場域 - 整合後端API
    const deleteHome = async (id: string) => {
        const home = homes.find(h => h.id === id)
        if (!home) return

        if (!confirm(`確定要刪除場域 "${home.name}" 嗎？此操作將同時刪除所有相關的樓層和設備數據。`)) {
            return
        }

        try {
            console.log('🗑️ 刪除場域:', id)
            await api.home.delete(id)

            setHomes(prev => prev.filter(h => h.id !== id))

            // 如果刪除的是當前選中的場域，切換到其他場域
            if (selectedHome === id) {
                const remainingHomes = homes.filter(h => h.id !== id)
                setSelectedHome(remainingHomes.length > 0 ? remainingHomes[0].id : null)
                setFloors([])
            }

            toast({
                title: "刪除成功",
                description: `場域 "${home.name}" 已刪除`,
            })
        } catch (error) {
            console.error('❌ 刪除場域失敗:', error)
            const errorMessage = error instanceof Error ? error.message : '刪除失敗'

            toast({
                title: "刪除失敗",
                description: errorMessage,
                variant: "destructive",
            })
        }
    }

    // 編輯場域
    const editHome = (home: Home) => {
        setEditingItem(home)
        setHomeForm({
            name: home.name,
            description: home.description,
            address: home.address
        })
    }

    // 重置表單
    const resetHomeForm = () => {
        setHomeForm({
            name: '',
            description: '',
            address: ''
        })
        setEditingItem(null)
    }

    // 手動同步數據
    const handleManualSync = async () => {
        try {
            const homesData = await syncHomes()
            setHomes(homesData)

            if (selectedHome) {
                const floorsData = await syncFloors(selectedHome)
                setFloors(floorsData)
            }

            toast({
                title: "同步成功",
                description: "數據已從後端同步",
            })
        } catch (error) {
            console.error('❌ 手動同步失敗:', error)
        }
    }

    return (
        <div className="container mx-auto p-6">
            <Toaster />

            {/* 頁面標題和同步狀態 */}
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h1 className="text-3xl font-bold flex items-center gap-2">
                        <Building2 className="h-8 w-8" />
                        場域管理
                    </h1>
                    <p className="text-gray-600 mt-1">
                        管理養老院的場域和樓層配置
                    </p>
                </div>

                <div className="flex items-center gap-4">
                    {lastSyncTime && (
                        <div className="text-sm text-gray-500">
                            最後同步: {lastSyncTime.toLocaleTimeString()}
                        </div>
                    )}

                    <Button
                        onClick={handleManualSync}
                        disabled={isLoading}
                        variant="outline"
                        size="sm"
                    >
                        {isLoading ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                            <CheckCircle2 className="h-4 w-4" />
                        )}
                        同步數據
                    </Button>
                </div>
            </div>

            {/* 錯誤提示 */}
            {syncError && (
                <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2">
                    <AlertCircle className="h-5 w-5 text-red-500" />
                    <span className="text-red-700">同步錯誤: {syncError}</span>
                    <Button
                        onClick={clearError}
                        variant="ghost"
                        size="sm"
                        className="ml-auto"
                    >
                        關閉
                    </Button>
                </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* 場域列表 */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Home className="h-5 w-5" />
                            場域列表
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-4">
                            {homes.map((home) => (
                                <div
                                    key={home.id}
                                    className={`p-4 border rounded-lg cursor-pointer transition-colors ${selectedHome === home.id
                                            ? 'border-blue-500 bg-blue-50'
                                            : 'border-gray-200 hover:border-gray-300'
                                        }`}
                                    onClick={() => setSelectedHome(home.id)}
                                >
                                    <div className="flex justify-between items-start">
                                        <div className="flex-1">
                                            <h3 className="font-semibold text-lg">{home.name}</h3>
                                            <p className="text-gray-600 text-sm mt-1">{home.description}</p>
                                            <p className="text-gray-500 text-xs mt-1">{home.address}</p>
                                            <p className="text-gray-400 text-xs mt-1">
                                                創建時間: {home.createdAt.toLocaleDateString()}
                                            </p>
                                        </div>
                                        <div className="flex gap-2">
                                            <Button
                                                size="sm"
                                                variant="ghost"
                                                onClick={(e) => {
                                                    e.stopPropagation()
                                                    editHome(home)
                                                }}
                                            >
                                                <Edit className="h-4 w-4" />
                                            </Button>
                                            <Button
                                                size="sm"
                                                variant="ghost"
                                                onClick={(e) => {
                                                    e.stopPropagation()
                                                    deleteHome(home.id)
                                                }}
                                                className="text-red-600 hover:text-red-700"
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    </div>
                                </div>
                            ))}

                            {homes.length === 0 && (
                                <div className="text-center py-8 text-gray-500">
                                    暫無場域數據
                                </div>
                            )}
                        </div>
                    </CardContent>
                </Card>

                {/* 場域表單 */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Plus className="h-5 w-5" />
                            {editingItem ? '編輯場域' : '新增場域'}
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium mb-1">
                                    場域名稱 *
                                </label>
                                <Input
                                    value={homeForm.name}
                                    onChange={(e) => setHomeForm(prev => ({ ...prev, name: e.target.value }))}
                                    placeholder="請輸入場域名稱"
                                    disabled={isSubmitting}
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium mb-1">
                                    場域描述
                                </label>
                                <Textarea
                                    value={homeForm.description}
                                    onChange={(e) => setHomeForm(prev => ({ ...prev, description: e.target.value }))}
                                    placeholder="請輸入場域描述"
                                    rows={3}
                                    disabled={isSubmitting}
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium mb-1">
                                    場域地址
                                </label>
                                <Input
                                    value={homeForm.address}
                                    onChange={(e) => setHomeForm(prev => ({ ...prev, address: e.target.value }))}
                                    placeholder="請輸入場域地址"
                                    disabled={isSubmitting}
                                />
                            </div>

                            <div className="flex gap-2 pt-4">
                                <Button
                                    onClick={handleHomeSubmit}
                                    disabled={isSubmitting || !homeForm.name.trim()}
                                    className="flex-1"
                                >
                                    {isSubmitting ? (
                                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                                    ) : null}
                                    {editingItem ? '更新場域' : '創建場域'}
                                </Button>

                                {editingItem && (
                                    <Button
                                        onClick={resetHomeForm}
                                        variant="outline"
                                        disabled={isSubmitting}
                                    >
                                        取消
                                    </Button>
                                )}
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* 樓層信息顯示 */}
            {selectedHome && floors.length > 0 && (
                <Card className="mt-6">
                    <CardHeader>
                        <CardTitle>樓層信息</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {floors.map((floor) => (
                                <div key={floor.id} className="p-4 border rounded-lg">
                                    <h4 className="font-semibold">{floor.name}</h4>
                                    <p className="text-sm text-gray-600">樓層: {floor.level}</p>
                                    <p className="text-xs text-gray-500">
                                        創建時間: {floor.createdAt.toLocaleDateString()}
                                    </p>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            )}
        </div>
    )
}
