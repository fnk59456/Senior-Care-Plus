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
 * 場域管理相關路由 (簡化版 - 不含刪除功能)
 */
fun Route.fieldManagementRoutes() {
    route("/api") {
        // ==================== Homes 路由 ====================
        
        // 獲取所有場域
        get("/homes") {
            try {
                val homes = transaction {
                    Homes.selectAll().map { row ->
                        HomeData(
                            id = row[Homes.homeId],
                            name = row[Homes.name],
                            description = row[Homes.description],
                            address = row[Homes.address],
                            createdAt = row[Homes.createdAt].format(DateTimeFormatter.ISO_LOCAL_DATE_TIME)
                        )
                    }
                }
                call.respond(homes)
            } catch (e: Exception) {
                call.respond(
                    HttpStatusCode.InternalServerError,
                    ApiResponse<Nothing>(
                        success = false,
                        message = "獲取場域列表失敗: ${e.message}"
                    )
                )
            }
        }
        
        // 根據ID獲取單個場域
        get("/homes/{id}") {
            try {
                val id = call.parameters["id"] ?: return@get call.respond(
                    HttpStatusCode.BadRequest,
                    ApiResponse<Nothing>(success = false, message = "缺少場域ID")
                )
                
                val home = transaction {
                    Homes.select { Homes.homeId eq id }.singleOrNull()?.let { row ->
                        HomeData(
                            id = row[Homes.homeId],
                            name = row[Homes.name],
                            description = row[Homes.description],
                            address = row[Homes.address],
                            createdAt = row[Homes.createdAt].format(DateTimeFormatter.ISO_LOCAL_DATE_TIME)
                        )
                    }
                }
                
                if (home != null) {
                    call.respond(home)
                } else {
                    call.respond(
                        HttpStatusCode.NotFound,
                        ApiResponse<Nothing>(success = false, message = "場域不存在")
                    )
                }
            } catch (e: Exception) {
                call.respond(
                    HttpStatusCode.InternalServerError,
                    ApiResponse<Nothing>(success = false, message = "獲取場域失敗: ${e.message}")
                )
            }
        }
        
        // 創建場域
        post("/homes") {
            try {
                val request = call.receive<CreateHomeRequest>()
                val homeId = "home_${System.currentTimeMillis()}"
                
                transaction {
                    Homes.insert {
                        it[Homes.homeId] = homeId
                        it[name] = request.name
                        it[description] = request.description
                        it[address] = request.address
                    }
                }
                
                val newHome = transaction {
                    Homes.select { Homes.homeId eq homeId }.single().let { row ->
                        HomeData(
                            id = row[Homes.homeId],
                            name = row[Homes.name],
                            description = row[Homes.description],
                            address = row[Homes.address],
                            createdAt = row[Homes.createdAt].format(DateTimeFormatter.ISO_LOCAL_DATE_TIME)
                        )
                    }
                }
                
                call.respond(HttpStatusCode.Created, newHome)
            } catch (e: Exception) {
                call.respond(
                    HttpStatusCode.InternalServerError,
                    ApiResponse<Nothing>(success = false, message = "創建場域失敗: ${e.message}")
                )
            }
        }
        
        // 更新場域
        put("/homes/{id}") {
            try {
                val id = call.parameters["id"] ?: return@put call.respond(
                    HttpStatusCode.BadRequest,
                    ApiResponse<Nothing>(success = false, message = "缺少場域ID")
                )
                val request = call.receive<UpdateHomeRequest>()
                
                val updated = transaction {
                    val existing = Homes.select { Homes.homeId eq id }.singleOrNull()
                    if (existing == null) {
                        return@transaction null
                    }
                    
                    Homes.update({ Homes.homeId eq id }) {
                        request.name?.let { name -> it[Homes.name] = name }
                        request.description?.let { desc -> it[description] = desc }
                        request.address?.let { addr -> it[address] = addr }
                    }
                    
                    Homes.select { Homes.homeId eq id }.single().let { row ->
                        HomeData(
                            id = row[Homes.homeId],
                            name = row[Homes.name],
                            description = row[Homes.description],
                            address = row[Homes.address],
                            createdAt = row[Homes.createdAt].format(DateTimeFormatter.ISO_LOCAL_DATE_TIME)
                        )
                    }
                }
                
                if (updated != null) {
                    call.respond(updated)
                } else {
                    call.respond(
                        HttpStatusCode.NotFound,
                        ApiResponse<Nothing>(success = false, message = "場域不存在")
                    )
                }
            } catch (e: Exception) {
                call.respond(
                    HttpStatusCode.InternalServerError,
                    ApiResponse<Nothing>(success = false, message = "更新場域失敗: ${e.message}")
                )
            }
        }
        
        // 刪除場域
        delete("/homes/{id}") {
            try {
                val id = call.parameters["id"] ?: return@delete call.respond(
                    HttpStatusCode.BadRequest,
                    ApiResponse<Nothing>(success = false, message = "缺少場域ID")
                )
                
                val deleted = transaction {
                    // 檢查場域是否存在
                    val existing = Homes.select { Homes.homeId eq id }.singleOrNull()
                    if (existing == null) {
                        return@transaction false
                    }
                    
                    // 刪除該場域下的所有樓層（CASCADE）
                    Floors.deleteWhere { Floors.homeId eq id }
                    
                    // 刪除場域
                    val deletedCount = Homes.deleteWhere { Homes.homeId eq id }
                    deletedCount > 0
                }
                
                if (deleted) {
                    call.respond(
                        HttpStatusCode.OK,
                        ApiResponse<Nothing>(success = true, message = "場域已刪除")
                    )
                } else {
                    call.respond(
                        HttpStatusCode.NotFound,
                        ApiResponse<Nothing>(success = false, message = "場域不存在")
                    )
                }
            } catch (e: Exception) {
                call.respond(
                    HttpStatusCode.InternalServerError,
                    ApiResponse<Nothing>(success = false, message = "刪除場域失敗: ${e.message}")
                )
            }
        }
        
        // 根據場域ID獲取樓層列表
        get("/homes/{homeId}/floors") {
            try {
                val homeId = call.parameters["homeId"] ?: return@get call.respond(
                    HttpStatusCode.BadRequest,
                    ApiResponse<Nothing>(success = false, message = "缺少場域ID")
                )
                
                val floors = transaction {
                    Floors.select { Floors.homeId eq homeId }.map { row ->
                        FloorData(
                            id = row[Floors.floorId],
                            homeId = row[Floors.homeId],
                            name = row[Floors.name],
                            level = row[Floors.level],
                            mapImage = row[Floors.mapImage],
                            dimensions = row[Floors.dimensions]?.let { Json.decodeFromString(it) },
                            calibration = row[Floors.calibration]?.let { Json.decodeFromString(it) },
                            createdAt = row[Floors.createdAt].format(DateTimeFormatter.ISO_LOCAL_DATE_TIME)
                        )
                    }
                }
                
                call.respond(floors)
            } catch (e: Exception) {
                call.respond(
                    HttpStatusCode.InternalServerError,
                    ApiResponse<Nothing>(success = false, message = "獲取樓層列表失敗: ${e.message}")
                )
            }
        }
        
        // ==================== Floors 路由 ====================
        
        // 獲取所有樓層
        get("/floors") {
            try {
                val floors = transaction {
                    Floors.selectAll().map { row ->
                        FloorData(
                            id = row[Floors.floorId],
                            homeId = row[Floors.homeId],
                            name = row[Floors.name],
                            level = row[Floors.level],
                            mapImage = row[Floors.mapImage],
                            dimensions = row[Floors.dimensions]?.let { Json.decodeFromString(it) },
                            calibration = row[Floors.calibration]?.let { Json.decodeFromString(it) },
                            createdAt = row[Floors.createdAt].format(DateTimeFormatter.ISO_LOCAL_DATE_TIME)
                        )
                    }
                }
                call.respond(floors)
            } catch (e: Exception) {
                call.respond(
                    HttpStatusCode.InternalServerError,
                    ApiResponse<Nothing>(success = false, message = "獲取樓層列表失敗: ${e.message}")
                )
            }
        }
        
        // 根據ID獲取單個樓層
        get("/floors/{id}") {
            try {
                val id = call.parameters["id"] ?: return@get call.respond(
                    HttpStatusCode.BadRequest,
                    ApiResponse<Nothing>(success = false, message = "缺少樓層ID")
                )
                
                val floor = transaction {
                    Floors.select { Floors.floorId eq id }.singleOrNull()?.let { row ->
                        FloorData(
                            id = row[Floors.floorId],
                            homeId = row[Floors.homeId],
                            name = row[Floors.name],
                            level = row[Floors.level],
                            mapImage = row[Floors.mapImage],
                            dimensions = row[Floors.dimensions]?.let { Json.decodeFromString(it) },
                            calibration = row[Floors.calibration]?.let { Json.decodeFromString(it) },
                            createdAt = row[Floors.createdAt].format(DateTimeFormatter.ISO_LOCAL_DATE_TIME)
                        )
                    }
                }
                
                if (floor != null) {
                    call.respond(floor)
                } else {
                    call.respond(
                        HttpStatusCode.NotFound,
                        ApiResponse<Nothing>(success = false, message = "樓層不存在")
                    )
                }
            } catch (e: Exception) {
                call.respond(
                    HttpStatusCode.InternalServerError,
                    ApiResponse<Nothing>(success = false, message = "獲取樓層失敗: ${e.message}")
                )
            }
        }
        
        // 創建樓層
        post("/floors") {
            try {
                val request = call.receive<CreateFloorRequest>()
                val floorId = "floor_${System.currentTimeMillis()}"
                
                transaction {
                    Floors.insert {
                        it[Floors.floorId] = floorId
                        it[homeId] = request.homeId
                        it[name] = request.name
                        it[level] = request.level
                        it[mapImage] = request.mapImage
                        it[dimensions] = request.dimensions?.let { d -> Json.encodeToString(d) }
                        it[calibration] = request.calibration?.let { c -> Json.encodeToString(c) }
                    }
                }
                
                val newFloor = transaction {
                    Floors.select { Floors.floorId eq floorId }.single().let { row ->
                        FloorData(
                            id = row[Floors.floorId],
                            homeId = row[Floors.homeId],
                            name = row[Floors.name],
                            level = row[Floors.level],
                            mapImage = row[Floors.mapImage],
                            dimensions = row[Floors.dimensions]?.let { Json.decodeFromString(it) },
                            calibration = row[Floors.calibration]?.let { Json.decodeFromString(it) },
                            createdAt = row[Floors.createdAt].format(DateTimeFormatter.ISO_LOCAL_DATE_TIME)
                        )
                    }
                }
                
                call.respond(HttpStatusCode.Created, newFloor)
            } catch (e: Exception) {
                call.respond(
                    HttpStatusCode.InternalServerError,
                    ApiResponse<Nothing>(success = false, message = "創建樓層失敗: ${e.message}")
                )
            }
        }
        
        // 更新樓層
        put("/floors/{id}") {
            try {
                val id = call.parameters["id"] ?: return@put call.respond(
                    HttpStatusCode.BadRequest,
                    ApiResponse<Nothing>(success = false, message = "缺少樓層ID")
                )
                val request = call.receive<UpdateFloorRequest>()
                
                val updated = transaction {
                    val existing = Floors.select { Floors.floorId eq id }.singleOrNull()
                    if (existing == null) {
                        return@transaction null
                    }
                    
                    Floors.update({ Floors.floorId eq id }) {
                        request.name?.let { name -> it[Floors.name] = name }
                        request.level?.let { lv -> it[level] = lv }
                        request.mapImage?.let { img -> it[mapImage] = img }
                        request.dimensions?.let { d -> it[dimensions] = Json.encodeToString(d) }
                        request.calibration?.let { c -> it[calibration] = Json.encodeToString(c) }
                    }
                    
                    Floors.select { Floors.floorId eq id }.single().let { row ->
                        FloorData(
                            id = row[Floors.floorId],
                            homeId = row[Floors.homeId],
                            name = row[Floors.name],
                            level = row[Floors.level],
                            mapImage = row[Floors.mapImage],
                            dimensions = row[Floors.dimensions]?.let { Json.decodeFromString(it) },
                            calibration = row[Floors.calibration]?.let { Json.decodeFromString(it) },
                            createdAt = row[Floors.createdAt].format(DateTimeFormatter.ISO_LOCAL_DATE_TIME)
                        )
                    }
                }
                
                if (updated != null) {
                    call.respond(updated)
                } else {
                    call.respond(
                        HttpStatusCode.NotFound,
                        ApiResponse<Nothing>(success = false, message = "樓層不存在")
                    )
                }
            } catch (e: Exception) {
                call.respond(
                    HttpStatusCode.InternalServerError,
                    ApiResponse<Nothing>(success = false, message = "更新樓層失敗: ${e.message}")
                )
            }
        }
        
        // 刪除樓層
        delete("/floors/{id}") {
            try {
                val id = call.parameters["id"] ?: return@delete call.respond(
                    HttpStatusCode.BadRequest,
                    ApiResponse<Nothing>(success = false, message = "缺少樓層ID")
                )
                
                val deleted = transaction {
                    // 檢查樓層是否存在
                    val existing = Floors.select { Floors.floorId eq id }.singleOrNull()
                    if (existing == null) {
                        return@transaction false
                    }
                    
                    // 刪除樓層
                    val deletedCount = Floors.deleteWhere { Floors.floorId eq id }
                    deletedCount > 0
                }
                
                if (deleted) {
                    call.respond(
                        HttpStatusCode.OK,
                        ApiResponse<Nothing>(success = true, message = "樓層已刪除")
                    )
                } else {
                    call.respond(
                        HttpStatusCode.NotFound,
                        ApiResponse<Nothing>(success = false, message = "樓層不存在")
                    )
                }
            } catch (e: Exception) {
                call.respond(
                    HttpStatusCode.InternalServerError,
                    ApiResponse<Nothing>(success = false, message = "刪除樓層失敗: ${e.message}")
                )
            }
        }
        
        // ==================== Gateways 路由 ====================
        
        // 獲取所有網關
        get("/gateways") {
            try {
                val gateways = transaction {
                    Gateways.selectAll().map { row ->
                        GatewayData(
                            id = row[Gateways.gatewayId],
                            floorId = row[Gateways.floorId],
                            name = row[Gateways.name],
                            macAddress = row[Gateways.macAddress],
                            firmwareVersion = row[Gateways.firmwareVersion],
                            cloudData = row[Gateways.cloudData]?.let { Json.decodeFromString(it) },
                            status = row[Gateways.status],
                            lastSeen = row[Gateways.lastSeen]?.format(DateTimeFormatter.ISO_LOCAL_DATE_TIME),
                            createdAt = row[Gateways.createdAt].format(DateTimeFormatter.ISO_LOCAL_DATE_TIME)
                        )
                    }
                }
                call.respond(gateways)
            } catch (e: Exception) {
                call.respond(
                    HttpStatusCode.InternalServerError,
                    ApiResponse<Nothing>(success = false, message = "獲取網關列表失敗: ${e.message}")
                )
            }
        }
        
        // 根據樓層ID獲取網關
        get("/floors/{floorId}/gateways") {
            try {
                val floorId = call.parameters["floorId"] ?: return@get call.respond(
                    HttpStatusCode.BadRequest,
                    ApiResponse<Nothing>(success = false, message = "缺少樓層ID")
                )
                
                val gateways = transaction {
                    Gateways.select { Gateways.floorId eq floorId }.map { row ->
                        GatewayData(
                            id = row[Gateways.gatewayId],
                            floorId = row[Gateways.floorId],
                            name = row[Gateways.name],
                            macAddress = row[Gateways.macAddress],
                            firmwareVersion = row[Gateways.firmwareVersion],
                            cloudData = row[Gateways.cloudData]?.let { Json.decodeFromString(it) },
                            status = row[Gateways.status],
                            lastSeen = row[Gateways.lastSeen]?.format(DateTimeFormatter.ISO_LOCAL_DATE_TIME),
                            createdAt = row[Gateways.createdAt].format(DateTimeFormatter.ISO_LOCAL_DATE_TIME)
                        )
                    }
                }
                call.respond(gateways)
            } catch (e: Exception) {
                call.respond(
                    HttpStatusCode.InternalServerError,
                    ApiResponse<Nothing>(success = false, message = "獲取樓層網關列表失敗: ${e.message}")
                )
            }
        }
        
        // ==================== Anchors 路由 ====================
        
        // 獲取所有錨點
        get("/anchors") {
            try {
                val anchors = transaction {
                    Anchors.selectAll().map { row ->
                        val gatewayId = row[Anchors.gatewayId]
                        val (homeId, floorId) = if (gatewayId != null) {
                            val gatewayRow = Gateways.select { Gateways.gatewayId eq gatewayId }.singleOrNull()
                            if (gatewayRow != null) {
                                val fId = gatewayRow[Gateways.floorId]
                                val hId = if (fId != null) {
                                    Floors.select { Floors.floorId eq fId }.singleOrNull()
                                        ?.let { it[Floors.homeId] }
                                } else {
                                    null
                                }
                                Pair(hId, fId)
                            } else {
                                Pair(null, null)
                            }
                        } else {
                            Pair(null, null)
                        }
                        
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
                    ApiResponse<Nothing>(success = false, message = "獲取錨點列表失敗: ${e.message}")
                )
            }
        }
        
        // 創建錨點（初始狀態未綁定）
        post("/anchors") {
            try {
                val request = call.receive<CreateAnchorRequest>()
                val anchorId = "anchor_${System.currentTimeMillis()}"
                
                transaction {
                    Anchors.insert {
                        it[Anchors.anchorId] = anchorId
                        it[gatewayId] = null  // 初始未綁定
                        it[name] = request.name
                        it[macAddress] = request.macAddress
                        it[position] = Json.encodeToString(request.position)
                        it[cloudData] = request.cloudData?.let { cd -> Json.encodeToString(cd) }
                        it[isBound] = false
                    }
                }
                
                val newAnchor = transaction {
                    Anchors.select { Anchors.anchorId eq anchorId }.single().let { row ->
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
                            isBound = false,
                            createdAt = row[Anchors.createdAt].format(DateTimeFormatter.ISO_LOCAL_DATE_TIME)
                        )
                    }
                }
                
                call.respond(HttpStatusCode.Created, newAnchor)
            } catch (e: Exception) {
                call.respond(
                    HttpStatusCode.InternalServerError,
                    ApiResponse<Nothing>(success = false, message = "創建錨點失敗: ${e.message}")
                )
            }
        }
        
        // 根據ID獲取單個錨點
        get("/anchors/{id}") {
            try {
                val id = call.parameters["id"] ?: return@get call.respond(
                    HttpStatusCode.BadRequest,
                    ApiResponse<Nothing>(success = false, message = "缺少錨點ID")
                )
                
                val anchor = transaction {
                    Anchors.select { Anchors.anchorId eq id }.singleOrNull()?.let { row ->
                        val gatewayId = row[Anchors.gatewayId]
                        val (homeId, floorId) = if (gatewayId != null) {
                            val gatewayRow = Gateways.select { Gateways.gatewayId eq gatewayId }.singleOrNull()
                            if (gatewayRow != null) {
                                val fId = gatewayRow[Gateways.floorId]
                                val hId = if (fId != null) {
                                    Floors.select { Floors.floorId eq fId }.singleOrNull()
                                        ?.let { it[Floors.homeId] }
                                } else {
                                    null
                                }
                                Pair(hId, fId)
                            } else {
                                Pair(null, null)
                            }
                        } else {
                            Pair(null, null)
                        }
                        
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
                
                if (anchor != null) {
                    call.respond(anchor)
                } else {
                    call.respond(
                        HttpStatusCode.NotFound,
                        ApiResponse<Nothing>(success = false, message = "錨點不存在")
                    )
                }
            } catch (e: Exception) {
                call.respond(
                    HttpStatusCode.InternalServerError,
                    ApiResponse<Nothing>(success = false, message = "獲取錨點失敗: ${e.message}")
                )
            }
        }
        
        // 更新錨點
        put("/anchors/{id}") {
            try {
                val id = call.parameters["id"] ?: return@put call.respond(
                    HttpStatusCode.BadRequest,
                    ApiResponse<Nothing>(success = false, message = "缺少錨點ID")
                )
                val request = call.receive<UpdateAnchorRequest>()
                
                val updated = transaction {
                    val existing = Anchors.select { Anchors.anchorId eq id }.singleOrNull()
                    if (existing == null) {
                        return@transaction null
                    }
                    
                    Anchors.update({ Anchors.anchorId eq id }) {
                        request.name?.let { name -> it[Anchors.name] = name }
                        request.macAddress?.let { mac -> it[macAddress] = mac }
                        request.position?.let { pos -> it[position] = Json.encodeToString(pos) }
                        request.cloudData?.let { cd -> it[cloudData] = Json.encodeToString(cd) }
                        request.status?.let { st -> it[status] = st }
                    }
                    
                    Anchors.select { Anchors.anchorId eq id }.single().let { row ->
                        val gatewayId = row[Anchors.gatewayId]
                        val (homeId, floorId) = if (gatewayId != null) {
                            val gatewayRow = Gateways.select { Gateways.gatewayId eq gatewayId }.singleOrNull()
                            if (gatewayRow != null) {
                                val fId = gatewayRow[Gateways.floorId]
                                val hId = if (fId != null) {
                                    Floors.select { Floors.floorId eq fId }.singleOrNull()
                                        ?.let { it[Floors.homeId] }
                                } else {
                                    null
                                }
                                Pair(hId, fId)
                            } else {
                                Pair(null, null)
                            }
                        } else {
                            Pair(null, null)
                        }
                        
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
                
                if (updated != null) {
                    call.respond(updated)
                } else {
                    call.respond(
                        HttpStatusCode.NotFound,
                        ApiResponse<Nothing>(success = false, message = "錨點不存在")
                    )
                }
            } catch (e: Exception) {
                call.respond(
                    HttpStatusCode.InternalServerError,
                    ApiResponse<Nothing>(success = false, message = "更新錨點失敗: ${e.message}")
                )
            }
        }
        
        // 刪除錨點
        delete("/anchors/{id}") {
            try {
                val id = call.parameters["id"] ?: return@delete call.respond(
                    HttpStatusCode.BadRequest,
                    ApiResponse<Nothing>(success = false, message = "缺少錨點ID")
                )
                
                val deleted = transaction {
                    val existing = Anchors.select { Anchors.anchorId eq id }.singleOrNull()
                    if (existing == null) {
                        return@transaction false
                    }
                    
                    val deletedCount = Anchors.deleteWhere { Anchors.anchorId eq id }
                    deletedCount > 0
                }
                
                if (deleted) {
                    call.respond(
                        HttpStatusCode.OK,
                        ApiResponse<Nothing>(success = true, message = "錨點已刪除")
                    )
                } else {
                    call.respond(
                        HttpStatusCode.NotFound,
                        ApiResponse<Nothing>(success = false, message = "錨點不存在")
                    )
                }
            } catch (e: Exception) {
                call.respond(
                    HttpStatusCode.InternalServerError,
                    ApiResponse<Nothing>(success = false, message = "刪除錨點失敗: ${e.message}")
                )
            }
        }
    }
}
