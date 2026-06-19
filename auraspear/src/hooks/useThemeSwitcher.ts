import { useSyncExternalStore } from 'react'
import { useTranslations } from 'next-intl'
import { useTheme } from 'next-themes'
import { useUpdatePreferences } from '@/hooks'

const noop = () => {}
const emptySubscribe = () => noop

export function useThemeSwitcher() {
  const t = useTranslations('common')
  const { resolvedTheme, setTheme } = useTheme()
  const updatePreferences = useUpdatePreferences()
  const mounted = useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false
  )

  const isDark = resolvedTheme === 'dark'

  function handleToggle() {
    const next = isDark ? 'light' : 'dark'
    setTheme(next)
    updatePreferences.mutate({ theme: next })
  }

  return { t, mounted, isDark, handleToggle }
}
