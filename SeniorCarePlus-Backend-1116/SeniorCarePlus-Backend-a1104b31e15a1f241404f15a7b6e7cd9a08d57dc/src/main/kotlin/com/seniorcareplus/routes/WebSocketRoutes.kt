package com.seniorcareplus.routes

import io.ktor.server.application.*
import io.ktor.server.routing.*
import io.ktor.server.websocket.*
import io.ktor.websocket.*
import org.slf4j.LoggerFactory

/**
 * WebSocket相關路由 - 簡化版
 */
fun Route.webSocketRoutes() {
    val logger = LoggerFactory.getLogger("WebSocketRoutes")
    
    webSocket("/ws/health") {
        logger.info("健康數據WebSocket客戶端已連接")
        
        try {
            // 發送歡迎消息
            send(Frame.Text("""
                {
                    "type": "welcome",
                    "message": "已連接到SeniorCarePlus健康數據流",
                    "timestamp": ${System.currentTimeMillis()}
                }
            """.trimIndent()))
            
            // 保持連接活躍
            for (frame in incoming) {
                // 處理客戶端消息（如果需要）
                logger.debug("收到WebSocket消息: $frame")
            }
        } catch (e: Exception) {
            logger.error("WebSocket錯誤: ${e.message}")
        } finally {
            logger.info("健康數據WebSocket客戶端已斷開")
        }
    }
    
    webSocket("/ws/alerts") {
        logger.info("警報WebSocket客戶端已連接")
        
        try {
            // 發送歡迎消息
            send(Frame.Text("""
                {
                    "type": "welcome",
                    "message": "已連接到SeniorCarePlus警報流",
                    "timestamp": ${System.currentTimeMillis()}
                }
            """.trimIndent()))
            
            // 保持連接活躍
            for (frame in incoming) {
                logger.debug("收到WebSocket消息: $frame")
            }
        } catch (e: Exception) {
            logger.error("WebSocket錯誤: ${e.message}")
        } finally {
            logger.info("警報WebSocket客戶端已斷開")
        }
    }
} 