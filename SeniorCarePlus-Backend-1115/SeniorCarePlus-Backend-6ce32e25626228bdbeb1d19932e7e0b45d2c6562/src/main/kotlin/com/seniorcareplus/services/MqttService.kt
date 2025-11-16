package com.seniorcareplus.services

import com.seniorcareplus.models.*
import com.seniorcareplus.database.*
import org.eclipse.paho.client.mqttv3.*
import org.eclipse.paho.client.mqttv3.persist.MemoryPersistence
import org.slf4j.LoggerFactory
import kotlinx.serialization.json.Json
import kotlinx.serialization.json.jsonObject
import kotlinx.serialization.json.jsonPrimitive
import kotlinx.serialization.decodeFromString
import kotlinx.serialization.encodeToString
import kotlinx.coroutines.GlobalScope
import kotlinx.coroutines.launch
import kotlinx.coroutines.delay
import org.jetbrains.exposed.sql.*
import org.jetbrains.exposed.sql.transactions.transaction
import java.time.Instant
import java.time.ZoneId
import javax.net.ssl.SSLContext
import javax.net.ssl.TrustManager
import javax.net.ssl.X509TrustManager
import java.security.SecureRandom
import java.security.cert.X509Certificate
import java.time.LocalDateTime

/**
 * MQTT服務 - 接收MQTT數據並存儲到數據庫，同時作為代理向App發送數據
 */
class MqttService {
    private val logger = LoggerFactory.getLogger(MqttService::class.java)
    private var mqttClientReceiver: MqttAsyncClient? = null  // 接收遠端數據
    private var mqttClientPublisher: MqttAsyncClient? = null // 發送給App
    private val json = Json { ignoreUnknownKeys = true }
    
    companion object {
        // 雲端MQTT服務器配置 (接收和發送數據) - 支持環境變數
        private val MQTT_CLOUD_SERVER_URI = System.getenv("MQTT_BROKER_URI") 
            ?: "wss://067ec32ef1344d3bb20c4e53abdde99a.s1.eu.hivemq.cloud:8884/mqtt"
        private val MQTT_CLOUD_USER = System.getenv("MQTT_USER") ?: "testweb1"
        private val MQTT_CLOUD_PASSWORD = System.getenv("MQTT_PASSWORD") ?: "Aa000000"
        
        // 接收主題列表 (從雲端)
        private val SUBSCRIBE_TOPICS = arrayOf(
            "UWB/GW16B8_Loca",      // 位置數據
            "UWB/+/Health",         // 健康數據（包含體溫，支持多個Gateway）
            "GW+_Health",           // 兼容性健康數據主題
            "health/heart_rate/+",   // 心率數據 
            "health/temperature/+",  // 體溫數據
            "health/diaper/+",       // 尿布數據
            "health/alert/+"         // 警報數據
        )
        
        // 發布主題列表 (發送給App)
        private object AppTopics {
            const val LOCATION = "backend/location"
            const val HEART_RATE = "backend/heart_rate"
            const val TEMPERATURE = "backend/temperature"
            const val DIAPER = "backend/diaper"
            const val ALERT = "backend/alert"
            const val HEALTH_STATUS = "backend/health_status"
        }
        
        private const val CLIENT_ID_PREFIX_RECEIVER = "SeniorCarePlusBackend_Receiver_"
        private const val CLIENT_ID_PREFIX_PUBLISHER = "SeniorCarePlusBackend_Publisher_"
        private const val QOS_1 = 1
    }
    
