import React, { createContext, useContext, useState, useCallback } from 'react'
import { DeviceType, DeviceUID } from '@/types/device-types'
import { useDeviceManagement } from './DeviceManagementContext'
import { mqttBus } from "@/services/mqttBus"

// 發現的設備接口
interface DiscoveredDevice {
    id: string
    deviceUid: DeviceUID
    deviceType: DeviceType
    name: string
    hardwareId: string
    gatewayId: string
    macAddress?: string
    lastSeen: Date
    signalStrength?: number
    batteryLevel?: number
    rawData: any
    // UWB Tag 特有欄位
    firmwareVersion?: string
    ledStatus?: number
    bleStatus?: number
}

// 設備發現上下文類型
interface DeviceDiscoveryContextType {
    // 狀態
    discoveredDevices: DiscoveredDevice[]
    isDiscovering: boolean
    showDiscoveryModal: boolean

    // 方法
    startDiscovery: (gatewayId: string) => void
    stopDiscovery: () => void
    addDiscoveredDevice: (device: DiscoveredDevice) => void
    confirmDevice: (deviceId: string, customName?: string) => void
    rejectDevice: (deviceId: string) => void
    removeDevice: (deviceId: string) => void
    setShowDiscoveryModal: (show: boolean) => void
    clearDiscoveredDevices: () => void
}

const DeviceDiscoveryContext = createContext<DeviceDiscoveryContextType | undefined>(undefined)

