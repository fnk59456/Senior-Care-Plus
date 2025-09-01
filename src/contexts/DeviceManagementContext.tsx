import React, { createContext, useContext, useState, useEffect } from 'react'
import {
    Device,
    Resident,
    DeviceBinding,
    DeviceData,
    DeviceType,
    DeviceStatus,
    DeviceUID,
    DeviceUIDGenerator,
    DEVICE_TYPE_CONFIG
} from '@/types/device-types'

interface DeviceManagementContextType {
    // 數據狀態
    devices: Device[]
    residents: Resident[]
    bindings: DeviceBinding[]
    deviceData: DeviceData[]

    // 設備管理
    addDevice: (device: Omit<Device, 'id' | 'createdAt' | 'updatedAt'>) => void
    updateDevice: (id: string, updates: Partial<Device>) => void
    removeDevice: (id: string) => void
    getDevice: (id: string) => Device | undefined
    getDeviceByUID: (deviceUid: DeviceUID) => Device | undefined

    // 院友管理
    addResident: (resident: Omit<Resident, 'id'>) => void
    updateResident: (id: string, updates: Partial<Resident>) => void
    removeResident: (id: string) => void
    getResident: (id: string) => Resident | undefined

    // 設備綁定管理
    bindDevice: (deviceId: string, residentId: string, type?: 'primary' | 'secondary') => void
    unbindDevice: (deviceId: string, residentId: string) => void
    getDevicesForResident: (residentId: string) => Device[]
    getResidentForDevice: (deviceId: string) => Resident | undefined

    // 數據管理
    addDeviceData: (data: Omit<DeviceData, 'id'>) => void
    getLatestDataForDevice: (deviceId: string) => DeviceData[]

    // 統計信息
    getDeviceStatusSummary: () => Record<DeviceStatus, number>
    getDeviceTypeSummary: () => Record<DeviceType, number>
}

const DeviceManagementContext = createContext<DeviceManagementContextType | undefined>(undefined)

// 模擬數據
const MOCK_RESIDENTS: Resident[] = [
    {
        id: 'R001',
        name: '張三',
        age: 80,
        gender: '男',
        room: '201',
        status: 'good',
        emergencyContact: {
            name: '張小明',
            relationship: '兒子',
            phone: '0912-345-678'
        },
        careNotes: '有輕微高血壓，每日需測量血壓兩次。',
        avatar: '👴'
    },
    {
        id: 'R002',
        name: '李四',
        age: 70,
        gender: '女',
        room: '202',
        status: 'attention',
        emergencyContact: {
            name: '李美麗',
            relationship: '女兒',
            phone: '0923-456-789'
        },
        careNotes: '糖尿病患者，需要定時服藥和監測血糖。',
        avatar: '👵'
    },
    {
        id: 'R003',
        name: '王五',
        age: 75,
        gender: '男',
        room: '203',
        status: 'critical',
        emergencyContact: {
            name: '王小華',
            relationship: '兒子',
            phone: '0934-567-890'
        },
        careNotes: '心臟疾病，需密切監控生命體徵。',
        avatar: '👴'
    }
]

