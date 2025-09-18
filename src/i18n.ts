import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import LanguageDetector from 'i18next-browser-languagedetector'

// 導入語言資源
import zhCommon from './locales/zh/common.json'
import zhNavigation from './locales/zh/navigation.json'
import zhPages from './locales/zh/pages.json'
import zhStatus from './locales/zh/status.json'

import enCommon from './locales/en/common.json'
import enNavigation from './locales/en/navigation.json'
import enPages from './locales/en/pages.json'
import enStatus from './locales/en/status.json'

import jpCommon from './locales/jp/common.json'
import jpNavigation from './locales/jp/navigation.json'
import jpPages from './locales/jp/pages.json'
import jpStatus from './locales/jp/status.json'

const resources = {
    zh: {
        common: zhCommon,
        navigation: zhNavigation,
        pages: zhPages,
        status: zhStatus,
    },
    en: {
        common: enCommon,
        navigation: enNavigation,
        pages: enPages,
        status: enStatus,
    },
    jp: {
        common: jpCommon,
        navigation: jpNavigation,
        pages: jpPages,
        status: jpStatus,
    },
}

i18n
    .use(LanguageDetector)
    .use(initReactI18next)
    .init({
        resources,
        fallbackLng: 'zh', // 預設語言為中文
        debug: process.env.NODE_ENV === 'development',

        // 語言檢測選項
        detection: {
            order: ['localStorage', 'navigator', 'htmlTag'],
            caches: ['localStorage'],
        },

        // 命名空間配置
        defaultNS: 'common',
        ns: ['common', 'navigation', 'pages', 'status'],

        // 插值選項
        interpolation: {
            escapeValue: false, // React 已經處理了 XSS
        },

        // 回退語言配置
        fallbackNS: 'common',
    })

export default i18n
