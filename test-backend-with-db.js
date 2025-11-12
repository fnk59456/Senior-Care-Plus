// 帶數據庫存儲的測試後端服務器
import express from 'express'
import cors from 'cors'
import fs from 'fs'
import path from 'path'
import mqtt from 'mqtt'
import { WebSocketServer } from 'ws'
import http from 'http'

const app = express()
const PORT = 3001
const WS_PORT = 3002

// ==================== 測試消息配置 ====================
// 💡 直接修改下面的值來控制測試消息
// true = 啟用測試消息，false = 禁用測試消息
const ENABLE_TEST_MESSAGES = false  // ← 在這裡修改：true 或 false

// 測試消息發送間隔（毫秒）
// 5000 = 每 5 秒發送一次，10000 = 每 10 秒發送一次
const TEST_MESSAGE_INTERVAL = 5000  // ← 在這裡修改間隔時間（毫秒）

// 注意：也可以通過環境變量控制（環境變量優先級更高）
// Windows: $env:ENABLE_TEST_MESSAGES="false"; node test-backend-with-db.js
// Linux/Mac: ENABLE_TEST_MESSAGES=false node test-backend-with-db.js
const ENABLE_TEST_MESSAGES_FINAL = process.env.ENABLE_TEST_MESSAGES !== undefined
    ? process.env.ENABLE_TEST_MESSAGES !== 'false'
    : ENABLE_TEST_MESSAGES
const TEST_MESSAGE_INTERVAL_FINAL = process.env.TEST_MESSAGE_INTERVAL
    ? parseInt(process.env.TEST_MESSAGE_INTERVAL, 10)
    : TEST_MESSAGE_INTERVAL
// ======================================================

// 中間件
app.use(cors())
app.use(express.json({ limit: '10mb' })) // 增加請求體大小限制到 10MB

// 數據文件路徑
const DATA_DIR = './test-data'
const HOMES_FILE = path.join(DATA_DIR, 'homes.json')
const FLOORS_FILE = path.join(DATA_DIR, 'floors.json')
const GATEWAYS_FILE = path.join(DATA_DIR, 'gateways.json')
const ANCHORS_FILE = path.join(DATA_DIR, 'anchors.json')
const TAGS_FILE = path.join(DATA_DIR, 'tags.json')
const DEVICES_FILE = path.join(DATA_DIR, 'devices.json')
const MQTT_MESSAGES_FILE = path.join(DATA_DIR, 'mqtt_messages.json')

// 確保數據目錄存在
if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true })
}

// 數據加載函數
const loadData = (filePath, defaultValue = []) => {
    try {
        if (fs.existsSync(filePath)) {
            const data = fs.readFileSync(filePath, 'utf8')
            return JSON.parse(data)
        }
    } catch (error) {
        console.error(`加載數據文件失敗 ${filePath}:`, error)
    }
    return defaultValue
}

// 數據保存函數
const saveData = (filePath, data) => {
    try {
        const jsonString = JSON.stringify(data, null, 2)
        console.log(`💾 準備保存數據到 ${filePath}, 大小: ${jsonString.length} bytes`)
        fs.writeFileSync(filePath, jsonString)
        console.log(`✅ 數據已保存到 ${filePath}`)
    } catch (error) {
        console.error(`❌ 保存數據文件失敗 ${filePath}:`, error)
        throw error // 重新拋出錯誤以便上層捕獲
    }
}

// 加載現有數據
let homes = loadData(HOMES_FILE)
let floors = loadData(FLOORS_FILE)
let gateways = loadData(GATEWAYS_FILE)
let anchors = loadData(ANCHORS_FILE)
let tags = loadData(TAGS_FILE)
let devices = loadData(DEVICES_FILE)
let mqttMessages = loadData(MQTT_MESSAGES_FILE, [])

// 保存 MQTT 消息到文件
const saveMqttMessage = (topic, message) => {
    const messageData = {
        topic,
        message: JSON.parse(message.toString()),
        timestamp: new Date().toISOString()
    }
    mqttMessages.push(messageData)
    saveData(MQTT_MESSAGES_FILE, mqttMessages)
    console.log(`📝 MQTT 消息已保存: ${topic}`)
}

// MQTT 連接配置
// 優先使用環境變量，如果沒有則使用默認的云端 MQTT 服務器
// 💡 如果需要使用本地 MQTT，請設置環境變量：MQTT_URL=ws://localhost:8083/mqtt
const MQTT_URL = process.env.MQTT_URL || process.env.VITE_MQTT_URL || 'wss://067ec32ef1344d3bb20c4e53abdde99a.s1.eu.hivemq.cloud:8884/mqtt'
const MQTT_USERNAME = process.env.MQTT_USERNAME || process.env.VITE_MQTT_USERNAME || 'testweb1'
const MQTT_PASSWORD = process.env.MQTT_PASSWORD || process.env.VITE_MQTT_PASSWORD || 'Aa000000'

