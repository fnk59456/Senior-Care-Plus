import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
// import { ScrollArea } from '@/components/ui/scroll-area'
import {
    Bug,
    Eye,
    EyeOff,
    Trash2,
    Download,
    Copy,
    CheckCircle2,
    AlertCircle,
    Clock,
    Wifi,
    WifiOff
} from 'lucide-react'
import { useDeviceMonitoring } from '@/contexts/DeviceMonitoringContext'
import { useTranslation } from 'react-i18next'

interface MQTTDebugMessage {
    id: string
    timestamp: Date
    topic: string
    gatewayId: string
    rawData: any
    parsedData: any
    deviceId?: string
    deviceName?: string
}

export default function DeviceMonitoringDebug() {
    const { t } = useTranslation()
    const { isMonitoring, connectionStatus, debugMessages } = useDeviceMonitoring()

    const [showDebug, setShowDebug] = useState(false)
    const [maxMessages, setMaxMessages] = useState(50)
    const [filterTopic, setFilterTopic] = useState<string>('')
    const [filterDevice, setFilterDevice] = useState<string>('')
    const [copiedId, setCopiedId] = useState<string | null>(null)

    // 現在使用真實的調試數據，不需要模擬
    // 調試消息會自動從DeviceMonitoringContext獲取

    // 過濾消息
    const filteredMessages = debugMessages.filter(msg => {
        const topicMatch = !filterTopic || msg.topic.toLowerCase().includes(filterTopic.toLowerCase())
        const deviceMatch = !filterDevice ||
            (msg.deviceName && msg.deviceName.toLowerCase().includes(filterDevice.toLowerCase())) ||
            (msg.deviceId && msg.deviceId.toLowerCase().includes(filterDevice.toLowerCase()))
        return topicMatch && deviceMatch
    })

    // 複製到剪貼板
    const copyToClipboard = async (text: string, messageId: string) => {
        try {
            await navigator.clipboard.writeText(text)
            setCopiedId(messageId)
            setTimeout(() => setCopiedId(null), 2000)
        } catch (err) {
            console.error('複製失敗:', err)
        }
    }

    // 導出調試數據
    const exportDebugData = () => {
        const data = {
            exportTime: new Date().toISOString(),
            totalMessages: debugMessages.length,
            filteredMessages: filteredMessages.length,
            messages: filteredMessages.map(msg => ({
                id: msg.id,
                timestamp: msg.timestamp.toISOString(),
                topic: msg.topic,
                gatewayId: msg.gatewayId,
                deviceId: msg.deviceId,
                deviceName: msg.deviceName,
                rawData: msg.rawData,
                parsedData: msg.parsedData
            }))
        }

        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `mqtt-debug-${new Date().toISOString().split('T')[0]}.json`
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        URL.revokeObjectURL(url)
    }

    // 清除所有消息
    const clearMessages = () => {
        setDebugMessages([])
    }

    // 獲取消息類型圖標
    const getMessageTypeIcon = (topic: string) => {
        if (topic.includes('Health')) return '💓'
        if (topic.includes('Loca')) return '📍'
        if (topic.includes('Message')) return '💬'
        if (topic.includes('Ack')) return '✅'
        return '📨'
    }

    // 獲取消息類型顏色
    const getMessageTypeColor = (topic: string) => {
        if (topic.includes('Health')) return 'text-red-600'
        if (topic.includes('Loca')) return 'text-blue-600'
        if (topic.includes('Message')) return 'text-green-600'
        if (topic.includes('Ack')) return 'text-purple-600'
        return 'text-gray-600'
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <Bug className="h-5 w-5" />
                        MQTT調試面板
                    </div>
                    <div className="flex items-center gap-2">
                        <Badge variant={isMonitoring ? "default" : "secondary"}>
                            {isMonitoring ? (
                                <>
                                    <Wifi className="h-3 w-3 mr-1" />
                                    監控中
                                </>
                            ) : (
                                <>
                                    <WifiOff className="h-3 w-3 mr-1" />
                                    未監控
                                </>
                            )}
                        </Badge>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setShowDebug(!showDebug)}
                        >
                            {showDebug ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                            {showDebug ? '隱藏' : '顯示'}
                        </Button>
                    </div>
                </CardTitle>
            </CardHeader>

            {showDebug && (
                <CardContent className="space-y-4">
                    {/* 控制面板 */}
                    <div className="flex flex-wrap gap-2 items-center">
                        <div className="flex items-center gap-2">
                            <label className="text-sm font-medium">最大消息數:</label>
                            <select
                                value={maxMessages}
                                onChange={(e) => setMaxMessages(Number(e.target.value))}
                                className="px-2 py-1 border rounded text-sm"
                            >
                                <option value={20}>20</option>
                                <option value={50}>50</option>
                                <option value={100}>100</option>
                                <option value={200}>200</option>
                            </select>
                        </div>

                        <div className="flex items-center gap-2">
                            <label className="text-sm font-medium">過濾主題:</label>
                            <input
                                type="text"
                                value={filterTopic}
                                onChange={(e) => setFilterTopic(e.target.value)}
                                placeholder="例如: Health, Loca"
                                className="px-2 py-1 border rounded text-sm w-32"
                            />
                        </div>

                        <div className="flex items-center gap-2">
                            <label className="text-sm font-medium">過濾設備:</label>
                            <input
                                type="text"
                                value={filterDevice}
                                onChange={(e) => setFilterDevice(e.target.value)}
                                placeholder="設備名稱或ID"
                                className="px-2 py-1 border rounded text-sm w-32"
                            />
                        </div>

                        <div className="flex gap-1">
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={exportDebugData}
                                disabled={filteredMessages.length === 0}
                            >
                                <Download className="h-4 w-4 mr-1" />
                                導出
                            </Button>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={clearMessages}
                                disabled={debugMessages.length === 0}
                            >
                                <Trash2 className="h-4 w-4 mr-1" />
                                清除
                            </Button>
                        </div>
                    </div>

                    {/* 統計信息 */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                        <div className="bg-blue-50 p-2 rounded">
                            <div className="font-semibold text-blue-600">總消息</div>
                            <div className="text-lg">{debugMessages.length}</div>
                        </div>
                        <div className="bg-green-50 p-2 rounded">
                            <div className="font-semibold text-green-600">顯示中</div>
                            <div className="text-lg">{filteredMessages.length}</div>
                        </div>
                        <div className="bg-orange-50 p-2 rounded">
                            <div className="font-semibold text-orange-600">健康數據</div>
                            <div className="text-lg">{filteredMessages.filter(m => m.topic.includes('Health')).length}</div>
                        </div>
                        <div className="bg-purple-50 p-2 rounded">
                            <div className="font-semibold text-purple-600">位置數據</div>
                            <div className="text-lg">{filteredMessages.filter(m => m.topic.includes('Loca')).length}</div>
                        </div>
                    </div>

                    {/* 消息列表 */}
                    <div className="h-96 w-full border rounded overflow-y-auto">
                        <div className="p-4 space-y-2">
                            {filteredMessages.length === 0 ? (
                                <div className="text-center text-gray-500 py-8">
                                    {debugMessages.length === 0 ? '暫無調試消息' : '沒有符合過濾條件的消息'}
                                </div>
                            ) : (
                                filteredMessages.map((msg, index) => (
                                    <details key={msg.id} className="border rounded p-3 bg-gray-50">
                                        <summary className="cursor-pointer font-mono text-sm hover:bg-gray-100 p-2 rounded flex items-center justify-between">
                                            <div className="flex items-center gap-2">
                                                <span className="text-lg">{getMessageTypeIcon(msg.topic)}</span>
                                                <span className={`font-semibold ${getMessageTypeColor(msg.topic)}`}>
                                                    [{index + 1}] {msg.topic}
                                                </span>
                                                {msg.deviceName && (
                                                    <Badge variant="outline" className="text-xs">
                                                        {msg.deviceName}
                                                    </Badge>
                                                )}
                                            </div>
                                            <div className="flex items-center gap-2 text-xs text-gray-500">
                                                <Clock className="h-3 w-3" />
                                                <span>{msg.timestamp.toLocaleTimeString()}</span>
                                            </div>
                                        </summary>

                                        <div className="mt-3 space-y-3">
                                            {/* 原始數據 */}
                                            <div>
                                                <div className="flex items-center justify-between mb-2">
                                                    <h4 className="font-semibold text-sm">原始MQTT數據</h4>
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        onClick={() => copyToClipboard(JSON.stringify(msg.rawData, null, 2), msg.id)}
                                                    >
                                                        {copiedId === msg.id ? (
                                                            <CheckCircle2 className="h-4 w-4 text-green-600" />
                                                        ) : (
                                                            <Copy className="h-4 w-4" />
                                                        )}
                                                    </Button>
                                                </div>
                                                <pre className="text-xs bg-white p-3 rounded border overflow-x-auto whitespace-pre-wrap">
                                                    {JSON.stringify(msg.rawData, null, 2)}
                                                </pre>
                                            </div>

                                            {/* 解析後數據 */}
                                            <div>
                                                <div className="flex items-center justify-between mb-2">
                                                    <h4 className="font-semibold text-sm">解析後數據</h4>
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        onClick={() => copyToClipboard(JSON.stringify(msg.parsedData, null, 2), `${msg.id}_parsed`)}
                                                    >
                                                        {copiedId === `${msg.id}_parsed` ? (
                                                            <CheckCircle2 className="h-4 w-4 text-green-600" />
                                                        ) : (
                                                            <Copy className="h-4 w-4" />
                                                        )}
                                                    </Button>
                                                </div>
                                                <pre className="text-xs bg-blue-50 p-3 rounded border overflow-x-auto whitespace-pre-wrap">
                                                    {JSON.stringify(msg.parsedData, null, 2)}
                                                </pre>
                                            </div>
                                        </div>
                                    </details>
                                ))
                            )}
                        </div>
                    </div>

                    {/* 使用說明 */}
                    <div className="text-xs text-gray-500 space-y-1 bg-yellow-50 p-3 rounded">
                        <p><strong>使用說明:</strong></p>
                        <p>• 此調試面板顯示實時接收的MQTT消息</p>
                        <p>• 可以按主題或設備名稱過濾消息</p>
                        <p>• 點擊複製按鈕可複製數據到剪貼板</p>
                        <p>• 支持導出調試數據為JSON文件</p>
                        <p>• 消息會自動更新，最多保留指定數量</p>
                    </div>
                </CardContent>
            )}
        </Card>
    )
}
