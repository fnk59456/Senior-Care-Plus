/**
 * Store 初始化文件
 * 確保所有 Store 被加載並註冊路由規則
 */

// 導入所有 Store 以觸發初始化
import './healthStore'
import './locationStore'
import './deviceStore'
import './ackStore'
import './anchorStore'

// 導入 MQTT Bus 和路由模式
import { mqttBus } from '@/services/mqttBus'
import { RoutePatterns } from '@/services/messageRouter'

// 延遲添加調試路由，確保 MQTT Bus 已初始化
setTimeout(() => {
    try {
        mqttBus.subscribe(RoutePatterns.ALL_TOPICS, (message) => {
            console.log('📨 收到 MQTT 消息:', {
                topic: message.topic,
                gateway: message.gateway?.name,
                timestamp: message.timestamp,
                payload: message.payload
            })
        })
        console.log('✅ 調試路由已註冊')
    } catch (error) {
        console.warn('⚠️ 調試路由註冊失敗:', error)
    }
}, 100)

console.log('✅ 所有 Store 已初始化，路由規則已註冊')
