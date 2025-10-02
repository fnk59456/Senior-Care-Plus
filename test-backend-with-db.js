// 帶數據庫存儲的測試後端服務器
import express from 'express'
import cors from 'cors'
import fs from 'fs'
import path from 'path'
import mqtt from 'mqtt'

const app = express()
const PORT = 3001

// 中間件
app.use(cors())
app.use(express.json({ limit: '10mb' })) // 增加請求體大小限制到 10MB

// 數據文件路徑
const DATA_DIR = './test-data'
const HOMES_FILE = path.join(DATA_DIR, 'homes.json')
const FLOORS_FILE = path.join(DATA_DIR, 'floors.json')
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

// MQTT 連接
const MQTT_URL = 'ws://localhost:8083/mqtt'
const MQTT_OPTIONS = {
    username: 'test',
    password: 'test',
    clientId: `backend-server-${Math.random().toString(16).slice(2, 8)}`,
    clean: true,
    reconnectPeriod: 5000,
    connectTimeout: 30 * 1000,
}

let mqttClient = null

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
        })

        mqttClient.on('message', (topic, message) => {
            console.log(`📨 收到MQTT消息 [${topic}]:`, message.toString())
            saveMqttMessage(topic, message)
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

// 定期發布測試數據
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
}, 5000)

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

    const deletedHome = homes.splice(homeIndex, 1)[0]
    saveData(HOMES_FILE, homes)
    console.log('✅ 場域刪除成功:', homeId)

    res.json({ message: '場域刪除成功', deletedHome })
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

    const deletedFloor = floors.splice(floorIndex, 1)[0]
    saveData(FLOORS_FILE, floors)
    console.log('✅ 樓層刪除成功:', floorId)

    res.json({ message: '樓層刪除成功', deletedFloor })
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
    console.log('🚀 測試後端服務器已啟動 (帶數據庫存儲)')
    console.log(`📡 REST API: http://localhost:${PORT}/api`)
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
    console.log('  GET    /api/mqtt/messages  ← 新增：查看MQTT消息歷史')
    console.log('  GET    /api/stats          ← 新增：查看數據統計')
    console.log('')
    console.log('💾 數據存儲位置:')
    console.log(`  📁 數據目錄: ${DATA_DIR}`)
    console.log(`  🏠 場域數據: ${HOMES_FILE}`)
    console.log(`  🏢 樓層數據: ${FLOORS_FILE}`)
    console.log(`  📱 設備數據: ${DEVICES_FILE}`)
    console.log(`  📨 MQTT消息: ${MQTT_MESSAGES_FILE}`)
})