console.log('🔧 MQTT 配置:')
console.log(`  📡 MQTT URL: ${MQTT_URL}`)
console.log(`  👤 用戶名: ${MQTT_USERNAME}`)
console.log(`  🔐 密碼: ${'*'.repeat(MQTT_PASSWORD.length)}`)

const MQTT_OPTIONS = {
    username: MQTT_USERNAME,
    password: MQTT_PASSWORD,
    clientId: `backend-server-${Math.random().toString(16).slice(2, 8)}`,
    clean: true,
    reconnectPeriod: 5000,
    connectTimeout: 30 * 1000,
}

let mqttClient = null

// ==================== WebSocket 服務器 ====================
const wss = new WebSocketServer({ port: WS_PORT })
const wsClients = new Set()

// 消息去重機制
const messageDeduplication = new Map()

// 清理過期的去重記錄（每5分鐘執行一次）
setInterval(() => {
    const oneHourAgo = Date.now() - 60 * 60 * 1000
    let cleanedCount = 0
    for (const [id, timestamp] of messageDeduplication.entries()) {
        if (timestamp < oneHourAgo) {
            messageDeduplication.delete(id)
            cleanedCount++
        }
    }
    if (cleanedCount > 0) {
        console.log(`🧹 清理了 ${cleanedCount} 條過期的去重記錄`)
    }
}, 5 * 60 * 1000)

wss.on('connection', (ws) => {
    console.log('✅ 前端 WebSocket 連接已建立')
    wsClients.add(ws)

    // 發送歡迎消息
    ws.send(JSON.stringify({
        type: 'connected',
        message: '歡迎連接到後端 WebSocket 服務',
        timestamp: new Date().toISOString(),
        clientCount: wsClients.size
    }))

    ws.on('message', (data) => {
        try {
            const message = JSON.parse(data.toString())
            console.log('📥 收到前端消息:', message)

            // 處理前端訂閱請求等
            if (message.type === 'subscribe') {
                ws.send(JSON.stringify({
                    type: 'subscribed',
                    topics: message.topics,
                    timestamp: new Date().toISOString()
                }))
            }
        } catch (error) {
            console.error('❌ 處理前端消息失敗:', error)
        }
    })

    ws.on('close', () => {
        console.log('🔌 前端 WebSocket 連接已關閉')
        wsClients.delete(ws)
        console.log(`📊 當前連接數: ${wsClients.size}`)
    })

    ws.on('error', (error) => {
        console.error('❌ WebSocket 錯誤:', error)
        wsClients.delete(ws)
    })
})

// 廣播消息到所有連接的前端客戶端
const broadcastToClients = (message) => {
    const messageStr = JSON.stringify(message)
    let successCount = 0
    let failCount = 0

    wsClients.forEach(client => {
        try {
            if (client.readyState === 1) { // OPEN
                client.send(messageStr)
                successCount++
            } else {
                failCount++
            }
        } catch (error) {
            console.error('❌ 發送消息到客戶端失敗:', error)
            failCount++
            wsClients.delete(client)
        }
    })

    if (successCount > 0) {
        console.log(`📤 已推送消息到 ${successCount} 個前端客戶端`)
    }
    if (failCount > 0) {
        console.log(`⚠️ ${failCount} 個客戶端發送失敗`)
    }
}

console.log(`🚀 WebSocket 服務器已啟動，監聽端口: ${WS_PORT}`)

// ==================== MQTT 連接 ====================

