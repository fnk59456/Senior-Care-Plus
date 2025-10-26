/**
 * MQTT 調試工具
 */

export const debugMQTT = () => {
    console.group('🔍 MQTT 調試信息')

    try {
        // 動態導入，避免循環依賴
        const { mqttBus } = require('@/services/mqttBus')
        const { gatewayRegistry } = require('@/services/gatewayRegistry')

        // MQTT Bus 狀態
        console.log('MQTT Bus 狀態:', mqttBus.getStatus())
        console.log('MQTT Bus 統計:', mqttBus.getStats())

        // Gateway Registry 狀態
        console.log('Gateway Registry 統計:', gatewayRegistry.getStats())
        console.log('活躍 Topics:', gatewayRegistry.getAllActiveTopics())

        // 最近消息
        const recentMessages = mqttBus.getRecentMessages()
        console.log('最近消息數量:', recentMessages.length)
        if (recentMessages.length > 0) {
            console.log('最新消息:', recentMessages[0])
        }
    } catch (error) {
        console.error('❌ 調試信息獲取失敗:', error)
    }

    console.groupEnd()
}

// 在瀏覽器控制台可用
if (typeof window !== 'undefined') {
    (window as any).debugMQTT = debugMQTT
}