    /**
     * 連接MQTT服務器並開始接收數據
     */
    suspend fun connect(): Boolean {
        return try {
            logger.info("正在初始化MQTT客戶端...")
            
            // 生成唯一客戶端ID
            val clientIdReceiver = CLIENT_ID_PREFIX_RECEIVER + System.currentTimeMillis()
            val clientIdPublisher = CLIENT_ID_PREFIX_PUBLISHER + System.currentTimeMillis()
            
            // 創建MQTT異步客戶端 (都連接到雲端)
            mqttClientReceiver = MqttAsyncClient(
                MQTT_CLOUD_SERVER_URI,
                clientIdReceiver,
                org.eclipse.paho.client.mqttv3.persist.MemoryPersistence()
            )
            mqttClientPublisher = MqttAsyncClient(
                MQTT_CLOUD_SERVER_URI,
                clientIdPublisher,
                org.eclipse.paho.client.mqttv3.persist.MemoryPersistence()
            )
            
            // 配置雲端MQTT連接（接收數據）
            val connOptsReceiver = MqttConnectOptions().apply {
                isCleanSession = true
                connectionTimeout = 30
                keepAliveInterval = 60
                isAutomaticReconnect = true
                maxInflight = 10
                userName = MQTT_CLOUD_USER
                password = MQTT_CLOUD_PASSWORD.toCharArray()
                
                // SSL配置（雲端需要）
                socketFactory = createTrustAllSSLContext().socketFactory
            }
            
            // 配置雲端MQTT連接（發送給App）
            val connOptsPublisher = MqttConnectOptions().apply {
                isCleanSession = true
                connectionTimeout = 30
                keepAliveInterval = 60
                isAutomaticReconnect = true
                maxInflight = 10
                userName = MQTT_CLOUD_USER
                password = MQTT_CLOUD_PASSWORD.toCharArray()
                
                // SSL配置（雲端需要）
                socketFactory = createTrustAllSSLContext().socketFactory
            }
            
            // 設置回調
            mqttClientReceiver?.setCallback(object : MqttCallback {
                override fun connectionLost(cause: Throwable?) {
                    logger.warn("MQTT連接丟失: ${cause?.message}")
                    GlobalScope.launch {
                        reconnect()
                    }
                }
                
                override fun messageArrived(topic: String?, message: MqttMessage?) {
                    try {
                        if (topic != null && message != null) {
                            val messageContent = String(message.payload)
                            logger.info("收到MQTT消息 - 主題: $topic, 內容: $messageContent")
                            
                            // 處理並存儲消息
                            GlobalScope.launch {
                                processMessage(topic, messageContent)
                            }
                        }
                    } catch (e: Exception) {
                        logger.error("處理MQTT消息時發生錯誤: ${e.message}")
                    }
                }
                
                override fun deliveryComplete(token: IMqttDeliveryToken?) {
                    // 不需要處理發送完成事件
                }
            })
            mqttClientPublisher?.setCallback(object : MqttCallback {
                override fun connectionLost(cause: Throwable?) {
                    logger.warn("MQTT發布連接丟失: ${cause?.message}")
                    GlobalScope.launch {
                        reconnectPublisher()
                    }
                }
                
                override fun messageArrived(topic: String?, message: MqttMessage?) {
                    // 發布消息的回調，不需要處理
                }
                
                override fun deliveryComplete(token: IMqttDeliveryToken?) {
                    // 發布完成的回調，不需要處理
                }
            })
            
            // 連接到MQTT代理
            logger.info("正在連接到雲端MQTT服務器(接收): $MQTT_CLOUD_SERVER_URI")
            mqttClientReceiver?.connect(connOptsReceiver)?.waitForCompletion(10000)
            logger.info("正在連接到雲端MQTT服務器(發送): $MQTT_CLOUD_SERVER_URI")
            mqttClientPublisher?.connect(connOptsPublisher)?.waitForCompletion(10000)
            
            if (mqttClientReceiver?.isConnected == true && mqttClientPublisher?.isConnected == true) {
                logger.info("MQTT連接成功")
                
                // 訂閱主題
                subscribeToTopics()
                
                // 啟動定期健康狀態發布
                startHealthStatusPublisher()
                
                return true
            } else {
                logger.error("MQTT連接失敗")
                return false
            }
            
        } catch (e: Exception) {
            logger.error("MQTT連接過程中發生錯誤: ${e.message}")
            false
        }
    }
    
    /**
     * 訂閱所有相關主題
     */
    private suspend fun subscribeToTopics() {
        try {
            SUBSCRIBE_TOPICS.forEach { topic ->
                mqttClientReceiver?.subscribe(topic, QOS_1)
                logger.info("訂閱主題: $topic")
            }
        } catch (e: Exception) {
            logger.error("訂閱主題失敗: ${e.message}")
        }
    }
    
