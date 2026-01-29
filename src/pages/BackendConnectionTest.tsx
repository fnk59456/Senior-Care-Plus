// 前端連接測試頁面
import React, { useState, useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { useToast } from "@/hooks/use-toast"
import {
    CheckCircle2,
    XCircle,
    Loader2,
    Wifi,
    WifiOff,
    Server,
    Database,
    Clock,
    AlertCircle
} from 'lucide-react'

interface TestResult {
    name: string
    status: 'pending' | 'success' | 'error'
    message: string
    duration?: number
}

export default function BackendConnectionTest() {
    const { t } = useTranslation()
    const { toast } = useToast()
    const [isRunning, setIsRunning] = useState(false)
    const [results, setResults] = useState<TestResult[]>([])
    const [overallStatus, setOverallStatus] = useState<'pending' | 'success' | 'error'>('pending')
    const [connectionStatus, setConnectionStatus] = useState<'disconnected' | 'connecting' | 'connected'>('disconnected')
    const [lastTestTime, setLastTestTime] = useState<Date | null>(null)
    const intervalRef = useRef<NodeJS.Timeout | null>(null)

    // 測試項目配置
    const testItems = [
        {
            name: 'API 健康檢查',
            test: async () => {
                const response = await fetch(`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001/api'}/health`)
                if (!response.ok) throw new Error(`HTTP ${response.status}`)
                const data = await response.json()
                return `服務器正常運行 - ${data.message || 'OK'}`
            }
        },
        {
            name: '場域數據獲取',
            test: async () => {
                const response = await fetch(`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001/api'}/homes`)
                if (!response.ok) throw new Error(`HTTP ${response.status}`)
                const data = await response.json()
                return `成功獲取 ${data.length} 個場域`
            }
        },
        {
            name: '樓層數據獲取',
            test: async () => {
                const response = await fetch(`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001/api'}/floors`)
                if (!response.ok) throw new Error(`HTTP ${response.status}`)
                const data = await response.json()
                return `成功獲取 ${data.length} 個樓層`
            }
        },
        {
            name: '場域創建測試',
            test: async () => {
                const testData = {
                    name: `測試場域_${Date.now()}`,
                    description: '自動測試創建的場域',
                    address: '測試地址'
                }
                const response = await fetch(`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001/api'}/homes`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(testData)
                })
                if (!response.ok) throw new Error(`HTTP ${response.status}`)
                const data = await response.json()
                return `成功創建場域: ${data.name}`
            }
        },
        {
            name: '樓層創建測試',
            test: async () => {
                // 先獲取一個場域ID
                const homesResponse = await fetch(`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001/api'}/homes`)
                const homes = await homesResponse.json()
                if (homes.length === 0) throw new Error('沒有可用的場域')

                const testData = {
                    homeId: homes[0].id,
                    name: `測試樓層_${Date.now()}`,
                    level: 1,
                    realWidth: 20,
                    realHeight: 15
                }
                const response = await fetch(`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001/api'}/floors`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(testData)
                })
                if (!response.ok) throw new Error(`HTTP ${response.status}`)
                const data = await response.json()
                return `成功創建樓層: ${data.name}`
            }
        }
    ]

    // 執行單個測試
    const runSingleTest = async (item: typeof testItems[0]): Promise<TestResult> => {
        const startTime = Date.now()
        try {
            const message = await item.test()
            const duration = Date.now() - startTime
            return {
                name: item.name,
                status: 'success',
                message,
                duration
            }
        } catch (error) {
            const duration = Date.now() - startTime
            return {
                name: item.name,
                status: 'error',
                message: error instanceof Error ? error.message : '未知錯誤',
                duration
            }
        }
    }

    // 執行所有測試
    const runAllTests = async () => {
        setIsRunning(true)
        setResults([])
        setOverallStatus('pending')
        setConnectionStatus('connecting')
        setLastTestTime(new Date())

        const testResults: TestResult[] = []

        for (const item of testItems) {
            const result = await runSingleTest(item)
            testResults.push(result)
            setResults([...testResults])

            // 添加小延遲以便觀察進度
            await new Promise(resolve => setTimeout(resolve, 500))
        }

        // 檢查整體狀態
        const hasError = testResults.some(r => r.status === 'error')
        setOverallStatus(hasError ? 'error' : 'success')
        setConnectionStatus(hasError ? 'disconnected' : 'connected')
        setIsRunning(false)

        // 顯示結果通知
        if (hasError) {
            toast({
                title: "測試完成",
                description: "部分測試失敗，請檢查後端服務器",
                variant: "destructive"
            })
        } else {
            toast({
                title: "測試完成",
                description: "所有測試通過，後端連接正常",
            })
        }
    }

    // 檢查後端連接狀態
    const checkConnection = async () => {
        try {
            setConnectionStatus('connecting')
            const response = await fetch(`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001/api'}/health`)
            if (response.ok) {
                setConnectionStatus('connected')
            } else {
                setConnectionStatus('disconnected')
            }
        } catch (error) {
            setConnectionStatus('disconnected')
        }
    }

    // 組件掛載時檢查連接
    useEffect(() => {
        checkConnection()
    }, [])

    // 定期檢查連接狀態
    useEffect(() => {
        intervalRef.current = setInterval(checkConnection, 10000) // 每10秒檢查一次
        return () => {
            if (intervalRef.current) {
                clearInterval(intervalRef.current)
            }
        }
    }, [])

    const getStatusIcon = (status: string) => {
        switch (status) {
            case 'success':
                return <CheckCircle2 className="h-5 w-5 text-green-500" />
            case 'error':
                return <XCircle className="h-5 w-5 text-red-500" />
            case 'pending':
                return <Loader2 className="h-5 w-5 text-blue-500 animate-spin" />
            default:
                return <AlertCircle className="h-5 w-5 text-gray-500" />
        }
    }

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'success':
                return <Badge variant="default" className="bg-green-100 text-green-800">成功</Badge>
            case 'error':
                return <Badge variant="destructive">失敗</Badge>
            case 'pending':
                return <Badge variant="secondary">進行中</Badge>
            default:
                return <Badge variant="outline">未知</Badge>
        }
    }

    const getConnectionIcon = () => {
        switch (connectionStatus) {
            case 'connected':
                return <Wifi className="h-5 w-5 text-green-500" />
            case 'connecting':
                return <Loader2 className="h-5 w-5 text-blue-500 animate-spin" />
            case 'disconnected':
                return <WifiOff className="h-5 w-5 text-red-500" />
        }
    }

    return (
        <div className="container mx-auto p-6 space-y-6">
            {/* 頁面標題 */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold">後端連接測試</h1>
                    <p className="text-muted-foreground mt-2">
                        測試前端與後端 API 的連接狀態和功能
                    </p>
                </div>
                <div className="flex items-center space-x-4">
                    <div className="flex items-center space-x-2">
                        {getConnectionIcon()}
                        <span className="text-sm font-medium">
                            {connectionStatus === 'connected' ? t('common:connection.connected') :
                                connectionStatus === 'connecting' ? t('common:connection.connecting') : t('common:connection.notConnected')}
                        </span>
                    </div>
                    <Button
                        onClick={runAllTests}
                        disabled={isRunning}
                        className="flex items-center space-x-2"
                    >
                        {isRunning ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                            <Server className="h-4 w-4" />
                        )}
                        <span>{isRunning ? t('common:testing.testing') : t('common:testing.startTest')}</span>
                    </Button>
                </div>
            </div>

            {/* 連接狀態卡片 */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center space-x-2">
                        <Database className="h-5 w-5" />
                        <span>{t('common:testing.connectionStatus')}</span>
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="flex items-center space-x-2">
                            <Server className="h-4 w-4 text-muted-foreground" />
                            <span className="text-sm">API 端點:</span>
                            <code className="text-xs bg-muted px-2 py-1 rounded">
                                {import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001/api'}
                            </code>
                        </div>
                        <div className="flex items-center space-x-2">
                            {getConnectionIcon()}
                            <span className="text-sm">狀態:</span>
                            <span className={`text-sm font-medium ${connectionStatus === 'connected' ? 'text-green-600' :
                                connectionStatus === 'connecting' ? 'text-blue-600' : 'text-red-600'
                                }`}>
                                {connectionStatus === 'connected' ? t('common:connection.connected') :
                                    connectionStatus === 'connecting' ? t('common:connection.connecting') : t('common:connection.notConnected')}
                            </span>
                        </div>
                        {lastTestTime && (
                            <div className="flex items-center space-x-2">
                                <Clock className="h-4 w-4 text-muted-foreground" />
                                <span className="text-sm">最後測試:</span>
                                <span className="text-sm text-muted-foreground">
                                    {lastTestTime.toLocaleTimeString()}
                                </span>
                            </div>
                        )}
                    </div>
                </CardContent>
            </Card>

            {/* 測試結果 */}
            {results.length > 0 && (
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center space-x-2">
                            {getStatusIcon(overallStatus)}
                            <span>測試結果</span>
                            {getStatusBadge(overallStatus)}
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-4">
                            {results.map((result, index) => (
                                <div key={index} className="flex items-center justify-between p-4 border rounded-lg">
                                    <div className="flex items-center space-x-3">
                                        {getStatusIcon(result.status)}
                                        <div>
                                            <div className="font-medium">{result.name}</div>
                                            <div className="text-sm text-muted-foreground">{result.message}</div>
                                        </div>
                                    </div>
                                    <div className="flex items-center space-x-2">
                                        {result.duration && (
                                            <span className="text-xs text-muted-foreground">
                                                {result.duration}ms
                                            </span>
                                        )}
                                        {getStatusBadge(result.status)}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* 使用說明 */}
            <Card>
                <CardHeader>
                    <CardTitle>使用說明</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                    <p className="text-sm text-muted-foreground">
                        1. 確保後端服務器正在運行 (node test-backend-with-db.js)
                    </p>
                    <p className="text-sm text-muted-foreground">
                        2. 點擊「開始測試」按鈕執行所有測試項目
                    </p>
                    <p className="text-sm text-muted-foreground">
                        3. 查看測試結果，綠色表示成功，紅色表示失敗
                    </p>
                    <p className="text-sm text-muted-foreground">
                        4. 連接狀態會每10秒自動檢查一次
                    </p>
                </CardContent>
            </Card>
        </div>
    )
}
