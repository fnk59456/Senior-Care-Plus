package com.seniorcareplus.models

import kotlinx.serialization.Serializable

/**
 * Gateway-Anchor 綁定數據模型
 * 用於記錄 Anchor 綁定到哪個 Gateway 的關係
 */
@Serializable
data class GatewayAnchorBindingData(
    val id: String,                    // 綁定記錄 ID
    val gatewayId: String,             // Gateway ID
    val anchorId: String,              // Anchor ID
    val status: String = "active",     // active, inactive
    val createdAt: String
)

/**
 * 創建 Gateway-Anchor 綁定請求
 */
@Serializable
data class CreateGatewayAnchorBindingRequest(
    val gatewayId: String,
    val anchorId: String
)

/**
 * 更新 Gateway-Anchor 綁定請求
 */
@Serializable
data class UpdateGatewayAnchorBindingRequest(
    val status: String? = null
)

/**
 * 獲取 Gateway 下的所有 Anchor 響應
 */
@Serializable
data class GatewayWithAnchorsResponse(
    val gateway: GatewayData,
    val anchors: List<AnchorData>
)

/**
 * Anchor 綁定狀態檢查
 */
@Serializable
data class AnchorBindingStatus(
    val anchorId: String,
    val isBound: Boolean,
    val gatewayId: String? = null,
    val gatewayName: String? = null,
    val floorId: String? = null
)

/**
 * Anchor 綁定到 Gateway 的請求
 * 流程：前端 MQTT 收到 Anchor 數據 → 前端點擊"綁定" → 調用此 API
 */
@Serializable
data class BindAnchorToGatewayRequest(
    val gatewayId: String  // 要綁定的 Gateway ID
)

/**
 * Anchor 解綁的請求
 */
@Serializable
data class UnbindAnchorRequest(
    val reason: String? = null  // 解綁原因（可選）
)

