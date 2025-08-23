import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react'

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

    // 從localStorage載入數據
    useEffect(() => {
        const loadFromStorage = <T,>(key: string, defaultValue: T): T => {
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
        }

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

    const value: UWBLocationState = {
        homes,
        floors,
        gateways,
        selectedHome,
        selectedFloor,
        selectedGateway,
        setSelectedHome,
        setSelectedFloor,
        setSelectedGateway
    }

    return (
        <UWBLocationContext.Provider value={value}>
            {children}
        </UWBLocationContext.Provider>
    )
}

export default UWBLocationContext