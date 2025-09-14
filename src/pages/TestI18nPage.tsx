import React from 'react'
import { useTranslation } from 'react-i18next'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { LanguageSwitcher } from '@/components/LanguageSwitcher'

export default function TestI18nPage() {
    const { t } = useTranslation()

    return (
        <div className="p-6 space-y-6">
            <div className="flex items-center justify-between">
                <h1 className="text-3xl font-bold">雙語功能測試頁面</h1>
                <LanguageSwitcher />
            </div>

            <div className="grid gap-6 grid-cols-1 md:grid-cols-2">
                <Card>
                    <CardHeader>
                        <CardTitle>基本翻譯測試</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div>
                            <h3 className="font-semibold mb-2">應用程式資訊：</h3>
                            <p>標題: {t('common:app.title')}</p>
                            <p>副標題: {t('common:app.subtitle')}</p>
                            <p>版本: {t('common:app.version')}</p>
                        </div>

                        <div>
                            <h3 className="font-semibold mb-2">操作按鈕：</h3>
                            <div className="flex gap-2 flex-wrap">
                                <Button size="sm">{t('common:actions.save')}</Button>
                                <Button size="sm" variant="outline">{t('common:actions.cancel')}</Button>
                                <Button size="sm" variant="outline">{t('common:actions.edit')}</Button>
                                <Button size="sm" variant="outline">{t('common:actions.delete')}</Button>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>頁面翻譯測試</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div>
                            <h3 className="font-semibold mb-2">首頁內容：</h3>
                            <p>標題: {t('pages:home.title')}</p>
                            <p>副標題: {t('pages:home.subtitle')}</p>
                        </div>

                        <div>
                            <h3 className="font-semibold mb-2">院友管理：</h3>
                            <p>標題: {t('pages:residents.title')}</p>
                            <p>副標題: {t('pages:residents.subtitle')}</p>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>狀態翻譯測試</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div>
                            <h3 className="font-semibold mb-2">設備狀態：</h3>
                            <p>活躍: {t('status:device.status.active')}</p>
                            <p>離線: {t('status:device.status.offline')}</p>
                            <p>異常: {t('status:device.status.error')}</p>
                        </div>

                        <div>
                            <h3 className="font-semibold mb-2">院友狀態：</h3>
                            <p>良好: {t('status:resident.status.good')}</p>
                            <p>需注意: {t('status:resident.status.attention')}</p>
                            <p>危急: {t('status:resident.status.critical')}</p>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>導航翻譯測試</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div>
                            <h3 className="font-semibold mb-2">側邊欄項目：</h3>
                            <p>首頁: {t('navigation:sidebar.items.home.name')}</p>
                            <p>健康監控: {t('navigation:sidebar.items.health.name')}</p>
                            <p>院友管理: {t('navigation:sidebar.items.residents.name')}</p>
                            <p>設置: {t('navigation:sidebar.items.settings.name')}</p>
                        </div>
                    </CardContent>
                </Card>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>插值變數測試</CardTitle>
                </CardHeader>
                <CardContent>
                    <p>院友總數: {t('pages:residents.list.count', { count: 25 })}</p>
                    <p>設備數量: {t('pages:residents.deviceManagement.count', { count: 8 })}</p>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>體溫和心率監測翻譯測試</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div>
                        <h3 className="font-semibold mb-2">體溫監測：</h3>
                        <p>標題: {t('pages:temperature.title')}</p>
                        <p>副標題: {t('pages:temperature.subtitle')}</p>
                        <p>當前體溫: {t('pages:temperature.currentTemp')}</p>
                        <p>正常範圍: {t('pages:temperature.normalRange')}</p>
                    </div>

                    <div>
                        <h3 className="font-semibold mb-2">心率監測：</h3>
                        <p>標題: {t('pages:heartRate.title')}</p>
                        <p>副標題: {t('pages:heartRate.subtitle')}</p>
                        <p>當前心率: {t('pages:heartRate.currentRate')}</p>
                        <p>正常範圍: {t('pages:heartRate.normalRange')}</p>
                    </div>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>院友管理修復測試</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div>
                        <h3 className="font-semibold mb-2">院友列表按鈕：</h3>
                        <p>管理設備: {t('pages:residents.actions.manageDevices')}</p>
                        <p>編輯: {t('pages:residents.actions.edit')}</p>
                        <p>移除: {t('pages:residents.actions.remove')}</p>
                        <p>設備數量: 2 {t('pages:residents.deviceCount')}</p>
                        <p>編號: {t('pages:residents.id')} R002</p>
                        <p>房間: {t('pages:residents.room')} 202 • 70 {t('pages:residents.ageUnit')}</p>
                        <p>綁定設備: {t('pages:residents.boundDevices')}</p>
                    </div>

                    <div>
                        <h3 className="font-semibold mb-2">彈跳視窗內容：</h3>
                        <p>標題: {t('pages:residents.modal.addResident')}</p>
                        <p>姓名: {t('pages:residents.modal.name')}</p>
                        <p>年齡: {t('pages:residents.modal.age')}</p>
                        <p>性別: {t('pages:residents.modal.gender')}</p>
                        <p>房間號: {t('pages:residents.modal.room')}</p>
                        <p>狀態: {t('pages:residents.modal.status')}</p>
                        <p>緊急聯絡人: {t('pages:residents.modal.emergencyContactName')}</p>
                        <p>取消: {t('common:actions.cancel')}</p>
                    </div>

                    <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                        <h4 className="font-semibold text-green-800 mb-2">✅ 修復狀態</h4>
                        <p className="text-green-700 text-sm">
                            翻譯鍵值結構已修復，現在應該顯示正確的中文文字而不是程式碼變數。
                        </p>
                    </div>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>監測頁面功能方塊修復測試</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div>
                        <h3 className="font-semibold mb-2">體溫監測連線狀態：</h3>
                        <p>標題: {t('pages:temperature.connectionStatus.title')}</p>
                        <p>本地 MQTT: {t('pages:temperature.connectionStatus.localMqtt')}</p>
                        <p>雲端 MQTT: {t('pages:temperature.connectionStatus.cloudMqtt')}</p>
                        <p>錯誤: {t('pages:temperature.connectionStatus.error')}</p>
                        <p>提示: {t('pages:temperature.connectionStatus.hint')}</p>
                    </div>

                    <div>
                        <h3 className="font-semibold mb-2">心率監測連線狀態：</h3>
                        <p>標題: {t('pages:heartRate.connectionStatus.title')}</p>
                        <p>本地 MQTT: {t('pages:heartRate.connectionStatus.localMqtt')}</p>
                        <p>雲端 MQTT: {t('pages:heartRate.connectionStatus.cloudMqtt')}</p>
                        <p>錯誤: {t('pages:heartRate.connectionStatus.error')}</p>
                        <p>提示: {t('pages:heartRate.connectionStatus.hint')}</p>
                    </div>
                </CardContent>
            </Card>
        </div>
    )
}
