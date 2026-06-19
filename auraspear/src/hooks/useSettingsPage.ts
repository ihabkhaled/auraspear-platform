import { useSyncExternalStore } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { useTheme } from 'next-themes'
import { Toast } from '@/components/common'
import { Permission } from '@/enums'
import { getCookie, setCookie } from '@/lib/cookies'
import { hasPermission } from '@/lib/permissions'
import { buildErrorToastHandler } from '@/lib/toast.utils'
import { useAuthStore } from '@/stores'
import { usePreferences, useUpdatePreferences } from './useSettings'

const noop = () => {}
const emptySubscribe = () => noop

export function useSettingsPage() {
  const t = useTranslations('settings')
  const tLang = useTranslations('language')
  const tErrors = useTranslations('errors')
  const permissions = useAuthStore(s => s.permissions)

  const canEditSettings = hasPermission(permissions, Permission.SETTINGS_UPDATE)
  const router = useRouter()
  const { theme, setTheme } = useTheme()
  const { data: preferences } = usePreferences()
  const updatePreferences = useUpdatePreferences()

  const mounted = useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false
  )

  const currentLocale = mounted ? getCookie('locale') || 'en' : 'en'
  const currentTheme = mounted ? (theme ?? 'system') : 'system'

  const emailAlerts = Boolean(preferences?.['notificationsEmail'])
  const browserNotifications = Boolean(preferences?.['notificationsInApp'])

  function handleThemeChange(value: string) {
    setTheme(value)
    updatePreferences.mutate({ theme: value })
  }

  function handleLanguageChange(locale: string) {
    setCookie('locale', locale)
    updatePreferences.mutate({ language: locale })
    router.refresh()
  }

  function handleNotificationToggle(key: string, checked: boolean) {
    updatePreferences.mutate(
      { [key]: checked },
      {
        onSuccess: () => {
          Toast.success(t('saved'))
        },
        onError: buildErrorToastHandler(tErrors),
      }
    )
  }

  return {
    t,
    tLang,
    mounted,
    currentLocale,
    currentTheme,
    emailAlerts,
    browserNotifications,
    updatePreferencesPending: updatePreferences.isPending,
    handleThemeChange,
    handleLanguageChange,
    handleNotificationToggle,
    canEditSettings,
  }
}
