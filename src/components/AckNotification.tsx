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
        switch (command.toLowerCase()) {
            case 'configchange':
                return 'bg-blue-100 text-blue-800 border-blue-200'
            case 'config':
                return 'bg-green-100 text-green-800 border-green-200'
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
