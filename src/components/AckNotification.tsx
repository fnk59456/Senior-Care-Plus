import { useTranslation } from 'react-i18next'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
    CheckCircle2,
    Radio,
    Hash,
    Clock,
    MessageSquare,
    Wifi
} from 'lucide-react'

export interface AckNotificationData {
    gatewayId: string
    command: string
    node: string
    id: string
    idHex: string
    receivedAt: string
    topic: string
    response?: string // 可选：NewFirmware Ack 的响应状态 (OK/NACK)
    serialNo?: string // 可选：序列号 (0-65535)
}

interface AckNotificationProps {
    data: AckNotificationData
}

export function AckNotification({ data }: AckNotificationProps) {
    const { t } = useTranslation()

    const formatTime = (timestamp: string) => {
        try {
            const date = new Date(timestamp)
            return date.toLocaleString('zh-TW', {
                year: 'numeric',
                month: '2-digit',
                day: '2-digit',
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit',
                hour12: false
            })
        } catch {
            return timestamp
        }
    }

    const getCommandColor = (command: string) => {
        const cmd = command.toLowerCase()
        switch (cmd) {
            // 配置相关
            case 'configchange':
            case 'tag cfg request':
                return 'bg-blue-100 text-blue-800 border-blue-200'
            case 'config':
                return 'bg-green-100 text-green-800 border-green-200'

            // 消息相关
            case 'message':
                return 'bg-green-100 text-green-800 border-green-200'

            // 警报相关
            case 'downlink alert':
                return 'bg-orange-100 text-orange-800 border-orange-200'

            // QR码和图片相关
            case 'qr code':
                return 'bg-purple-100 text-purple-800 border-purple-200'
            case 'image':
                return 'bg-cyan-100 text-cyan-800 border-cyan-200'

            // 固件相关（重要）
            case 'new fw notify':
                return 'bg-red-100 text-red-800 border-red-200'

            // QoS 相关
            case 'qos request':
                return 'bg-yellow-100 text-yellow-800 border-yellow-200'

            // 网关操作相关（警告）
            case 'gateway reset request':
                return 'bg-red-100 text-red-800 border-red-200'
            case 'discard iot data time(0.1s)':
                return 'bg-gray-100 text-gray-800 border-gray-200'

            // 状态相关
            case 'status':
                return 'bg-yellow-100 text-yellow-800 border-yellow-200'

            default:
                return 'bg-gray-100 text-gray-800 border-gray-200'
        }
    }

    const getNodeColor = (node: string) => {
        switch (node.toLowerCase()) {
            case 'anchor':
                return 'bg-purple-100 text-purple-800 border-purple-200'
            case 'tag':
                return 'bg-orange-100 text-orange-800 border-orange-200'
            case 'gateway':
                return 'bg-indigo-100 text-indigo-800 border-indigo-200'
            default:
                return 'bg-gray-100 text-gray-800 border-gray-200'
        }
    }

    return (
        <Card className="w-full max-w-md border-l-4 border-l-blue-500 shadow-lg">
            <CardContent className="p-4">
                <div className="flex items-start justify-between">
                    <div className="flex items-center space-x-2 mb-3">
                        <CheckCircle2 className="h-5 w-5 text-green-500" />
                        <span className="font-semibold text-sm text-gray-900">
                            {t('pages:uwbLocation.notifications.ackReceived', 'Ack 消息接收')}
                        </span>
                    </div>
                </div>

                <div className="space-y-3">
                    {/* Gateway ID */}
                    <div className="flex items-center space-x-2">
                        <Wifi className="h-4 w-4 text-gray-500" />
                        <span className="text-xs text-gray-600 font-medium">
                            {t('pages:uwbLocation.notifications.gatewayId', 'Gateway ID')}:
                        </span>
                        <Badge variant="outline" className="text-xs">
                            {data.gatewayId}
                        </Badge>
                    </div>

                    {/* Command */}
                    <div className="flex items-center space-x-2">
                        <MessageSquare className="h-4 w-4 text-gray-500" />
                        <span className="text-xs text-gray-600 font-medium">
                            {t('pages:uwbLocation.notifications.command', '命令')}:
                        </span>
                        <Badge
                            variant="outline"
                            className={`text-xs ${getCommandColor(data.command)}`}
                        >
                            {data.command}
                        </Badge>
                    </div>

                    {/* Node Type */}
                    <div className="flex items-center space-x-2">
                        <Radio className="h-4 w-4 text-gray-500" />
                        <span className="text-xs text-gray-600 font-medium">
                            {t('pages:uwbLocation.notifications.nodeType', '節點類型')}:
                        </span>
                        <Badge
                            variant="outline"
                            className={`text-xs ${getNodeColor(data.node)}`}
                        >
                            {data.node}
                        </Badge>
                    </div>

                    {/* Device ID */}
                    <div className="flex items-center space-x-2">
                        <Hash className="h-4 w-4 text-gray-500" />
                        <span className="text-xs text-gray-600 font-medium">
                            {t('pages:uwbLocation.notifications.deviceId', '設備ID')}:
                        </span>
                        <div className="flex space-x-1">
                            <Badge variant="outline" className="text-xs">
                                {data.id}
                            </Badge>
                            <Badge variant="outline" className="text-xs bg-gray-50">
                                {data.idHex}
                            </Badge>
                        </div>
                    </div>

                    {/* Topic */}
                    <div className="flex items-center space-x-2">
                        <MessageSquare className="h-4 w-4 text-gray-500" />
                        <span className="text-xs text-gray-600 font-medium">
                            {t('pages:uwbLocation.notifications.topic', '主題')}:
                        </span>
                        <code className="text-xs bg-gray-100 px-2 py-1 rounded text-gray-700">
                            {data.topic}
                        </code>
                    </div>

                    {/* Response (仅 NewFirmware Ack 有) */}
                    {data.response && (
                        <div className="flex items-center space-x-2">
                            <CheckCircle2 className="h-4 w-4 text-gray-500" />
                            <span className="text-xs text-gray-600 font-medium">
                                {t('pages:uwbLocation.notifications.response', '響應狀態')}:
                            </span>
                            <Badge
                                variant="outline"
                                className={`text-xs ${
                                    data.response.toUpperCase() === 'OK'
                                        ? 'bg-green-100 text-green-800 border-green-200'
                                        : 'bg-red-100 text-red-800 border-red-200'
                                }`}
                            >
                                {data.response}
                            </Badge>
                        </div>
                    )}

                    {/* Serial No */}
                    {data.serialNo && (
                        <div className="flex items-center space-x-2">
                            <Hash className="h-4 w-4 text-gray-500" />
                            <span className="text-xs text-gray-600 font-medium">
                                {t('pages:uwbLocation.notifications.serialNo', '序列號')}:
                            </span>
                            <Badge variant="outline" className="text-xs">
                                {data.serialNo}
                            </Badge>
                        </div>
                    )}

                    {/* Received Time */}
                    <div className="flex items-center space-x-2">
                        <Clock className="h-4 w-4 text-gray-500" />
                        <span className="text-xs text-gray-600 font-medium">
                            {t('pages:uwbLocation.notifications.receivedAt', '接收時間')}:
                        </span>
                        <span className="text-xs text-gray-700">
                            {formatTime(data.receivedAt)}
                        </span>
                    </div>
                </div>
            </CardContent>
        </Card>
    )
}

export default AckNotification
