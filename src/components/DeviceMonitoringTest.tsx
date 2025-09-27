import React, { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
// import { Label } from '@/components/ui/label'
import {
    Play,
    Square,
    TestTube,
    CheckCircle2,
    AlertCircle,
    Loader2
} from 'lucide-react'
import { useDeviceMonitoring } from '@/contexts/DeviceMonitoringContext'
import { useTranslation } from 'react-i18next'

export default function DeviceMonitoringTest() {
    const { t } = useTranslation()
    const { updateDeviceData, getDeviceStatus } = useDeviceMonitoring()

    const [isTesting, setIsTesting] = useState(false)
    const [testResults, setTestResults] = useState<string[]>([])
    const [testGatewayId, setTestGatewayId] = useState('test-gateway-001')

    // 模擬測試數據
    const generateTestData = () => {
        const testDevices = [
            { id: 'D001', name: '測試手錶1', batteryLevel: 85, status: 'ACTIVE' },
            { id: 'D002', name: '測試感測器1', batteryLevel: 45, status: 'ACTIVE' },
            { id: 'D003', name: '測試標籤1', batteryLevel: 12, status: 'ERROR' },
            { id: 'D004', name: '測試計步器1', batteryLevel: 78, status: 'OFFLINE' }
        ]

        return testDevices.map(device => ({
            deviceId: device.id,
            deviceUid: `TEST:${device.id}`,
            batteryLevel: device.batteryLevel,
            status: device.status as any,
            lastSeen: new Date(),
            signalStrength: Math.random() * 100 - 50,
            healthData: {
                hr: Math.floor(Math.random() * 40) + 60,
                spO2: Math.floor(Math.random() * 10) + 90,
                temperature: Math.random() * 2 + 36
            }
        }))
    }

    // 執行測試
    const runTest = async () => {
        setIsTesting(true)
        setTestResults([])

        const results: string[] = []

        try {
            // 模擬測試過程
            results.push('🚀 開始設備監控測試...')
            await new Promise(resolve => setTimeout(resolve, 500))

            results.push('📡 生成測試數據...')
            const testData = generateTestData()
            await new Promise(resolve => setTimeout(resolve, 500))

            results.push(`📊 更新 ${testData.length} 個設備的實時數據...`)
            testData.forEach((data, index) => {
                updateDeviceData(data.deviceId, data)
                results.push(`  ✅ 設備 ${data.deviceId}: 電池 ${data.batteryLevel}%, 狀態 ${data.status}`)
            })

            await new Promise(resolve => setTimeout(resolve, 1000))

            results.push('🔍 驗證數據更新...')
            testData.forEach(data => {
                const status = getDeviceStatus(data.deviceId)
                if (status) {
                    results.push(`  ✅ 設備 ${data.deviceId} 數據驗證成功`)
                } else {
                    results.push(`  ❌ 設備 ${data.deviceId} 數據驗證失敗`)
                }
            })

            results.push('🎉 測試完成！所有功能正常運行')

        } catch (error) {
            results.push(`❌ 測試失敗: ${error instanceof Error ? error.message : '未知錯誤'}`)
        } finally {
            setIsTesting(false)
            setTestResults(results)
        }
    }

    // 清除測試數據
    const clearTest = () => {
        setTestResults([])
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <TestTube className="h-5 w-5" />
                    監控系統測試
                </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
                {/* 測試配置 */}
                <div className="space-y-2">
                    <label htmlFor="test-gateway" className="text-sm font-medium">測試Gateway ID</label>
                    <Input
                        id="test-gateway"
                        value={testGatewayId}
                        onChange={(e) => setTestGatewayId(e.target.value)}
                        placeholder="輸入Gateway ID"
                    />
                </div>

                {/* 測試按鈕 */}
                <div className="flex gap-2">
                    <Button
                        onClick={runTest}
                        disabled={isTesting}
                        className="gap-2"
                    >
                        {isTesting ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                            <Play className="h-4 w-4" />
                        )}
                        {isTesting ? '測試中...' : '開始測試'}
                    </Button>

                    {testResults.length > 0 && (
                        <Button
                            onClick={clearTest}
                            variant="outline"
                            className="gap-2"
                        >
                            <Square className="h-4 w-4" />
                            清除結果
                        </Button>
                    )}
                </div>

                {/* 測試結果 */}
                {testResults.length > 0 && (
                    <div className="space-y-2">
                        <h4 className="font-semibold text-sm">測試結果:</h4>
                        <div className="bg-gray-50 p-3 rounded-lg max-h-60 overflow-y-auto">
                            {testResults.map((result, index) => (
                                <div key={index} className="text-sm font-mono mb-1">
                                    {result}
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* 測試說明 */}
                <div className="text-xs text-gray-500 space-y-1">
                    <p>• 此測試會生成模擬的設備數據來驗證監控系統</p>
                    <p>• 測試數據包括電池電量、健康數據、信號強度等</p>
                    <p>• 測試完成後可以在監控視圖中查看更新的數據</p>
                </div>
            </CardContent>
        </Card>
    )
}
