import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback, useRef } from 'react'
import { gatewayRegistry } from '@/services/gatewayRegistry'
import { mqttBus } from '@/services/mqttBus'
import { useDataSync } from '@/hooks/useDataSync'
// 初始化所有 Store 以註冊路由規則
import '@/stores/initStores'

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

    // 後端狀態管理
    const [backendAvailable, setBackendAvailable] = useState(false)
    const [isCheckingBackend, setIsCheckingBackend] = useState(true)

    // 數據同步 Hook - 使用 useCallback 包裝 onError 避免無限循環
    const handleSyncError = useCallback((error: Error) => {
        console.warn('數據同步失敗，使用本地存儲:', error)
        setBackendAvailable(false)
    }, [])

    const { syncHomes, syncFloors, syncGateways } = useDataSync({
        enableAutoSync: false,
        onError: handleSyncError
    })

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

    // 數據刷新函數 - 重新載入所有數據（支持後端和localStorage）
    // 使用 useRef 防止重複調用
    const isRefreshingRef = useRef(false)
    const refreshData = useCallback(async () => {
        // 防止重複調用
        if (isRefreshingRef.current) {
            console.log('⚠️ 數據刷新正在進行中，跳過重複調用')
            return
        }

        isRefreshingRef.current = true
        console.log('🔄 正在刷新UWBLocationContext數據...')

        try {
            let loadedHomes: Home[] = []
            let loadedFloors: Floor[] = []
            let loadedGateways: Gateway[] = []
            let loadedSelectedHome = ''

            if (backendAvailable && !isCheckingBackend) {
                // 從後端刷新數據
                try {
                    loadedHomes = await syncHomes()
                    if (loadedHomes.length > 0 && selectedHome) {
                        try {
                            loadedFloors = await syncFloors(selectedHome)
                            if (loadedFloors.length > 0) {
                                try {
                                    loadedGateways = await syncGateways(loadedFloors[0].id)
                                } catch {
                                    loadedGateways = loadFromStorage<Gateway[]>('uwb_gateways', [])
                                }
                            } else {
                                loadedGateways = loadFromStorage<Gateway[]>('uwb_gateways', [])
                            }
                        } catch {
                            loadedFloors = loadFromStorage<Floor[]>('uwb_floors', [])
                            loadedGateways = loadFromStorage<Gateway[]>('uwb_gateways', [])
                        }
                    } else {
                        loadedFloors = loadFromStorage<Floor[]>('uwb_floors', [])
                        loadedGateways = loadFromStorage<Gateway[]>('uwb_gateways', [])
                    }
                } catch {
                    // 降級到 localStorage
                    loadedHomes = loadFromStorage<Home[]>('uwb_homes', [])
                    loadedFloors = loadFromStorage<Floor[]>('uwb_floors', [])
                    loadedGateways = loadFromStorage<Gateway[]>('uwb_gateways', [])
                }
            } else {
                // 從 localStorage 刷新數據
                loadedHomes = loadFromStorage<Home[]>('uwb_homes', [])
                loadedFloors = loadFromStorage<Floor[]>('uwb_floors', [])
                loadedGateways = loadFromStorage<Gateway[]>('uwb_gateways', [])
            }

            // 設置網關數據（移除硬編碼默認 Gateway）
            setGateways(loadedGateways)
            setHomes(loadedHomes)
            setFloors(loadedFloors)

            // 驗證並設置selectedHome
            loadedSelectedHome = loadFromStorage<string>('uwb_selectedHome', '')
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
        } finally {
            isRefreshingRef.current = false
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [backendAvailable, isCheckingBackend, selectedHome])

    // 檢測後端可用性
    useEffect(() => {
        const checkBackendAvailability = async () => {
            try {
                setIsCheckingBackend(true)
                const response = await fetch(`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001/api'}/health`)
                if (response.ok) {
                    setBackendAvailable(true)
                    console.log('✅ 後端連接可用，使用 API 模式')
                } else {
                    setBackendAvailable(false)
                    console.log('⚠️ 後端連接不可用，使用 localStorage 模式')
                }
            } catch (error) {
                setBackendAvailable(false)
                console.log('⚠️ 後端連接不可用，使用 localStorage 模式')
            } finally {
                setIsCheckingBackend(false)
            }
        }

        checkBackendAvailability()
    }, [])

    // ✨ 初始化 MQTT Bus（應用啟動時只執行一次）
    useEffect(() => {
        console.log('🚀 初始化 MQTT Bus...')

        // 連接 MQTT
        mqttBus.connect()

        // 監聽連接狀態
        const unsubscribeStatus = mqttBus.onStatusChange((status) => {
            console.log(`📊 MQTT Bus 狀態: ${status}`)
        })

        return () => {
            unsubscribeStatus()
            // 注意：不要在這裡斷開 MQTT 連接，因為是全局單例
        }
    }, []) // 空依賴數組，只執行一次

    // 從localStorage或後端載入數據 - 支持智能降級
    useEffect(() => {
        const initializeData = async () => {
            // 等待後端檢測完成
            if (isCheckingBackend) {
                return
            }

            console.log('🚀 UWBLocationContext初始化，開始載入數據...')

            let loadedHomes: Home[] = []
            let loadedFloors: Floor[] = []
            let loadedGateways: Gateway[] = []
            let loadedSelectedHome = ''

            if (backendAvailable) {
                // 從後端加載數據
                try {
                    console.log('🔄 從後端加載數據...')

                    // 1. 加載場域
                    loadedHomes = await syncHomes()

                    // 2. 如果有場域，加載樓層
                    if (loadedHomes.length > 0) {
                        try {
                            const homeIdToSync = loadedHomes[0].id
                            loadedFloors = await syncFloors(homeIdToSync)
                            console.log(`✅ 從後端加載 ${loadedFloors.length} 個樓層`)
                        } catch (floorError) {
                            console.warn('後端樓層數據加載失敗，使用本地存儲:', floorError)
                            loadedFloors = loadFromStorage<Floor[]>('uwb_floors', [])
                        }

                        // 3. 如果有樓層，加載網關
                        if (loadedFloors.length > 0) {
                            try {
                                const floorIdToSync = loadedFloors[0].id
                                loadedGateways = await syncGateways(floorIdToSync)
                                console.log(`✅ 從後端加載 ${loadedGateways.length} 個網關`)
                            } catch (gatewayError) {
                                console.warn('後端網關數據加載失敗，使用本地存儲:', gatewayError)
                                loadedGateways = loadFromStorage<Gateway[]>('uwb_gateways', [])
                            }
                        } else {
                            loadedGateways = loadFromStorage<Gateway[]>('uwb_gateways', [])
                        }
                    } else {
                        loadedFloors = loadFromStorage<Floor[]>('uwb_floors', [])
                        loadedGateways = loadFromStorage<Gateway[]>('uwb_gateways', [])
                    }
                } catch (error) {
                    console.warn('後端數據加載失敗，使用本地存儲:', error)
                    // 降級到 localStorage
                    loadedHomes = loadFromStorage<Home[]>('uwb_homes', [])
                    loadedFloors = loadFromStorage<Floor[]>('uwb_floors', [])
                    loadedGateways = loadFromStorage<Gateway[]>('uwb_gateways', [])
                }
            } else {
                // 從 localStorage 加載（降級模式）
                console.log('🔄 從 localStorage 加載數據...')
                loadedHomes = loadFromStorage<Home[]>('uwb_homes', [])
                loadedFloors = loadFromStorage<Floor[]>('uwb_floors', [])
                loadedGateways = loadFromStorage<Gateway[]>('uwb_gateways', [])
            }

            // 設置數據
            setHomes(loadedHomes)
            setFloors(loadedFloors)
            setGateways(loadedGateways)

            // 設置 selectedHome
            loadedSelectedHome = loadFromStorage<string>('uwb_selectedHome', '')
            if (loadedSelectedHome && loadedHomes.find((h: Home) => h.id === loadedSelectedHome)) {
                setSelectedHome(loadedSelectedHome)
            } else if (loadedHomes.length > 0) {
                setSelectedHome(loadedHomes[0].id)
            }

            console.log('✅ UWBLocationContext初始化完成')
            console.log(`- 養老院: ${loadedHomes.length} 個`)
            console.log(`- 樓層: ${loadedFloors.length} 個`)
            console.log(`- 閘道器: ${loadedGateways.length} 個`)
        }

        initializeData()
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [backendAvailable, isCheckingBackend])

    // 當選擇的場域改變時，從後端加載對應的樓層和網關數據
    useEffect(() => {
        if (!selectedHome || !backendAvailable || isCheckingBackend) {
            return
        }

        const loadDataForHome = async () => {
            try {
                console.log(`🔄 場域切換，從後端加載數據 (homeId: ${selectedHome})`)

                // 加載樓層
                const loadedFloors = await syncFloors(selectedHome)
                setFloors(loadedFloors)
                console.log(`✅ 從後端加載 ${loadedFloors.length} 個樓層`)

                // 如果有樓層，加載第一個樓層的網關
                if (loadedFloors.length > 0) {
                    try {
                        const floorIdToSync = loadedFloors[0].id
                        const loadedGateways = await syncGateways(floorIdToSync)
                        setGateways(loadedGateways)
                        console.log(`✅ 從後端加載 ${loadedGateways.length} 個網關`)
                    } catch (gatewayError) {
                        console.warn('後端網關數據加載失敗，使用本地存儲:', gatewayError)
                        const allGateways = loadFromStorage<Gateway[]>('uwb_gateways', [])
                        const homeGateways = allGateways.filter(g =>
                            loadedFloors.some(f => f.id === g.floorId)
                        )
                        setGateways(homeGateways)
                    }
                }
            } catch (error) {
                console.warn('後端數據加載失敗，使用本地存儲:', error)
                // 降級：從 localStorage 讀取
                const allFloors = loadFromStorage<Floor[]>('uwb_floors', [])
                const homeFloors = allFloors.filter(f => f.homeId === selectedHome)
                setFloors(homeFloors)

                const allGateways = loadFromStorage<Gateway[]>('uwb_gateways', [])
                const homeGateways = allGateways.filter(g =>
                    homeFloors.some(f => f.id === g.floorId)
                )
                setGateways(homeGateways)
            }
        }

        loadDataForHome()
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [selectedHome, backendAvailable, isCheckingBackend])

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

    // ✨ 同步 Gateways 到 Gateway Registry
    useEffect(() => {
        if (gateways.length === 0) {
            console.log('⚠️ 沒有 Gateway 需要註冊')
            return
        }

        console.log(`🔄 同步 ${gateways.length} 個 Gateways 到 Registry...`)

        // 註冊所有 Gateways
        gateways.forEach(gateway => {
            gatewayRegistry.registerGateway(gateway)
        })

        console.log(`✅ 已註冊 ${gateways.length} 個 Gateways`)
    }, [gateways])

    // ✨ 監聽 Gateway Registry 事件（用於調試）
    useEffect(() => {
        const unsubscribe = gatewayRegistry.on((event) => {
            switch (event.type) {
                case 'gateway_added':
                    console.log(`✅ Gateway 已註冊: ${event.gateway.name}`, event.topics)
                    break
                case 'gateway_removed':
                    console.log(`❌ Gateway 已移除: ${event.gateway.name}`)
                    break
                case 'gateway_updated':
                    console.log(`🔄 Gateway 已更新: ${event.gateway.name}`)
                    break
            }
        })

        return unsubscribe
    }, [])

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