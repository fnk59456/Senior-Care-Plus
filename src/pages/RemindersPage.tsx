import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { PlusCircle, Clock, Pill, Coffee, Calendar } from "lucide-react"
import { useTranslation } from "react-i18next"

// 提醒數據 - 將在組件內動態生成以支援國際化

export default function RemindersPage() {
  const { t } = useTranslation()

  // 提醒數據 - 動態生成以支援國際化
  const reminders = [
    {
      id: 1,
      title: t('pages:reminders.types.medication'),
      time: "08:00",
      description: t('pages:reminders.descriptions.hypertension'),
      icon: <Pill className="h-5 w-5" />,
      color: "text-blue-500",
    },
    {
      id: 2,
      title: t('pages:reminders.types.medication'),
      time: "12:00",
      description: t('pages:reminders.descriptions.diabetes'),
      icon: <Pill className="h-5 w-5" />,
      color: "text-blue-500",
    },
    {
      id: 3,
      title: t('pages:reminders.types.water'),
      time: "10:00",
      description: t('pages:reminders.descriptions.hydration'),
      icon: <Coffee className="h-5 w-5" />,
      color: "text-green-500",
    },
    {
      id: 4,
      title: t('pages:reminders.types.physicalTherapy'),
      time: "14:30",
      description: t('pages:reminders.descriptions.rehabilitation'),
      icon: <Calendar className="h-5 w-5" />,
      color: "text-purple-500",
    },
    {
      id: 5,
      title: t('pages:reminders.types.medication'),
      time: "18:00",
      description: t('pages:reminders.descriptions.hypertension'),
      icon: <Pill className="h-5 w-5" />,
      color: "text-blue-500",
    },
  ]

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">{t('pages:reminders.title')}</h1>
          <p className="text-muted-foreground mt-1">
            {t('pages:reminders.subtitle')}
          </p>
        </div>
        <Button className="gap-2">
          <PlusCircle className="h-4 w-4" />
          {t('pages:reminders.addReminder')}
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            {t('pages:reminders.todayReminders')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="divide-y">
            {reminders.map((reminder) => (
              <div key={reminder.id} className="py-4 first:pt-0 last:pb-0">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`${reminder.color}`}>{reminder.icon}</div>
                    <div>
                      <div className="font-medium">{reminder.title}</div>
                      <div className="text-sm text-muted-foreground">
                        {reminder.description}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-lg font-medium">{reminder.time}</div>
                    <Button variant="outline" size="sm">
                      {t('pages:reminders.complete')}
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>{t('pages:reminders.cards.periodic.title')}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">
              {t('pages:reminders.cards.periodic.description')}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>{t('pages:reminders.cards.statistics.title')}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">
              {t('pages:reminders.cards.statistics.description')}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>{t('pages:reminders.cards.settings.title')}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">
              {t('pages:reminders.cards.settings.description')}
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