    /**
     * 處理接收到的MQTT消息
     */
    private suspend fun processMessage(topic: String, messageContent: String) {
        try {
            when {
                topic.contains("Loca") -> {
                    // 處理位置數據
                    processLocationData(messageContent)
                }
                topic.contains("Health") || topic.endsWith("_Health") -> {
                    // 處理雲端健康數據（包括體溫、心率等）
                    processHealthData(messageContent)
                }
                topic.contains("heart_rate") -> {
                    // 處理心率數據  
                    processHeartRateData(messageContent, extractPatientIdFromTopic(topic))
                }
                topic.contains("temperature") -> {
                    // 處理體溫數據
                    processTemperatureData(messageContent, extractPatientIdFromTopic(topic))
                }
                topic.contains("diaper") -> {
                    // 處理尿布數據
                    processDiaperData(messageContent, extractPatientIdFromTopic(topic))
                }
                topic.contains("alert") -> {
                    // 處理警報數據
                    processAlertData(messageContent, extractPatientIdFromTopic(topic))
                }
                else -> {
                    logger.debug("未知主題類型: $topic")
                }
            }
        } catch (e: Exception) {
            logger.error("處理消息失敗 - 主題: $topic, 錯誤: ${e.message}")
        }
    }
    
    /**
     * 處理健康數據（來自模擬器）
     */
    private suspend fun processHealthData(messageContent: String) {
        try {
            // 首先嘗試解析JSON
            val jsonElement = json.parseToJsonElement(messageContent)
            val jsonObject = jsonElement.jsonObject
            
            // 檢查content字段來確定數據類型
            val content = jsonObject["content"]?.jsonPrimitive?.content
            
            when (content) {
                "temperature" -> {
                    // 處理體溫數據
                    val simulatorData = json.decodeFromString<SimulatorTemperatureData>(messageContent)
                    val temperatureData = simulatorData.toTemperatureData()
                    
                    logger.info("收到體溫數據 - 用戶: ${simulatorData.name} (${simulatorData.id}), 體溫: ${simulatorData.temperature.value}°C")
                    
                    // 確保患者存在於數據庫中
                    val (patientFound, patientDbId) = ensurePatientExists(simulatorData.id, simulatorData.name)
                    
                    if (patientFound) {
                        // 存儲體溫數據到數據庫
                        storeTemperatureData(temperatureData, patientDbId)
                        
                        // 發送給App
                        publishTemperatureToApp(temperatureData)
                        
                        // 警報功能已移除
                    }
                }
                "heart_rate" -> {
                    // 處理心率數據（如果需要的話）
                    logger.info("收到心率數據，但目前未實現處理邏輯")
                }
                else -> {
                    logger.debug("未知的健康數據類型: $content")
                }
            }
            
        } catch (e: Exception) {
            logger.error("處理健康數據失敗: ${e.message}")
            logger.debug("原始數據: $messageContent")
        }
    }
    
    /**
     * 確保患者存在於數據庫中
     */
    private suspend fun ensurePatientExists(patientId: String, patientName: String): Pair<Boolean, Int> {
        return transaction {
            // 檢查患者是否存在
            val existingPatient = Patients.select { Patients.deviceId eq patientId }
                .singleOrNull()
            
            if (existingPatient != null) {
                Pair(true, existingPatient[Patients.id].value)
            } else {
                // 創建新患者
                val newPatientId = Patients.insert {
                    it[Patients.name] = patientName
                    it[Patients.deviceId] = patientId
                    it[Patients.room] = "未分配"
                    it[Patients.age] = 0
                    it[Patients.gender] = "未知"
                }[Patients.id].value
                
                logger.info("創建新患者 - ID: $newPatientId, 設備ID: $patientId, 姓名: $patientName")
                Pair(true, newPatientId)
            }
        }
    }
    
    /**
     * 存儲體溫數據到數據庫
     */
    private suspend fun storeTemperatureData(temperatureData: TemperatureData, patientDbId: Int) {
        transaction {
            HealthRecords.insert {
                it[HealthRecords.patientId] = patientDbId
                it[HealthRecords.dataType] = "temperature"
                it[HealthRecords.value] = json.encodeToString(TemperatureData.serializer(), temperatureData)
                it[HealthRecords.deviceId] = temperatureData.deviceId ?: temperatureData.patientId
                it[HealthRecords.quality] = temperatureData.quality
                it[HealthRecords.unit] = temperatureData.unit
                it[HealthRecords.timestamp] = Instant.ofEpochSecond(temperatureData.timestamp)
                    .atZone(ZoneId.systemDefault()).toLocalDateTime()
            }
        }
        
        logger.info("體溫數據已存儲到數據庫 - 患者: ${temperatureData.patientId}, 體溫: ${temperatureData.temperature}°C")
    }

