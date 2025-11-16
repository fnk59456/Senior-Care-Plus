package com.seniorcareplus.database

import com.zaxxer.hikari.HikariConfig
import com.zaxxer.hikari.HikariDataSource
import org.jetbrains.exposed.sql.*
import org.jetbrains.exposed.sql.transactions.transaction
import org.slf4j.LoggerFactory
import java.sql.DriverManager

/**
 * 數據庫配置
 */
object DatabaseConfig {
    private val logger = LoggerFactory.getLogger(DatabaseConfig::class.java)
    
    /**
     * 初始化數據庫
     */
    fun init() {
        // 嘗試連接PostgreSQL
        if (tryConnectPostgreSQL()) {
            initPostgreSQL()
        } else {
            logger.warn("PostgreSQL連接失敗，使用H2內存數據庫")
            initH2()
        }
    }
    
    /**
     * 測試PostgreSQL連接
     */
    private fun tryConnectPostgreSQL(): Boolean {
        return try {
            // 支援多種PostgreSQL連接格式
            var url = System.getenv("DATABASE_URL") 
                ?: System.getenv("DATABASE_PUBLIC_URL")
                ?: System.getenv("SUPABASE_DATABASE_URL")
                ?: "jdbc:postgresql://localhost:5432/seniorcareplus"
            
            // 診斷：檢查變數引用是否正確解析
            logger.info("🔍 DATABASE_URL 原始值檢查:")
            logger.info("  - 長度: ${url.length}")
            logger.info("  - 前50字符: ${url.take(50)}")
            logger.info("  - 是否包含變數引用: ${url.contains("\${{")}")
            
            // 如果包含變數引用字面量，說明 Railway 沒有正確解析
            if (url.contains("\${{")) {
                logger.error("❌ 錯誤：DATABASE_URL 包含未解析的變數引用: $url")
                logger.error("❌ Railway 變數引用沒有正確解析，請手動設置完整的 DATABASE_URL")
                return false
            }
            
            // 轉換 Railway/Heroku 格式的 URL
            if (url.startsWith("postgres://")) {
                url = url.replace("postgres://", "jdbc:postgresql://")
                logger.info("🔄 轉換 URL: postgres:// -> jdbc:postgresql://")
            } else if (url.startsWith("postgresql://")) {
                url = url.replace("postgresql://", "jdbc:postgresql://")
                logger.info("🔄 轉換 URL: postgresql:// -> jdbc:postgresql://")
            }
            
            // 從 URL 中提取用戶名和密碼（如果包含）
            var user = System.getenv("PGUSER") ?: System.getenv("DATABASE_USER") ?: "postgres"
            var password = System.getenv("PGPASSWORD") ?: System.getenv("DATABASE_PASSWORD") ?: "password"
            
            // 如果 URL 中包含用戶名和密碼，提取它們
            val urlPattern = Regex("jdbc:postgresql://([^:]+):([^@]+)@(.+)")
            val match = urlPattern.find(url)
            if (match != null) {
                user = match.groupValues[1]
                password = match.groupValues[2]
                url = "jdbc:postgresql://${match.groupValues[3]}"
            }
            
            logger.info("測試PostgreSQL連接...")
            logger.info("連接URL: ${url.replace(Regex(":[^:@]+@"), ":***@")}")
            logger.info("用戶: $user")
            
            val connection = DriverManager.getConnection(url, user, password)
            connection.close()
            logger.info("✅ PostgreSQL連接測試成功！")
            true
        } catch (e: Exception) {
            logger.error("❌ PostgreSQL連接測試失敗: ${e.message}", e)
            false
        }
    }
    
    /**
     * 初始化PostgreSQL
     */
    private fun initPostgreSQL() {
        try {
            logger.info("正在初始化PostgreSQL數據庫...")
            
            // 配置HikariCP連接池
            var databaseUrl = System.getenv("DATABASE_URL") 
                ?: System.getenv("DATABASE_PUBLIC_URL")
                ?: System.getenv("SUPABASE_DATABASE_URL")
                ?: "jdbc:postgresql://localhost:5432/seniorcareplus"
            
            // 診斷：檢查變數引用是否正確解析
            logger.info("🔍 DATABASE_URL 原始值檢查:")
            logger.info("  - 長度: ${databaseUrl.length}")
            logger.info("  - 前50字符: ${databaseUrl.take(50)}")
            logger.info("  - 是否包含變數引用: ${databaseUrl.contains("\${{")}")
            
            // 如果包含變數引用字面量，說明 Railway 沒有正確解析
            if (databaseUrl.contains("\${{")) {
                logger.error("❌ 錯誤：DATABASE_URL 包含未解析的變數引用: $databaseUrl")
                logger.error("❌ Railway 變數引用沒有正確解析，請手動設置完整的 DATABASE_URL")
                throw IllegalStateException("DATABASE_URL 變數引用未解析，請手動設置完整連接字串")
            }
            
            // 轉換 Railway/Heroku 格式的 URL (postgres:// 或 postgresql:// -> jdbc:postgresql://)
            if (databaseUrl.startsWith("postgres://")) {
                databaseUrl = databaseUrl.replace("postgres://", "jdbc:postgresql://")
                logger.info("🔄 轉換數據庫 URL 格式: postgres:// -> jdbc:postgresql://")
            } else if (databaseUrl.startsWith("postgresql://")) {
                databaseUrl = databaseUrl.replace("postgresql://", "jdbc:postgresql://")
                logger.info("🔄 轉換數據庫 URL 格式: postgresql:// -> jdbc:postgresql://")
            }
            
            logger.info("📌 連接數據庫: ${databaseUrl.replace(Regex(":[^:@]+@"), ":***@")}")
            
            // 從 URL 中提取用戶名和密碼（如果包含）
            var username = System.getenv("PGUSER") ?: System.getenv("DATABASE_USER") ?: "postgres"
            var password = System.getenv("PGPASSWORD") ?: System.getenv("DATABASE_PASSWORD") ?: "password"
            
            val urlPattern = Regex("jdbc:postgresql://([^:]+):([^@]+)@(.+)")
            val match = urlPattern.find(databaseUrl)
            if (match != null) {
                username = match.groupValues[1]
                password = match.groupValues[2]
                databaseUrl = "jdbc:postgresql://${match.groupValues[3]}"
                logger.info("🔑 從 URL 中提取用戶認證信息")
            }
            
            logger.info("👤 數據庫用戶: $username")
            
            val config = HikariConfig().apply {
                jdbcUrl = databaseUrl
                driverClassName = "org.postgresql.Driver"
                this.username = username
                this.password = password
                
                // 連接池配置
                maximumPoolSize = 10
                minimumIdle = 2
                connectionTimeout = 30000
                idleTimeout = 600000
                maxLifetime = 1800000
                leakDetectionThreshold = 60000
                
                // 性能配置
                addDataSourceProperty("cachePrepStmts", "true")
                addDataSourceProperty("prepStmtCacheSize", "250")
                addDataSourceProperty("prepStmtCacheSqlLimit", "2048")
                
                // Supabase SSL配置
                if (jdbcUrl.contains("supabase")) {
                    addDataSourceProperty("sslmode", "require")
                }
            }
            
            val dataSource = HikariDataSource(config)
            
            // 連接到PostgreSQL數據庫
            Database.connect(dataSource)
            
            logger.info("PostgreSQL數據庫連接成功 (${config.jdbcUrl})")
            
            // 創建表格
            logger.info("⏳ 正在創建數據庫表格...")
            try {
                createTables()
                logger.info("✅ 表格創建邏輯執行完成")
                
                // 驗證表格創建（使用簡單的方式）
                transaction {
                    try {
                        // 嘗試查詢一個已知的表格來驗證創建成功
                        val homesCount = Homes.selectAll().count()
                        logger.info("✅ PostgreSQL數據庫表格創建完成！")
                        logger.info("📋 驗證：homes 表格存在，當前記錄數: $homesCount")
                    } catch (e: Exception) {
                        logger.warn("⚠️ 警告：無法驗證表格創建，但表格創建邏輯已執行")
                        logger.warn("⚠️ 錯誤詳情: ${e.message}")
                    }
                }
            } catch (e: Exception) {
                logger.error("❌ 創建表格失敗: ${e.message}", e)
                throw e
            }
            
        } catch (e: Exception) {
            logger.error("PostgreSQL數據庫初始化失敗: ${e.message}")
            throw e
        }
    }
    
    /**
     * 初始化H2數據庫
     */
    private fun initH2() {
        try {
            logger.info("正在初始化H2文件數據庫...")
            Database.connect(
                url = "jdbc:h2:file:./data/seniorcareplus;AUTO_SERVER=TRUE;MODE=PostgreSQL",
                driver = "org.h2.Driver"
            )
            
            // 創建表格
            createTables()
            
            logger.info("H2文件數據庫初始化完成 (數據保存在 ./data/seniorcareplus.mv.db)")
            
        } catch (e: Exception) {
            logger.error("H2數據庫初始化失敗: ${e.message}")
            throw e
        }
    }
    
    /**
     * 創建表格
     */
    private fun createTables() {
        transaction {
            SchemaUtils.create(
                // 場域管理表
                Homes,
                Floors,
                Gateways,
                Anchors,
                Tags,
                // 患者與健康數據表
                Patients,
                HealthRecords,
                LocationRecords,
                Devices,
                Alerts,
                RemindersTable,
                // Anchor-Gateway 綁定表
                GatewayAnchorBindingHistory
            )
            
            // ✨ 強制執行表遷移 - 確保新欄位被添加
            logger.info("⏳ 正在執行數據庫遷移...")
            try {
                // 為 anchors 表添加 is_bound 欄位
                exec("""
                    ALTER TABLE anchors 
                    ADD COLUMN IF NOT EXISTS is_bound BOOLEAN DEFAULT false;
                """)
                logger.info("✅ 已確保 anchors.is_bound 欄位存在")
            } catch (e: Exception) {
                logger.info("ℹ️  is_bound 欄位可能已存在或遷移已執行: ${e.message}")
            }
            
            try {
                // 修改 gateway_id 為可選（允許 NULL）
                exec("""
                    ALTER TABLE anchors 
                    ALTER COLUMN gateway_id DROP NOT NULL;
                """)
                logger.info("✅ 已將 anchors.gateway_id 修改為可選（nullable）")
            } catch (e: Exception) {
                logger.info("ℹ️  gateway_id 可能已是可選或遷移已執行: ${e.message}")
            }
            
            logger.info("✅ 數據庫遷移檢查完成")
        }
    }
    
    /**
     * 創建測試數據
     */
    fun createTestData() {
        try {
            transaction {
                // 插入測試患者數據
                val testPatients = listOf(
                    Triple("張三", "101", "device_001"),
                    Triple("李四", "102", "device_002"),
                    Triple("王五", "103", "device_003"),
                    Triple("趙六", "104", "device_004"),
                    Triple("陳七", "105", "device_005")
                )
                
                testPatients.forEach { (name, room, deviceId) ->
                    // 檢查患者是否已存在
                    val existingPatient = Patients.select { Patients.deviceId eq deviceId }.singleOrNull()
                    if (existingPatient == null) {
                        Patients.insert {
                            it[Patients.name] = name
                            it[Patients.room] = room
                            it[Patients.deviceId] = deviceId
                            it[age] = (65..85).random()
                            it[gender] = if ((0..1).random() == 0) "男" else "女"
                        }
                        logger.info("創建測試患者: $name (設備ID: $deviceId)")
                    }
                }
            }
            logger.info("測試數據創建完成")
        } catch (e: Exception) {
            logger.error("創建測試數據失敗: ${e.message}")
        }
    }
} 