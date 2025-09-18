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

                    <div>
                        <h3 className="font-semibold mb-2">設備綁定管理彈跳視窗：</h3>
                        <p>標題: {t('pages:residents.deviceBinding.title')}</p>
                        <p>選擇設備: {t('pages:residents.deviceBinding.selectDevice')}</p>
                        <p>選擇院友: {t('pages:residents.deviceBinding.selectResident')}</p>
                        <p>綁定設置: {t('pages:residents.deviceBinding.bindingSettings')}</p>
                        <p>確認綁定: {t('pages:residents.deviceBinding.confirmBind')}</p>
                    </div>

                    <div>
                        <h3 className="font-semibold mb-2">院友詳情彈跳視窗：</h3>
                        <p>編輯資訊: {t('pages:residents.detailModal.editInfo')}</p>
                        <p>緊急聯絡人: {t('pages:residents.detailModal.emergencyContact')}</p>
                        <p>照護注意事項: {t('pages:residents.detailModal.careNotes')}</p>
                        <p>綁定設備: {t('pages:residents.boundDevices')}</p>
                        <p>添加設備: {t('pages:residents.detailModal.addDevice')}</p>
                        <p>關閉: {t('pages:residents.detailModal.close')}</p>
                        <p>儲存: {t('common:actions.save')}</p>
                    </div>

                    <div>
                        <h3 className="font-semibold mb-2">未綁定設備列表：</h3>
                        <p>未綁定設備: {t('pages:residents.unboundDevices')}</p>
                        <p>設備數量: {t('pages:residents.deviceCount')}</p>
                        <p>綁定按鈕: {t('pages:residents.bindDevice')}</p>
                    </div>

                    <div>
                        <h3 className="font-semibold mb-2">對話框和提示：</h3>
                        <p>導入成功: {t('pages:residents.alerts.importSuccess')}</p>
                        <p>無效格式: {t('pages:residents.alerts.invalidFormat')}</p>
                        <p>導入失敗: {t('pages:residents.alerts.importFailed')}</p>
                        <p>重置確認: {t('pages:residents.confirms.resetSettings')}</p>
                        <p>移除確認: {t('pages:residents.confirms.removeResident')}</p>
                    </div>

                    <div>
                        <h3 className="font-semibold mb-2">設備管理頁面：</h3>
                        <p>頁面標題: {t('pages:deviceManagement.title')}</p>
                        <p>頁面描述: {t('pages:deviceManagement.subtitle')}</p>
                        <p>搜索框: {t('pages:deviceManagement.searchPlaceholder')}</p>
                        <p>篩選按鈕: {t('pages:deviceManagement.filters.all')}, {t('pages:deviceManagement.filters.smartwatch300B')}</p>
                        <p>統計資訊: {t('pages:deviceManagement.stats.totalDevices')}, {t('pages:deviceManagement.stats.activeDevices')}</p>
                        <p>設備列表: {t('pages:deviceManagement.deviceList.title')}</p>
                        <p>新增設備: {t('pages:deviceManagement.actions.addDevice')}</p>
                        <p>替換設備: {t('pages:deviceManagement.replaceModal.title')}</p>
                    </div>

                    <div>
                        <h3 className="font-semibold mb-2">健康監控頁面：</h3>
                        <p>系統標題: {t('pages:health.systemTitle')}</p>
                        <p>監控標題: {t('pages:health.monitoringTitle')}</p>
                        <p>統計資訊: {t('pages:health.stats.totalResidents')}, {t('pages:health.stats.activeDevices')}</p>
                        <p>篩選器: {t('pages:health.filters.全部')}, {t('pages:health.filters.正常')}, {t('pages:health.filters.異常')}</p>
                        <p>患者資訊: {t('pages:health.patientInfo.age')}, {t('pages:health.patientInfo.room')}, {t('pages:health.patientInfo.devices')}</p>
                        <p>監控圖標: {t('pages:health.monitoringIcons.temperature')}, {t('pages:health.monitoringIcons.heartRate')}, {t('pages:health.monitoringIcons.diaper')}</p>
                        <p>患者狀態: {t('pages:health.patientStatus.normal')}, {t('pages:health.patientStatus.error')}, {t('pages:health.patientStatus.attention')}</p>
                    </div>

                    <div>
                        <h3 className="font-semibold mb-2">緊急呼叫頁面：</h3>
                        <p>頁面標題: {t('pages:emergencyCall.title')}</p>
                        <p>頁面描述: {t('pages:emergencyCall.subtitle')}</p>
                        <p>患者選擇: {t('pages:emergencyCall.patient')}, {t('pages:emergencyCall.selectPatient')}</p>
                        <p>位置選擇: {t('pages:emergencyCall.location')}, {t('pages:emergencyCall.selectLocation')}</p>
                        <p>緊急按鈕: {t('pages:emergencyCall.emergencyButton')}</p>
                        <p>緊急類型: {t('pages:emergencyCall.types.fall')}, {t('pages:emergencyCall.types.pain')}, {t('pages:emergencyCall.types.toilet')}</p>
                        <p>呼叫狀態: {t('pages:emergencyCall.status.responding')}, {t('pages:emergencyCall.status.completed')}, {t('pages:emergencyCall.status.cancelled')}</p>
                        <p>呼叫記錄: {t('pages:emergencyCall.callHistory')}, {t('pages:emergencyCall.emptyState.noRecords')}</p>
                        <p>對話框: {t('pages:emergencyCall.modals.selectType.title')}, {t('pages:emergencyCall.modals.cancelCall.title')}</p>
                    </div>

                    <div>
                        <h3 className="font-semibold mb-2">定時提醒頁面：</h3>
                        <p>頁面標題: {t('pages:reminders.title')}</p>
                        <p>頁面描述: {t('pages:reminders.subtitle')}</p>
                        <p>操作按鈕: {t('pages:reminders.addReminder')}</p>
                        <p>今日提醒: {t('pages:reminders.todayReminders')}</p>
                        <p>提醒類型: {t('pages:reminders.types.medication')}, {t('pages:reminders.types.water')}, {t('pages:reminders.types.physicalTherapy')}</p>
                        <p>提醒描述: {t('pages:reminders.descriptions.hypertension')}, {t('pages:reminders.descriptions.diabetes')}, {t('pages:reminders.descriptions.hydration')}</p>
                        <p>完成按鈕: {t('pages:reminders.complete')}</p>
                        <p>功能卡片: {t('pages:reminders.cards.periodic.title')}, {t('pages:reminders.cards.statistics.title')}, {t('pages:reminders.cards.settings.title')}</p>
                    </div>

                    <div>
                        <h3 className="font-semibold mb-2">室內定位頁面：</h3>
                        <p>頁面標題: {t('pages:location.title')}</p>
                        <p>頁面描述: {t('pages:location.subtitle')}</p>
                        <p>選擇區域: {t('pages:location.selectArea.title')}, {t('pages:location.selectArea.nursingHome')}, {t('pages:location.selectArea.floor')}, {t('pages:location.selectArea.gateway')}</p>
                        <p>MQTT狀態: {t('pages:location.mqttStatus.title')}, {t('pages:location.mqttStatus.refreshData')}</p>
                        <p>搜索過濾: {t('pages:location.searchFilter.title')}, {t('pages:location.searchFilter.allStatus')}, {t('pages:location.searchFilter.allDevices')}</p>
                        <p>地圖控制: {t('pages:location.map.zoomIn')}, {t('pages:location.map.zoomOut')}, {t('pages:location.map.resetView')}</p>
                        <p>設備列表: {t('pages:location.deviceList.onlineDevices', { count: 5 })}, {t('pages:location.deviceList.totalDevices', { count: 10 })}</p>
                        <p>狀態標籤: {t('status:resident.status.good')}, {t('status:resident.status.attention')}, {t('status:resident.status.critical')}</p>
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
