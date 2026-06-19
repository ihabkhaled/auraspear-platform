import { useTranslations } from 'next-intl'

export function useHuntStatsGrid() {
  const t = useTranslations('hunt')

  return { t }
}
