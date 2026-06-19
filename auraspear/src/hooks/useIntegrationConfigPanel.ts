import { useTranslations } from 'next-intl'

export function useIntegrationConfigPanel() {
  const t = useTranslations('admin')

  return { t }
}
