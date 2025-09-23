import React from 'react'
import { useToast } from '@/hooks/use-toast'
import AckNotification, { AckNotificationData } from './AckNotification'

export function TestAckNotification() {
    const { toast } = useToast()

    const testAckData: AckNotificationData = {
        gatewayId: '4192540344',
        command: 'configChange',
        node: 'ANCHOR',
        id: '16912',
        idHex: '0x4210',
        receivedAt: new Date().toISOString(),
        topic: 'UWB/GW16B8Ack'
    }

    const showTestNotification = () => {
        toast({
            title: 'Ack 消息接收',
            description: (
                <AckNotification
                    data={testAckData}
                    onClose={() => {
                        console.log('通知已關閉')
                    }}
                />
            ),
            duration: 5000,
        })
    }

    return (
        <div className="p-4">
            <h3 className="text-lg font-semibold mb-4">測試 Ack 通知</h3>
            <button
                onClick={showTestNotification}
                className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
            >
                顯示測試通知
            </button>
        </div>
    )
}

export default TestAckNotification
