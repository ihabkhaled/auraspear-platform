import { useSyncExternalStore } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { useTheme } from 'next-themes'
import { getCookie, setCookie } from '@/lib/cookies'
import { useLoginForm } from './useLoginForm'

const noop = () => {}
const emptySubscribe = () => noop

export function useLoginPage() {
  const t = useTranslations('auth')
  const tApp = useTranslations('app')
  const tLang = useTranslations('language')
  const tCommon = useTranslations('common')
  const router = useRouter()
  const { resolvedTheme, setTheme } = useTheme()
  const mounted = useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false
  )
  const loginForm = useLoginForm()

  const isDark = resolvedTheme === 'dark'
  const currentLocale = getCookie('locale') || 'en'

  function handleThemeToggle() {
    setTheme(isDark ? 'light' : 'dark')
  }

  function handleLocaleChange(locale: string) {
    setCookie('locale', locale)
    router.refresh()
  }

  return {
    t,
    tApp,
    tLang,
    tCommon,
    mounted,
    isDark,
    currentLocale,
    handleThemeToggle,
    handleLocaleChange,
    ...loginForm,
  }
}
