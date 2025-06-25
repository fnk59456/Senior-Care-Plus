import React, { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import { 
  Search, 
  Phone, 
  User, 
  Calendar, 
  MapPin, 
  Edit,
  Heart,
  AlertTriangle,
  AlertCircle,
  Info,
  Users
} from 'lucide-react'

interface Resident {
  id: string
  name: string
  age: number
  gender: string
  room: string
  status: 'good' | 'attention' | 'critical'
  emergencyContact: {
    name: string
    relationship: string
    phone: string
  }
  careNotes: string
  avatar?: string
}

// 示例數據
const mockResidents: Resident[] = [
  {
    id: 'R001',
    name: '王大明',
    age: 78,
    gender: '男',
    room: '201',
    status: 'good',
    emergencyContact: {
      name: '王小明',
      relationship: '兒子',
      phone: '0912-345-678'
    },
    careNotes: '有輕微高血壓，每日需測量血壓兩次。喜歡散步。',
    avatar: '👴'
  },
  {
    id: 'R002',
    name: '李小華',
    age: 85,
    gender: '女',
    room: '202',
    status: 'attention',
    emergencyContact: {
      name: '李美麗',
      relationship: '女兒',
      phone: '0923-456-789'
    },
    careNotes: '糖尿病患者，需要定時服藥和監測血糖。飲食需特別注意。',
    avatar: '👵'
  },
  {
    id: 'R003',
    name: '張小鳳',
    age: 80,
    gender: '女',
    room: '203',
    status: 'good',
    emergencyContact: {
      name: '張志明',
      relationship: '兒子',
      phone: '0934-567-890'
    },
    careNotes: '身體狀況良好，喜歡園藝活動。每週三次復健運動。',
    avatar: '👵'
  },
  {
    id: 'R004',
    name: '孫大龍',
    age: 90,
    gender: '男',
    room: '204',
    status: 'critical',
    emergencyContact: {
      name: '孫小龍',
      relationship: '兒子',
      phone: '0945-678-901'
    },
    careNotes: '心臟疾病，需密切監控生命體徵。行動不便，需輪椅協助。',
    avatar: '👴'
  },
  {
    id: 'R005',
    name: '陳美玲',
    age: 75,
    gender: '女',
    room: '205',
    status: 'good',
    emergencyContact: {
      name: '陳志偉',
      relationship: '兒子',
      phone: '0956-789-012'
    },
    careNotes: '關節炎，天氣變化時需要特別關注。喜歡音樂治療。',
    avatar: '👵'
  },
  {
    id: 'R006',
    name: '林志強',
    age: 82,
    gender: '男',
    room: '206',
    status: 'attention',
    emergencyContact: {
      name: '林小華',
      relationship: '女兒',
      phone: '0967-890-123'
    },
    careNotes: '輕度失智症，需要耐心溝通。容易忘記吃藥，需提醒。',
    avatar: '👴'
  }
]

export default function ResidentsPage() {
  const [residents, setResidents] = useState<Resident[]>(mockResidents)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | 'good' | 'attention' | 'critical'>('all')
  const [selectedResident, setSelectedResident] = useState<Resident | null>(null)
  const [isEditingNotes, setIsEditingNotes] = useState(false)
  const [editedNotes, setEditedNotes] = useState('')

  // 篩選院友
  const filteredResidents = residents.filter(resident => {
    const matchesSearch = resident.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         resident.room.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         resident.id.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesStatus = statusFilter === 'all' || resident.status === statusFilter
    return matchesSearch && matchesStatus
  })

  const handleResidentClick = (resident: Resident) => {
    setSelectedResident(resident)
    setEditedNotes(resident.careNotes)
    setIsEditingNotes(false)
  }

  const handleUpdateNotes = () => {
    if (selectedResident) {
      const updatedResidents = residents.map(resident => 
        resident.id === selectedResident.id 
          ? { ...resident, careNotes: editedNotes }
          : resident
      )
      setResidents(updatedResidents)
      setSelectedResident({ ...selectedResident, careNotes: editedNotes })
      setIsEditingNotes(false)
    }
  }

  const getStatusInfo = (status: string) => {
    switch (status) {
      case 'good':
        return {
          badge: (
            <Badge className="bg-green-100 text-green-800 hover:bg-green-100">
              <Heart className="w-3 h-3 mr-1 fill-current" />
              良好
            </Badge>
          ),
          icon: '💚',
          bgColor: 'bg-green-100'
        }
      case 'attention':
        return {
          badge: (
            <Badge className="bg-orange-100 text-orange-800 hover:bg-orange-100">
              <AlertTriangle className="w-3 h-3 mr-1" />
              需注意
            </Badge>
          ),
          icon: '⚠️',
          bgColor: 'bg-orange-100'
        }
      case 'critical':
        return {
          badge: (
            <Badge className="bg-red-100 text-red-800 hover:bg-red-100">
              <AlertCircle className="w-3 h-3 mr-1" />
              危急
            </Badge>
          ),
          icon: '🚨',
          bgColor: 'bg-red-100'
        }
      default:
        return {
          badge: <Badge>未知</Badge>,
          icon: '❓',
          bgColor: 'bg-gray-100'
        }
    }
  }

  return (
    <div className="p-6 space-y-6">
      {/* 頁面標題 */}
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">院友管理</h1>
      </div>

      {/* 搜索和篩選 */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="搜索院友姓名、編號或房間號..."
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
                全部
              </Button>
              <Button
                variant={statusFilter === 'good' ? 'default' : 'outline'}
                onClick={() => setStatusFilter('good')}
                className="whitespace-nowrap"
              >
                <Heart className="w-4 h-4 mr-1" />
                良好
              </Button>
              <Button
                variant={statusFilter === 'attention' ? 'default' : 'outline'}
                onClick={() => setStatusFilter('attention')}
                className="whitespace-nowrap"
              >
                <AlertTriangle className="w-4 h-4 mr-1" />
                注意
              </Button>
              <Button
                variant={statusFilter === 'critical' ? 'default' : 'outline'}
                onClick={() => setStatusFilter('critical')}
                className="whitespace-nowrap"
              >
                <AlertCircle className="w-4 h-4 mr-1" />
                危急
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 院友列表 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>院友列表</span>
            <span className="text-sm font-normal text-muted-foreground">
              共 {filteredResidents.length} 位院友
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {filteredResidents.map((resident) => {
              const statusInfo = getStatusInfo(resident.status)
              return (
                <div
                  key={resident.id}
                  onClick={() => handleResidentClick(resident)}
                  className="flex items-center justify-between p-4 rounded-lg border hover:bg-gray-50 cursor-pointer transition-colors"
                >
                  <div className="flex items-center space-x-4">
                    <div className={`w-12 h-12 rounded-full ${statusInfo.bgColor} flex items-center justify-center text-2xl`}>
                      {statusInfo.icon}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold text-lg">{resident.name}</h3>
                        {statusInfo.badge}
                      </div>
                      <p className="text-sm text-muted-foreground">
                        編號: {resident.id}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        房間: {resident.room}, {resident.age} 歲
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center">
                    <Info className="w-5 h-5 text-blue-500" />
                  </div>
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>

      {/* 院友詳情彈窗 */}
      {selectedResident && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <Card className="w-full max-w-md max-h-[90vh] overflow-y-auto">
            <CardHeader className="text-center">
              <div className={`w-16 h-16 rounded-full ${getStatusInfo(selectedResident.status).bgColor} flex items-center justify-center text-3xl mx-auto mb-2`}>
                {getStatusInfo(selectedResident.status).icon}
              </div>
              <CardTitle className="text-xl">{selectedResident.name}</CardTitle>
              <p className="text-muted-foreground">
                {selectedResident.age} 歲, {selectedResident.gender}, 房間 {selectedResident.room}
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* 緊急聯絡人 */}
              <div>
                <h4 className="font-semibold text-blue-600 mb-2">緊急聯絡人</h4>
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Users className="w-4 h-4" />
                    <span className="text-sm">
                      {selectedResident.emergencyContact.name} ({selectedResident.emergencyContact.relationship})
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Phone className="w-4 h-4" />
                    <span className="text-sm">{selectedResident.emergencyContact.phone}</span>
                  </div>
                </div>
              </div>

              {/* 照護注意事項 */}
              <div>
                <h4 className="font-semibold text-blue-600 mb-2">照護注意事項</h4>
                {isEditingNotes ? (
                  <div className="space-y-2">
                    <Textarea
                      value={editedNotes}
                      onChange={(e) => setEditedNotes(e.target.value)}
                      placeholder="請輸入照護注意事項..."
                      rows={4}
                    />
                    <div className="flex gap-2">
                      <Button onClick={handleUpdateNotes} size="sm">
                        儲存
                      </Button>
                      <Button 
                        variant="outline" 
                        onClick={() => setIsEditingNotes(false)}
                        size="sm"
                      >
                        取消
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="bg-gray-50 p-3 rounded-lg">
                    <p className="text-sm whitespace-pre-wrap">
                      {selectedResident.careNotes || '暫無照護注意事項'}
                    </p>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setIsEditingNotes(true)}
                      className="mt-2 p-0 h-auto"
                    >
                      <Edit className="w-4 h-4 mr-1" />
                      編輯注意事項
                    </Button>
                  </div>
                )}
              </div>

              {/* 底部按鈕 */}
              <div className="flex gap-2 pt-4">
                <Button
                  variant="outline"
                  onClick={() => setSelectedResident(null)}
                  className="flex-1"
                >
                  取消
                </Button>
                <Button
                  onClick={() => setIsEditingNotes(true)}
                  className="flex-1"
                >
                  更新照護注意事項
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}
