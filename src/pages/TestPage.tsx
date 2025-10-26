/**
 * 測試頁面 - 用於排除問題
 */

import React from 'react'

export default function TestPage() {
    return (
        <div className="p-8">
            <h1 className="text-2xl font-bold mb-4">測試頁面</h1>
            <p className="text-gray-600">如果您能看到這個頁面，說明 React 應用正常運行。</p>

            <div className="mt-4 p-4 bg-green-100 rounded">
                <h2 className="font-bold text-green-800">✅ 基本功能正常</h2>
                <p className="text-green-700">React 渲染正常</p>
            </div>
        </div>
    )
}


