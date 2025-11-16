# Stage 1: 構建應用
FROM gradle:8.4-jdk17 AS builder

WORKDIR /app

# 複製 Gradle 配置文件
COPY build.gradle.kts settings.gradle.kts gradle.properties ./
COPY gradle ./gradle

# 下載依賴（利用 Docker 緩存）
RUN gradle dependencies --no-daemon || true

# 複製源代碼
COPY src ./src

# 構建應用（跳過測試以加快構建速度）
RUN gradle clean build -x test --no-daemon

# Stage 2: 運行應用
FROM eclipse-temurin:17-jre-alpine

WORKDIR /app

# 安裝必要的工具（用於健康檢查）
RUN apk add --no-cache curl

# 從構建階段複製 JAR 文件
COPY --from=builder /app/build/libs/*.jar app.jar

# 暴露端口
EXPOSE 8080

# 設置 JVM 參數（優化內存使用）
ENV JAVA_OPTS="-Xms256m -Xmx512m -XX:+UseG1GC -XX:MaxGCPauseMillis=200"

# 健康檢查（增加啟動等待時間）
HEALTHCHECK --interval=30s --timeout=5s --start-period=120s --retries=5 \
  CMD curl -f http://localhost:8080/health || exit 1

# 設置環境變數（Railway 會自動提供 PORT）
ENV PORT=8080

# 啟動應用
CMD java $JAVA_OPTS -Dktor.deployment.port=$PORT -jar app.jar
