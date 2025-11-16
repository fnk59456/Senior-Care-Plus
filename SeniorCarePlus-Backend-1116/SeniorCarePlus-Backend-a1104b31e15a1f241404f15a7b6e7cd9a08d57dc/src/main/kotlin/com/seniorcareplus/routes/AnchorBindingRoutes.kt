package com.seniorcareplus.routes

import com.seniorcareplus.database.*
import com.seniorcareplus.models.*
import io.ktor.http.*
import io.ktor.server.application.*
import io.ktor.server.request.*
import io.ktor.server.response.*
import io.ktor.server.routing.*
import kotlinx.serialization.json.Json
import kotlinx.serialization.encodeToString
import org.jetbrains.exposed.sql.*
import org.jetbrains.exposed.sql.SqlExpressionBuilder.eq
import org.jetbrains.exposed.sql.transactions.transaction
import java.time.LocalDateTime
import java.time.format.DateTimeFormatter

/**
 * Anchor-Gateway 綁定相關路由
 * 
 * 數據流：
 * 1. MQTT 收到 Anchor 數據 → 前端顯示未綁定的 Anchor
 * 2. 管理員在前端點擊"綁定"按鈕
 * 3. 前端調用 PUT /api/anchors/{anchorId}/bind-gateway
 * 4. 後端更新 Anchors 表：設置 gatewayId、homeId、floorId、isBound=true
 * 5. 後端寫入 GatewayAnchorBindingHistory 記錄
 */
