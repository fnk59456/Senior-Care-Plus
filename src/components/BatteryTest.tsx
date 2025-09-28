import React from 'react'
import BatteryIcon from './ui/battery-icon'

export default function BatteryTest() {
    return (
        <div className="p-4 space-y-4">
            <h3 className="text-lg font-semibold">電池圖標測試</h3>

            <div className="space-y-2">
                <h4 className="text-sm font-medium">不同電量測試</h4>
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
        </div>
    )
}
