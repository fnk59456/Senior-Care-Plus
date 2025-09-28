import React, { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
    Info,
    Link,
    Trash2,
    Unlink,
    CheckCircle2,
    AlertCircle,
    Loader2
} from 'lucide-react'
import { useTranslation } from 'react-i18next'

interface DeviceActionHandlerProps {
    deviceId: string
    deviceName: string
    onAction: (action: string, deviceId: string) => void
}

export default function DeviceActionHandler({ deviceId, deviceName, onAction }: DeviceActionHandlerProps) {
    const { t } = useTranslation()
    const [isProcessing, setIsProcessing] = useState<string | null>(null)
    const [showSuccess, setShowSuccess] = useState<string | null>(null)

    // 處理操作執行
    const handleAction = async (action: string) => {
        setIsProcessing(action)

        try {
            // 模擬操作延遲
            await new Promise(resolve => setTimeout(resolve, 1000))

            // 執行實際操作
            onAction(action, deviceId)

            // 顯示成功提示
            setShowSuccess(action)
            setTimeout(() => setShowSuccess(null), 2000)
        } catch (error) {
            console.error(`操作失敗: ${action}`, error)
        } finally {
            setIsProcessing(null)
        }
    }

    // 操作按鈕配置
    const actionButtons = [
        {
            key: 'deviceInfo',
            label: t('pages:deviceManagement.deviceCard.deviceInfo'),
            icon: Info,
            color: 'text-blue-600 hover:text-blue-700',
            description: t('pages:deviceManagement.deviceCard.deviceInfo')
        },
        {
            key: 'bindDevice',
            label: t('pages:deviceManagement.deviceCard.bindDevice'),
            icon: Link,
            color: 'text-green-600 hover:text-green-700',
            description: t('pages:deviceManagement.deviceCard.bindDevice')
        },
        {
            key: 'remove',
            label: t('pages:deviceManagement.deviceCard.removeDevice'),
            icon: Trash2,
            color: 'text-red-600 hover:text-red-700',
            description: t('pages:deviceManagement.deviceCard.removeDevice')
        },
        {
            key: 'unbind',
            label: t('pages:deviceManagement.deviceCard.unbind'),
            icon: Unlink,
            color: 'text-red-600 hover:text-red-700',
            description: t('pages:deviceManagement.deviceCard.unbind')
        }
    ]

    return (
        <div className="space-y-2">
            {/* 操作按鈕網格 */}
            <div className="grid grid-cols-2 gap-2">
                {actionButtons.map(({ key, label, icon: Icon, color, description }) => (
                    <Button
                        key={key}
                        size="sm"
                        variant="outline"
                        onClick={() => handleAction(key)}
                        disabled={isProcessing !== null}
                        className={`text-xs h-8 ${color} ${isProcessing === key ? 'opacity-50' : ''
                            }`}
                        title={description}
                    >
                        {isProcessing === key ? (
                            <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                        ) : (
                            <Icon className="h-3 w-3 mr-1" />
                        )}
                        {label}
                    </Button>
                ))}
            </div>

            {/* 成功提示 */}
            {showSuccess && (
                <div className="flex items-center gap-2 text-xs text-green-600 bg-green-50 p-2 rounded">
                    <CheckCircle2 className="h-3 w-3" />
                    <span>操作完成: {actionButtons.find(btn => btn.key === showSuccess)?.label}</span>
                </div>
            )}

            {/* 處理中提示 */}
            {isProcessing && (
                <div className="flex items-center gap-2 text-xs text-blue-600 bg-blue-50 p-2 rounded">
                    <Loader2 className="h-3 w-3 animate-spin" />
                    <span>處理中: {actionButtons.find(btn => btn.key === isProcessing)?.label}...</span>
                </div>
            )}
        </div>
    )
}
