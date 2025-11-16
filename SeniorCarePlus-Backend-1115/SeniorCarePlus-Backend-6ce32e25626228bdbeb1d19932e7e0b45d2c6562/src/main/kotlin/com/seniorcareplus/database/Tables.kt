package com.seniorcareplus.database

import org.jetbrains.exposed.dao.id.IntIdTable
import org.jetbrains.exposed.sql.Table
import org.jetbrains.exposed.sql.ReferenceOption
import org.jetbrains.exposed.sql.javatime.datetime
import java.time.LocalDateTime

// ==================== 場域管理表 ====================

// 場域表 (Homes)
object Homes : IntIdTable("homes") {
    val homeId = varchar("home_id", 100).uniqueIndex()
    val name = varchar("name", 200)
    val description = text("description").nullable()
    val address = varchar("address", 500).nullable()
    val createdAt = datetime("created_at").default(LocalDateTime.now())
}

// 樓層表 (Floors)
object Floors : IntIdTable("floors") {
    val floorId = varchar("floor_id", 100).uniqueIndex()
    val homeId = varchar("home_id", 100).references(Homes.homeId, onDelete = ReferenceOption.CASCADE)
    val name = varchar("name", 200)
    val level = integer("level")
    val mapImage = text("map_image").nullable()  // base64 圖片數據
    val dimensions = text("dimensions").nullable()  // JSON: {width, height, realWidth, realHeight}
    val calibration = text("calibration").nullable()  // JSON: 校準數據
    val createdAt = datetime("created_at").default(LocalDateTime.now())
}

// 網關表 (Gateways)
object Gateways : IntIdTable("gateways") {
    val gatewayId = varchar("gateway_id", 100).uniqueIndex()
    val floorId = varchar("floor_id", 100).references(Floors.floorId, onDelete = ReferenceOption.CASCADE)
    val name = varchar("name", 200)
    val macAddress = varchar("mac_address", 50)
    val firmwareVersion = varchar("firmware_version", 50).nullable()
    val cloudData = text("cloud_data").nullable()  // JSON: {gateway_id, sub_topic, etc.}
    val status = varchar("status", 50).default("offline")  // online, offline
    val lastSeen = datetime("last_seen").nullable()
    val createdAt = datetime("created_at").default(LocalDateTime.now())
}

// 錨點表 (Anchors)
object Anchors : IntIdTable("anchors") {
    val anchorId = varchar("anchor_id", 100).uniqueIndex()
    // 當 Anchor 未被綁定到 Gateway 時，此欄位可為 NULL
    // 當管理員通過 API 綁定後，此欄位會被設置
    val gatewayId = varchar("gateway_id", 100).references(Gateways.gatewayId, onDelete = ReferenceOption.SET_NULL).nullable()
    val name = varchar("name", 200)
    val macAddress = varchar("mac_address", 50)
    val position = text("position")  // JSON: {x, y, z}
    val cloudData = text("cloud_data").nullable()  // JSON: {id, name, config}
    val status = varchar("status", 50).default("offline")
    val isBound = bool("is_bound").default(false)  // 標記是否已綁定到 Gateway
    val createdAt = datetime("created_at").default(LocalDateTime.now())
}

// 標籤表 (Tags)
object Tags : IntIdTable("tags") {
    val tagId = varchar("tag_id", 100).uniqueIndex()
    val gatewayId = varchar("gateway_id", 100).references(Gateways.gatewayId, onDelete = ReferenceOption.CASCADE)
    val name = varchar("name", 200)
    val hardwareId = varchar("hardware_id", 50)  // TAG 的實際 ID
    val cloudData = text("cloud_data").nullable()  // JSON
    val boundTo = varchar("bound_to", 100).nullable()  // 綁定的患者/設備
    val status = varchar("status", 50).default("offline")
    val createdAt = datetime("created_at").default(LocalDateTime.now())
}

// ==================== 患者與健康數據表 ====================

