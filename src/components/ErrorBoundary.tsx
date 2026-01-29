/**
 * 錯誤邊界組件
 */

import React, { Component, ErrorInfo, ReactNode } from 'react'
import { withTranslation, WithTranslation } from 'react-i18next'

interface Props extends WithTranslation {
    children: ReactNode
}

interface State {
    hasError: boolean
    error?: Error
}

class ErrorBoundaryComponent extends Component<Props, State> {
    constructor(props: Props) {
        super(props)
        this.state = { hasError: false }
    }

    static getDerivedStateFromError(error: Error): State {
        return { hasError: true, error }
    }

    componentDidCatch(error: Error, errorInfo: ErrorInfo) {
        console.error(this.props.t('common:error.consolePrefix'), error, errorInfo)
    }

    render() {
        const { t } = this.props
        if (this.state.hasError) {
            return (
                <div className="min-h-screen flex items-center justify-center bg-gray-100">
                    <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-6">
                        <div className="flex items-center mb-4">
                            <div className="flex-shrink-0">
                                <svg className="h-8 w-8 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                                </svg>
                            </div>
                            <div className="ml-3">
                                <h3 className="text-lg font-medium text-gray-900">{t('common:error.title')}</h3>
                            </div>
                        </div>
                        <div className="text-sm text-gray-500 mb-4">
                            <p>{t('common:error.message')}</p>
                            {this.state.error && (
                                <details className="mt-2">
                                    <summary className="cursor-pointer text-red-600">{t('common:error.details')}</summary>
                                    <pre className="mt-2 text-xs bg-gray-100 p-2 rounded overflow-auto">
                                        {this.state.error.toString()}
                                    </pre>
                                </details>
                            )}
                        </div>
                        <button
                            onClick={() => window.location.reload()}
                            className="w-full bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
                        >
                            {t('common:error.reload')}
                        </button>
                    </div>
                </div>
            )
        }

        return this.props.children
    }
}

export const ErrorBoundary = withTranslation()(ErrorBoundaryComponent)


