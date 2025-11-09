import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback, useRef } from 'react'
import { gatewayRegistry } from '@/services/gatewayRegistry'
import { mqttBus } from '@/services/mqttBus'
import { useDataSync } from '@/hooks/useDataSync'
import { api } from '@/services/api'
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

// 雲端 Gateway 數據類型
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

interface Gateway {
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
    refreshData: () => void
    // CRUD 方法
    createHome: (homeData: Omit<Home, 'id' | 'createdAt'>) => Promise<Home>
    updateHome: (id: string, homeData: Partial<Home>) => Promise<Home>
    deleteHome: (id: string) => Promise<void>
    createFloor: (floorData: Omit<Floor, 'id' | 'createdAt'>) => Promise<Floor>
    updateFloor: (id: string, floorData: Partial<Floor>) => Promise<Floor>
    deleteFloor: (id: string) => Promise<void>
    createGateway: (gatewayData: Omit<Gateway, 'id' | 'createdAt'>) => Promise<Gateway>
    updateGateway: (id: string, gatewayData: Partial<Gateway>) => Promise<Gateway>
    deleteGateway: (id: string) => Promise<void>
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

    // 保存到 localStorage 的輔助函數（帶錯誤處理和大小檢查）
    const saveToStorage = useCallback(<T,>(key: string, value: T): void => {
        try {
            const dataString = JSON.stringify(value)
            const dataSize = new Blob([dataString]).size

            // 檢查數據大小（localStorage 通常限制為 5-10MB）
            if (dataSize > 4 * 1024 * 1024) { // 4MB 警告
                console.warn(`⚠️ ${key} 數據過大 (${(dataSize / 1024 / 1024).toFixed(2)}MB)，可能導致保存失敗`)
            }

            localStorage.setItem(key, dataString)
        } catch (error: any) {
            if (error.name === 'QuotaExceededError') {
                console.warn(`⚠️ localStorage 配額已滿，無法保存 ${key}。建議清理舊數據或使用後端存儲。`)
            } else {
                console.error(`保存${key}失敗:`, error)
            }
        }
    }, [])

    // 數據刷新函數 - 重新載入所有數據（支持後端和localStorage）
    // 使用 useRef 防止重複調用和存儲最新狀態
    const isRefreshingRef = useRef(false)
    const backendAvailableRef = useRef(backendAvailable)
    const isCheckingBackendRef = useRef(isCheckingBackend)
    const selectedHomeRef = useRef(selectedHome)

    // 更新 ref
    useEffect(() => {
        backendAvailableRef.current = backendAvailable
        isCheckingBackendRef.current = isCheckingBackend
        selectedHomeRef.current = selectedHome
    }, [backendAvailable, isCheckingBackend, selectedHome])

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

