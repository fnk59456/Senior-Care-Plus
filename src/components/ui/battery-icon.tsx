import React from 'react'

interface BatteryIconProps {
    level: number // 0-100
    size?: 'sm' | 'md' | 'lg'
    className?: string
}

export default function BatteryIcon({ level, size = 'md', className = '' }: BatteryIconProps) {
    // 確保電量在有效範圍內
    const normalizedLevel = Math.max(0, Math.min(100, level || 0))

    // 根據電量確定顏色
    const getBatteryColor = (level: number) => {
        if (level <= 25) return 'text-red-500'
        if (level <= 50) return 'text-yellow-500'
        return 'text-green-500'
    }

    // 根據電量確定填充顏色
    const getFillColor = (level: number) => {
        if (level <= 25) return 'fill-red-500'
        if (level <= 50) return 'fill-yellow-500'
        return 'fill-green-500'
    }

    // 尺寸配置
    const sizeConfig = {
        sm: { width: 16, height: 10, strokeWidth: 1.5 },
        md: { width: 20, height: 12, strokeWidth: 2 },
        lg: { width: 24, height: 14, strokeWidth: 2.5 }
    }

    const config = sizeConfig[size]
    const colorClass = getBatteryColor(normalizedLevel)
    const fillClass = getFillColor(normalizedLevel)

    // 計算填充寬度（電池內部填充部分）
    const fillWidth = Math.max(0, (normalizedLevel / 100) * (config.width - 4)) // 留2px邊距

    return (
        <div className={`inline-flex items-center ${className}`}>
            <svg
                width={config.width}
                height={config.height}
                viewBox={`0 0 ${config.width} ${config.height}`}
                className={`${colorClass}`}
                fill="none"
                stroke="currentColor"
                strokeWidth={config.strokeWidth}
                strokeLinecap="round"
                strokeLinejoin="round"
                style={{ display: 'inline-block' }}
            >
                {/* 電池外框 */}
                <rect
                    x="1"
                    y="2"
                    width={config.width - 6}
                    height={config.height - 4}
                    rx="1.5"
                    ry="1.5"
                />

                {/* 電池正極 */}
                <rect
                    x={config.width - 4}
                    y="4"
                    width="2"
                    height={config.height - 8}
                    rx="0.5"
                    ry="0.5"
                />

                {/* 電池填充部分 */}
                {normalizedLevel > 0 && (
                    <rect
                        x="2"
                        y="3"
                        width={fillWidth}
                        height={config.height - 6}
                        rx="0.5"
                        ry="0.5"
                        className={fillClass}
                    />
                )}
            </svg>

            {/* 電量百分比文字 */}
            <span className={`ml-1 text-xs font-medium ${colorClass}`}>
                {Math.round(normalizedLevel)}%
            </span>
        </div>
    )
}


