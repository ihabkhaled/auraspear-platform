import { useTranslations } from 'next-intl'

export function useCycleHistoryTable() {
  const t = useTranslations('cases.cycles')
  const tCommon = useTranslations('common')

  return { t, tCommon }
}
