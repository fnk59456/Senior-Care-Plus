import React, { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Avatar } from '@/components/ui/avatar'
import { Textarea } from '@/components/ui/textarea'
import {
  Search,
  Phone,
  Mail,
  Calendar,
  MapPin,
  Clock,
  Edit,
  CheckCircle,
  Home,
  Info
} from 'lucide-react'

interface Staff {
  id: string
  name: string
  position: string
  department: string
  phone: string
  email: string
  hireDate: string
  status: 'active' | 'on-leave'
  notes: string
  avatar?: string
}

// 示例數據
const mockStaff: Staff[] = [
  {
    id: 'S001',
    name: '張明德',
    position: '護理主任',
    department: '護理部',
    phone: '0912-345-678',
    email: 'zhang.mingde@careplus.com',
    hireDate: '2018-05-15',
    status: 'active',
    notes: '負責所有護理人員的管理和排班工作。擁有10年護理經驗。',
    avatar: '👨‍⚕️'
  },
  {
    id: 'S002',
    name: '李小梅',
    position: '護士',
    department: '護理部',
    phone: '0923-456-789',
    email: 'li.xiaomei@careplus.com',
    hireDate: '2020-03-10',
    status: 'on-leave',
    notes: '專門負責夜班照護工作，對老人照顧很有耐心。',
    avatar: '👩‍⚕️'
  },
  {
    id: 'S003',
    name: '王建國',
    position: '醫生',
    department: '醫療部',
    phone: '0934-567-890',
    email: 'wang.jianguo@careplus.com',
    hireDate: '2019-08-22',
    status: 'active',
    notes: '內科專科醫師，負責住民的日常健康檢查和醫療諮詢。',
    avatar: '👨‍⚕️'
  },
  {
    id: 'S004',
    name: '林美華',
    position: '營養師',
    department: '營養科',
    phone: '0945-678-901',
    email: 'lin.meihua@careplus.com',
    hireDate: '2021-01-18',
    status: 'active',
    notes: '負責規劃住民的營養餐點，有豐富的老人營養管理經驗。',
    avatar: '👩‍🍳'
  },
  {
    id: 'S005',
    name: '陳志偉',
    position: '物理治療師',
    department: '復健科',
    phone: '0956-789-012',
    email: 'chen.zhiwei@careplus.com',
    hireDate: '2020-11-05',
    status: 'active',
    notes: '專精老人復健治療，幫助住民維持身體機能。',
    avatar: '👨‍⚕️'
  },
  {
    id: 'S006',
    name: '黃淑芬',
    position: '社工師',
    department: '社工部',
    phone: '0967-890-123',
    email: 'huang.shufen@careplus.com',
    hireDate: '2019-06-30',
    status: 'active',
    notes: '負責住民的心理輔導和家屬溝通協調工作。',
    avatar: '👩‍💼'
  }
]