// 連接 MQTT
const connectMQTT = () => {
    try {
        mqttClient = mqtt.connect(MQTT_URL, MQTT_OPTIONS)

        mqttClient.on('connect', () => {
            console.log('🔌 MQTT測試服務器已連接')

            // 訂閱位置主題
            mqttClient.subscribe('UWB/location/+', (err) => {
                if (err) {
                    console.error('❌ 訂閱位置主題失敗:', err)
                } else {
                    console.log('✅ 已訂閱位置主題: UWB/location/+')
                }
            })

            // 訂閱設備狀態主題
            mqttClient.subscribe('UWB/device/+/status', (err) => {
                if (err) {
                    console.error('❌ 訂閱設備狀態主題失敗:', err)
                } else {
                    console.log('✅ 已訂閱設備狀態主題: UWB/device/+/status')
                }
            })

            // 訂閱所有 UWB 相關主題（用於室內定位）
            mqttClient.subscribe('UWB/#', (err) => {
                if (err) {
                    console.error('❌ 訂閱 UWB 主題失敗:', err)
                } else {
                    console.log('✅ 已訂閱 UWB 主題: UWB/#')
                }
            })
        })

        mqttClient.on('message', (topic, message) => {
            try {
                const messageStr = message.toString()
                console.log(`📨 收到MQTT消息 [${topic}]:`, messageStr.substring(0, 100))

                // 解析消息（支持容错处理）
                let parsedMessage
                try {
                    parsedMessage = JSON.parse(messageStr)
                    console.log(`✅ JSON 解析成功，内容类型: ${parsedMessage.content || 'unknown'}`)
                } catch (parseError) {
                    // 尝试清理可能的外层引号
                    const cleanedStr = messageStr.trim().replace(/^'|'$/g, '')
                    console.log(`⚠️ JSON 解析失败，尝试清理后重新解析: ${cleanedStr.substring(0, 100)}`)
                    try {
                        parsedMessage = JSON.parse(cleanedStr)
                        console.log(`✅ 清理后解析成功，内容类型: ${parsedMessage.content || 'unknown'}`)
                    } catch (secondError) {
                        console.error(`❌ 清理后仍然解析失败: ${secondError.message}`)
                        console.error(`❌ 原始消息: ${messageStr}`)
                        return // 跳过无法解析的消息
                    }
                }

                // 生成消息 ID（用於去重）
                const messageId = `${topic}-${parsedMessage.timestamp || Date.now()}-${JSON.stringify(parsedMessage).substring(0, 50)}`

                // 檢查是否為重複消息
                if (messageDeduplication.has(messageId)) {
                    console.log(`⏭️ 重複消息已跳過: ${messageId.substring(0, 50)}...`)
                    return
                }

                // 記錄消息（用於去重）
                messageDeduplication.set(messageId, Date.now())

                // 保存到文件
                saveMqttMessage(topic, message)

                // 通過 WebSocket 推送到所有前端客戶端
                console.log(`🔄 準備推送消息到前端，當前連接數: ${wsClients.size}`)
                broadcastToClients({
                    type: 'mqtt_message',
                    topic,
                    payload: parsedMessage,
                    timestamp: new Date().toISOString(),
                    messageId: messageId.substring(0, 50)
                })

            } catch (error) {
                console.error('❌ 處理 MQTT 消息失敗:', error)
                console.error('❌ 錯誤堆棧:', error.stack)
            }
        })

        mqttClient.on('error', (error) => {
            console.error('❌ MQTT連接錯誤:', error)
        })

        mqttClient.on('close', () => {
            console.log('🔌 MQTT連接已關閉')
        })

    } catch (error) {
        console.error('❌ MQTT連接失敗:', error)
    }
}

// 啟動 MQTT 連接
connectMQTT()

// 定期發布測試數據（可通過 ENABLE_TEST_MESSAGES_FINAL 開關控制）
if (ENABLE_TEST_MESSAGES_FINAL) {
    setInterval(() => {
        if (mqttClient && mqttClient.connected) {
            const testData = {
                tagId: `test_tag_${Math.floor(Math.random() * 1000)}`,
                position: {
                    x: Math.random() * 100,
                    y: Math.random() * 100,
                    z: 0
                },
                floorId: 'test_floor_123',
                timestamp: new Date().toISOString(),
                signalStrength: -60 - Math.random() * 20,
                batteryLevel: 80 + Math.random() * 20
            }

            mqttClient.publish('UWB/location/test_tag', JSON.stringify(testData))
            console.log(`📤 發布測試位置數據: ${testData.tagId}`)

            // 發布設備狀態
            const deviceStatus = {
                deviceId: `test_device_${Math.floor(Math.random() * 100)}`,
                deviceType: 'gateway',
                status: 'online',
                lastSeen: new Date().toISOString(),
                batteryLevel: 70 + Math.random() * 30,
                signalStrength: -70 - Math.random() * 10
            }

            mqttClient.publish('UWB/device/test_device/status', JSON.stringify(deviceStatus))
            console.log(`📤 發布設備狀態: ${deviceStatus.deviceId}`)
        }
    }, TEST_MESSAGE_INTERVAL_FINAL)

    console.log(`✅ 測試消息已啟用，發送間隔: ${TEST_MESSAGE_INTERVAL_FINAL}ms (${TEST_MESSAGE_INTERVAL_FINAL / 1000}秒)`)
} else {
    console.log('⚠️  測試消息已禁用')
    console.log('💡 提示: 在 test-backend-with-db.js 中將 ENABLE_TEST_MESSAGES 設為 true 來啟用')
}

// API 路由

// 健康檢查
app.get('/api/health', (req, res) => {
    console.log('📥 GET /api/health - 健康檢查')
    res.json({
        status: 'ok',
        message: '測試後端服務器運行正常',
        timestamp: new Date().toISOString(),
        mqttConnected: mqttClient ? mqttClient.connected : false
    })
})

