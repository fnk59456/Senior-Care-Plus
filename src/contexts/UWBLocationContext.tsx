import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react'

// 類型定義
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

interface Gateway {
    id: string
    floorId: string
    name: string
    macAddress: string
    ipAddress: string
    status: 'online' | 'offline' | 'error'
    lastSeen?: Date
    createdAt: Date
    cloudData?: {
        gateway_id: number
        pub_topic: {
            anchor_config: string
            tag_config: string
            location: string
            message: string
            ack_from_node: string
            health: string
        }
    }
}

interface UWBLocationState {
    homes: Home[]
    floors: Floor[]
    gateways: Gateway[]
    selectedHome: string
    selectedFloor: string
    selectedGateway: string
    setSelectedHome: (id: string) => void
    setSelectedFloor: (id: string) => void
    setSelectedGateway: (id: string) => void
    refreshData: () => void // 新增：數據刷新函數
}

const UWBLocationContext = createContext<UWBLocationState | undefined>(undefined)

export const useUWBLocation = () => {
    const context = useContext(UWBLocationContext)
    if (!context) {
        throw new Error('useUWBLocation must be used within UWBLocationProvider')
    }
    return context
}

interface UWBLocationProviderProps {
    children: ReactNode
}

export const UWBLocationProvider: React.FC<UWBLocationProviderProps> = ({ children }) => {
    const [homes, setHomes] = useState<Home[]>([])
    const [floors, setFloors] = useState<Floor[]>([])
    const [gateways, setGateways] = useState<Gateway[]>([])
    const [selectedHome, setSelectedHome] = useState("")
    const [selectedFloor, setSelectedFloor] = useState("")
    const [selectedGateway, setSelectedGateway] = useState("")

    // 數據載入輔助函數
    const loadFromStorage = useCallback(<T,>(key: string, defaultValue: T): T => {
        try {
            const stored = localStorage.getItem(key)
            if (stored) {
                const data = JSON.parse(stored)
                // 恢復Date對象
                if (Array.isArray(data)) {
                    return data.map((item: any) => {
                        if (item.createdAt) {
                            return { ...item, createdAt: new Date(item.createdAt) }
                        }
                        if (item.lastSeen) {
                            return { ...item, lastSeen: new Date(item.lastSeen) }
                        }
                        return item
                    }) as T
                }
                return data
            }
        } catch (error) {
            console.error(`載入${key}失敗:`, error)
        }
        return defaultValue
    }, [])

    // 數據刷新函數 - 從localStorage重新載入所有數據
    const refreshData = useCallback(() => {
        console.log('🔄 正在刷新UWBLocationContext數據...')

        try {
            // 載入數據
            const loadedHomes = loadFromStorage<Home[]>('uwb_homes', [])
            const loadedFloors = loadFromStorage<Floor[]>('uwb_floors', [])
            const loadedGateways = loadFromStorage<Gateway[]>('uwb_gateways', [])
            const loadedSelectedHome = loadFromStorage<string>('uwb_selectedHome', '')

            // 更新狀態
            setHomes(loadedHomes)
            setFloors(loadedFloors)
            setGateways(loadedGateways)

            // 驗證並設置selectedHome
            if (loadedSelectedHome && loadedHomes.find((h: Home) => h.id === loadedSelectedHome)) {
                setSelectedHome(loadedSelectedHome)
            } else if (loadedHomes.length > 0) {
                setSelectedHome(loadedHomes[0].id)
            }

            console.log('✅ UWBLocationContext數據刷新完成')
            console.log(`- 養老院: ${loadedHomes.length} 個`)
            console.log(`- 樓層: ${loadedFloors.length} 個`)
            console.log(`- 閘道器: ${loadedGateways.length} 個`)
        } catch (error) {
            console.error('❌ UWBLocationContext數據刷新失敗:', error)
        }
    }, [loadFromStorage])

    // 從localStorage載入數據 - 只在組件初始化時執行
    useEffect(() => {
        console.log('🚀 UWBLocationContext初始化，開始載入數據...')

        // 載入數據
        const loadedHomes = loadFromStorage<Home[]>('uwb_homes', [])
        const loadedFloors = loadFromStorage<Floor[]>('uwb_floors', [])
        const loadedGateways = loadFromStorage<Gateway[]>('uwb_gateways', [])
        const loadedSelectedHome = loadFromStorage<string>('uwb_selectedHome', '')

        setHomes(loadedHomes)
        setFloors(loadedFloors)
        setGateways(loadedGateways)

        if (loadedSelectedHome && loadedHomes.find((h: Home) => h.id === loadedSelectedHome)) {
            setSelectedHome(loadedSelectedHome)
        } else if (loadedHomes.length > 0) {
            setSelectedHome(loadedHomes[0].id)
        }

        console.log('✅ UWBLocationContext初始化完成')
    }, [loadFromStorage])

    // 監聽localStorage變化 - 當其他頁面更新數據時自動同步
    useEffect(() => {
        const handleStorageChange = (e: StorageEvent) => {
            // 只監聽uwb_開頭的key變化
            if (e.key?.startsWith('uwb_')) {
                console.log(`🔄 檢測到localStorage變化: ${e.key}`)

                // 延遲執行，確保數據已完全寫入
                setTimeout(() => {
                    refreshData()
                }, 100)
            }
        }

        // 監聽同頁面內的localStorage變化（通過自定義事件）
        const handleCustomStorageChange = (e: CustomEvent) => {
            console.log(`🔄 檢測到自定義storage變化: ${e.detail.key}`)
            if (e.detail.key?.startsWith('uwb_')) {
                setTimeout(() => {
                    refreshData()
                }, 100)
            }
        }

        // 添加事件監聽器
        window.addEventListener('storage', handleStorageChange)
        window.addEventListener('uwb-storage-change', handleCustomStorageChange as EventListener)

        console.log('👂 UWBLocationContext已開始監聽localStorage變化')

        return () => {
            window.removeEventListener('storage', handleStorageChange)
            window.removeEventListener('uwb-storage-change', handleCustomStorageChange as EventListener)
            console.log('👂 UWBLocationContext已停止監聽localStorage變化')
        }
    }, [refreshData])

    // 當選擇的養老院改變時，重置樓層和閘道器選擇
    useEffect(() => {
        if (selectedHome) {
            setSelectedFloor("")
            setSelectedGateway("")
        }
    }, [selectedHome])

    // 當選擇的樓層改變時，重置閘道器選擇
    useEffect(() => {
        if (selectedFloor) {
            setSelectedGateway("")
        }
    }, [selectedFloor])

    const value: UWBLocationState = {
        homes,
        floors,
        gateways,
        selectedHome,
        selectedFloor,
        selectedGateway,
        setSelectedHome,
        setSelectedFloor,
        setSelectedGateway,
        refreshData // 暴露刷新函數供組件使用
    }

    return (
        <UWBLocationContext.Provider value={value}>
            {children}
        </UWBLocationContext.Provider>
    )
}

export default UWBLocationContext