export default function StaffManagementPage() {
  const { t } = useTranslation()
  const [staff, setStaff] = useState<Staff[]>(mockStaff)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'on-leave'>('all')
  const [selectedStaff, setSelectedStaff] = useState<Staff | null>(null)
  const [isEditingNotes, setIsEditingNotes] = useState(false)
  const [editedNotes, setEditedNotes] = useState('')

  // 篩選員工
  const filteredStaff = staff.filter(person => {
    const matchesSearch = person.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      person.department.toLowerCase().includes(searchTerm.toLowerCase()) ||
      person.position.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesStatus = statusFilter === 'all' || person.status === statusFilter
    return matchesSearch && matchesStatus
  })

  const handleStaffClick = (person: Staff) => {
    setSelectedStaff(person)
    setEditedNotes(person.notes)
    setIsEditingNotes(false)
  }

  const handleUpdateNotes = () => {
    if (selectedStaff) {
      const updatedStaff = staff.map(person =>
        person.id === selectedStaff.id
          ? { ...person, notes: editedNotes }
          : person
      )
      setStaff(updatedStaff)
      setSelectedStaff({ ...selectedStaff, notes: editedNotes })
      setIsEditingNotes(false)
    }
  }

  const getStatusBadge = (status: string) => {
    return status === 'active' ? (
      <Badge className="bg-green-100 text-green-800 hover:bg-green-100">
        <CheckCircle className="w-3 h-3 mr-1" />
        {t('pages:staffManagement.status.active')}
      </Badge>
    ) : (
      <Badge className="bg-orange-100 text-orange-800 hover:bg-orange-100">
        <Home className="w-3 h-3 mr-1" />
        {t('pages:staffManagement.status.onLeave')}
      </Badge>
    )
  }

  return (
    <div className="p-6 space-y-6">
      {/* 頁面標題 */}
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">{t('pages:staffManagement.title')}</h1>
      </div>

      {/* 搜索和篩選 */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder={t('pages:staffManagement.searchPlaceholder')}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <div className="flex gap-2">
              <Button
                variant={statusFilter === 'all' ? 'default' : 'outline'}
                onClick={() => setStatusFilter('all')}
                className="whitespace-nowrap"
              >
                {t('pages:staffManagement.filters.all')}
              </Button>
              <Button
                variant={statusFilter === 'active' ? 'default' : 'outline'}
                onClick={() => setStatusFilter('active')}
                className="whitespace-nowrap"
              >
                <CheckCircle className="w-4 h-4 mr-1" />
                {t('pages:staffManagement.filters.active')}
              </Button>
              <Button
                variant={statusFilter === 'on-leave' ? 'default' : 'outline'}
                onClick={() => setStatusFilter('on-leave')}
                className="whitespace-nowrap"
              >
                <Home className="w-4 h-4 mr-1" />
                {t('pages:staffManagement.filters.onLeave')}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 員工列表 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>{t('pages:staffManagement.staffList.title')}</span>
            <span className="text-sm font-normal text-muted-foreground">
              {t('pages:staffManagement.staffList.count', { count: filteredStaff.length })}
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {filteredStaff.map((person) => (
              <div
                key={person.id}
                onClick={() => handleStaffClick(person)}
                className="flex items-center justify-between p-4 rounded-lg border hover:bg-gray-50 cursor-pointer transition-colors"
              >
                <div className="flex items-center space-x-4">
                  <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center text-2xl">
                    {person.avatar || '👤'}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-lg">{person.name}</h3>
                      {getStatusBadge(person.status)}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {t('pages:staffManagement.staffList.id')}: {person.id}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {person.position}, {person.department}
                    </p>
                  </div>
                </div>
                <div className="flex items-center">
                  <Info className="w-5 h-5 text-blue-500" />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* 員工詳情彈窗 */}
      {selectedStaff && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <Card className="w-full max-w-md max-h-[90vh] overflow-y-auto">
            <CardHeader className="text-center">
              <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center text-3xl mx-auto mb-2">
                {selectedStaff.avatar || '👤'}
              </div>
              <CardTitle className="text-xl">{selectedStaff.name}</CardTitle>
              <p className="text-muted-foreground">
                {selectedStaff.position}, {selectedStaff.department}
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* 聯繫方式 */}
              <div>
                <h4 className="font-semibold text-blue-600 mb-2">{t('pages:staffManagement.detailModal.contactInfo')}</h4>
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Phone className="w-4 h-4" />
                    <span className="text-sm">{selectedStaff.phone}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Mail className="w-4 h-4" />
                    <span className="text-sm">{selectedStaff.email}</span>
                  </div>
                </div>
              </div>

              {/* 工作資訊 */}
              <div>
                <h4 className="font-semibold text-blue-600 mb-2">{t('pages:staffManagement.detailModal.workInfo')}</h4>
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4" />
                  <span className="text-sm">{t('pages:staffManagement.detailModal.hireDate')}: {selectedStaff.hireDate}</span>
                </div>
              </div>

              {/* 備註資訊 */}
              <div>
                <h4 className="font-semibold text-blue-600 mb-2">{t('pages:staffManagement.detailModal.notes')}</h4>
                {isEditingNotes ? (
                  <div className="space-y-2">
                    <Textarea
                      value={editedNotes}
                      onChange={(e) => setEditedNotes(e.target.value)}
                      placeholder={t('pages:staffManagement.detailModal.notesPlaceholder')}
                      rows={4}
                    />
                    <div className="flex gap-2">
                      <Button onClick={handleUpdateNotes} size="sm">
                        {t('common:actions.save')}
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => setIsEditingNotes(false)}
                        size="sm"
                      >
                        {t('common:actions.cancel')}
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="bg-gray-50 p-3 rounded-lg">
                    <p className="text-sm whitespace-pre-wrap">
                      {selectedStaff.notes || t('pages:staffManagement.detailModal.noNotes')}
                    </p>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setIsEditingNotes(true)}
                      className="mt-2 p-0 h-auto"
                    >
                      <Edit className="w-4 h-4 mr-1" />
                      {t('pages:staffManagement.detailModal.editNotes')}
                    </Button>
                  </div>
                )}
              </div>

              {/* 底部按鈕 */}
              <div className="flex gap-2 pt-4">
                <Button
                  variant="outline"
                  onClick={() => setSelectedStaff(null)}
                  className="flex-1"
                >
                  {t('common:actions.cancel')}
                </Button>
                <Button
                  onClick={() => setIsEditingNotes(true)}
                  className="flex-1"
                >
                  {t('pages:staffManagement.detailModal.updateNotes')}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}