// 場域管理 API

// 獲取所有場域
app.get('/api/homes', (req, res) => {
    console.log('📥 GET /api/homes - 獲取場域列表')
    console.log(`返回 ${homes.length} 個場域`)
    res.json(homes)
})

// 創建場域
app.post('/api/homes', (req, res) => {
    console.log('📥 POST /api/homes - 創建場域')
    console.log('請求數據:', req.body)

    const newHome = {
        id: `home_${Date.now()}`,
        ...req.body,
        createdAt: new Date().toISOString()
    }

    homes.push(newHome)
    saveData(HOMES_FILE, homes)
    console.log('✅ 場域創建成功:', newHome.id)

    res.status(201).json(newHome)
})

// 獲取單個場域
app.get('/api/homes/:id', (req, res) => {
    console.log('📥 GET /api/homes/:id - 獲取場域')
    console.log('場域ID:', req.params.id)

    const home = homes.find(h => h.id === req.params.id)
    if (!home) {
        console.log('❌ 場域不存在:', req.params.id)
        return res.status(404).json({ error: '場域不存在' })
    }

    console.log('✅ 場域獲取成功:', home.name)
    res.json(home)
})

// 更新場域
app.put('/api/homes/:id', (req, res) => {
    console.log('📥 PUT /api/homes/:id - 更新場域')
    console.log('場域ID:', req.params.id)
    console.log('請求數據:', req.body)

    const homeId = req.params.id
    const homeIndex = homes.findIndex(h => h.id === homeId)

    if (homeIndex === -1) {
        console.log('❌ 場域不存在:', homeId)
        return res.status(404).json({ error: '場域不存在' })
    }

    const updatedHome = {
        ...homes[homeIndex],
        ...req.body,
        id: homeId, // 確保 ID 不被覆蓋
        createdAt: homes[homeIndex].createdAt // 保持原始創建時間
    }

    homes[homeIndex] = updatedHome
    saveData(HOMES_FILE, homes)
    console.log('✅ 場域更新成功:', homeId)

    res.json(updatedHome)
})

// 刪除場域
app.delete('/api/homes/:id', (req, res) => {
    console.log('📥 DELETE /api/homes/:id - 刪除場域')
    console.log('場域ID:', req.params.id)

    const homeId = req.params.id
    const homeIndex = homes.findIndex(h => h.id === homeId)

    if (homeIndex === -1) {
        console.log('❌ 場域不存在:', homeId)
        return res.status(404).json({ error: '場域不存在' })
    }

    // 級聯刪除：刪除該場域下的所有樓層和網關
    const floorsToDelete = floors.filter(f => f.homeId === homeId)
    const floorIds = floorsToDelete.map(f => f.id)
    const gatewaysToDelete = gateways.filter(g => floorIds.includes(g.floorId))

    if (floorsToDelete.length > 0 || gatewaysToDelete.length > 0) {
        console.log(`🔄 級聯刪除 ${floorsToDelete.length} 個樓層和 ${gatewaysToDelete.length} 個網關...`)

        // 刪除網關
        if (gatewaysToDelete.length > 0) {
            const updatedGateways = gateways.filter(g => !floorIds.includes(g.floorId))
            gateways.length = 0
            gateways.push(...updatedGateways)
            saveData(GATEWAYS_FILE, gateways)
        }

        // 刪除樓層
        if (floorsToDelete.length > 0) {
            const updatedFloors = floors.filter(f => f.homeId !== homeId)
            floors.length = 0
            floors.push(...updatedFloors)
            saveData(FLOORS_FILE, floors)
        }

        console.log(`✅ 已刪除 ${floorsToDelete.length} 個樓層和 ${gatewaysToDelete.length} 個網關`)
    }

    const deletedHome = homes.splice(homeIndex, 1)[0]
    saveData(HOMES_FILE, homes)
    console.log('✅ 場域刪除成功:', homeId)

    res.json({
        message: '場域刪除成功',
        deletedHome,
        cascadeDeleted: {
            floors: floorsToDelete.length,
            gateways: gatewaysToDelete.length
        }
    })
})

// 樓層管理 API

// 獲取所有樓層
app.get('/api/floors', (req, res) => {
    console.log('📥 GET /api/floors - 獲取樓層列表')
    console.log(`返回 ${floors.length} 個樓層`)
    res.json(floors)
})

