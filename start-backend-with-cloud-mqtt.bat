@echo off
REM 使用云端 MQTT 配置启动后端服务器

echo ========================================
echo 启动后端服务器（使用云端 MQTT）
echo ========================================
echo.

REM 设置云端 MQTT 配置
set MQTT_URL=wss://067ec32ef1344d3bb20c4e53abdde99a.s1.eu.hivemq.cloud:8884/mqtt
set MQTT_USERNAME=testweb1
set MQTT_PASSWORD=Aa000000

echo MQTT 配置:
echo   URL: %MQTT_URL%
echo   用户名: %MQTT_USERNAME%
echo.

REM 启动后端
node test-backend-with-db.js

