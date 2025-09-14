import React, { createContext, useContext, useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'

interface LanguageContextType {
    currentLanguage: string
    changeLanguage: (language: string) => void
    availableLanguages: { code: string; name: string; flag: string }[]
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined)

const availableLanguages = [
    { code: 'zh', name: '中文', flag: '🇨🇳' },
    { code: 'en', name: 'English', flag: '🇺🇸' },
]

export function LanguageProvider({ children }: { children: React.ReactNode }) {
    const { i18n } = useTranslation()
    const [currentLanguage, setCurrentLanguage] = useState(i18n.language || 'zh')

    const changeLanguage = (language: string) => {
        i18n.changeLanguage(language)
        setCurrentLanguage(language)
        localStorage.setItem('preferred-language', language)
    }

    // 初始化時從 localStorage 讀取語言設定
    useEffect(() => {
        const savedLanguage = localStorage.getItem('preferred-language')
        if (savedLanguage && availableLanguages.some(lang => lang.code === savedLanguage)) {
            changeLanguage(savedLanguage)
        }
    }, [])

    // 監聽 i18n 語言變化
    useEffect(() => {
        const handleLanguageChange = (lng: string) => {
            setCurrentLanguage(lng)
        }

        i18n.on('languageChanged', handleLanguageChange)
        return () => {
            i18n.off('languageChanged', handleLanguageChange)
        }
    }, [i18n])

    return (
        <LanguageContext.Provider
            value={{
                currentLanguage,
                changeLanguage,
                availableLanguages,
            }}
        >
            {children}
        </LanguageContext.Provider>
    )
}

export function useLanguage() {
    const context = useContext(LanguageContext)
    if (context === undefined) {
        throw new Error('useLanguage must be used within a LanguageProvider')
    }
    return context
}