// 創建樓層
app.post('/api/floors', (req, res) => {
    console.log('📥 POST /api/floors - 創建樓層')
    console.log('請求數據:', req.body)

    const newFloor = {
        id: `floor_${Date.now()}`,
        ...req.body,
        createdAt: new Date().toISOString()
    }

    floors.push(newFloor)
    saveData(FLOORS_FILE, floors)
    console.log('✅ 樓層創建成功:', newFloor.id)

    res.status(201).json(newFloor)
})

// 更新樓層
app.put('/api/floors/:id', (req, res) => {
    try {
        console.log('📥 PUT /api/floors/:id - 更新樓層')
        console.log('樓層ID:', req.params.id)
        console.log('請求數據類型:', typeof req.body)
        console.log('請求數據鍵:', Object.keys(req.body || {}))

        const floorId = req.params.id
        const floorIndex = floors.findIndex(f => f.id === floorId)

        if (floorIndex === -1) {
            console.log('❌ 樓層不存在:', floorId)
            return res.status(404).json({ error: '樓層不存在' })
        }

        console.log('原始樓層數據:', floors[floorIndex])

        const updatedFloor = {
            ...floors[floorIndex],
            ...req.body,
            id: floorId, // 確保 ID 不被覆蓋
            createdAt: floors[floorIndex].createdAt // 保持原始創建時間
        }

        console.log('更新後樓層數據:', updatedFloor)

        floors[floorIndex] = updatedFloor

        // 檢查數據大小
        const dataSize = JSON.stringify(floors).length
        console.log('數據大小:', dataSize, 'bytes')

        if (dataSize > 10 * 1024 * 1024) { // 10MB
            console.warn('⚠️ 數據過大，可能導致性能問題')
        }

        saveData(FLOORS_FILE, floors)
        console.log('✅ 樓層更新成功:', floorId)

        res.json(updatedFloor)
    } catch (error) {
        console.error('❌ 樓層更新失敗:', error)
        res.status(500).json({
            error: '樓層更新失敗',
            message: error.message,
            stack: error.stack
        })
    }
})

// 刪除樓層
app.delete('/api/floors/:id', (req, res) => {
    console.log('📥 DELETE /api/floors/:id - 刪除樓層')
    console.log('樓層ID:', req.params.id)

    const floorId = req.params.id
    const floorIndex = floors.findIndex(f => f.id === floorId)

    if (floorIndex === -1) {
        console.log('❌ 樓層不存在:', floorId)
        return res.status(404).json({ error: '樓層不存在' })
    }

    // 級聯刪除：刪除該樓層下的所有網關
    const gatewaysToDelete = gateways.filter(g => g.floorId === floorId)
    if (gatewaysToDelete.length > 0) {
        console.log(`🔄 級聯刪除 ${gatewaysToDelete.length} 個網關...`)
        const updatedGateways = gateways.filter(g => g.floorId !== floorId)
        gateways.length = 0
        gateways.push(...updatedGateways)
        saveData(GATEWAYS_FILE, gateways)
        console.log(`✅ 已刪除 ${gatewaysToDelete.length} 個關聯網關`)
    }

    const deletedFloor = floors.splice(floorIndex, 1)[0]
    saveData(FLOORS_FILE, floors)
    console.log('✅ 樓層刪除成功:', floorId)

    res.json({
        message: '樓層刪除成功',
        deletedFloor,
        cascadeDeleted: {
            gateways: gatewaysToDelete.length
        }
    })
})

// 樓層關聯查詢：根據場域ID獲取樓層
app.get('/api/homes/:homeId/floors', (req, res) => {
    console.log('📥 GET /api/homes/:homeId/floors - 獲取場域的樓層列表')
    const homeId = req.params.homeId
    const homeFloors = floors.filter(f => f.homeId === homeId)
    console.log(`返回 ${homeFloors.length} 個樓層 (場域ID: ${homeId})`)
    res.json(homeFloors)
})

// 網關管理 API

// 獲取所有網關
app.get('/api/gateways', (req, res) => {
    console.log('📥 GET /api/gateways - 獲取所有網關列表')
    console.log(`返回 ${gateways.length} 個網關`)
    res.json(gateways)
})

// 根據樓層ID獲取網關
app.get('/api/floors/:floorId/gateways', (req, res) => {
    console.log('📥 GET /api/floors/:floorId/gateways - 獲取樓層的網關列表')
    const floorId = req.params.floorId
    const floorGateways = gateways.filter(g => g.floorId === floorId)
    console.log(`返回 ${floorGateways.length} 個網關 (樓層ID: ${floorId})`)
    res.json(floorGateways)
})

