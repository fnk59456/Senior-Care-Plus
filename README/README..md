長者照護系統 (Senior Care Plus)
這是一個專為長者護理設計的Android應用程式，提供多種功能來輔助長者照護和管理。

This is an Android application designed for elderly care, providing various functions to assist in elderly care and management.

專案概述 | Project Overview
長者照護系統是使用Kotlin和Jetpack Compose構建的Android應用，專注於提供全面的長者照護功能。應用程式提供健康監測、位置追蹤、提醒設置、用戶管理等功能，幫助照顧者和長者獲得更好的照護體驗。

The Senior Care Plus system is an Android application built with Kotlin and Jetpack Compose, focusing on providing comprehensive elderly care functions. The application offers health monitoring, location tracking, reminder settings, user management, and other features to help caregivers and the elderly achieve a better care experience.

專案架構 | Project Architecture
檔案結構 | File Structure
app/
├── src/
│   ├── main/
│   │   ├── java/
│   │   │   └── com/
│   │   │       └── seniorcareplus/
│   │   │           └── app/
│   │   │               ├── auth/            # 用戶認證相關代碼 | User authentication code
│   │   │               │   └── UserManager.kt # 用戶管理器 | User manager
│   │   │               ├── database/        # 資料庫相關代碼 | Database related code
│   │   │               │   └── AppDatabase.kt # SQLite資料庫助手 | SQLite database helper
│   │   │               ├── models/          # 資料模型 | Data models
│   │   │               │   └── UserProfile.kt # 用戶個人資料模型 | User profile model
│   │   │               ├── reminder/        # 提醒功能相關代碼 | Reminder feature code
│   │   │               │   ├── ReminderManager.kt       # 提醒管理器 | Reminder manager
│   │   │               │   ├── ReminderReceiver.kt      # 提醒廣播接收器 | Reminder broadcast receiver
│   │   │               │   ├── ReminderAlertDialog.kt   # 提醒彈窗界面 | Reminder alert dialog
│   │   │               │   ├── ReminderFullScreenDialog.kt # 全屏提醒對話框 | Full-screen reminder dialog
│   │   │               │   └── ProcessedReminders # 提醒處理系統 | Reminder processing system
│   │   │               ├── ui/              # UI相關代碼 | UI related code
│   │   │               │   ├── components/  # 可重用UI組件 | Reusable UI components
│   │   │               │   │   ├── AbnormalFilterChip.kt  # 異常篩選元件 | Abnormal filter component
│   │   │               │   │   └── TimeRangeChip.kt      # 時間範圍選擇元件 | Time range selection component
│   │   │               │   ├── screens/     # 各功能螢幕 | Feature screens
│   │   │               │   │   ├── HomeScreen.kt        # 主頁界面 | Home screen
│   │   │               │   │   ├── MapScreen.kt         # 地圖界面 | Map screen
│   │   │               │   │   ├── NotificationScreen.kt # 通知界面 | Notification screen
│   │   │               │   │   ├── SettingsScreen.kt    # 設置界面 | Settings screen
│   │   │               │   │   ├── TimerScreen.kt       # 定時器界面 | Timer screen
│   │   │               │   │   ├── HeartRateScreen.kt   # 心率監測界面 | Heart rate monitoring screen
│   │   │               │   │   ├── TemperatureScreen.kt # 體溫監測界面 | Temperature monitoring screen
│   │   │               │   │   ├── DiaperScreen.kt      # 尿布監測界面 | Diaper monitoring screen
│   │   │               │   │   ├── ButtonScreen.kt      # 緊急按鈕界面 | Emergency button screen
│   │   │               │   │   ├── LoginScreen.kt       # 登入界面 | Login screen
│   │   │               │   │   ├── RegisterScreen.kt    # 註冊界面 | Registration screen
│   │   │               │   │   ├── ForgotPasswordScreen.kt # 忘記密碼界面 | Forgot password screen
│   │   │               │   │   ├── VerificationCodeScreen.kt # 驗證碼界面 | Verification code screen
│   │   │               │   │   ├── ResetPasswordScreen.kt # 重設密碼界面 | Reset password screen
│   │   │               │   │   ├── ChangePasswordScreen.kt # 更改密碼界面 | Change password screen
│   │   │               │   │   ├── ProfileScreen.kt     # 個人資料界面 | Profile screen
│   │   │               │   │   ├── ProfileEditScreen.kt # 個人資料編輯界面 | Profile editing screen
│   │   │               │   │   ├── ReminderViewModel.kt # 提醒視圖模型 | Reminder view model
│   │   │               │   │   ├── MonitorScreen.kt     # 監控中心界面 | Monitoring center screen
│   │   │               │   │   ├── IssueReportScreen.kt # 問題報告界面 | Issue reporting screen
│   │   │               │   │   ├── MailboxScreen.kt     # 信箱界面 | Mailbox screen
│   │   │               │   │   ├── AboutUsScreen.kt     # 關於我們界面 | About us screen
│   │   │               │   │   ├── ResidentManagementScreen.kt # 院友管理界面 | Resident management screen
│   │   │               │   │   ├── StaffManagementScreen.kt # 員工管理界面 | Staff management screen
│   │   │               │   │   └── EquipmentManagementScreen.kt # 設備管理界面 | Equipment management screen
│   │   │               │   ├── theme/       # 主題相關代碼 | Theme related code
│   │   │               │   │   ├── Color.kt             # 顏色定義 | Color definitions
│   │   │               │   │   ├── Theme.kt             # 主題設置 | Theme settings
│   │   │               │   │   ├── Type.kt              # 字型設置 | Typography settings
│   │   │               │   │   └── LanguageManager.kt   # 語言管理器 | Language manager
│   │   │               │   ├── gallery/     # 圖庫相關代碼 | Gallery related code
│   │   │               │   ├── home/        # 主頁相關代碼 | Home related code
│   │   │               │   └── slideshow/   # 幻燈片相關代碼 | Slideshow related code
│   │   │               ├── utils/           # 工具類 | Utility classes
│   │   │               │   └── UserManager.kt # 用戶管理工具 | User management utility
│   │   │               ├── MainActivity.kt  # 主活動 | Main activity
│   │   │               │   └── ProcessedReminders # 提醒處理系統 | Reminder processing system
│   │   │               └── MyApplication.kt # 應用程式類 | Application class
│   │   ├── res/              # 資源文件 | Resource files
│   │   └── AndroidManifest.xml # 應用程式清單 | Application manifest
│   ├── androidTest/          # Android測試代碼 | Android test code
│   └── test/                 # 單元測試代碼 | Unit test code
├── build.gradle.kts          # 專案構建腳本 | Project build script
└── proguard-rules.pro        # ProGuard規則 | ProGuard rules
主要模組說明 | Main Module Description
1. 用戶認證模組 (auth) | User Authentication Module
UserManager.kt: 處理用戶登入、註冊、登出和個人資料管理 Handles user login, registration, logout and profile management
支援多種用戶類型：院友、家屬、員工、管理人員和開發人員 Supports multiple user types: residents, family members, staff, administrators, and developers
整合SQLite資料庫和SharedPreferences進行用戶資料持久化 Integrates SQLite database and SharedPreferences for user data persistence
2. 資料庫模組 (database) | Database Module
AppDatabase.kt: SQLite資料庫助手，管理資料庫操作 SQLite database helper, manages database operations
支援用戶資料、體溫記錄等資料的存儲和查詢 Supports storage and querying of user data, temperature records, etc.
提供版本遷移和資料庫升級功能 Provides version migration and database upgrade functionality
3. 提醒系統 (reminder) | Reminder System
ReminderManager.kt: 提醒排程管理，與Android系統的AlarmManager整合 Reminder scheduling management, integrated with Android's AlarmManager
ReminderReceiver.kt: 接收系統提醒通知的廣播接收器 Broadcast receiver for system reminder notifications
ReminderAlertDialog.kt 和 ReminderFullScreenDialog.kt: 提醒顯示界面 Reminder display interfaces
支援每週重複提醒設置和貪睡功能 Supports weekly recurring reminders and snooze functionality
4. 界面模組 (ui) | Interface Module
screens: 包含所有功能界面，如主頁、監測界面、設置界面等 Contains all functional interfaces, such as home page, monitoring interfaces, settings interface, etc.
components: 可重用的UI組件，如異常篩選器、時間範圍選擇器等 Reusable UI components, such as abnormal filters, time range selectors, etc.
theme: 主題和語言設置，支援深色模式和中英文雙語 Theme and language settings, supporting dark mode and bilingual interfaces (Chinese and English)
主要功能 | Main Features
1. 用戶管理系統 | User Management System
登入與註冊: 支援用戶創建帳號和安全登入 Login and Registration: Supports user account creation and secure login
個人資料管理: 提供詳細的個人資料設置，包括姓名、性別、生日、聯絡資訊等 Profile Management: Provides detailed profile settings, including name, gender, birthday, contact information, etc.
多用戶類型: 支援不同角色的用戶，包括院友、家屬、員工和管理人員 Multiple User Types: Supports different user roles, including residents, family members, staff, and administrators
資料持久化: 登入狀態和用戶資訊在應用重啟後保持不變 Data Persistence: Login status and user information remain unchanged after application restart
2. 健康監測功能 | Health Monitoring Features
體溫監測: 記錄和追蹤用戶體溫數據，支援異常數據提醒 Temperature Monitoring: Records and tracks user temperature data, supports abnormal data alerts

