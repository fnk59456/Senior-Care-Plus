// API服務層 - 處理與後端的通信
import { Home, Floor, Gateway, AnchorDevice, TagDevice } from '@/types/device-types'
import type { FlattenedGatewayData, FlattenedAnchorData } from '@/types/iot-devices'
import { serializeGateway, deserializeGateway, serializeAnchor, deserializeAnchor } from '@/utils/dataflowNormalizer'

// API基礎配置
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001/api'

// 通用API請求函數
async function apiRequest<T>(
    endpoint: string,
    options: RequestInit = {}
): Promise<T> {
    const url = `${API_BASE_URL}${endpoint}`

    const defaultOptions: RequestInit = {
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('auth_token') || ''}`,
        },
        ...options,
    }

    console.log(`📡 API 請求: ${options.method || 'GET'} ${url}`)

    try {
        const response = await fetch(url, defaultOptions)
        console.log(`📡 API 響應: ${response.status} ${response.statusText}`)

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}))
            const errorMessage = errorData.message || `HTTP ${response.status}: ${response.statusText}`
            console.error(`❌ API 錯誤: ${errorMessage}`)
            throw new Error(errorMessage)
        }

        // DELETE 请求可能返回空响应
        if (options.method === 'DELETE' && response.status === 204) {
            console.log('✅ DELETE 請求成功（無內容響應）')
            return undefined as T
        }

        const data = await response.json()
        console.log('✅ API 請求成功，返回數據:', data)
        return data
    } catch (error) {
        console.error(`❌ API請求失敗 ${endpoint}:`, error)
        throw error
    }
}

const shouldSerializeGatewayPayload = (data: any): boolean => {
    return Boolean(data && typeof data === 'object' && 'cloudData' in data)
}

const isFlattenedGatewayPayload = (data: any): data is FlattenedGatewayData => {
    // 新的格式使用顶层 id 和 name，device_type 是可选的
    return Boolean(data && typeof data === 'object' && (data.device_type === 'gateway' || (data.id && data.name)))
}

const parseGatewayResponse = (data: any): any => {
    if (Array.isArray(data)) {
        return data.map(item => parseGatewayResponse(item))
    }
    if (isFlattenedGatewayPayload(data)) {
        return deserializeGateway(data)
    }
    return data
}

const shouldSerializeAnchorPayload = (data: any): boolean => {
    return Boolean(data && typeof data === 'object' && 'cloudData' in data)
}

const isFlattenedAnchorPayload = (data: any): data is FlattenedAnchorData => {
    // 新的格式使用顶层 id 和 name，device_type 是可选的
    return Boolean(data && typeof data === 'object' && (data.device_type === 'anchor' || (data.id && data.name)))
}

const parseAnchorResponse = (data: any): any => {
    if (Array.isArray(data)) {
        return data.map(item => parseAnchorResponse(item))
    }
    if (isFlattenedAnchorPayload(data)) {
        return deserializeAnchor(data)
    }
    return data
}

// 場域管理API
export const homeAPI = {
    // 獲取所有場域
    async getAll(): Promise<Home[]> {
        return apiRequest<Home[]>('/homes')
    },

    // 根據ID獲取場域
    async getById(id: string): Promise<Home> {
        return apiRequest<Home>(`/homes/${id}`)
    },

    // 創建新場域
    async create(homeData: Omit<Home, 'id' | 'createdAt'>): Promise<Home> {
        return apiRequest<Home>('/homes', {
            method: 'POST',
            body: JSON.stringify(homeData),
        })
    },

    // 更新場域
    async update(id: string, homeData: Partial<Home>): Promise<Home> {
        return apiRequest<Home>(`/homes/${id}`, {
            method: 'PUT',
            body: JSON.stringify(homeData),
        })
    },

    // 刪除場域
    async delete(id: string): Promise<void> {
        return apiRequest<void>(`/homes/${id}`, {
            method: 'DELETE',
        })
    },
}

// 樓層管理API
export const floorAPI = {
    // 根據場域ID獲取樓層
    async getByHomeId(homeId: string): Promise<Floor[]> {
        return apiRequest<Floor[]>(`/homes/${homeId}/floors`)
    },

    // 創建新樓層
    async create(floorData: Omit<Floor, 'id' | 'createdAt'>): Promise<Floor> {
        return apiRequest<Floor>('/floors', {
            method: 'POST',
            body: JSON.stringify(floorData),
        })
    },

    // 更新樓層
    async update(id: string, floorData: Partial<Floor>): Promise<Floor> {
        return apiRequest<Floor>(`/floors/${id}`, {
            method: 'PUT',
            body: JSON.stringify(floorData),
        })
    },

    // 刪除樓層
    async delete(id: string): Promise<void> {
        return apiRequest<void>(`/floors/${id}`, {
            method: 'DELETE',
        })
    },
}

// 網關管理API
export const gatewayAPI = {
    // 獲取所有網關
    async getAll(): Promise<Gateway[]> {
        const data = await apiRequest<any[]>('/gateways')
        return parseGatewayResponse(data)
    },

    // 根據樓層ID獲取網關
    async getByFloorId(floorId: string): Promise<Gateway[]> {
        const data = await apiRequest<any[]>(`/floors/${floorId}/gateways`)
        return parseGatewayResponse(data)
    },

    // 創建新網關
    async create(gatewayData: Omit<Gateway, 'id' | 'createdAt'>): Promise<Gateway> {
        const payload = shouldSerializeGatewayPayload(gatewayData)
            ? serializeGateway(gatewayData as any)
            : gatewayData
        const data = await apiRequest<any>('/gateways', {
            method: 'POST',
            body: JSON.stringify(payload),
        })
        return parseGatewayResponse(data)
    },

    // 更新網關
    async update(id: string, gatewayData: Partial<Gateway>): Promise<Gateway> {
        const payload = shouldSerializeGatewayPayload(gatewayData)
            ? serializeGateway({ ...(gatewayData as any), id } as any)
            : gatewayData
        const data = await apiRequest<any>(`/gateways/${id}`, {
            method: 'PUT',
            body: JSON.stringify(payload),
        })
        return parseGatewayResponse(data)
    },

    // 刪除網關
    async delete(id: string): Promise<void> {
        return apiRequest<void>(`/gateways/${id}`, {
            method: 'DELETE',
        })
    },
}

// 錨點管理API
export const anchorAPI = {
    // 獲取所有錨點
    async getAll(): Promise<AnchorDevice[]> {
        const data = await apiRequest<any[]>('/anchors')
        return parseAnchorResponse(data)
    },

    // 根據網關ID獲取錨點
    async getByGatewayId(gatewayId: string): Promise<AnchorDevice[]> {
        const data = await apiRequest<any[]>(`/gateways/${gatewayId}/anchors`)
        return parseAnchorResponse(data)
    },

    // 根據ID獲取錨點
    async getById(id: string): Promise<AnchorDevice> {
        const data = await apiRequest<any>(`/anchors/${id}`)
        return parseAnchorResponse(data)
    },

    // 創建新錨點
    async create(anchorData: Omit<AnchorDevice, 'id' | 'createdAt'>): Promise<AnchorDevice> {
        const payload = shouldSerializeAnchorPayload(anchorData)
            ? serializeAnchor(anchorData as any)
            : anchorData
        const data = await apiRequest<any>('/anchors', {
            method: 'POST',
            body: JSON.stringify(payload),
        })
        return parseAnchorResponse(data)
    },

    // 更新錨點
    async update(id: string, anchorData: Partial<AnchorDevice>): Promise<AnchorDevice> {
        const payload = shouldSerializeAnchorPayload(anchorData)
            ? serializeAnchor({ ...(anchorData as any), id } as any)
            : anchorData
        const data = await apiRequest<any>(`/anchors/${id}`, {
            method: 'PUT',
            body: JSON.stringify(payload),
        })
        return parseAnchorResponse(data)
    },

    // 刪除錨點
    async delete(id: string): Promise<void> {
        return apiRequest<void>(`/anchors/${id}`, {
            method: 'DELETE',
        })
    },
}

// 標籤管理API
export const tagAPI = {
    // 根據網關ID獲取標籤
    async getByGatewayId(gatewayId: string): Promise<TagDevice[]> {
        return apiRequest<TagDevice[]>(`/gateways/${gatewayId}/tags`)
    },

    // 創建新標籤
    async create(tagData: Omit<TagDevice, 'id' | 'createdAt'>): Promise<TagDevice> {
        return apiRequest<TagDevice>('/tags', {
            method: 'POST',
            body: JSON.stringify(tagData),
        })
    },

    // 更新標籤
    async update(id: string, tagData: Partial<TagDevice>): Promise<TagDevice> {
        return apiRequest<TagDevice>(`/tags/${id}`, {
            method: 'PUT',
            body: JSON.stringify(tagData),
        })
    },

    // 刪除標籤
    async delete(id: string): Promise<void> {
        return apiRequest<void>(`/tags/${id}`, {
            method: 'DELETE',
        })
    },
}

// 導出所有API
export const api = {
    home: homeAPI,
    floor: floorAPI,
    gateway: gatewayAPI,
    anchor: anchorAPI,
    tag: tagAPI,
}