    /**
     * 處理位置數據
     */
    private suspend fun processLocationData(messageContent: String) {
        try {
            // 解析UWB位置數據
            val uwbLocationData = json.decodeFromString<UWBLocationData>(messageContent)
            val locationData = uwbLocationData.toLocationData()
            
            logger.info("UWB位置數據 - 標籤ID: ${uwbLocationData.id} (${uwbLocationData.idHex}), 位置: (${locationData.x}, ${locationData.y}, ${locationData.z}), 品質: ${uwbLocationData.position.quality}")
            
            // 存儲到數據庫
            val patientFound = transaction {
                // 檢查患者是否存在
                val patient = Patients.select { Patients.deviceId eq locationData.patientId }
                    .singleOrNull()
                
                if (patient != null) {
                    val patientId = patient[Patients.id].value
                    
                    // 插入位置記錄
                    LocationRecords.insert {
                        it[LocationRecords.patientId] = patientId
                        it[LocationRecords.x] = locationData.x
                        it[LocationRecords.y] = locationData.y
                        it[LocationRecords.z] = locationData.z ?: 0.0
                        it[LocationRecords.accuracy] = locationData.accuracy ?: 0.0
                        it[LocationRecords.area] = locationData.area ?: "未知區域"
                        it[LocationRecords.deviceId] = locationData.deviceId ?: "unknown"
                        it[LocationRecords.timestamp] = Instant.ofEpochSecond(locationData.timestamp)
                            .atZone(ZoneId.systemDefault()).toLocalDateTime()
                    }
                    
                    logger.info("位置數據已存儲到數據庫 - 患者ID: $patientId, 標籤: ${uwbLocationData.idHex}")
                    true
                    
                } else {
                    logger.warn("找不到對應的患者 - 設備ID: ${locationData.patientId}, 標籤ID: ${uwbLocationData.id}")
                    
                    // 如果是未知設備，創建一個臨時患者記錄
                    val newPatientId = Patients.insert {
                        it[Patients.name] = "未知患者_${uwbLocationData.id}"
                        it[Patients.deviceId] = locationData.patientId
                        it[Patients.room] = "未分配"
                        it[Patients.age] = 0
                        it[Patients.gender] = "未知"
                    }[Patients.id].value
                    
                    // 插入位置記錄
                    LocationRecords.insert {
                        it[LocationRecords.patientId] = newPatientId
                        it[LocationRecords.x] = locationData.x
                        it[LocationRecords.y] = locationData.y
                        it[LocationRecords.z] = locationData.z ?: 0.0
                        it[LocationRecords.accuracy] = locationData.accuracy ?: 0.0
                        it[LocationRecords.area] = locationData.area ?: "未知區域"
                        it[LocationRecords.deviceId] = locationData.deviceId ?: "unknown"
                        it[LocationRecords.timestamp] = Instant.ofEpochSecond(locationData.timestamp)
                            .atZone(ZoneId.systemDefault()).toLocalDateTime()
                    }
                    
                    logger.info("創建新患者並存儲位置數據 - 患者ID: $newPatientId, 標籤: ${uwbLocationData.idHex}")
                    true
                }
            }
            
            // 數據庫操作完成後發送數據給App
            if (patientFound) {
                publishLocationToApp(locationData)
            }
            
        } catch (e: Exception) {
            logger.error("處理位置數據失敗: ${e.message}")
            logger.debug("原始數據: $messageContent")
        }
    }
    
    /**
     * 向App發布位置數據
     */
    private suspend fun publishLocationToApp(locationData: LocationData) {
        try {
            val messageJson = json.encodeToString(LocationData.serializer(), locationData)
            val message = MqttMessage(messageJson.toByteArray())
            message.qos = QOS_1
            
            mqttClientPublisher?.publish(AppTopics.LOCATION, message)
            logger.info("位置數據已發送給App - 設備: ${locationData.deviceId}")
        } catch (e: Exception) {
            logger.error("發送位置數據給App失敗: ${e.message}")
        }
    }
    
