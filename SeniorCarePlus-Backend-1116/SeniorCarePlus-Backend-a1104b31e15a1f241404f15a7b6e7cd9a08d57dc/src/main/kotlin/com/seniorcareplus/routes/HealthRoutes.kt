package com.seniorcareplus.routes

import io.ktor.http.*
import io.ktor.server.application.*
import io.ktor.server.response.*
import io.ktor.server.routing.*

/**
 * 健康數據相關路由 - 簡化版
 */
fun Route.healthRoutes() {
    route("/api/health") {
        get("/status") {
            call.respond(mapOf(
                "status" to "healthy",
                "service" to "SeniorCarePlus Backend",
                "mqtt_status" to "running",
                "timestamp" to System.currentTimeMillis()
            ))
        }
        
        get("/patients") {
            call.respond(mapOf(
                "success" to true,
                "message" to "患者列表",
                "data" to emptyList<Any>(),
                "timestamp" to System.currentTimeMillis()
            ))
        }
        
        get("/alerts") {
            call.respond(mapOf(
                "success" to true,
                "message" to "警報列表",
                "data" to emptyList<Any>(),
                "timestamp" to System.currentTimeMillis()
            ))
        }
    }
} 