// 創建網關
app.post('/api/gateways', (req, res) => {
    console.log('📥 POST /api/gateways - 創建網關')
    console.log('請求數據:', req.body)

    // 驗證 floorId 是否存在
    if (req.body.floorId) {
        const floorExists = floors.some(f => f.id === req.body.floorId)
        if (!floorExists) {
            console.log('❌ 樓層不存在:', req.body.floorId)
            return res.status(400).json({ error: '指定的樓層不存在' })
        }
    }

    const newGateway = {
        id: `gw_${Date.now()}`,
        ...req.body,
        createdAt: new Date().toISOString()
    }

    gateways.push(newGateway)
    saveData(GATEWAYS_FILE, gateways)
    console.log('✅ 網關創建成功:', newGateway.id)

    res.status(201).json(newGateway)
})

// 獲取單個網關
app.get('/api/gateways/:id', (req, res) => {
    console.log('📥 GET /api/gateways/:id - 獲取網關')
    const gateway = gateways.find(g => g.id === req.params.id)
    if (!gateway) {
        return res.status(404).json({ error: '網關不存在' })
    }
    res.json(gateway)
})

// 更新網關
app.put('/api/gateways/:id', (req, res) => {
    console.log('📥 PUT /api/gateways/:id - 更新網關')
    const gatewayId = req.params.id
    const gatewayIndex = gateways.findIndex(g => g.id === gatewayId)

    if (gatewayIndex === -1) {
        return res.status(404).json({ error: '網關不存在' })
    }

    // 如果更新 floorId，驗證其是否存在
    if (req.body.floorId && req.body.floorId !== gateways[gatewayIndex].floorId) {
        const floorExists = floors.some(f => f.id === req.body.floorId)
        if (!floorExists) {
            console.log('❌ 樓層不存在:', req.body.floorId)
            return res.status(400).json({ error: '指定的樓層不存在' })
        }
    }

    const updatedGateway = {
        ...gateways[gatewayIndex],
        ...req.body,
        id: gatewayId,
        createdAt: gateways[gatewayIndex].createdAt
    }

    gateways[gatewayIndex] = updatedGateway
    saveData(GATEWAYS_FILE, gateways)
    console.log('✅ 網關更新成功:', gatewayId)

    res.json(updatedGateway)
})

// 刪除網關
app.delete('/api/gateways/:id', (req, res) => {
    console.log('📥 DELETE /api/gateways/:id - 刪除網關')
    const gatewayId = req.params.id
    const gatewayIndex = gateways.findIndex(g => g.id === gatewayId)

    if (gatewayIndex === -1) {
        return res.status(404).json({ error: '網關不存在' })
    }

    const deletedGateway = gateways.splice(gatewayIndex, 1)[0]
    // 同時刪除關聯的錨點和標籤
    anchors = anchors.filter(a => a.gatewayId !== gatewayId)
    tags = tags.filter(t => t.gatewayId !== gatewayId)
    saveData(GATEWAYS_FILE, gateways)
    saveData(ANCHORS_FILE, anchors)
    saveData(TAGS_FILE, tags)
    console.log('✅ 網關刪除成功:', gatewayId)

    res.json({ message: '網關刪除成功', deletedGateway })
})

// 錨點管理 API

// 獲取所有錨點
app.get('/api/anchors', (req, res) => {
    console.log('📥 GET /api/anchors - 獲取所有錨點')
    console.log(`返回 ${anchors.length} 個錨點`)
    res.json(anchors)
})

// 根據網關ID獲取錨點
app.get('/api/gateways/:gatewayId/anchors', (req, res) => {
    console.log('📥 GET /api/gateways/:gatewayId/anchors - 獲取網關的錨點列表')
    const gatewayId = req.params.gatewayId
    const gatewayAnchors = anchors.filter(a => a.gatewayId === gatewayId)
    console.log(`返回 ${gatewayAnchors.length} 個錨點 (網關ID: ${gatewayId})`)
    res.json(gatewayAnchors)
})

// 創建錨點
app.post('/api/anchors', (req, res) => {
    console.log('📥 POST /api/anchors - 創建錨點')
    console.log('請求數據:', req.body)

    // 驗證 gatewayId 是否存在
    if (req.body.gatewayId) {
        const gatewayExists = gateways.some(g => g.id === req.body.gatewayId)
        if (!gatewayExists) {
            console.log('❌ 網關不存在:', req.body.gatewayId)
            return res.status(400).json({ error: '指定的網關不存在' })
        }
    }

    const newAnchor = {
        id: `anchor_${Date.now()}`,
        ...req.body,
        createdAt: new Date().toISOString()
    }

    anchors.push(newAnchor)
    saveData(ANCHORS_FILE, anchors)
    console.log('✅ 錨點創建成功:', newAnchor.id)

    res.status(201).json(newAnchor)
})

// 獲取單個錨點
app.get('/api/anchors/:id', (req, res) => {
    console.log('📥 GET /api/anchors/:id - 獲取錨點')
    const anchor = anchors.find(a => a.id === req.params.id)
    if (!anchor) {
        return res.status(404).json({ error: '錨點不存在' })
    }
    res.json(anchor)
})