// 患者表
object Patients : IntIdTable() {
    val name = varchar("name", 100)
    val room = varchar("room", 50)
    val deviceId = varchar("device_id", 100).uniqueIndex()
    val age = integer("age").nullable()
    val gender = varchar("gender", 10).nullable()
    val emergencyContact = varchar("emergency_contact", 200).nullable()
    val createdAt = datetime("created_at").default(LocalDateTime.now())
    val updatedAt = datetime("updated_at").default(LocalDateTime.now())
}

// 健康記錄表
object HealthRecords : IntIdTable() {
    val patientId = reference("patient_id", Patients)
    val dataType = varchar("data_type", 50) // heart_rate, temperature, diaper, location
    val value = varchar("value", 500) // JSON格式存儲數據
    val deviceId = varchar("device_id", 100)
    val quality = varchar("quality", 50).nullable()
    val unit = varchar("unit", 20).nullable()
    val timestamp = datetime("timestamp")
    val createdAt = datetime("created_at").default(LocalDateTime.now())
}

// 位置記錄表
object LocationRecords : IntIdTable() {
    val patientId = reference("patient_id", Patients)
    val x = double("x")
    val y = double("y")
    val z = double("z").nullable()
    val accuracy = double("accuracy").nullable()
    val area = varchar("area", 100).nullable()
    val deviceId = varchar("device_id", 100)
    val timestamp = datetime("timestamp")
    val createdAt = datetime("created_at").default(LocalDateTime.now())
}

// 設備表
object Devices : IntIdTable() {
    val deviceId = varchar("device_id", 100).uniqueIndex()
    val deviceType = varchar("device_type", 50) // sensor, wearable, etc.
    val status = varchar("status", 20).default("active") // active, inactive, maintenance
    val lastSeen = datetime("last_seen").nullable()
    val batteryLevel = integer("battery_level").nullable()
    val firmwareVersion = varchar("firmware_version", 50).nullable()
    val createdAt = datetime("created_at").default(LocalDateTime.now())
    val updatedAt = datetime("updated_at").default(LocalDateTime.now())
}

// 警報表
object Alerts : IntIdTable() {
    val patientId = reference("patient_id", Patients)
    val alertType = varchar("alert_type", 50) // emergency, warning, info
    val title = varchar("title", 200)
    val message = text("message")
    val severity = varchar("severity", 20) // high, medium, low
    val status = varchar("status", 20).default("active") // active, acknowledged, resolved
    val deviceId = varchar("device_id", 100).nullable()
    val triggeredAt = datetime("triggered_at")
    val acknowledgedAt = datetime("acknowledged_at").nullable()
    val resolvedAt = datetime("resolved_at").nullable()
    val createdAt = datetime("created_at").default(LocalDateTime.now())
}

// 提醒表
object RemindersTable : IntIdTable() {
    val patientId = reference("patient_id", Patients)
    val title = varchar("title", 200)
    val description = text("description").nullable()
    val reminderType = varchar("reminder_type", 50) // medication, appointment, exercise
    val scheduledTime = datetime("scheduled_time")
    val isCompleted = bool("is_completed").default(false)
    val completedAt = datetime("completed_at").nullable()
    val createdAt = datetime("created_at").default(LocalDateTime.now())
    val updatedAt = datetime("updated_at").default(LocalDateTime.now())
}

// ==================== Gateway-Anchor 綁定表 ====================

// Gateway-Anchor 綁定歷史記錄表
// 用於記錄 Anchor 與 Gateway 的綁定操作記錄
object GatewayAnchorBindingHistory : IntIdTable("gateway_anchor_binding_history") {
    val bindingId = varchar("binding_id", 100).uniqueIndex()  // 綁定記錄 ID
    val anchorId = varchar("anchor_id", 100).references(Anchors.anchorId, onDelete = ReferenceOption.CASCADE)
    val gatewayId = varchar("gateway_id", 100).references(Gateways.gatewayId, onDelete = ReferenceOption.CASCADE)
    val action = varchar("action", 50)  // 'bind' 或 'unbind'
    val reason = text("reason").nullable()  // 操作原因
    val operatedBy = varchar("operated_by", 100).nullable()  // 操作人（未來可擴展）
    val createdAt = datetime("created_at").default(LocalDateTime.now())
} 