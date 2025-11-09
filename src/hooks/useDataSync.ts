// 數據同步Hook - 管理前端與後端的數據同步
import { useState, useEffect, useCallback } from 'react'
import { api } from '@/services/api'
import { Home, Floor, Gateway, AnchorDevice, TagDevice } from '@/types/device-types'

interface UseDataSyncOptions {
    enableAutoSync?: boolean
    syncInterval?: number
    onError?: (error: Error) => void
}

export function useDataSync(options: UseDataSyncOptions = {}) {
    const {
        enableAutoSync = true,
        syncInterval = 30000, // 30秒
        onError
    } = options

    const [isLoading, setIsLoading] = useState(false)
    const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null)
    const [error, setError] = useState<string | null>(null)

    // 同步場域數據
    const syncHomes = useCallback(async (): Promise<Home[]> => {
        try {
            setIsLoading(true)
            setError(null)
            const homes = await api.home.getAll()
            setLastSyncTime(new Date())
            return homes
        } catch (err) {
            const error = err as Error
            setError(error.message)
            onError?.(error)
            throw error
        } finally {
            setIsLoading(false)
        }
    }, [onError])

    // 同步樓層數據
    const syncFloors = useCallback(async (homeId: string): Promise<Floor[]> => {
        try {
            setIsLoading(true)
            setError(null)
            const floors = await api.floor.getByHomeId(homeId)
            setLastSyncTime(new Date())
            return floors
        } catch (err) {
            const error = err as Error
            setError(error.message)
            onError?.(error)
            throw error
        } finally {
            setIsLoading(false)
        }
    }, [onError])

    // 同步網關數據（支持按樓層或所有）
    const syncGateways = useCallback(async (floorId?: string): Promise<Gateway[]> => {
        try {
            setIsLoading(true)
            setError(null)
            const gateways = floorId
                ? await api.gateway.getByFloorId(floorId)
                : await api.gateway.getAll()
            setLastSyncTime(new Date())
            return gateways
        } catch (err) {
            const error = err as Error
            setError(error.message)
            onError?.(error)
            throw error
        } finally {
            setIsLoading(false)
        }
    }, [onError])

    // 同步錨點數據
    const syncAnchors = useCallback(async (gatewayId: string): Promise<AnchorDevice[]> => {
        try {
            setIsLoading(true)
            setError(null)
            const anchors = await api.anchor.getByGatewayId(gatewayId)
            setLastSyncTime(new Date())
            return anchors
        } catch (err) {
            const error = err as Error
            setError(error.message)
            onError?.(error)
            throw error
        } finally {
            setIsLoading(false)
        }
    }, [onError])

    // 同步標籤數據
    const syncTags = useCallback(async (gatewayId: string): Promise<TagDevice[]> => {
        try {
            setIsLoading(true)
            setError(null)
            const tags = await api.tag.getByGatewayId(gatewayId)
            setLastSyncTime(new Date())
            return tags
        } catch (err) {
            const error = err as Error
            setError(error.message)
            onError?.(error)
            throw error
        } finally {
            setIsLoading(false)
        }
    }, [onError])

    // 自動同步
    useEffect(() => {
        if (!enableAutoSync) return

        const interval = setInterval(() => {
            // 這裡可以根據需要同步特定數據
            console.log('自動同步觸發')
        }, syncInterval)

        return () => clearInterval(interval)
    }, [enableAutoSync, syncInterval])

    return {
        isLoading,
        lastSyncTime,
        error,
        syncHomes,
        syncFloors,
        syncGateways,
        syncAnchors,
        syncTags,
        clearError: () => setError(null),
    }
}