// 更新錨點
app.put('/api/anchors/:id', (req, res) => {
    console.log('📥 PUT /api/anchors/:id - 更新錨點')
    const anchorId = req.params.id
    const anchorIndex = anchors.findIndex(a => a.id === anchorId)

    if (anchorIndex === -1) {
        return res.status(404).json({ error: '錨點不存在' })
    }

    // 如果更新 gatewayId，驗證其是否存在
    if (req.body.gatewayId && req.body.gatewayId !== anchors[anchorIndex].gatewayId) {
        const gatewayExists = gateways.some(g => g.id === req.body.gatewayId)
        if (!gatewayExists) {
            console.log('❌ 網關不存在:', req.body.gatewayId)
            return res.status(400).json({ error: '指定的網關不存在' })
        }
    }

    const updatedAnchor = {
        ...anchors[anchorIndex],
        ...req.body,
        id: anchorId,
        createdAt: anchors[anchorIndex].createdAt
    }

    anchors[anchorIndex] = updatedAnchor
    saveData(ANCHORS_FILE, anchors)
    console.log('✅ 錨點更新成功:', anchorId)

    res.json(updatedAnchor)
})

// 刪除錨點
app.delete('/api/anchors/:id', (req, res) => {
    console.log('📥 DELETE /api/anchors/:id - 刪除錨點')
    const anchorId = req.params.id
    const anchorIndex = anchors.findIndex(a => a.id === anchorId)

    if (anchorIndex === -1) {
        return res.status(404).json({ error: '錨點不存在' })
    }

    const deletedAnchor = anchors.splice(anchorIndex, 1)[0]
    saveData(ANCHORS_FILE, anchors)
    console.log('✅ 錨點刪除成功:', anchorId)

    res.json({ message: '錨點刪除成功', deletedAnchor })
})

// 標籤管理 API

// 根據網關ID獲取標籤
app.get('/api/gateways/:gatewayId/tags', (req, res) => {
    console.log('📥 GET /api/gateways/:gatewayId/tags - 獲取網關的標籤列表')
    const gatewayId = req.params.gatewayId
    const gatewayTags = tags.filter(t => t.gatewayId === gatewayId)
    console.log(`返回 ${gatewayTags.length} 個標籤 (網關ID: ${gatewayId})`)
    res.json(gatewayTags)
})

// 創建標籤
app.post('/api/tags', (req, res) => {
    console.log('📥 POST /api/tags - 創建標籤')
    console.log('請求數據:', req.body)

    const newTag = {
        id: `tag_${Date.now()}`,
        ...req.body,
        createdAt: new Date().toISOString()
    }

    tags.push(newTag)
    saveData(TAGS_FILE, tags)
    console.log('✅ 標籤創建成功:', newTag.id)

    res.status(201).json(newTag)
})

// 獲取單個標籤
app.get('/api/tags/:id', (req, res) => {
    console.log('📥 GET /api/tags/:id - 獲取標籤')
    const tag = tags.find(t => t.id === req.params.id)
    if (!tag) {
        return res.status(404).json({ error: '標籤不存在' })
    }
    res.json(tag)
})

// 更新標籤
app.put('/api/tags/:id', (req, res) => {
    console.log('📥 PUT /api/tags/:id - 更新標籤')
    const tagId = req.params.id
    const tagIndex = tags.findIndex(t => t.id === tagId)

    if (tagIndex === -1) {
        return res.status(404).json({ error: '標籤不存在' })
    }

    const updatedTag = {
        ...tags[tagIndex],
        ...req.body,
        id: tagId,
        createdAt: tags[tagIndex].createdAt
    }

    tags[tagIndex] = updatedTag
    saveData(TAGS_FILE, tags)
    console.log('✅ 標籤更新成功:', tagId)

    res.json(updatedTag)
})

// 刪除標籤
app.delete('/api/tags/:id', (req, res) => {
    console.log('📥 DELETE /api/tags/:id - 刪除標籤')
    const tagId = req.params.id
    const tagIndex = tags.findIndex(t => t.id === tagId)

    if (tagIndex === -1) {
        return res.status(404).json({ error: '標籤不存在' })
    }

    const deletedTag = tags.splice(tagIndex, 1)[0]
    saveData(TAGS_FILE, tags)
    console.log('✅ 標籤刪除成功:', tagId)

    res.json({ message: '標籤刪除成功', deletedTag })
})

// MQTT 消息歷史
app.get('/api/mqtt/messages', (req, res) => {
    console.log('📥 GET /api/mqtt/messages - 獲取MQTT消息歷史')
    console.log(`返回 ${mqttMessages.length} 條消息`)
    res.json(mqttMessages)
})