const MOCK_DEVICES: Device[] = [
    {
        id: 'D001',
        deviceUid: DeviceUIDGenerator.generate300B('E0:0E:08:36:93:F8'),
        deviceType: DeviceType.SMARTWATCH_300B,
        name: '健康監測手錶 #1',
        hardwareId: 'HWID-W23445',
        status: DeviceStatus.ACTIVE,
        residentId: 'R001',
        gatewayId: '137205',
        batteryLevel: 86,
        lastData: {
            hr: 75,
            spO2: 98,
            'bp syst': 125,
            'bp diast': 80,
            'skin temp': 36.5,
            steps: 2150
        },
        lastSeen: new Date().toISOString(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
    },
    {
        id: 'D002',
        deviceUid: DeviceUIDGenerator.generateDiaper('E0:0E:08:36:94:A2'),
        deviceType: DeviceType.DIAPER_SENSOR,
        name: '智能尿布傳感器 #1',
        hardwareId: 'HWID-D23001',
        status: DeviceStatus.ACTIVE,
        residentId: 'R001',
        gatewayId: '137205',
        batteryLevel: 92,
        lastData: {
            temp: 34.2,
            humi: 45.8,
            button: 0
        },
        lastSeen: new Date().toISOString(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
    },
    {
        id: 'D003',
        deviceUid: DeviceUIDGenerator.generateTag('23349'),
        deviceType: DeviceType.UWB_TAG,
        name: 'UWB定位標籤 #1',
        hardwareId: 'DW5B35',
        status: DeviceStatus.ACTIVE,
        residentId: 'R002',
        gatewayId: '137205',
        batteryLevel: 78,
        lastData: {
            position: { x: 1.5, y: -2.3, z: 0.8, quality: 89 },
            time: '2024-01-15 14:15:11'
        },
        lastSeen: new Date().toISOString(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
    },
    {
        id: 'D004',
        deviceUid: DeviceUIDGenerator.generatePedo('5345'),
        deviceType: DeviceType.PEDOMETER,
        name: '運動傳感器 #1',
        hardwareId: 'PEDO-5345',
        status: DeviceStatus.ACTIVE,
        residentId: 'R003',
        gatewayId: '1612681207',
        batteryLevel: 65,
        lastData: {
            step: 1250,
            'distance(m)': 890,
            'calorie(Kcal)': 95
        },
        lastSeen: new Date().toISOString(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
    }
]

const MOCK_BINDINGS: DeviceBinding[] = [
    {
        id: 'B001',
        residentId: 'R001',
        deviceId: 'D001',
        bindingType: 'primary',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
    },
    {
        id: 'B002',
        residentId: 'R001',
        deviceId: 'D002',
        bindingType: 'secondary',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
    },
    {
        id: 'B003',
        residentId: 'R002',
        deviceId: 'D003',
        bindingType: 'primary',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
    },
    {
        id: 'B004',
        residentId: 'R003',
        deviceId: 'D004',
        bindingType: 'primary',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
    }
]

export function DeviceManagementProvider({ children }: { children: React.ReactNode }) {
    // 📦 從 localStorage 加載設備數據的輔助函數
    const loadDevicesFromStorage = (): Device[] => {
        try {
            const stored = localStorage.getItem('device_mgmt_context_devices')
            if (!stored) {
                console.log('📭 無存儲的設備數據，使用默認數據')
                return MOCK_DEVICES
            }

            console.log('📦 開始解析存儲的設備數據')
            const data = JSON.parse(stored)
            console.log('✅ 設備數據加載完成')
            return data
        } catch (error) {
            console.warn('❌ 無法從 localStorage 加載設備數據:', error)
            return MOCK_DEVICES
        }
    }

    // 📦 從 localStorage 加載院友數據的輔助函數
    const loadResidentsFromStorage = (): Resident[] => {
        try {
            const stored = localStorage.getItem('device_mgmt_context_residents')
            if (!stored) {
                console.log('📭 無存儲的院友數據，使用默認數據')
                return MOCK_RESIDENTS
            }

            console.log('📦 開始解析存儲的院友數據')
            const data = JSON.parse(stored)
            console.log('✅ 院友數據加載完成')
            return data
        } catch (error) {
            console.warn('❌ 無法從 localStorage 加載院友數據:', error)
            return MOCK_RESIDENTS
        }
    }

    // 數據狀態 - 從 localStorage 加載數據
    const [devices, setDevices] = useState<Device[]>(() => loadDevicesFromStorage())
    const [residents, setResidents] = useState<Resident[]>(() => loadResidentsFromStorage())
    const [bindings, setBindings] = useState<DeviceBinding[]>(MOCK_BINDINGS)
    const [deviceData, setDeviceData] = useState<DeviceData[]>([])

    // 設備管理
    const addDevice = (deviceData: Omit<Device, 'id' | 'createdAt' | 'updatedAt'>) => {
        const newDevice: Device = {
            ...deviceData,
            id: `D${Date.now()}`,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        }
        setDevices(prev => [...prev, newDevice])
    }

    const updateDevice = (id: string, updates: Partial<Device>) => {
        setDevices(prev => prev.map(device =>
            device.id === id
                ? { ...device, ...updates, updatedAt: new Date().toISOString() }
                : device
        ))
    }

    const removeDevice = (id: string) => {
        setDevices(prev => prev.filter(device => device.id !== id))
        setBindings(prev => prev.filter(binding => binding.deviceId !== id))
    }

    const getDevice = (id: string) => {
        return devices.find(device => device.id === id)
    }

    const getDeviceByUID = (deviceUid: DeviceUID) => {
        return devices.find(device => device.deviceUid === deviceUid)
    }

    // 院友管理
    const addResident = (residentData: Omit<Resident, 'id'>) => {
        const newResident: Resident = {
            ...residentData,
            id: `R${Date.now()}`
        }
        setResidents(prev => [...prev, newResident])
    }

    const updateResident = (id: string, updates: Partial<Resident>) => {
        setResidents(prev => prev.map(resident =>
            resident.id === id ? { ...resident, ...updates } : resident
        ))
    }

    const removeResident = (id: string) => {
        setResidents(prev => prev.filter(resident => resident.id !== id))
        setBindings(prev => prev.filter(binding => binding.residentId !== id))
    }

    const getResident = (id: string) => {
        return residents.find(resident => resident.id === id)
    }

    // 設備綁定管理
    const bindDevice = (deviceId: string, residentId: string, type: 'primary' | 'secondary' = 'primary') => {
        const existingBinding = bindings.find(b => b.deviceId === deviceId && b.residentId === residentId)
        if (existingBinding) return

        const newBinding: DeviceBinding = {
            id: `B${Date.now()}`,
            deviceId,
            residentId,
            bindingType: type,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        }

        setBindings(prev => [...prev, newBinding])
        updateDevice(deviceId, { residentId })
    }

    const unbindDevice = (deviceId: string, residentId: string) => {
        setBindings(prev => prev.filter(binding =>
            !(binding.deviceId === deviceId && binding.residentId === residentId)
        ))
        updateDevice(deviceId, { residentId: undefined })
    }

    const getDevicesForResident = (residentId: string) => {
        const residentBindings = bindings.filter(binding => binding.residentId === residentId)
        return residentBindings
            .map(binding => devices.find(device => device.id === binding.deviceId))
            .filter((device): device is Device => device !== undefined)
    }

    const getResidentForDevice = (deviceId: string) => {
        const binding = bindings.find(binding => binding.deviceId === deviceId)
        if (!binding) return undefined
        return residents.find(resident => resident.id === binding.residentId)
    }

    // 數據管理
    const addDeviceData = (data: Omit<DeviceData, 'id'>) => {
        const newData: DeviceData = {
            ...data,
            id: `DATA${Date.now()}`
        }
        setDeviceData(prev => [...prev, newData])

        // 更新設備最新數據
        const device = getDevice(data.deviceId)
        if (device) {
            updateDevice(device.id, {
                lastData: data.payload,
                lastSeen: data.timestamp
            })
        }
    }

    const getLatestDataForDevice = (deviceId: string) => {
        return deviceData
            .filter(data => data.deviceId === deviceId)
            .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
            .slice(0, 10)
    }

    // 統計信息
    const getDeviceStatusSummary = () => {
        const summary = {
            [DeviceStatus.ACTIVE]: 0,
            [DeviceStatus.INACTIVE]: 0,
            [DeviceStatus.OFFLINE]: 0,
            [DeviceStatus.ERROR]: 0
        }

        devices.forEach(device => {
            summary[device.status]++
        })

        return summary
    }

    const getDeviceTypeSummary = () => {
        const summary = {
            [DeviceType.SMARTWATCH_300B]: 0,
            [DeviceType.DIAPER_SENSOR]: 0,
            [DeviceType.PEDOMETER]: 0,
            [DeviceType.UWB_TAG]: 0
        }

        devices.forEach(device => {
            summary[device.deviceType]++
        })

        return summary
    }

    const value: DeviceManagementContextType = {
        devices,
        residents,
        bindings,
        deviceData,
        addDevice,
        updateDevice,
        removeDevice,
        getDevice,
        getDeviceByUID,
        addResident,
        updateResident,
        removeResident,
        getResident,
        bindDevice,
        unbindDevice,
        getDevicesForResident,
        getResidentForDevice,
        addDeviceData,
        getLatestDataForDevice,
        getDeviceStatusSummary,
        getDeviceTypeSummary
    }

    return (
        <DeviceManagementContext.Provider value={value}>
            {children}
        </DeviceManagementContext.Provider>
    )
}

export function useDeviceManagement() {
    const context = useContext(DeviceManagementContext)
    if (context === undefined) {
        throw new Error('useDeviceManagement must be used within a DeviceManagementProvider')
    }
    return context
}