    /**
     * 處理心率數據
     */
    private suspend fun processHeartRateData(messageContent: String, patientId: String) {
        try {
            val heartRateData = json.decodeFromString<HeartRateData>(messageContent)
            
            val patientFound = transaction {
                // 檢查患者是否存在
                val patient = Patients.select { Patients.deviceId eq patientId }
                    .singleOrNull()
                
                if (patient != null) {
                    val id = patient[Patients.id].value
                    
                    // 插入健康記錄
                    HealthRecords.insert {
                        it[HealthRecords.patientId] = id
                        it[HealthRecords.dataType] = "heart_rate"
                        it[HealthRecords.value] = json.encodeToString(HeartRateData.serializer(), heartRateData)
                        it[HealthRecords.deviceId] = heartRateData.deviceId ?: patientId
                        it[HealthRecords.quality] = heartRateData.quality
                        it[HealthRecords.unit] = "bpm"
                        it[HealthRecords.timestamp] = Instant.ofEpochSecond(heartRateData.timestamp)
                            .atZone(ZoneId.systemDefault()).toLocalDateTime()
                    }
                    
                    logger.info("心率數據已存儲 - 患者: $patientId, 心率: ${heartRateData.heartRate} bpm")
                    true
                } else {
                    false
                }
            }
            
            // 數據庫操作完成後發送數據給App
            if (patientFound) {
                publishHeartRateToApp(heartRateData)
            }
            
        } catch (e: Exception) {
            logger.error("處理心率數據失敗: ${e.message}")
        }
    }
    
    /**
     * 向App發布心率數據
     */
    private suspend fun publishHeartRateToApp(heartRateData: HeartRateData) {
        try {
            val messageJson = json.encodeToString(HeartRateData.serializer(), heartRateData)
            val message = MqttMessage(messageJson.toByteArray())
            message.qos = QOS_1
            
            mqttClientPublisher?.publish(AppTopics.HEART_RATE, message)
            logger.info("心率數據已發送給App - 設備: ${heartRateData.deviceId}")
        } catch (e: Exception) {
            logger.error("發送心率數據給App失敗: ${e.message}")
        }
    }
    
    /**
     * 處理體溫數據
     */
    private suspend fun processTemperatureData(messageContent: String, patientId: String) {
        try {
            val temperatureData = json.decodeFromString<TemperatureData>(messageContent)
            
            val (patientFound, patientDbId) = transaction {
                // 檢查患者是否存在
                val patient = Patients.select { Patients.deviceId eq patientId }
                    .singleOrNull()
                
                if (patient != null) {
                    val id = patient[Patients.id].value
                    
                    // 插入健康記錄
                    HealthRecords.insert {
                        it[HealthRecords.patientId] = id
                        it[HealthRecords.dataType] = "temperature"
                        it[HealthRecords.value] = json.encodeToString(TemperatureData.serializer(), temperatureData)
                        it[HealthRecords.deviceId] = temperatureData.deviceId ?: patientId
                        it[HealthRecords.quality] = temperatureData.quality
                        it[HealthRecords.unit] = temperatureData.unit
                        it[HealthRecords.timestamp] = Instant.ofEpochSecond(temperatureData.timestamp)
                            .atZone(ZoneId.systemDefault()).toLocalDateTime()
                    }
                    
                    logger.info("體溫數據已存儲 - 患者: $patientId, 體溫: ${temperatureData.temperature} ${temperatureData.unit}")
                    Pair(true, id)
                } else {
                    Pair(false, 0)
                }
            }
            
            // 數據庫操作完成後發送數據給App
            if (patientFound) {
                publishTemperatureToApp(temperatureData)
            }
            
        } catch (e: Exception) {
            logger.error("處理體溫數據失敗: ${e.message}")
        }
    }
    
    /**
     * 向App發布體溫數據
     */
    private suspend fun publishTemperatureToApp(temperatureData: TemperatureData) {
        try {
            val messageJson = json.encodeToString(TemperatureData.serializer(), temperatureData)
            val message = MqttMessage(messageJson.toByteArray())
            message.qos = QOS_1
            
            mqttClientPublisher?.publish(AppTopics.TEMPERATURE, message)
            logger.info("體溫數據已發送給App - 設備: ${temperatureData.deviceId}")
        } catch (e: Exception) {
            logger.error("發送體溫數據給App失敗: ${e.message}")
        }
    }
    