// 數據統計
app.get('/api/stats', (req, res) => {
    console.log('📥 GET /api/stats - 獲取數據統計')
    const stats = {
        homes: homes.length,
        floors: floors.length,
        gateways: gateways.length,
        anchors: anchors.length,
        tags: tags.length,
        devices: devices.length,
        mqttMessages: mqttMessages.length,
        mqttConnected: mqttClient ? mqttClient.connected : false,
        uptime: process.uptime(),
        timestamp: new Date().toISOString()
    }
    console.log('📊 數據統計:', stats)
    res.json(stats)
})

// 錯誤處理中間件
app.use((error, req, res, next) => {
    console.error('❌ 服務器錯誤:', error)
    res.status(500).json({
        error: '內部服務器錯誤',
        message: error.message
    })
})

// 啟動服務器
app.listen(PORT, () => {
    console.log('================================================')
    console.log('🚀 測試後端服務器已啟動 (帶數據庫存儲)')
    console.log(`📡 REST API: http://localhost:${PORT}/api`)
    console.log(`🌐 WebSocket: ws://localhost:${WS_PORT}`)
    console.log('================================================')
    console.log('📋 可用端點:')
    console.log('  GET    /api/health')
    console.log('  GET    /api/homes')
    console.log('  POST   /api/homes')
    console.log('  GET    /api/homes/:id')
    console.log('  PUT    /api/homes/:id')
    console.log('  DELETE /api/homes/:id')
    console.log('  GET    /api/floors')
    console.log('  POST   /api/floors')
    console.log('  PUT    /api/floors/:id')
    console.log('  DELETE /api/floors/:id')
    console.log('  GET    /api/homes/:homeId/floors  ← 根據場域獲取樓層')
    console.log('  GET    /api/floors/:floorId/gateways  ← 根據樓層獲取網關')
    console.log('  POST   /api/gateways')
    console.log('  GET    /api/gateways/:id')
    console.log('  PUT    /api/gateways/:id')
    console.log('  DELETE /api/gateways/:id')
    console.log('  GET    /api/gateways/:gatewayId/anchors  ← 根據網關獲取錨點')
    console.log('  POST   /api/anchors')
    console.log('  GET    /api/anchors/:id')
    console.log('  PUT    /api/anchors/:id')
    console.log('  DELETE /api/anchors/:id')
    console.log('  GET    /api/gateways/:gatewayId/tags  ← 根據網關獲取標籤')
    console.log('  POST   /api/tags')
    console.log('  GET    /api/tags/:id')
    console.log('  PUT    /api/tags/:id')
    console.log('  DELETE /api/tags/:id')
    console.log('  GET    /api/mqtt/messages  ← 查看MQTT消息歷史')
    console.log('  GET    /api/stats          ← 查看數據統計')
    console.log('')
    console.log('🌐 WebSocket 功能:')
    console.log('  ✅ MQTT 消息實時推送到前端')
    console.log('  ✅ 消息去重機制（防止重複消息）')
    console.log('  ✅ 支持多客戶端同時連接')
    console.log('  ✅ 自動清理過期的去重記錄')
    console.log('')
    console.log('🧪 測試消息配置:')
    if (ENABLE_TEST_MESSAGES_FINAL) {
        console.log(`  ✅ 測試消息已啟用`)
        console.log(`  ⏱️  發送間隔: ${TEST_MESSAGE_INTERVAL_FINAL}ms (${TEST_MESSAGE_INTERVAL_FINAL / 1000}秒)`)
        console.log(`  💡 提示: 在 test-backend-with-db.js 第 18 行將 ENABLE_TEST_MESSAGES 設為 false 來禁用`)
    } else {
        console.log(`  ⚠️  測試消息已禁用`)
        console.log(`  💡 提示: 在 test-backend-with-db.js 第 18 行將 ENABLE_TEST_MESSAGES 設為 true 來啟用`)
    }
    console.log('')
    console.log('💾 數據存儲位置:')
    console.log(`  📁 數據目錄: ${DATA_DIR}`)
    console.log(`  🏠 場域數據: ${HOMES_FILE}`)
    console.log(`  🏢 樓層數據: ${FLOORS_FILE}`)
    console.log(`  🌐 網關數據: ${GATEWAYS_FILE}`)
    console.log(`  📍 錨點數據: ${ANCHORS_FILE}`)
    console.log(`  🏷️  標籤數據: ${TAGS_FILE}`)
    console.log(`  📱 設備數據: ${DEVICES_FILE}`)
    console.log(`  📨 MQTT消息: ${MQTT_MESSAGES_FILE}`)
})
