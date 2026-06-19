import { useTranslations } from 'next-intl'

export function useMitreTopTechniques() {
  const t = useTranslations('dashboard')

  return { t }
}
