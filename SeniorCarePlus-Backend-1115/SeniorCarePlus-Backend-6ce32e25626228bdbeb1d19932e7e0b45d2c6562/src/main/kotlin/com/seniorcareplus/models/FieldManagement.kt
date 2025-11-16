package com.seniorcareplus.models

import kotlinx.serialization.Serializable
import java.time.LocalDateTime

/**
 * 場域數據模型 (Home)
 */
@Serializable
data class HomeData(
    val id: String,
    val name: String,
    val description: String? = null,
    val address: String? = null,
    val createdAt: String
)

/**
 * 創建場域請求
 */
@Serializable
data class CreateHomeRequest(
    val name: String,
    val description: String? = null,
    val address: String? = null
)

/**
 * 更新場域請求
 */
@Serializable
data class UpdateHomeRequest(
    val name: String? = null,
    val description: String? = null,
    val address: String? = null
)

/**
 * 樓層數據模型 (Floor)
 */
@Serializable
data class FloorData(
    val id: String,
    val homeId: String,
    val name: String,
    val level: Int,
    val mapImage: String? = null,
    val dimensions: DimensionsData? = null,
    val calibration: CalibrationData? = null,
    val createdAt: String
)

/**
 * 尺寸數據
 */
@Serializable
data class DimensionsData(
    val width: Double,
    val height: Double,
    val realWidth: Double,
    val realHeight: Double
)

/**
 * 校準數據
 */
@Serializable
data class CalibrationData(
    val originPixel: PixelPoint,
    val originCoordinates: CoordinatePoint? = null,
    val pixelToMeterRatio: Double,
    val scalePoints: ScalePoints? = null,
    val realDistance: Double? = null,
    val isCalibrated: Boolean
)

@Serializable
data class PixelPoint(
    val x: Double,
    val y: Double
)

@Serializable
data class CoordinatePoint(
    val x: Double,
    val y: Double
)

@Serializable
data class ScalePoints(
    val point1: PixelPoint?,
    val point2: PixelPoint?
)

/**
 * 創建樓層請求
 */
@Serializable
data class CreateFloorRequest(
    val homeId: String,
    val name: String,
    val level: Int,
    val mapImage: String? = null,
    val dimensions: DimensionsData? = null,
    val calibration: CalibrationData? = null
)

/**
 * 更新樓層請求
 */
@Serializable
data class UpdateFloorRequest(
    val name: String? = null,
    val level: Int? = null,
    val mapImage: String? = null,
    val dimensions: DimensionsData? = null,
    val calibration: CalibrationData? = null
)

/**
 * 網關數據模型 (Gateway)
 */
@Serializable
data class GatewayData(
    val id: String,
    val floorId: String,
    val name: String,
    val macAddress: String,
    val firmwareVersion: String? = null,
    val cloudData: CloudDataInfo? = null,
    val status: String = "offline",
    val lastSeen: String? = null,
    val createdAt: String
)

/**
 * 雲端數據信息
 */
@Serializable
data class CloudDataInfo(
    val gateway_id: Int,
    val sub_topic: SubTopic
)

@Serializable
data class SubTopic(
    val uplink: String,
    val downlink: String
)

/**
 * 創建網關請求
 */
@Serializable
data class CreateGatewayRequest(
    val floorId: String,
    val name: String,
    val macAddress: String,
    val firmwareVersion: String? = null,
    val cloudData: CloudDataInfo? = null
)

/**
 * 更新網關請求
 */
@Serializable
data class UpdateGatewayRequest(
    val name: String? = null,
    val macAddress: String? = null,
    val firmwareVersion: String? = null,
    val cloudData: CloudDataInfo? = null,
    val status: String? = null,
    val lastSeen: String? = null
)

/**
 * 錨點數據模型 (Anchor)
 * 當 Anchor 未綁定時，gatewayId/homeId/floorId 為 null
 */
@Serializable
data class AnchorData(
    val id: String,
    val gatewayId: String? = null,      // 綁定的 Gateway ID（未綁定時為 null）
    val homeId: String? = null,          // 反查：Gateway 所在的養老院
    val floorId: String? = null,         // 反查：Gateway 所在的樓層
    val name: String,
    val macAddress: String,
    val position: PositionData,
    val cloudData: AnchorCloudData? = null,
    val status: String = "offline",
    val isBound: Boolean = false,        // 是否已綁定到 Gateway
    val createdAt: String
)

/**
 * 位置數據
 */
@Serializable
data class PositionData(
    val x: Double,
    val y: Double,
    val z: Double
)

/**
 * 錨點雲端數據
 */
@Serializable
data class AnchorCloudData(
    val id: Int,
    val name: String,
    val config: AnchorConfig? = null
)

@Serializable
data class AnchorConfig(
    val fw_update: Boolean = false,
    val led: Boolean = true,
    val ble: Boolean = true,
    val initiator: Boolean = false
)

/**
 * 創建錨點請求
 * Anchor 初始創建時不綁定到 Gateway
 */
@Serializable
data class CreateAnchorRequest(
    val name: String,
    val macAddress: String,
    val position: PositionData,
    val cloudData: AnchorCloudData? = null
)

/**
 * 更新錨點請求
 */
@Serializable
data class UpdateAnchorRequest(
    val name: String? = null,
    val macAddress: String? = null,
    val position: PositionData? = null,
    val cloudData: AnchorCloudData? = null,
    val status: String? = null
)

/**
 * 標籤數據模型 (Tag)
 */
@Serializable
data class TagData(
    val id: String,
    val gatewayId: String,
    val name: String,
    val hardwareId: String,
    val cloudData: TagCloudData? = null,
    val boundTo: String? = null,
    val status: String = "offline",
    val createdAt: String
)

/**
 * 標籤雲端數據
 */
@Serializable
data class TagCloudData(
    val id: Int,
    val name: String,
    val config: TagConfig? = null
)

@Serializable
data class TagConfig(
    val fw_update: Boolean = false,
    val led: Boolean = true,
    val ble: Boolean = true
)

/**
 * 創建標籤請求
 */
@Serializable
data class CreateTagRequest(
    val gatewayId: String,
    val name: String,
    val hardwareId: String,
    val cloudData: TagCloudData? = null,
    val boundTo: String? = null
)

/**
 * 更新標籤請求
 */
@Serializable
data class UpdateTagRequest(
    val name: String? = null,
    val hardwareId: String? = null,
    val cloudData: TagCloudData? = null,
    val boundTo: String? = null,
    val status: String? = null
)

/**
 * 通用響應模型
 */
@Serializable
data class ApiResponse<T>(
    val success: Boolean,
    val message: String,
    val data: T? = null,
    val timestamp: Long = System.currentTimeMillis()
)

