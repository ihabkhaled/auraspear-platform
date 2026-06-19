import { useTranslations } from 'next-intl'

export function useAlertTrendChart() {
  const t = useTranslations('common')

  return { t }
}