圖表顯示體溫變化趨勢 | Charts display temperature change trends
按日期和時間範圍篩選數據 | Filter data by date and time range
異常體溫高亮顯示 | Highlight abnormal temperatures
心率監測: 記錄和檢視心率數據 Heart Rate Monitoring: Records and views heart rate data

圖表顯示心率變化 | Charts display heart rate changes
檢測異常心率並提醒 | Detect abnormal heart rates and send alerts
尿布監測: 追蹤尿布更換時間和狀態 Diaper Monitoring: Tracks diaper change times and status

提醒更換尿布 | Reminds to change diapers
記錄更換歷史 | Records change history
3. 提醒系統 | Reminder System
多功能提醒: 設置各種類型的提醒，如用藥提醒、檢查提醒等 Multi-functional Reminders: Set various types of reminders, such as medication reminders, check-up reminders, etc.
週期性提醒: 支援每週特定日期的重複提醒設置 Periodic Reminders: Supports recurring reminder settings for specific days of the week
提醒通知: 使用系統通知和彈窗來提醒用戶 Reminder Notifications: Uses system notifications and pop-ups to remind users
貪睡功能: 可暫時延遲提醒 Snooze Function: Can temporarily delay reminders
用戶綁定: 提醒數據與用戶帳號關聯，確保資料隔離 User Binding: Reminder data is associated with user accounts, ensuring data isolation
4. 位置追蹤功能 | Location Tracking Function
地圖顯示: 整合地圖功能，顯示用戶位置 Map Display: Integrates map functionality, displays user location
安全區域: 設置安全區域，離開時發出警報 Safety Zones: Sets up safety zones, issues alerts when leaving
位置歷史: 記錄位置歷史資料 Location History: Records historical location data
5. 管理功能 | Management Functions
院友管理: 管理長者資訊和照護需求 Resident Management: Manages elderly information and care needs
員工管理: 管理護理人員和其他工作人員 Staff Management: Manages nursing staff and other personnel
設備管理: 追蹤和管理照護設備 Equipment Management: Tracks and manages care equipment
6. 其他功能 | Other Functions
緊急呼叫: 快速求助功能 Emergency Call: Quick help function
問題報告: 回報系統問題或提出建議 Issue Reporting: Report system problems or make suggestions
通知系統: 接收重要通知和消息 Notification System: Receives important notices and messages
設置選項: 自定義應用程式外觀和行為 Setting Options: Customize