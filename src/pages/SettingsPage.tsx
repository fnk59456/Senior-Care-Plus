import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import {
  Settings, Bell, UserCog, Lock, Monitor,
  Database, Globe, HelpCircle
} from "lucide-react"
import { useTranslation } from "react-i18next"

// 設置分類配置 - 使用函數來獲取翻譯
const getSettingCategories = (t: any) => [
  {
    title: t('pages:settings.categories.personal.title'),
    description: t('pages:settings.categories.personal.description'),
    icon: <UserCog className="h-6 w-6 text-blue-500" />,
    color: "bg-blue-50 dark:bg-blue-900/20"
  },
  {
    title: t('pages:settings.categories.notifications.title'),
    description: t('pages:settings.categories.notifications.description'),
    icon: <Bell className="h-6 w-6 text-amber-500" />,
    color: "bg-amber-50 dark:bg-amber-900/20"
  },
  {
    title: t('pages:settings.categories.security.title'),
    description: t('pages:settings.categories.security.description'),
    icon: <Lock className="h-6 w-6 text-red-500" />,
    color: "bg-red-50 dark:bg-red-900/20"
  },
  {
    title: t('pages:settings.categories.display.title'),
    description: t('pages:settings.categories.display.description'),
    icon: <Monitor className="h-6 w-6 text-purple-500" />,
    color: "bg-purple-50 dark:bg-purple-900/20"
  },
  {
    title: t('pages:settings.categories.data.title'),
    description: t('pages:settings.categories.data.description'),
    icon: <Database className="h-6 w-6 text-green-500" />,
    color: "bg-green-50 dark:bg-green-900/20"
  },
  {
    title: t('pages:settings.categories.language.title'),
    description: t('pages:settings.categories.language.description'),
    icon: <Globe className="h-6 w-6 text-indigo-500" />,
    color: "bg-indigo-50 dark:bg-indigo-900/20"
  }
]

export default function SettingsPage() {
  const { t } = useTranslation()
  const settingCategories = getSettingCategories(t)

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <Settings className="h-7 w-7" />
          {t('pages:settings.title')}
        </h1>
        <p className="text-muted-foreground mt-1">
          {t('pages:settings.subtitle')}
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {settingCategories.map((category, i) => (
          <Card key={i} className={`${category.color}`}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  {category.icon}
                  {category.title}
                </CardTitle>
              </div>
              <CardDescription>{category.description}</CardDescription>
            </CardHeader>
            <CardContent>
              <Button variant="outline" className="w-full">{t('pages:settings.actions.enterSettings')}</Button>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="mt-8">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <HelpCircle className="h-5 w-5 text-blue-500" />
            {t('pages:settings.systemInfo.title')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-muted-foreground">{t('pages:settings.systemInfo.version')}</span>
              <span className="font-medium">{t('common:app.version')}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">{t('pages:settings.systemInfo.lastUpdate')}</span>
              <span className="font-medium">{t('common:app.lastUpdate')}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">{t('pages:settings.systemInfo.terms')}</span>
              <Button variant="link" className="p-0 h-auto">{t('pages:settings.systemInfo.view')}</Button>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">{t('pages:settings.systemInfo.privacy')}</span>
              <Button variant="link" className="p-0 h-auto">{t('pages:settings.systemInfo.view')}</Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
