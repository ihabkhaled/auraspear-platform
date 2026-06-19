import { useTranslations } from 'next-intl'

export function useWazuhCorrelationPanel() {
  const t = useTranslations('intel')
  const tCommon = useTranslations('common')

  return { t, tCommon }
}