    /**
     * 處理尿布數據
     */
    private suspend fun processDiaperData(messageContent: String, patientId: String) {
        try {
            val diaperData = json.decodeFromString<DiaperData>(messageContent)
            
            val (patientFound, patientDbId) = transaction {
                // 檢查患者是否存在
                val patient = Patients.select { Patients.deviceId eq patientId }
                    .singleOrNull()
                
                if (patient != null) {
                    val id = patient[Patients.id].value
                    
                    // 插入健康記錄
                    HealthRecords.insert {
                        it[HealthRecords.patientId] = id
                        it[HealthRecords.dataType] = "diaper"
                        it[HealthRecords.value] = json.encodeToString(DiaperData.serializer(), diaperData)
                        it[HealthRecords.deviceId] = diaperData.deviceId ?: patientId
                        it[HealthRecords.quality] = "normal"
                        it[HealthRecords.unit] = "status"
                        it[HealthRecords.timestamp] = Instant.ofEpochSecond(diaperData.timestamp)
                            .atZone(ZoneId.systemDefault()).toLocalDateTime()
                    }
                    
                    logger.info("尿布數據已存儲 - 患者: $patientId, 狀態: ${diaperData.status}")
                    Pair(true, id)
                } else {
                    Pair(false, 0)
                }
            }
            
            // 數據庫操作完成後發送數據給App和檢查警報
            if (patientFound) {
                publishDiaperToApp(diaperData)
                
                // 檢查尿布警報
                if (diaperData.status == "wet" || diaperData.status == "soiled") {
                    createAlert(patientDbId, "diaper", "尿布需要更換", "尿布狀態: ${diaperData.status}", "warning", diaperData.deviceId ?: patientId)
                }
            }
            
        } catch (e: Exception) {
            logger.error("處理尿布數據失敗: ${e.message}")
        }
    }
    
    /**
     * 向App發布尿布數據
     */
    private suspend fun publishDiaperToApp(diaperData: DiaperData) {
        try {
            val messageJson = json.encodeToString(DiaperData.serializer(), diaperData)
            val message = MqttMessage(messageJson.toByteArray())
            message.qos = QOS_1
            
            mqttClientPublisher?.publish(AppTopics.DIAPER, message)
            logger.info("尿布數據已發送給App - 設備: ${diaperData.deviceId}")
        } catch (e: Exception) {
            logger.error("發送尿布數據給App失敗: ${e.message}")
        }
    }
    
    /**
     * 處理警報數據
     */
    private suspend fun processAlertData(messageContent: String, patientId: String) {
        try {
            val alertData = json.decodeFromString<AlertData>(messageContent)
            
            val patientFound = transaction {
                // 檢查患者是否存在
                val patient = Patients.select { Patients.deviceId eq patientId }
                    .singleOrNull()
                
                if (patient != null) {
                    val id = patient[Patients.id].value
                    
                    // 插入警報記錄
                    Alerts.insert {
                        it[Alerts.patientId] = id
                        it[Alerts.alertType] = alertData.alertType
                        it[Alerts.title] = alertData.title
                        it[Alerts.message] = alertData.message
                        it[Alerts.severity] = alertData.severity
                        it[Alerts.status] = "active"
                        it[Alerts.deviceId] = alertData.deviceId ?: patientId
                        it[Alerts.triggeredAt] = Instant.ofEpochSecond(alertData.timestamp)
                            .atZone(ZoneId.systemDefault()).toLocalDateTime()
                    }
                    
                    logger.warn("警報已記錄 - 患者: $patientId, 類型: ${alertData.alertType}, 訊息: ${alertData.message}")
                    true
                } else {
                    false
                }
            }
            
            // 數據庫操作完成後發送數據給App
            if (patientFound) {
                publishAlertToApp(alertData)
            }
            
        } catch (e: Exception) {
            logger.error("處理警報數據失敗: ${e.message}")
        }
    }
    
    /**
     * 向App發布警報數據
     */
    private suspend fun publishAlertToApp(alertData: AlertData) {
        try {
            val messageJson = json.encodeToString(AlertData.serializer(), alertData)
            val message = MqttMessage(messageJson.toByteArray())
            message.qos = QOS_1
            
            mqttClientPublisher?.publish(AppTopics.ALERT, message)
            logger.warn("警報數據已發送給App - 設備: ${alertData.deviceId}, 類型: ${alertData.alertType}")
        } catch (e: Exception) {
            logger.error("發送警報數據給App失敗: ${e.message}")
        }
    }
    
    // 體溫警報功能已移除
    