fun Route.anchorBindingRoutes() {
    route("/api") {
        
        // ==================== 獲取未綁定的 Anchor 列表 ====================
        
        /**
         * GET /api/anchors/unbound
         * 獲取所有未綁定的 Anchor 列表
         * 
         * 響應示例：
         * [
         *   {
         *     "id": "anchor_1",
         *     "name": "Anchor A",
         *     "macAddress": "00:11:22:33:44:55",
         *     "position": { "x": 1.0, "y": 2.0, "z": 0.5 },
         *     "status": "offline",
         *     "isBound": false,
         *     "createdAt": "2025-11-14T10:00:00"
         *   }
         * ]
         */
        get("/anchors/unbound") {
            try {
                val unboundAnchors = transaction {
                    Anchors.select { Anchors.isBound eq false }.map { row ->
                        AnchorData(
                            id = row[Anchors.anchorId],
                            gatewayId = null,
                            homeId = null,
                            floorId = null,
                            name = row[Anchors.name],
                            macAddress = row[Anchors.macAddress],
                            position = row[Anchors.position].let { Json.decodeFromString(it) },
                            cloudData = row[Anchors.cloudData]?.let { Json.decodeFromString(it) },
                            status = row[Anchors.status],
                            isBound = row[Anchors.isBound],
                            createdAt = row[Anchors.createdAt].format(DateTimeFormatter.ISO_LOCAL_DATE_TIME)
                        )
                    }
                }
                call.respond(unboundAnchors)
            } catch (e: Exception) {
                call.respond(
                    HttpStatusCode.InternalServerError,
                    ApiResponse<Nothing>(
                        success = false,
                        message = "獲取未綁定 Anchor 失敗: ${e.message}"
                    )
                )
            }
        }
        
        // ==================== 綁定 Anchor 到 Gateway ====================
        
        /**
         * PUT /api/anchors/{anchorId}/bind-gateway
         * 將 Anchor 綁定到指定的 Gateway
         * 
         * 請求體：
         * {
         *   "gatewayId": "gateway_001"
         * }
         * 
         * 響應示例：
         * {
         *   "id": "anchor_1",
         *   "gatewayId": "gateway_001",
         *   "homeId": "home_123",
         *   "floorId": "floor_456",
         *   "name": "Anchor A",
         *   "macAddress": "00:11:22:33:44:55",
         *   "position": { "x": 1.0, "y": 2.0, "z": 0.5 },
         *   "status": "offline",
         *   "isBound": true,
         *   "createdAt": "2025-11-14T10:00:00"
         * }
         */
        put("/anchors/{anchorId}/bind-gateway") {
            try {
                val anchorId = call.parameters["anchorId"] ?: return@put call.respond(
                    HttpStatusCode.BadRequest,
                    ApiResponse<Nothing>(success = false, message = "缺少 Anchor ID")
                )
                val request = call.receive<BindAnchorToGatewayRequest>()
                
                val result = transaction {
                    // 1. 檢查 Anchor 是否存在
                    val anchorRow = Anchors.select { Anchors.anchorId eq anchorId }.singleOrNull()
                        ?: return@transaction null
                    
                    // 2. 檢查 Gateway 是否存在且已指派到樓層
                    val gatewayRow = Gateways.select { Gateways.gatewayId eq request.gatewayId }.singleOrNull()
                        ?: return@transaction null
                    
                    val floorId = gatewayRow[Gateways.floorId]
                        ?: return@transaction null  // Gateway 必須先指派到樓層
                    
                    // 3. 從 Floor 查詢 homeId
                    val floorRow = Floors.select { Floors.floorId eq floorId }.singleOrNull()
                        ?: return@transaction null
                    val homeId = floorRow[Floors.homeId]
                    
                    // 4. 更新 Anchors 表
                    Anchors.update({ Anchors.anchorId eq anchorId }) {
                        it[gatewayId] = request.gatewayId
                        it[isBound] = true
                    }
                    
                    // 5. 記錄綁定操作到 GatewayAnchorBindingHistory
                    val bindingId = "binding_${System.currentTimeMillis()}"
                    GatewayAnchorBindingHistory.insert {
                        it[GatewayAnchorBindingHistory.bindingId] = bindingId
                        it[GatewayAnchorBindingHistory.anchorId] = anchorId
                        it[GatewayAnchorBindingHistory.gatewayId] = request.gatewayId
                        it[action] = "bind"
                        it[reason] = "前端管理員綁定"
                    }
                    
                    // 6. 返回更新後的 Anchor 數據（包含 homeId 和 floorId）
                    AnchorData(
                        id = anchorRow[Anchors.anchorId],
                        gatewayId = request.gatewayId,
                        homeId = homeId,
                        floorId = floorId,
                        name = anchorRow[Anchors.name],
                        macAddress = anchorRow[Anchors.macAddress],
                        position = anchorRow[Anchors.position].let { Json.decodeFromString(it) },
                        cloudData = anchorRow[Anchors.cloudData]?.let { Json.decodeFromString(it) },
                        status = anchorRow[Anchors.status],
                        isBound = true,
                        createdAt = anchorRow[Anchors.createdAt].format(DateTimeFormatter.ISO_LOCAL_DATE_TIME)
                    )
                }
                
                if (result != null) {
                    call.respond(HttpStatusCode.OK, result)
                } else {
                    call.respond(
                        HttpStatusCode.BadRequest,
                        ApiResponse<Nothing>(
                            success = false,
                            message = "Anchor 或 Gateway 不存在，或 Gateway 未指派到樓層"
                        )
                    )
                }
            } catch (e: Exception) {
                call.respond(
                    HttpStatusCode.InternalServerError,
                    ApiResponse<Nothing>(success = false, message = "綁定 Anchor 失敗: ${e.message}")
                )
            }
        }
        
        // ==================== 解綁 Anchor 從 Gateway ====================
        
        /**
         * PUT /api/anchors/{anchorId}/unbind-gateway
         * 將 Anchor 從 Gateway 解綁
         * 
         * 請求體（可選）：
         * {
         *   "reason": "設備故障"
         * }
         */
        put("/anchors/{anchorId}/unbind-gateway") {
            try {
                val anchorId = call.parameters["anchorId"] ?: return@put call.respond(
                    HttpStatusCode.BadRequest,
                    ApiResponse<Nothing>(success = false, message = "缺少 Anchor ID")
                )
                val request = call.receive<UnbindAnchorRequest>()
                
                val result = transaction {
                    // 1. 檢查 Anchor 是否存在且已綁定
                    val anchorRow = Anchors.select { Anchors.anchorId eq anchorId }.singleOrNull()
                        ?: return@transaction null
                    
                    if (!anchorRow[Anchors.isBound]) {
                        return@transaction null  // Anchor 未綁定，無法解綁
                    }
                    
                    val currentGatewayId = anchorRow[Anchors.gatewayId]
                    
                    // 2. 記錄解綁操作到 GatewayAnchorBindingHistory
                    val bindingId = "binding_${System.currentTimeMillis()}"
                    if (currentGatewayId != null) {
                        GatewayAnchorBindingHistory.insert {
                            it[GatewayAnchorBindingHistory.bindingId] = bindingId
                            it[GatewayAnchorBindingHistory.anchorId] = anchorId
                            it[GatewayAnchorBindingHistory.gatewayId] = currentGatewayId
                            it[action] = "unbind"
                            it[reason] = request.reason
                        }
                    }
                    
                    // 3. 更新 Anchors 表（清除綁定）
                    Anchors.update({ Anchors.anchorId eq anchorId }) {
                        it[gatewayId] = null
                        it[isBound] = false
                    }
                    
                    // 4. 返回更新後的 Anchor 數據
                    AnchorData(
                        id = anchorRow[Anchors.anchorId],
                        gatewayId = null,
                        homeId = null,
                        floorId = null,
                        name = anchorRow[Anchors.name],
                        macAddress = anchorRow[Anchors.macAddress],
                        position = anchorRow[Anchors.position].let { Json.decodeFromString(it) },
                        cloudData = anchorRow[Anchors.cloudData]?.let { Json.decodeFromString(it) },
                        status = anchorRow[Anchors.status],
                        isBound = false,
                        createdAt = anchorRow[Anchors.createdAt].format(DateTimeFormatter.ISO_LOCAL_DATE_TIME)
                    )
                }
                
                if (result != null) {
                    call.respond(HttpStatusCode.OK, result)
                } else {
                    call.respond(
                        HttpStatusCode.BadRequest,
                        ApiResponse<Nothing>(
                            success = false,
                            message = "Anchor 不存在或未綁定"
                        )
                    )
                }
            } catch (e: Exception) {
                call.respond(
                    HttpStatusCode.InternalServerError,
                    ApiResponse<Nothing>(success = false, message = "解綁 Anchor 失敗: ${e.message}")
                )
            }
        }
        
        // ==================== 獲取 Gateway 下的所有 Anchor ====================
        
        /**
         * GET /api/gateways/{gatewayId}/anchors
         * 獲取指定 Gateway 下的所有綁定的 Anchor
         * 
         * 響應示例：
         * [
         *   {
         *     "id": "anchor_1",
         *     "gatewayId": "gateway_001",
         *     "homeId": "home_123",
         *     "floorId": "floor_456",
         *     "name": "Anchor A",
         *     ...
         *   }
         * ]
         */
        get("/gateways/{gatewayId}/anchors") {
            try {
                val gatewayId = call.parameters["gatewayId"] ?: return@get call.respond(
                    HttpStatusCode.BadRequest,
                    ApiResponse<Nothing>(success = false, message = "缺少 Gateway ID")
                )
                
                val anchors = transaction {
                    // 1. 檢查 Gateway 是否存在
                    val gatewayRow = Gateways.select { Gateways.gatewayId eq gatewayId }.singleOrNull()
                        ?: return@transaction emptyList()
                    
                    val floorId = gatewayRow[Gateways.floorId]
                    val homeId = if (floorId != null) {
                        Floors.select { Floors.floorId eq floorId }.singleOrNull()
                            ?.let { it[Floors.homeId] }
                    } else {
                        null
                    }
                    
                    // 2. 查詢該 Gateway 下的所有 Anchor
                    Anchors.select { Anchors.gatewayId eq gatewayId }.map { row ->
                        AnchorData(
                            id = row[Anchors.anchorId],
                            gatewayId = gatewayId,
                            homeId = homeId,
                            floorId = floorId,
                            name = row[Anchors.name],
                            macAddress = row[Anchors.macAddress],
                            position = row[Anchors.position].let { Json.decodeFromString(it) },
                            cloudData = row[Anchors.cloudData]?.let { Json.decodeFromString(it) },
                            status = row[Anchors.status],
                            isBound = row[Anchors.isBound],
                            createdAt = row[Anchors.createdAt].format(DateTimeFormatter.ISO_LOCAL_DATE_TIME)
                        )
                    }
                }
                
                call.respond(anchors)
            } catch (e: Exception) {
                call.respond(
                    HttpStatusCode.InternalServerError,
                    ApiResponse<Nothing>(success = false, message = "獲取 Gateway 下的 Anchor 失敗: ${e.message}")
                )
            }
        }
    }
}

