import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react'
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
import { mqttBus } from '@/services/mqttBus'
import { RoutePatterns } from '@/services/messageRouter'
import { MQTTMessage } from '@/types/mqtt-types'

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

    // 持久化管理
    forceSave: () => void
    clearAllData: () => void
    exportAllData: () => void
    importData: (data: any) => void
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

    // 📦 從 localStorage 加載綁定數據的輔助函數
    const loadBindingsFromStorage = (): DeviceBinding[] => {
        try {
            const stored = localStorage.getItem('device_mgmt_context_bindings')
            if (!stored) {
                console.log('📭 無存儲的綁定數據，使用默認數據')
                return MOCK_BINDINGS
            }

            console.log('📦 開始解析存儲的綁定數據')
            const data = JSON.parse(stored)
            console.log('✅ 綁定數據加載完成')
            return data
        } catch (error) {
            console.warn('❌ 無法從 localStorage 加載綁定數據:', error)
            return MOCK_BINDINGS
        }
    }

    // 💾 保存到 localStorage 的輔助函數
    const saveToStorage = <T,>(key: string, data: T) => {
        try {
            localStorage.setItem(`device_mgmt_context_${key}`, JSON.stringify(data))
            //console.log(`✅ 已保存 ${key} 到 localStorage`)
        } catch (error) {
            console.warn(`無法保存 ${key} 到 localStorage:`, error)
        }
    }

    // 持久化相關狀態
    const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null)

    // 數據狀態 - 從 localStorage 加載數據
    const [devices, setDevices] = useState<Device[]>(() => loadDevicesFromStorage())
    const [residents, setResidents] = useState<Resident[]>(() => loadResidentsFromStorage())
    const [bindings, setBindings] = useState<DeviceBinding[]>(() => loadBindingsFromStorage())
    const [deviceData, setDeviceData] = useState<DeviceData[]>([])

    // Tag 數據臨時狀態（用於組合多個 topic 的數據）
    const tagDataCacheRef = useRef<Map<number, {
        message?: any
        location?: any
        config?: any
        lastUpdate: Date
    }>>(new Map())

    // 🚀 智能批量保存函數 - 避免頻繁寫入
    const batchSave = useCallback(() => {
        if (saveTimeoutRef.current) {
            clearTimeout(saveTimeoutRef.current)
        }

        saveTimeoutRef.current = setTimeout(() => {
            try {
                // 批量保存所有數據
                saveToStorage('devices', devices)
                saveToStorage('residents', residents)
                saveToStorage('bindings', bindings)
                saveToStorage('deviceData', deviceData)

                // 保存完整備份
                const fullBackup = {
                    devices,
                    residents,
                    bindings,
                    deviceData,
                    version: Date.now(),
                    lastSave: new Date().toISOString()
                }
                localStorage.setItem('device_mgmt_context_full_backup', JSON.stringify(fullBackup))

                console.log(`💾 設備管理 Context 自動保存完成 ${new Date().toLocaleTimeString()}`)
            } catch (error) {
                console.error('❌ 設備管理 Context 自動保存失敗:', error)
            }
        }, 500) // 500ms延遲，避免頻繁保存
    }, [devices, residents, bindings, deviceData])

    // 監聽所有數據變化，觸發批量保存
    useEffect(() => {
        batchSave()
    }, [devices, residents, bindings, deviceData, batchSave])

    // 清理定時器
    useEffect(() => {
        return () => {
            if (saveTimeoutRef.current) {
                clearTimeout(saveTimeoutRef.current)
            }
        }
    }, [])

    // ========== 設備管理函數（需要在 MQTT 處理之前定義）==========

    // 設備管理
    const addDevice = useCallback((deviceData: Omit<Device, 'id' | 'createdAt' | 'updatedAt'>) => {
        const newDevice: Device = {
            ...deviceData,
            id: `D${Date.now()}`,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        }
        setDevices(prev => [...prev, newDevice])
    }, [])

    const updateDevice = useCallback((id: string, updates: Partial<Device>) => {
        setDevices(prev => prev.map(device =>
            device.id === id
                ? { ...device, ...updates, updatedAt: new Date().toISOString() }
                : device
        ))
    }, [])

    const removeDevice = useCallback((id: string) => {
        setDevices(prev => prev.filter(device => device.id !== id))
        setBindings(prev => prev.filter(binding => binding.deviceId !== id))
    }, [])

    const getDevice = useCallback((id: string) => {
        return devices.find(device => device.id === id)
    }, [devices])

    const getDeviceByUID = useCallback((deviceUid: DeviceUID) => {
        return devices.find(device => device.deviceUid === deviceUid)
    }, [devices])

    // 數據管理
    const addDeviceData = useCallback((data: Omit<DeviceData, 'id'>) => {
        const newData: DeviceData = {
            ...data,
            id: `DATA${Date.now()}`
        }
        setDeviceData(prev => [...prev, newData])

        // 更新設備最新數據
        const device = devices.find(d => d.id === data.deviceId)
        if (device) {
            updateDevice(device.id, {
                lastData: data.payload,
                lastSeen: data.timestamp
            })
        }
    }, [devices, updateDevice])

    // ========== MQTT 消息處理邏輯 ==========

    // 識別設備類型並獲取設備 UID
    const identifyDevice = useCallback((topic: string, payload: any): { deviceUid: DeviceUID; deviceType: DeviceType; hardwareId: string; gatewayId?: string } | null => {
        const content = payload?.content || ''
        const gatewayId = payload?.['gateway id'] || payload?.gateway_id || payload?.gatewayId

        // 300B 設備識別
        if (content === '300B' && payload?.MAC) {
            const mac = payload.MAC
            return {
                deviceUid: DeviceUIDGenerator.generate300B(mac),
                deviceType: DeviceType.SMARTWATCH_300B,
                hardwareId: mac,
                gatewayId: gatewayId?.toString()
            }
        }

        // DIAPER 設備識別
        if (content === 'diaper DV1' && payload?.MAC) {
            const mac = payload.MAC
            return {
                deviceUid: DeviceUIDGenerator.generateDiaper(mac),
                deviceType: DeviceType.DIAPER_SENSOR,
                hardwareId: mac,
                gatewayId: gatewayId?.toString()
            }
        }

        // PEDO 設備識別
        if (content?.startsWith('motion info') && payload?.id !== undefined) {
            const id = payload.id.toString()
            return {
                deviceUid: DeviceUIDGenerator.generatePedo(id),
                deviceType: DeviceType.PEDOMETER,
                hardwareId: id,
                gatewayId: gatewayId?.toString()
            }
        }

        // TAG 設備識別（從 Message、Loca、TagConf topic）
        if (payload?.node === 'TAG' && payload?.id !== undefined) {
            const id = payload.id.toString()
            return {
                deviceUid: DeviceUIDGenerator.generateTag(id),
                deviceType: DeviceType.UWB_TAG,
                hardwareId: id,
                gatewayId: gatewayId?.toString()
            }
        }

        return null
    }, [])

    // 處理 Health Topic 數據（300B、DIAPER、PEDO）
    const handleHealthData = useCallback((message: MQTTMessage) => {
        const { topic, payload, timestamp } = message
        if (!payload) return

        const deviceInfo = identifyDevice(topic, payload)
        if (!deviceInfo) return

        const { deviceUid, deviceType, hardwareId, gatewayId } = deviceInfo

        // 查找已存在的設備（使用函數式更新避免依賴 devices）
        setDevices(prevDevices => {
            let existingDevice = prevDevices.find(d => d.deviceUid === deviceUid)

            // 準備設備數據
            const lastData: Record<string, any> = {}
            let batteryLevel: number | undefined
            let firmwareVersion: string | undefined

            // 根據設備類型提取數據
            if (deviceType === DeviceType.SMARTWATCH_300B) {
                if (payload.hr !== undefined) lastData.hr = payload.hr
                if (payload.SpO2 !== undefined) lastData.SpO2 = payload.SpO2
                if (payload['bp syst'] !== undefined) lastData['bp syst'] = payload['bp syst']
                if (payload['bp diast'] !== undefined) lastData['bp diast'] = payload['bp diast']
                if (payload['skin temp'] !== undefined) lastData['skin temp'] = payload['skin temp']
                if (payload.steps !== undefined) lastData.steps = payload.steps
                if (payload['battery level'] !== undefined) batteryLevel = parseInt(payload['battery level'])
                if (payload['fw ver'] !== undefined) firmwareVersion = payload['fw ver'].toString()
            } else if (deviceType === DeviceType.DIAPER_SENSOR) {
                if (payload.temp !== undefined) lastData.temp = payload.temp
                if (payload.humi !== undefined) lastData.humi = payload.humi
                if (payload.button !== undefined) lastData.button = payload.button
                if (payload['battery level'] !== undefined) batteryLevel = parseInt(payload['battery level'])
                if (payload['fw ver'] !== undefined) firmwareVersion = payload['fw ver'].toString()
            } else if (deviceType === DeviceType.PEDOMETER) {
                if (payload.step !== undefined) lastData.step = payload.step
                if (payload['distance(m)'] !== undefined) lastData['distance(m)'] = payload['distance(m)']
                if (payload['calorie(Kcal)'] !== undefined) lastData['calorie(Kcal)'] = payload['calorie(Kcal)']
                if (payload['battery level'] !== undefined) batteryLevel = parseInt(payload['battery level'])
            }

            // 如果設備不存在，自動創建
            if (!existingDevice) {
                const newDevice: Device = {
                    id: `D${Date.now()}`,
                    deviceUid,
                    deviceType,
                    name: `${DEVICE_TYPE_CONFIG[deviceType].label} ${hardwareId.slice(-6)}`,
                    hardwareId,
                    status: DeviceStatus.ACTIVE,
                    gatewayId,
                    batteryLevel,
                    firmwareVersion,
                    lastData: Object.keys(lastData).length > 0 ? lastData : undefined,
                    lastSeen: timestamp.toISOString(),
                    createdAt: timestamp.toISOString(),
                    updatedAt: timestamp.toISOString()
                }
                console.log(`✅ 自動發現新設備: ${deviceType} - ${hardwareId}`)

                // 保存設備數據記錄
                setDeviceData(prevData => {
                    const newData: DeviceData = {
                        id: `DATA${Date.now()}`,
                        deviceId: newDevice.id,
                        deviceUid,
                        dataType: 'health',
                        content: payload.content || '',
                        payload: lastData,
                        timestamp: timestamp.toISOString(),
                        topic,
                        gatewayId,
                        serialNo: payload['serial no'] || payload.serial_no
                    }
                    return [...prevData, newData]
                })

                return [...prevDevices, newDevice]
            } else {
                // 更新已存在的設備
                const updates: Partial<Device> = {
                    lastSeen: timestamp.toISOString(),
                    status: DeviceStatus.ACTIVE,
                    updatedAt: timestamp.toISOString()
                }

                if (Object.keys(lastData).length > 0) {
                    updates.lastData = { ...existingDevice.lastData, ...lastData }
                }
                if (batteryLevel !== undefined) {
                    updates.batteryLevel = batteryLevel
                }
                if (firmwareVersion !== undefined) {
                    updates.firmwareVersion = firmwareVersion
                }
                if (gatewayId && existingDevice.gatewayId !== gatewayId) {
                    updates.gatewayId = gatewayId
                }

                // 保存設備數據記錄
                setDeviceData(prevData => {
                    const newData: DeviceData = {
                        id: `DATA${Date.now()}`,
                        deviceId: existingDevice.id,
                        deviceUid,
                        dataType: 'health',
                        content: payload.content || '',
                        payload: lastData,
                        timestamp: timestamp.toISOString(),
                        topic,
                        gatewayId,
                        serialNo: payload['serial no'] || payload.serial_no
                    }
                    return [...prevData, newData]
                })

                return prevDevices.map(device =>
                    device.id === existingDevice.id
                        ? { ...device, ...updates }
                        : device
                )
            }
        })
    }, [identifyDevice])

    // 合併 Tag 數據並更新設備（需要在 handleTagMessage/Location/Config 之前定義）
    const mergeAndUpdateTagDevice = useCallback((tagId: number, tagData: any, timestamp: Date) => {
        const deviceUid = DeviceUIDGenerator.generateTag(tagId.toString())
        const gatewayId = tagData.message?.['gateway id'] || tagData.location?.['gateway id'] || tagData.config?.['gateway id']

        // 使用函數式更新避免依賴 devices
        setDevices(prevDevices => {
            // 查找已存在的設備
            let existingDevice = prevDevices.find(d => d.deviceUid === deviceUid)

            // 合併數據
            const lastData: Record<string, any> = {}
            let batteryLevel: number | undefined
            let firmwareVersion: string | undefined

            // 從 message 提取數據
            if (tagData.message) {
                const msg = tagData.message
                if (msg['battery level'] !== undefined) batteryLevel = parseInt(msg['battery level'])
                if (msg['battery voltage'] !== undefined) lastData['battery voltage'] = msg['battery voltage']
                if (msg['fw ver'] !== undefined) firmwareVersion = msg['fw ver'].toString()
                if (msg['led on time(1ms)'] !== undefined) lastData['led on time'] = msg['led on time(1ms)']
                if (msg['led off time(1ms)'] !== undefined) lastData['led off time'] = msg['led off time(1ms)']
                if (msg['uwb tx power'] !== undefined) lastData['uwb tx power'] = msg['uwb tx power']
            }

            // 從 location 提取數據
            if (tagData.location) {
                const loc = tagData.location
                if (loc.position) {
                    lastData.position = {
                        x: loc.position.x || 0,
                        y: loc.position.y || 0,
                        z: loc.position.z || 0,
                        quality: loc.position.quality || 0
                    }
                }
                if (loc.time) lastData.time = loc.time
            }

            // 從 config 提取數據
            if (tagData.config) {
                const cfg = tagData.config
                if (cfg.name) lastData.name = cfg.name
                if (cfg.led !== undefined) lastData.led = cfg.led
                if (cfg.ble !== undefined) lastData.ble = cfg.ble
                if (cfg['location engine'] !== undefined) lastData['location engine'] = cfg['location engine']
            }

            // 如果設備不存在，自動創建
            if (!existingDevice) {
                const newDevice: Device = {
                    id: `D${Date.now()}`,
                    deviceUid,
                    deviceType: DeviceType.UWB_TAG,
                    name: tagData.config?.name || `${DEVICE_TYPE_CONFIG[DeviceType.UWB_TAG].label} ${tagId}`,
                    hardwareId: tagId.toString(),
                    status: DeviceStatus.ACTIVE,
                    gatewayId: gatewayId?.toString(),
                    batteryLevel,
                    firmwareVersion,
                    lastData: Object.keys(lastData).length > 0 ? lastData : undefined,
                    lastSeen: timestamp.toISOString(),
                    createdAt: timestamp.toISOString(),
                    updatedAt: timestamp.toISOString()
                }
                console.log(`✅ 自動發現新 Tag 設備: ${tagId}`)

                // 保存設備數據記錄
                setDeviceData(prevData => {
                    const newData: DeviceData = {
                        id: `DATA${Date.now()}`,
                        deviceId: newDevice.id,
                        deviceUid,
                        dataType: 'tag',
                        content: 'tag_combined',
                        payload: lastData,
                        timestamp: timestamp.toISOString(),
                        topic: 'combined',
                        gatewayId: gatewayId?.toString(),
                        serialNo: tagData.message?.['serial no'] || tagData.location?.['serial no'] || tagData.config?.['serial no']
                    }
                    return [...prevData, newData]
                })

                return [...prevDevices, newDevice]
            } else {
                // 更新已存在的設備
                const updates: Partial<Device> = {
                    lastSeen: timestamp.toISOString(),
                    status: DeviceStatus.ACTIVE,
                    updatedAt: timestamp.toISOString()
                }

                if (Object.keys(lastData).length > 0) {
                    updates.lastData = { ...existingDevice.lastData, ...lastData }
                }
                if (batteryLevel !== undefined) {
                    updates.batteryLevel = batteryLevel
                }
                if (firmwareVersion !== undefined) {
                    updates.firmwareVersion = firmwareVersion
                }
                if (tagData.config?.name && existingDevice.name !== tagData.config.name) {
                    updates.name = tagData.config.name
                }
                if (gatewayId && existingDevice.gatewayId !== gatewayId.toString()) {
                    updates.gatewayId = gatewayId.toString()
                }

                // 保存設備數據記錄
                setDeviceData(prevData => {
                    const newData: DeviceData = {
                        id: `DATA${Date.now()}`,
                        deviceId: existingDevice.id,
                        deviceUid,
                        dataType: 'tag',
                        content: 'tag_combined',
                        payload: lastData,
                        timestamp: timestamp.toISOString(),
                        topic: 'combined',
                        gatewayId: gatewayId?.toString(),
                        serialNo: tagData.message?.['serial no'] || tagData.location?.['serial no'] || tagData.config?.['serial no']
                    }
                    return [...prevData, newData]
                })

                return prevDevices.map(device =>
                    device.id === existingDevice.id
                        ? { ...device, ...updates }
                        : device
                )
            }
        })
    }, [])

    // 處理 Tag Message Topic 數據（info 類型）
    const handleTagMessage = useCallback((message: MQTTMessage) => {
        const { topic, payload, timestamp } = message
        if (!payload || payload.node !== 'TAG' || payload.content !== 'info') return

        const tagId = payload.id
        if (tagId === undefined) return

        // 更新 Tag 數據緩存
        const cache = tagDataCacheRef.current
        if (!cache.has(tagId)) {
            cache.set(tagId, { lastUpdate: timestamp })
        }
        const tagData = cache.get(tagId)!
        tagData.message = payload
        tagData.lastUpdate = timestamp

        // 實時合併並更新設備
        mergeAndUpdateTagDevice(tagId, tagData, timestamp)
    }, [mergeAndUpdateTagDevice])

    // 處理 Tag Location Topic 數據（location 類型）
    const handleTagLocation = useCallback((message: MQTTMessage) => {
        const { topic, payload, timestamp } = message
        if (!payload || payload.node !== 'TAG' || payload.content !== 'location') return

        const tagId = payload.id
        if (tagId === undefined) return

        // 更新 Tag 數據緩存
        const cache = tagDataCacheRef.current
        if (!cache.has(tagId)) {
            cache.set(tagId, { lastUpdate: timestamp })
        }
        const tagData = cache.get(tagId)!
        tagData.location = payload
        tagData.lastUpdate = timestamp

        // 實時合併並更新設備
        mergeAndUpdateTagDevice(tagId, tagData, timestamp)
    }, [mergeAndUpdateTagDevice])

    // 處理 Tag Config Topic 數據（config 類型）
    const handleTagConfig = useCallback((message: MQTTMessage) => {
        const { topic, payload, timestamp } = message
        if (!payload || payload.node !== 'TAG' || payload.content !== 'config') return

        const tagId = payload.id
        if (tagId === undefined) return

        // 更新 Tag 數據緩存
        const cache = tagDataCacheRef.current
        if (!cache.has(tagId)) {
            cache.set(tagId, { lastUpdate: timestamp })
        }
        const tagData = cache.get(tagId)!
        tagData.config = payload
        tagData.lastUpdate = timestamp

        // 實時合併並更新設備
        mergeAndUpdateTagDevice(tagId, tagData, timestamp)
    }, [mergeAndUpdateTagDevice])

    // 訂閱 MQTT 消息
    useEffect(() => {
        // 1. 處理歷史消息（從 mqttBus 緩衝區獲取）
        const processRecentMessages = () => {
            const recentMessages = mqttBus.getRecentMessages()
            console.log(`🔄 [DeviceManagementContext] 處理 ${recentMessages.length} 條歷史消息`)

            recentMessages.forEach(msg => {
                const { topic, payload } = msg
                if (!payload) return

                try {
                    if (topic.includes('Health')) {
                        handleHealthData(msg)
                    } else if (topic.includes('Message') && payload.node === 'TAG' && payload.content === 'info') {
                        handleTagMessage(msg)
                    } else if (topic.includes('Loca') && payload.node === 'TAG' && payload.content === 'location') {
                        handleTagLocation(msg)
                    } else if ((topic.includes('TagConf') || topic.includes('tag_config')) && payload.node === 'TAG' && payload.content === 'config') {
                        handleTagConfig(msg)
                    }
                } catch (error) {
                    console.error('❌ 處理歷史消息失敗:', error)
                }
            })
        }

        // 初始加載歷史消息
        processRecentMessages()

        // 2. 訂閱新消息
        const unsubscribeHealth = mqttBus.subscribe(RoutePatterns.HEALTH, (message: MQTTMessage) => {
            handleHealthData(message)
        })

        const unsubscribeMessage = mqttBus.subscribe(RoutePatterns.MESSAGE, (message: MQTTMessage) => {
            const payload = message.payload || {}
            if (payload.node === 'TAG' && payload.content === 'info') {
                handleTagMessage(message)
            }
        })

        const unsubscribeLocation = mqttBus.subscribe(RoutePatterns.LOCATION, (message: MQTTMessage) => {
            const payload = message.payload || {}
            if (payload.node === 'TAG' && payload.content === 'location') {
                handleTagLocation(message)
            }
        })

        const unsubscribeTagConf = mqttBus.subscribe(RoutePatterns.TAG_CONF, (message: MQTTMessage) => {
            const payload = message.payload || {}
            if (payload.node === 'TAG' && payload.content === 'config') {
                handleTagConfig(message)
            }
        })

        const unsubscribeTagConfig = mqttBus.subscribe(RoutePatterns.TAG_CONFIG, (message: MQTTMessage) => {
            const payload = message.payload || {}
            if (payload.node === 'TAG' && payload.content === 'config') {
                handleTagConfig(message)
            }
        })

        console.log('✅ DeviceManagementContext MQTT 訂閱已註冊')

        // 清理函數
        return () => {
            unsubscribeHealth()
            unsubscribeMessage()
            unsubscribeLocation()
            unsubscribeTagConf()
            unsubscribeTagConfig()
            console.log('🔌 DeviceManagementContext MQTT 訂閱已取消')
        }
        // 只在組件掛載時訂閱一次，避免重複訂閱
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])

    // 清理過期的 Tag 數據緩存（保留最近 1 小時）
    useEffect(() => {
        const interval = setInterval(() => {
            const oneHourAgo = Date.now() - 60 * 60 * 1000
            const cache = tagDataCacheRef.current
            const keysToDelete: number[] = []

            cache.forEach((data, tagId) => {
                if (data.lastUpdate.getTime() < oneHourAgo) {
                    keysToDelete.push(tagId)
                }
            })

            keysToDelete.forEach(tagId => cache.delete(tagId))

            if (keysToDelete.length > 0) {
                console.log(`🧹 清理了 ${keysToDelete.length} 個過期的 Tag 數據緩存`)
            }
        }, 5 * 60 * 1000) // 每 5 分鐘清理一次

        return () => clearInterval(interval)
    }, [])


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

    // 持久化管理
    const forceSave = () => {
        if (saveTimeoutRef.current) {
            clearTimeout(saveTimeoutRef.current)
        }
        batchSave()
        console.log('🔄 手動觸發強制保存')
    }

    const clearAllData = () => {
        const keys = ['devices', 'residents', 'bindings', 'deviceData', 'full_backup']
        keys.forEach(key => {
            localStorage.removeItem(`device_mgmt_context_${key}`)
        })
        console.log('🗑️ 已清除所有設備管理 Context localStorage 數據')

        // 重置為默認數據
        setDevices(MOCK_DEVICES)
        setResidents(MOCK_RESIDENTS)
        setBindings(MOCK_BINDINGS)
        setDeviceData([])
    }

    const exportAllData = () => {
        const data = {
            devices,
            residents,
            bindings,
            deviceData,
            exportDate: new Date().toISOString()
        }

        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `device-management-context-data-${new Date().toISOString().split('T')[0]}.json`
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        URL.revokeObjectURL(url)

        console.log('📤 設備管理 Context 數據已導出')
    }

    const importData = (data: any) => {
        try {
            if (data.devices && Array.isArray(data.devices)) {
                setDevices(data.devices)
            }
            if (data.residents && Array.isArray(data.residents)) {
                setResidents(data.residents)
            }
            if (data.bindings && Array.isArray(data.bindings)) {
                setBindings(data.bindings)
            }
            if (data.deviceData && Array.isArray(data.deviceData)) {
                setDeviceData(data.deviceData)
            }
            console.log('📥 設備管理 Context 數據已導入')
        } catch (error) {
            console.error('❌ 導入數據失敗:', error)
        }
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
        getDeviceTypeSummary,
        forceSave,
        clearAllData,
        exportAllData,
        importData
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
