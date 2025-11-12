/**
 * WebSocket 測試頁面
 * 用於測試 WebSocket 連接和消息接收
 */

import { useEffect, useState } from 'react'
import { wsService } from '@/services/websocketService'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'

interface Message {
    id: string
    type: string
    topic?: string
    payload?: any
    timestamp: string
}

export default function WebSocketTestPage() {
    const [status, setStatus] = useState<string>('disconnected')
    const [messages, setMessages] = useState<Message[]>([])
    const [stats, setStats] = useState({
        totalMessages: 0,
        lastMessageTime: null as string | null
    })

    useEffect(() => {
        // 監聽連接狀態
        const unsubscribeStatus = wsService.onStatusChange((newStatus) => {
            setStatus(newStatus)
            console.log('WebSocket 狀態變更:', newStatus)
        })

        // 訂閱所有消息
        const unsubscribeAll = wsService.subscribe('*', (message) => {
            console.log('收到 WebSocket 消息:', message)

            const newMessage: Message = {
                id: `${Date.now()}-${Math.random()}`,
                type: message.type,
                topic: message.topic,
                payload: message.payload,
                timestamp: message.timestamp || new Date().toISOString()
            }

            setMessages(prev => [newMessage, ...prev].slice(0, 50)) // 只保留最近50條
            setStats(prev => ({
                totalMessages: prev.totalMessages + 1,
                lastMessageTime: newMessage.timestamp
            }))
        })

        return () => {
            unsubscribeStatus()
            unsubscribeAll()
        }
    }, [])

    const handleConnect = () => {
        wsService.connect()
    }

    const handleDisconnect = () => {
        wsService.disconnect()
    }

    const handleClearMessages = () => {
        setMessages([])
        setStats({
            totalMessages: 0,
            lastMessageTime: null
        })
    }

    const handleDebug = () => {
        wsService.debug()
    }

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'connected':
                return 'bg-green-500'
            case 'connecting':
            case 'reconnecting':
                return 'bg-yellow-500'
            case 'error':
                return 'bg-red-500'
            default:
                return 'bg-gray-500'
        }
    }

    const getStatusText = (status: string) => {
        switch (status) {
            case 'connected':
                return '已連接'
            case 'connecting':
                return '連接中'
            case 'reconnecting':
                return '重連中'
            case 'disconnected':
                return '已斷開'
            case 'error':
                return '錯誤'
            default:
                return status
        }
    }

    return (
        <div className="container mx-auto p-6 space-y-6">
            {/* 標題 */}
            <div>
                <h1 className="text-3xl font-bold">WebSocket 測試</h1>
                <p className="text-muted-foreground mt-2">
                    測試 WebSocket 連接和消息接收
                </p>
            </div>

            {/* 連接狀態卡片 */}
            <Card>
                <CardHeader>
                    <CardTitle>連接狀態</CardTitle>
                    <CardDescription>WebSocket 服務器連接狀態</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="flex items-center gap-4">
                        <Badge className={getStatusColor(status)}>
                            {getStatusText(status)}
                        </Badge>
                        <span className="text-sm text-muted-foreground">
                            {import.meta.env.VITE_WS_URL || 'ws://localhost:3002'}
                        </span>
                    </div>

                    <div className="flex gap-2">
                        <Button onClick={handleConnect} disabled={status === 'connected'}>
                            連接
                        </Button>
                        <Button onClick={handleDisconnect} variant="destructive" disabled={status === 'disconnected'}>
                            斷開
                        </Button>
                        <Button onClick={handleDebug} variant="outline">
                            調試信息
                        </Button>
                    </div>
                </CardContent>
            </Card>

            {/* 統計信息卡片 */}
            <Card>
                <CardHeader>
                    <CardTitle>統計信息</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <div className="text-sm text-muted-foreground">總消息數</div>
                            <div className="text-2xl font-bold">{stats.totalMessages}</div>
                        </div>
                        <div>
                            <div className="text-sm text-muted-foreground">最後消息時間</div>
                            <div className="text-sm">
                                {stats.lastMessageTime
                                    ? new Date(stats.lastMessageTime).toLocaleString()
                                    : '-'}
                            </div>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* 消息列表卡片 */}
            <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                    <div>
                        <CardTitle>消息列表</CardTitle>
                        <CardDescription>最近收到的 50 條消息</CardDescription>
                    </div>
                    <Button onClick={handleClearMessages} variant="outline" size="sm">
                        清空
                    </Button>
                </CardHeader>
                <CardContent>
                    <ScrollArea className="h-[600px]">
                        {messages.length === 0 ? (
                            <div className="text-center text-muted-foreground py-8">
                                暫無消息
                            </div>
                        ) : (
                            <div className="space-y-2">
                                {messages.map((message) => (
                                    <div
                                        key={message.id}
                                        className="border rounded-lg p-4 space-y-2"
                                    >
                                        <div className="flex items-center justify-between">
                                            <Badge variant="outline">{message.type}</Badge>
                                            <span className="text-xs text-muted-foreground">
                                                {new Date(message.timestamp).toLocaleTimeString()}
                                            </span>
                                        </div>

                                        {message.topic && (
                                            <div className="text-sm">
                                                <span className="font-semibold">Topic: </span>
                                                <span className="font-mono text-xs">
                                                    {message.topic}
                                                </span>
                                            </div>
                                        )}

                                        {message.payload && (
                                            <div className="text-sm">
                                                <span className="font-semibold">Payload: </span>
                                                <pre className="mt-1 p-2 bg-muted rounded text-xs overflow-x-auto">
                                                    {JSON.stringify(message.payload, null, 2)}
                                                </pre>
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}
                    </ScrollArea>
                </CardContent>
            </Card>

            {/* 測試說明 */}
            <Card>
                <CardHeader>
                    <CardTitle>測試說明</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                    <p>1. 點擊「連接」按鈕連接到 WebSocket 服務器</p>
                    <p>2. 確保後端服務器已啟動（node test-backend-with-db.js）</p>
                    <p>3. 確保 MQTT Broker 已啟動</p>
                    <p>4. 使用 mosquitto_pub 發布測試消息：</p>
                    <pre className="bg-muted p-2 rounded overflow-x-auto">
                        {`mosquitto_pub -h localhost -p 1883 -t "UWB/location/test_tag_001" -m '{"tagId":"test_tag_001","x":12.34,"y":56.78,"z":1.5,"timestamp":1699876543210}'`}
                    </pre>
                    <p>5. 觀察消息列表，應該會收到推送的消息</p>
                </CardContent>
            </Card>
        </div>
    )
}

