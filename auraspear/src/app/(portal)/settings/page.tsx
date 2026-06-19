'use client'

import { Bell, ChevronDown, Globe, Moon, Monitor, Palette, Sun } from 'lucide-react'
import { PageHeader } from '@/components/common'
import {
  NotificationPreferencesCard,
  DataRetentionCard,
  ExportImportCard,
  MemorySettingsCard,
} from '@/components/settings'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
  Label,
  RadioGroup,
  RadioGroupItem,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Switch,
} from '@/components/ui'
import { useSettingsPage } from '@/hooks'
import { LOCALES } from '@/lib/constants/locales'

export default function SettingsPage() {
  const {
    t,
    tLang,
    mounted,
    currentLocale,
    currentTheme,
    emailAlerts,
    browserNotifications,
    updatePreferencesPending,
    handleThemeChange,
    handleLanguageChange,
    handleNotificationToggle,
    canEditSettings,
  } = useSettingsPage()

  return (
    <div className="space-y-4">
      <PageHeader title={t('title')} description={t('description')} />

      {/* Appearance */}
      <Collapsible>
        <Card>
          <CollapsibleTrigger className="w-full">
            <CardHeader className="cursor-pointer">
              <CardTitle className="flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <Palette className="h-5 w-5" />
                  {t('appearance')}
                </span>
                <ChevronDown className="text-muted-foreground h-4 w-4 transition-transform [[data-state=open]>&]:rotate-180" />
              </CardTitle>
            </CardHeader>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <Label>{t('theme')}</Label>
                {mounted ? (
                  <RadioGroup
                    value={currentTheme}
                    onValueChange={handleThemeChange}
                    className="grid grid-cols-1 gap-3 sm:grid-cols-3"
                    disabled={!canEditSettings}
                  >
                    <label
                      htmlFor="theme-light"
                      className="border-border hover:bg-muted has-[button[data-state=checked]]:border-primary flex cursor-pointer flex-col items-center gap-2 rounded-lg border p-3 transition-colors"
                    >
                      <RadioGroupItem value="light" id="theme-light" />
                      <Sun className="text-muted-foreground h-5 w-5" />
                      <span className="text-sm font-medium">{t('themeLight')}</span>
                    </label>
                    <label
                      htmlFor="theme-dark"
                      className="border-border hover:bg-muted has-[button[data-state=checked]]:border-primary flex cursor-pointer flex-col items-center gap-2 rounded-lg border p-3 transition-colors"
                    >
                      <RadioGroupItem value="dark" id="theme-dark" />
                      <Moon className="text-muted-foreground h-5 w-5" />
                      <span className="text-sm font-medium">{t('themeDark')}</span>
                    </label>
                    <label
                      htmlFor="theme-system"
                      className="border-border hover:bg-muted has-[button[data-state=checked]]:border-primary flex cursor-pointer flex-col items-center gap-2 rounded-lg border p-3 transition-colors"
                    >
                      <RadioGroupItem value="system" id="theme-system" />
                      <Monitor className="text-muted-foreground h-5 w-5" />
                      <span className="text-sm font-medium">{t('themeSystem')}</span>
                    </label>
                  </RadioGroup>
                ) : (
                  <div className="bg-muted h-24 animate-pulse rounded-lg" />
                )}
              </div>
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>

      {/* Language */}
      <Collapsible>
        <Card>
          <CollapsibleTrigger className="w-full">
            <CardHeader className="cursor-pointer">
              <CardTitle className="flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <Globe className="h-5 w-5" />
                  {t('language')}
                </span>
                <ChevronDown className="text-muted-foreground h-4 w-4 transition-transform [[data-state=open]>&]:rotate-180" />
              </CardTitle>
            </CardHeader>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="language-select">{t('languageDescription')}</Label>
                {mounted ? (
                  <Select
                    value={currentLocale}
                    onValueChange={handleLanguageChange}
                    disabled={!canEditSettings}
                  >
                    <SelectTrigger id="language-select" className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {LOCALES.map(l => (
                        <SelectItem key={l.code} value={l.code}>
                          {tLang(l.labelKey)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <div className="bg-muted h-9 animate-pulse rounded-md" />
                )}
              </div>
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>

      {/* Notifications (Email / Browser) */}
      <Collapsible>
        <Card>
          <CollapsibleTrigger className="w-full">
            <CardHeader className="cursor-pointer">
              <CardTitle className="flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <Bell className="h-5 w-5" />
                  {t('notifications')}
                </span>
                <ChevronDown className="text-muted-foreground h-4 w-4 transition-transform [[data-state=open]>&]:rotate-180" />
              </CardTitle>
            </CardHeader>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between gap-4">
                <div className="space-y-0.5">
                  <Label htmlFor="email-alerts">{t('emailAlerts')}</Label>
                  <p className="text-muted-foreground text-sm">{t('emailAlertsDescription')}</p>
                </div>
                <Switch
                  id="email-alerts"
                  checked={emailAlerts}
                  onCheckedChange={(checked: boolean) =>
                    handleNotificationToggle('notificationsEmail', checked)
                  }
                  disabled={!canEditSettings || updatePreferencesPending}
                />
              </div>
              <div className="bg-border h-px" />
              <div className="flex items-center justify-between gap-4">
                <div className="space-y-0.5">
                  <Label htmlFor="browser-notifications">{t('browserNotifications')}</Label>
                  <p className="text-muted-foreground text-sm">
                    {t('browserNotificationsDescription')}
                  </p>
                </div>
                <Switch
                  id="browser-notifications"
                  checked={browserNotifications}
                  onCheckedChange={(checked: boolean) =>
                    handleNotificationToggle('notificationsInApp', checked)
                  }
                  disabled={!canEditSettings || updatePreferencesPending}
                />
              </div>
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>

      {/* Notification Preferences Card */}
      <NotificationPreferencesCard />

      {/* Data Retention Card */}
      <DataRetentionCard />

      {/* Export/Import Settings Card */}
      <ExportImportCard />

      {/* AI Memory Card */}
      <MemorySettingsCard />
    </div>
  )
}