export function DeviceDiscoveryProvider({ children }: { children: React.ReactNode }) {
    const [discoveredDevices, setDiscoveredDevices] = useState<DiscoveredDevice[]>([])
    const [isDiscovering, setIsDiscovering] = useState(false)
    const [showDiscoveryModal, setShowDiscoveryModal] = useState(false)

    const { addDevice, devices } = useDeviceManagement()


    // 根據topic和content識別設備類型
    const identifyDeviceType = useCallback((topic: string, content: string): DeviceType | null => {
        const lowerTopic = topic.toLowerCase()

        if (lowerTopic.includes('loca') && content === 'location') {
            return DeviceType.UWB_TAG
        }
        // 新增：支援 TagConf
        if (lowerTopic.includes('tagconf') && content === 'config') {
            return DeviceType.UWB_TAG
        }
        // 新增：支援 Message (電量等資訊)
        if (lowerTopic.includes('message') && content === 'info') {
            return DeviceType.UWB_TAG
        }
        if (lowerTopic.includes('health')) {
            if (content === 'diaper DV1') {
                return DeviceType.DIAPER_SENSOR
            }
            if (content === '300B') {
                return DeviceType.SMARTWATCH_300B
            }
            if (content === 'motion info step') {
                return DeviceType.PEDOMETER
            }
        }
        return null
    }, [])

    // 生成設備UID
    const generateDeviceUID = useCallback((deviceType: DeviceType, macAddress: string, deviceId?: string): DeviceUID => {
        switch (deviceType) {
            case DeviceType.UWB_TAG:
                return `TAG:${deviceId || 'unknown'}`
            case DeviceType.SMARTWATCH_300B:
                return `300B:${macAddress}`
            case DeviceType.DIAPER_SENSOR:
                return `DIAPER:${macAddress}`
            case DeviceType.PEDOMETER:
                return `PEDO:${deviceId || 'unknown'}`
            default:
                return `TAG:${deviceId || 'unknown'}`
        }
    }, [])

    // 從MQTT消息中提取設備信息
    const extractDeviceInfo = useCallback((topic: string, message: any): Partial<DiscoveredDevice> | null => {
        const content = message.content || message['content']
        const deviceType = identifyDeviceType(topic, content)

        if (!deviceType) return null

        // 提取基本信息
        const deviceId = message['device id'] || message.device_id || message.deviceId || message.id
        const macAddress = message['mac address'] || message.mac_address || message.macAddress || message.MAC
        const gatewayId = message['gateway id'] || message.gateway_id || message.gatewayId
        const signalStrength = message['signal strength'] || message.signal_strength || message.signalStrength

        // 提取電量信息
        const rawBatteryLevel = message['battery level'] || message.battery_level || message.battery
        const batteryLevel = rawBatteryLevel !== undefined ? Math.max(0, Math.min(100, Number(rawBatteryLevel) || 0)) : undefined

        // 提取 UWB Tag 特有信息
        const firmwareVersion = message['fw update'] || message.fw_update || message['fw ver'] || message.fw_ver
        const ledStatus = message.led
        const bleStatus = message.ble

        if (!macAddress && !deviceId) return null

        const deviceUid = generateDeviceUID(deviceType, macAddress || 'unknown', deviceId)

        return {
            deviceUid,
            deviceType,
            hardwareId: deviceId || macAddress || 'unknown',
            gatewayId: gatewayId?.toString() || 'unknown',
            macAddress,
            signalStrength,
            batteryLevel,
            firmwareVersion,
            ledStatus,
            bleStatus,
            rawData: message
        }
    }, [identifyDeviceType, generateDeviceUID])

    // 檢查設備是否已存在於設備管理系統中
    const isDeviceAlreadyExists = useCallback((deviceUid: string, macAddress?: string, hardwareId?: string) => {
        return devices.some(device => {
            // 檢查 deviceUid 是否匹配
            if (device.deviceUid === deviceUid) return true

            // 檢查 MAC 地址是否匹配
            if (macAddress && device.hardwareId === macAddress) return true

            // 檢查 hardwareId 是否匹配
            if (hardwareId && device.hardwareId === hardwareId) return true

            // 檢查 deviceUid 是否包含 MAC 地址
            if (macAddress && device.deviceUid && device.deviceUid.includes(macAddress)) return true

            return false
        })
    }, [devices])

    // 添加發現的設備
    const addDiscoveredDevice = useCallback((device: DiscoveredDevice) => {
        // 首先檢查設備是否已存在於系統中
        if (isDeviceAlreadyExists(device.deviceUid, device.macAddress, device.hardwareId)) {
            console.log(`⚠️ 設備已存在，跳過: ${device.deviceUid}`)
            return
        }

        setDiscoveredDevices(prev => {
            // 檢查是否已存在相同deviceUid的設備
            const existingIndex = prev.findIndex(d => d.deviceUid === device.deviceUid)

            if (existingIndex >= 0) {
                // 更新現有設備信息，只更新非 undefined 的欄位
                const existingDevice = prev[existingIndex]
                const updatedDevice = { ...existingDevice, lastSeen: new Date() }

                // 遍歷新設備的屬性，如果有值則更新
                Object.keys(device).forEach(key => {
                    const value = (device as any)[key]
                    if (value !== undefined && value !== null && value !== '' && key !== 'id') {
                        (updatedDevice as any)[key] = value
                    }
                })

                const updated = [...prev]
                updated[existingIndex] = updatedDevice
                return updated
            } else {
                // 添加新設備
                return [...prev, { ...device, lastSeen: new Date() }]
            }
        })
    }, [isDeviceAlreadyExists])

    // 開始發現
    const startDiscovery = useCallback((gatewayId: string) => {
        setIsDiscovering(true)
        setShowDiscoveryModal(true)
        setDiscoveredDevices([])

        // 監聽MQTT消息來發現設備
        // 這裡會與現有的MQTT監聽邏輯整合
        console.log(`🔍 開始設備發現，Gateway: ${gatewayId}`)

        // 同時啟動監控以獲取實時數據
        // 這將通過監控上下文來處理
    }, [])

    // 停止發現
    const stopDiscovery = useCallback(() => {
        setIsDiscovering(false)
        console.log('⏹️ 停止設備發現')
    }, [])

    // 確認添加設備
    const confirmDevice = useCallback((deviceId: string, customName?: string) => {
        const device = discoveredDevices.find(d => d.id === deviceId)
        if (!device) return

        // 添加到設備管理系統
        addDevice({
            deviceUid: device.deviceUid,
            deviceType: device.deviceType,
            name: customName || `${device.deviceType}_${device.hardwareId}`,
            hardwareId: device.hardwareId,
            status: 'active' as any,
            gatewayId: device.gatewayId,
            firmwareVersion: '1.0.0',
            batteryLevel: device.batteryLevel || 0
        })

        // 從發現列表中移除
        setDiscoveredDevices(prev => prev.filter(d => d.id !== deviceId))

        console.log(`✅ 已添加設備: ${device.deviceUid}，電量: ${device.batteryLevel || 0}%`)
    }, [discoveredDevices, addDevice])

    // 拒絕設備
    const rejectDevice = useCallback((deviceId: string) => {
        setDiscoveredDevices(prev => prev.filter(d => d.id !== deviceId))
        console.log(`❌ 已拒絕設備: ${deviceId}`)
    }, [])

    // 清空發現的設備
    const clearDiscoveredDevices = useCallback(() => {
        setDiscoveredDevices([])
    }, [])

    // 移除設備（從設備管理系統中移除）
    const removeDevice = useCallback((deviceId: string) => {
        // 這裡需要調用設備管理系統的移除功能
        // 暫時只是從發現列表中移除
        setDiscoveredDevices(prev => prev.filter(d => d.id !== deviceId))
        console.log(`🗑️ 已移除設備: ${deviceId}`)
    }, [])

    // 監聽MQTT消息來發現設備
    React.useEffect(() => {
        if (!isDiscovering) return

        const checkForNewDevices = () => {
            // 從全域 MQTT Bus 獲取最近的消息
            const recentMessages = mqttBus.getRecentMessages()

            // 只處理最近 10 秒內的消息，避免處理過舊的數據
            const now = Date.now()
            const tenSecondsAgo = now - 10000

            const validMessages = recentMessages.filter(msg =>
                msg.timestamp.getTime() > tenSecondsAgo
            )

            validMessages.forEach(msg => {
                // 嘗試解析消息內容
                // 注意：mqttBus 的消息 payload 已經是解析後的對象
                const payload = msg.payload

                if (payload) {
                    const deviceInfo = extractDeviceInfo(msg.topic, payload)
                    if (deviceInfo) {
                        const discoveredDevice: DiscoveredDevice = {
                            id: `${deviceInfo.deviceUid}_${Date.now()}`,
                            name: `${deviceInfo.deviceType}_${deviceInfo.hardwareId}`,
                            lastSeen: new Date(),
                            ...deviceInfo
                        } as DiscoveredDevice

                        addDiscoveredDevice(discoveredDevice)
                    }
                }
            })
        }

        // 初始檢查
        checkForNewDevices()

        // 定時輪詢 (每 2 秒檢查一次)
        const interval = setInterval(checkForNewDevices, 2000)

        return () => clearInterval(interval)
    }, [isDiscovering, extractDeviceInfo, addDiscoveredDevice])

    const value: DeviceDiscoveryContextType = {
        discoveredDevices,
        isDiscovering,
        showDiscoveryModal,
        startDiscovery,
        stopDiscovery,
        addDiscoveredDevice,
        confirmDevice,
        rejectDevice,
        removeDevice,
        setShowDiscoveryModal,
        clearDiscoveredDevices
    }

    return (
        <DeviceDiscoveryContext.Provider value={value}>
            {children}
        </DeviceDiscoveryContext.Provider>
    )
}

export function useDeviceDiscovery() {
    const context = useContext(DeviceDiscoveryContext)
    if (context === undefined) {
        throw new Error('useDeviceDiscovery must be used within a DeviceDiscoveryProvider')
    }
    return context
}