    /**
     * 創建警報記錄
     */
    private suspend fun createAlert(patientId: Int, alertType: String, title: String, message: String, severity: String, deviceId: String) {
        try {
            val alertData = transaction {
                val alertId = Alerts.insert {
                    it[Alerts.patientId] = patientId
                    it[Alerts.alertType] = alertType
                    it[Alerts.title] = title
                    it[Alerts.message] = message
                    it[Alerts.severity] = severity
                    it[Alerts.status] = "active"
                    it[Alerts.deviceId] = deviceId
                    it[Alerts.triggeredAt] = LocalDateTime.now()
                }[Alerts.id].value
                
                logger.warn("創建新警報 - ID: $alertId, 患者: $patientId, 類型: $alertType, 等級: $severity")
                
                // 創建警報數據對象
                AlertData(
                    patientId = "patient_$patientId",
                    deviceId = deviceId,
                    alertType = alertType,
                    title = title,
                    message = message,
                    severity = severity,
                    timestamp = System.currentTimeMillis() / 1000
                )
            }
            
            // 發送警報給App
            publishAlertToApp(alertData)
            
        } catch (e: Exception) {
            logger.error("創建警報失敗: ${e.message}")
        }
    }
    
    /**
     * 定期發送健康狀態數據給App
     */
    suspend fun publishHealthStatus() {
        try {
            val healthStatus = transaction {
                // 獲取所有患者的最新健康狀態
                val patients = Patients.selectAll().map { 
                    mapOf(
                        "patientId" to it[Patients.deviceId],
                        "name" to it[Patients.name],
                        "room" to it[Patients.room],
                        "lastUpdate" to LocalDateTime.now().toString()
                    )
                }
                
                mapOf(
                    "timestamp" to System.currentTimeMillis() / 1000,
                    "status" to "active",
                    "patients" to patients,
                    "totalPatients" to patients.size
                )
            }
            
            val messageJson = json.encodeToString(healthStatus)
            val message = MqttMessage(messageJson.toByteArray())
            message.qos = QOS_1
            
            mqttClientPublisher?.publish(AppTopics.HEALTH_STATUS, message)
            logger.info("健康狀態數據已發送給App - 患者數量: ${healthStatus["totalPatients"]}")
            
        } catch (e: Exception) {
            logger.error("發送健康狀態數據給App失敗: ${e.message}")
        }
    }
    
    /**
     * 啟動定期健康狀態發布
     */
    private fun startHealthStatusPublisher() {
        GlobalScope.launch {
            while (true) {
                try {
                    if (mqttClientPublisher?.isConnected == true) {
                        publishHealthStatus()
                    }
                    delay(30000) // 每30秒發送一次健康狀態
                } catch (e: Exception) {
                    logger.error("健康狀態發布循環錯誤: ${e.message}")
                    delay(60000) // 錯誤時等待1分鐘
                }
            }
        }
    }
    
    /**
     * 從主題中提取患者ID
     */
    private fun extractPatientIdFromTopic(topic: String): String {
        return topic.split("/").lastOrNull() ?: "unknown"
    }
    
    /**
     * 重新連接
     */
    private suspend fun reconnect() {
        delay(5000)
        logger.info("嘗試重新連接MQTT...")
        connect()
    }

    /**
     * 重新連接發布客戶端
     */
    private suspend fun reconnectPublisher() {
        delay(5000)
        logger.info("嘗試重新連接MQTT發布客戶端...")
        connect()
    }
    
    /**
     * 創建信任所有證書的SSL上下文
     */
    private fun createTrustAllSSLContext(): SSLContext {
        val trustAllCerts = arrayOf<TrustManager>(object : X509TrustManager {
            override fun checkClientTrusted(chain: Array<X509Certificate>, authType: String) {}
            override fun checkServerTrusted(chain: Array<X509Certificate>, authType: String) {}
            override fun getAcceptedIssuers(): Array<X509Certificate> = arrayOf()
        })
        
        val sslContext = SSLContext.getInstance("TLS")
        sslContext.init(null, trustAllCerts, SecureRandom())
        return sslContext
    }
    
    /**
     * 斷開連接
     */
    fun disconnect() {
        try {
            mqttClientReceiver?.disconnect()
            mqttClientPublisher?.disconnect()
            logger.info("MQTT連接已斷開")
        } catch (e: Exception) {
            logger.error("斷開MQTT連接時發生錯誤: ${e.message}")
        }
    }
} 