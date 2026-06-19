import { useTranslations } from 'next-intl'

export function useHuntEventTable() {
  const t = useTranslations('hunt')

  return { t }
}
