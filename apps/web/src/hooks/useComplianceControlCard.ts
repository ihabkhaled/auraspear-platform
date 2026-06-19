import { useTranslations } from 'next-intl'

export function useComplianceControlCard() {
  const t = useTranslations('compliance')

  return { t }
}
