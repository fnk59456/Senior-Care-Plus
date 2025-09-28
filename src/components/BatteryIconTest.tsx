import React, { useState, useEffect } from 'react'
import BatteryIcon from './ui/battery-icon'

export default function BatteryIconTest() {
    const [testLevel, setTestLevel] = useState(75)

    // 自動循環測試不同電量
    useEffect(() => {
        const interval = setInterval(() => {
            setTestLevel(prev => {
                if (prev <= 0) return 100
                return prev - 5
            })
        }, 1000)

        return () => clearInterval(interval)
    }, [])

    return (
        <div className="p-4 space-y-4">
            <h3 className="text-lg font-semibold">電池圖標測試</h3>

            {/* 手動控制 */}
            <div className="space-y-2">
                <label className="block text-sm font-medium">
                    電量測試: {testLevel}%
                </label>
                <input
                    type="range"
                    min="0"
                    max="100"
                    value={testLevel}
                    onChange={(e) => setTestLevel(Number(e.target.value))}
                    className="w-full"
                />
            </div>

            {/* 不同尺寸的電池圖標 */}
            <div className="space-y-4">
                <div>
                    <h4 className="text-sm font-medium mb-2">小尺寸 (sm)</h4>
                    <BatteryIcon level={testLevel} size="sm" />
                </div>

                <div>
                    <h4 className="text-sm font-medium mb-2">中尺寸 (md)</h4>
                    <BatteryIcon level={testLevel} size="md" />
                </div>

                <div>
                    <h4 className="text-sm font-medium mb-2">大尺寸 (lg)</h4>
                    <BatteryIcon level={testLevel} size="lg" />
                </div>
            </div>

            {/* 固定電量測試 */}
            <div className="space-y-2">
                <h4 className="text-sm font-medium">固定電量測試</h4>
                <div className="flex gap-4 items-center">
                    <BatteryIcon level={0} size="md" />
                    <BatteryIcon level={10} size="md" />
                    <BatteryIcon level={25} size="md" />
                    <BatteryIcon level={30} size="md" />
                    <BatteryIcon level={50} size="md" />
                    <BatteryIcon level={60} size="md" />
                    <BatteryIcon level={75} size="md" />
                    <BatteryIcon level={90} size="md" />
                    <BatteryIcon level={100} size="md" />
                </div>
            </div>

            {/* 邊界情況測試 */}
            <div className="space-y-2">
                <h4 className="text-sm font-medium">邊界情況測試</h4>
                <div className="flex gap-4 items-center">
                    <BatteryIcon level={-10} size="md" />
                    <BatteryIcon level={150} size="md" />
                    <BatteryIcon level={undefined as any} size="md" />
                    <BatteryIcon level={null as any} size="md" />
                </div>
            </div>
        </div>
    )
}
