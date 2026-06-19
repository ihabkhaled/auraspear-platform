import { useTranslations } from 'next-intl'

export function useCycleBadge() {
  const t = useTranslations('cases.cycles')

  return { t }
}
