import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Link } from "react-router-dom"
import {
  PlusCircle, Search, User, UserCheck,
  Filter, Heart, Calendar, MoreHorizontal
} from "lucide-react"

const residents = [
  {
    id: "001",
    name: "王大明",
    age: 78,
    room: "101",
    status: "正常",
    healthStatus: "良好",
    joinDate: "2023/01/15",
    imageUrl: ""
  },
  {
    id: "002",
    name: "李小華",
    age: 82,
    room: "102",
    status: "需關注",
    healthStatus: "慢性病",
    joinDate: "2023/02/28",
    imageUrl: ""
  },
  {
    id: "003",
    name: "張美麗",
    age: 75,
    room: "103",
    status: "正常",
    healthStatus: "良好",
    joinDate: "2023/03/10",
    imageUrl: ""
  },
  {
    id: "004",
    name: "林志明",
    age: 85,
    room: "105",
    status: "需照護",
    healthStatus: "行動不便",
    joinDate: "2023/01/20",
    imageUrl: ""
  },
  {
    id: "005",
    name: "陳小玲",
    age: 72,
    room: "106",
    status: "正常",
    healthStatus: "良好",
    joinDate: "2023/04/05",
    imageUrl: ""
  }
]

export default function ResidentsPage() {
  return (
    <div>
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold">院友管理</h1>
          <p className="text-muted-foreground mt-1">
            管理院友資料、健康記錄與照護需求
          </p>
        </div>
        <Button className="gap-2">
          <PlusCircle className="h-4 w-4" />
          新增院友
        </Button>
      </div>

      <div className="flex items-center gap-4 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input type="search" placeholder="搜尋院友..." className="pl-9" />
        </div>
        <Button variant="outline" size="icon">
          <Filter className="h-4 w-4" />
        </Button>
      </div>

      <div className="overflow-hidden rounded-lg border">
        <table className="w-full">
          <thead className="bg-muted/50">
            <tr>
              <th className="px-6 py-3 text-left text-sm font-medium text-muted-foreground">院友資料</th>
              <th className="px-6 py-3 text-left text-sm font-medium text-muted-foreground">房號</th>
              <th className="px-6 py-3 text-left text-sm font-medium text-muted-foreground">健康狀況</th>
              <th className="px-6 py-3 text-left text-sm font-medium text-muted-foreground">入住日期</th>
              <th className="px-6 py-3 text-left text-sm font-medium text-muted-foreground">狀態</th>
              <th className="px-6 py-3 text-left text-sm font-medium text-muted-foreground"></th>
            </tr>
          </thead>
          <tbody>
            {residents.map((resident) => (
              <tr key={resident.id} className="border-t">
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center">
                      <User className="h-5 w-5 text-muted-foreground" />
                    </div>
                    <div>
                      <div className="font-medium">{resident.name}</div>
                      <div className="text-sm text-muted-foreground">{resident.age}歲</div>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4">{resident.room}</td>
                <td className="px-6 py-4">
                  <div className="flex items-center gap-1">
                    <Heart className="h-4 w-4 text-rose-500" />
                    <span>{resident.healthStatus}</span>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <div className="flex items-center gap-1">
                    <Calendar className="h-4 w-4 text-blue-500" />
                    <span>{resident.joinDate}</span>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                    resident.status === "正常"
                      ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                      : resident.status === "需關注"
                      ? "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400"
                      : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                  }`}>
                    {resident.status}
                  </span>
                </td>
                <td className="px-6 py-4 text-right">
                  <Link to={`/residents/${resident.id}`}>
                    <Button variant="ghost" size="sm">查看詳情</Button>
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-8">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <UserCheck className="h-5 w-5 text-blue-500" />
              院友統計
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-4">
              <div className="flex flex-col">
                <span className="text-3xl font-bold">{residents.length}</span>
                <span className="text-sm text-muted-foreground">院友總數</span>
              </div>
              <div className="flex flex-col">
                <span className="text-3xl font-bold">3</span>
                <span className="text-sm text-muted-foreground">需關注</span>
              </div>
              <div className="flex flex-col">
                <span className="text-3xl font-bold">1</span>
                <span className="text-sm text-muted-foreground">新入住</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