            if (backendAvailableRef.current && !isCheckingBackendRef.current) {
                // ✅ 後端可用：完全以後端數據為準
                console.log('🔄 從後端刷新數據（後端優先模式）...')

                try {
                    loadedHomes = await syncHomes()

                    if (loadedHomes.length > 0 && selectedHomeRef.current) {
                        try {
                            loadedFloors = await syncFloors(selectedHomeRef.current)
                        } catch (error) {
                            console.error('⚠️ 後端樓層刷新失敗，保持空數組:', error)
                            loadedFloors = [] // 不降級
                        }
                    } else {
                        loadedFloors = [] // 不降級
                    }

                    // 加載所有 Gateway（不按樓層過濾）
                    try {
                        loadedGateways = await syncGateways()
                    } catch (error) {
                        console.error('⚠️ 後端網關刷新失敗，保持空數組:', error)
                        loadedGateways = [] // 不降級
                    }
                } catch (error) {
                    console.error('❌ 後端數據刷新失敗:', error)
                    // 即使失敗，在後端可用時也不降級
                    loadedHomes = []
                    loadedFloors = []
                    loadedGateways = []
                }
            } else {
                // ✅ 後端不可用：智能降級到 localStorage
                console.log('🔄 後端不可用，從 localStorage 刷新數據（智能降級模式）...')
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
    }, [syncHomes, syncFloors, syncGateways, loadFromStorage])

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
                // ✅ 後端可用：完全以後端數據為準，不使用 localStorage
                console.log('🔄 從後端加載數據（後端優先模式）...')

                try {
                    // 1. 加載場域
                    loadedHomes = await syncHomes()
                    console.log(`✅ 從後端加載 ${loadedHomes.length} 個場域`)

                    // 2. 加載樓層（如果有場域）
                    if (loadedHomes.length > 0) {
                        try {
                            const homeIdToSync = loadedHomes[0].id
                            loadedFloors = await syncFloors(homeIdToSync)
                            console.log(`✅ 從後端加載 ${loadedFloors.length} 個樓層`)
                        } catch (floorError) {
                            console.error('⚠️ 後端樓層加載失敗，保持空數組:', floorError)
                            loadedFloors = [] // 後端可用時不降級，保持空數組
                        }

                        // 3. 加載所有網關
                        try {
                            loadedGateways = await syncGateways()
                            console.log(`✅ 從後端加載 ${loadedGateways.length} 個網關`)
                        } catch (gatewayError) {
                            console.error('⚠️ 後端網關加載失敗，保持空數組:', gatewayError)
                            loadedGateways = [] // 後端可用時不降級，保持空數組
                        }
                    } else {
                        // 後端可用但沒有場域，樓層和網關也為空
                        console.log('📭 後端無場域數據，樓層和網關保持為空')
                        loadedFloors = []
                        loadedGateways = []
                    }
                } catch (error) {
                    console.error('❌ 後端場域數據加載失敗:', error)
                    // 即使場域加載失敗，在後端可用時也不降級
                    loadedHomes = []
                    loadedFloors = []
                    loadedGateways = []
                }
            } else {
                // ✅ 後端不可用：智能降級到 localStorage
                console.log('🔄 後端不可用，從 localStorage 加載數據（智能降級模式）...')
                loadedHomes = loadFromStorage<Home[]>('uwb_homes', [])
                loadedFloors = loadFromStorage<Floor[]>('uwb_floors', [])
                loadedGateways = loadFromStorage<Gateway[]>('uwb_gateways', [])
                console.log(`📦 從 localStorage 加載: ${loadedHomes.length} 場域, ${loadedFloors.length} 樓層, ${loadedGateways.length} 網關`)
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
            console.log(`🔄 場域切換，從後端加載數據 (homeId: ${selectedHome}, 後端優先模式)`)

            try {
                // ✅ 後端可用：完全以後端數據為準
                // 加載樓層
                try {
                    const loadedFloors = await syncFloors(selectedHome)
                    setFloors(loadedFloors)
                    console.log(`✅ 從後端加載 ${loadedFloors.length} 個樓層`)
                } catch (floorError) {
                    console.error('⚠️ 後端樓層加載失敗，保持空數組:', floorError)
                    setFloors([]) // 不降級
                }

                // 加載所有網關（不按樓層過濾）
                try {
                    const loadedGateways = await syncGateways()
                    setGateways(loadedGateways)
                    console.log(`✅ 從後端加載所有網關: ${loadedGateways.length} 個`)
                } catch (gatewayError) {
                    console.error('⚠️ 後端網關加載失敗，保持空數組:', gatewayError)
                    setGateways([]) // 不降級
                }
            } catch (error) {
                console.error('❌ 場域數據加載失敗:', error)
                // 即使失敗，在後端可用時也不降級
                setFloors([])
                setGateways([])
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
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])

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

    // ✨ 同步 Gateways 到 Gateway Registry（使用 useRef 避免重複註冊）
    const registeredGatewayIdsRef = useRef<Set<string>>(new Set())
    useEffect(() => {
        if (gateways.length === 0) {
            console.log('⚠️ 沒有 Gateway 需要註冊')
            return
        }

        console.log(`🔄 檢查 ${gateways.length} 個 Gateways 是否需要註冊...`)

        // 只註冊新的 Gateways，避免重複註冊導致無限循環
        let registeredCount = 0
        gateways.forEach(gateway => {
            if (!registeredGatewayIdsRef.current.has(gateway.id)) {
                gatewayRegistry.registerGateway(gateway)
                registeredGatewayIdsRef.current.add(gateway.id)
                registeredCount++
            }
        })

        // 清理不存在的 Gateway
        const currentGatewayIds = new Set(gateways.map(g => g.id))
        registeredGatewayIdsRef.current.forEach(id => {
            if (!currentGatewayIds.has(id)) {
                registeredGatewayIdsRef.current.delete(id)
            }
        })

        if (registeredCount > 0) {
            console.log(`✅ 新註冊了 ${registeredCount} 個 Gateways`)
        }
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

    // ========== CRUD 方法實現 ==========

    // Home CRUD
    const createHome = useCallback(async (homeData: Omit<Home, 'id' | 'createdAt'>): Promise<Home> => {
        if (backendAvailable) {
            const newHome = await api.home.create(homeData)
            setHomes(prev => {
                const updated = [...prev, newHome]
                // 後端可用時，不保存 homes 到 localStorage
                return updated
            })
            return newHome
        } else {
            const newHome: Home = {
                id: `home_${Date.now()}`,
                ...homeData,
                createdAt: new Date()
            }
            setHomes(prev => {
                const updated = [...prev, newHome]
                saveToStorage('uwb_homes', updated)
                return updated
            })
            return newHome
        }
    }, [backendAvailable, saveToStorage])

    const updateHome = useCallback(async (id: string, homeData: Partial<Home>): Promise<Home> => {
        if (backendAvailable) {
            const updatedHome = await api.home.update(id, homeData)
            setHomes(prev => {
                const updated = prev.map(home => home.id === id ? updatedHome : home)
                // 後端可用時，不保存 homes 到 localStorage
                return updated
            })
            return updatedHome
        } else {
            let newHome: Home
            setHomes(prev => {
                const updatedHome = prev.find(h => h.id === id)
                if (!updatedHome) throw new Error('場域不存在')
                newHome = { ...updatedHome, ...homeData }
                const updated = prev.map(home => home.id === id ? newHome : home)
                saveToStorage('uwb_homes', updated)
                return updated
            })
            return newHome!
        }
    }, [backendAvailable, saveToStorage])

    const deleteHome = useCallback(async (id: string): Promise<void> => {
        if (backendAvailable) {
            await api.home.delete(id)
        }
        setHomes(prev => {
            const updated = prev.filter(h => h.id !== id)
            // 後端可用時，不保存 homes 到 localStorage
            // 如果刪除的是當前選中的場域，切換到其他場域
            if (selectedHome === id) {
                setSelectedHome(updated.length > 0 ? updated[0].id : "")
            }
            return updated
        })

        // 級聯刪除相關的樓層和網關
        setFloors(prev => {
            const relatedFloors = prev.filter(f => f.homeId === id)
            const relatedFloorIds = relatedFloors.map(f => f.id)
            const updated = prev.filter(f => f.homeId !== id)
            // 只在後端不可用時保存
            if (!backendAvailable) {
                saveToStorage('uwb_floors', updated)
            }

            setGateways(gatewayPrev => {
                const updatedGateways = gatewayPrev.filter(g => !relatedFloorIds.includes(g.floorId))
                // 只在後端不可用時保存
                if (!backendAvailable) {
                    saveToStorage('uwb_gateways', updatedGateways)
                }
                return updatedGateways
            })

            return updated
        })
    }, [backendAvailable, selectedHome, saveToStorage])

    // Floor CRUD
    const createFloor = useCallback(async (floorData: Omit<Floor, 'id' | 'createdAt'>): Promise<Floor> => {
        if (backendAvailable) {
            const newFloor = await api.floor.create(floorData)
            setFloors(prev => {
                const updated = [...prev, newFloor]
                // 後端可用時，不保存 floors 到 localStorage（避免 mapImage base64 數據過大）
                return updated
            })
            return newFloor
        } else {
            const newFloor: Floor = {
                id: `floor_${Date.now()}`,
                ...floorData,
                createdAt: new Date()
            }
            setFloors(prev => {
                const updated = [...prev, newFloor]
                saveToStorage('uwb_floors', updated)
                return updated
            })
            return newFloor
        }
    }, [backendAvailable, saveToStorage])

    const updateFloor = useCallback(async (id: string, floorData: Partial<Floor>): Promise<Floor> => {
        if (backendAvailable) {
            const updatedFloor = await api.floor.update(id, floorData)
            setFloors(prev => {
                const updated = prev.map(floor => floor.id === id ? updatedFloor : floor)
                // 後端可用時，不保存 floors 到 localStorage（避免 mapImage base64 數據過大）
                // 只在後端不可用時才保存
                return updated
            })
            return updatedFloor
        } else {
            let newFloor: Floor
            setFloors(prev => {
                const updatedFloor = prev.find(f => f.id === id)
                if (!updatedFloor) throw new Error('樓層不存在')
                newFloor = { ...updatedFloor, ...floorData }
                const updated = prev.map(floor => floor.id === id ? newFloor : floor)
                // 後端不可用時才保存到 localStorage
                saveToStorage('uwb_floors', updated)
                return updated
            })
            return newFloor!
        }
    }, [backendAvailable, saveToStorage])

    const deleteFloor = useCallback(async (id: string): Promise<void> => {
        if (backendAvailable) {
            await api.floor.delete(id)
        }
        setFloors(prev => {
            const updated = prev.filter(f => f.id !== id)
            // 只在後端不可用時保存
            if (!backendAvailable) {
                saveToStorage('uwb_floors', updated)
            }

            // 級聯刪除相關的網關
            setGateways(gatewayPrev => {
                const updatedGateways = gatewayPrev.filter(g => g.floorId !== id)
                // 只在後端不可用時保存
                if (!backendAvailable) {
                    saveToStorage('uwb_gateways', updatedGateways)
                }
                return updatedGateways
            })

            return updated
        })
    }, [backendAvailable, saveToStorage])

    // Gateway CRUD
    const createGateway = useCallback(async (gatewayData: Omit<Gateway, 'id' | 'createdAt'>): Promise<Gateway> => {
        console.log('🔄 createGateway 被調用，backendAvailable:', backendAvailable)
        console.log('📦 gatewayData:', gatewayData)

        if (backendAvailable) {
            try {
                console.log('📡 調用後端 API 創建 Gateway...')
                const newGateway = await api.gateway.create(gatewayData)
                console.log('✅ 後端 API 返回:', newGateway)

                setGateways(prev => {
                    const updated = [...prev, newGateway]
                    // 後端可用時，不保存 gateways 到 localStorage
                    return updated
                })
                // 註冊到 GatewayRegistry
                gatewayRegistry.registerGateway(newGateway)
                console.log('✅ Gateway 已創建並註冊到 Registry')
                return newGateway
            } catch (error) {
                console.error('❌ 後端 API 創建 Gateway 失敗:', error)
                throw error
            }
        } else {
            console.log('💾 使用 localStorage 創建 Gateway')
            const newGateway: Gateway = {
                id: `gw_${Date.now()}`,
                ...gatewayData,
                createdAt: new Date()
            }
            setGateways(prev => {
                const updated = [...prev, newGateway]
                saveToStorage('uwb_gateways', updated)
                return updated
            })
            // 註冊到 GatewayRegistry
            gatewayRegistry.registerGateway(newGateway)
            return newGateway
        }
    }, [backendAvailable, saveToStorage])

    const updateGateway = useCallback(async (id: string, gatewayData: Partial<Gateway>): Promise<Gateway> => {
        if (backendAvailable) {
            const updatedGateway = await api.gateway.update(id, gatewayData)
            setGateways(prev => {
                const updated = prev.map(gateway => gateway.id === id ? updatedGateway : gateway)
                // 後端可用時，不保存 gateways 到 localStorage
                return updated
            })
            // 更新 GatewayRegistry
            gatewayRegistry.updateGateway(updatedGateway)
            return updatedGateway
        } else {
            let newGateway: Gateway
            setGateways(prev => {
                const updatedGateway = prev.find(g => g.id === id)
                if (!updatedGateway) throw new Error('網關不存在')
                newGateway = { ...updatedGateway, ...gatewayData }
                const updated = prev.map(gateway => gateway.id === id ? newGateway : gateway)
                saveToStorage('uwb_gateways', updated)
                return updated
            })
            // 更新 GatewayRegistry
            gatewayRegistry.updateGateway(newGateway!)
            return newGateway!
        }
    }, [backendAvailable, saveToStorage])

    const deleteGateway = useCallback(async (id: string): Promise<void> => {
        if (backendAvailable) {
            await api.gateway.delete(id)
        }
        // 從 GatewayRegistry 取消註冊
        gatewayRegistry.unregisterGateway(id)
        setGateways(prev => {
            const updated = prev.filter(g => g.id !== id)
            // 只在後端不可用時保存
            if (!backendAvailable) {
                saveToStorage('uwb_gateways', updated)
            }
            return updated
        })
    }, [backendAvailable, saveToStorage])

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
        refreshData,
        // CRUD 方法
        createHome,
        updateHome,
        deleteHome,
        createFloor,
        updateFloor,
        deleteFloor,
        createGateway,
        updateGateway,
        deleteGateway
    }

    return (
        <UWBLocationContext.Provider value={value}>
            {children}
        </UWBLocationContext.Provider>
    )
}

export default UWBLocationContext