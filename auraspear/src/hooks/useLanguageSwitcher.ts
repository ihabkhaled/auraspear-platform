import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { useUpdatePreferences } from '@/hooks'
import { getCookie, setCookie } from '@/lib/cookies'

export function useLanguageSwitcher() {
  const t = useTranslations('language')
  const router = useRouter()
  const updatePreferences = useUpdatePreferences()
  const current = getCookie('locale') || 'en'

  function handleChange(locale: string) {
    setCookie('locale', locale)
    updatePreferences.mutate({ language: locale })
    router.refresh()
  }

  return { t, current, handleChange }
}
