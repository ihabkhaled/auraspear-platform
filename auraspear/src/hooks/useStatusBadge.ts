import { useTranslations } from 'next-intl'

export function useStatusBadge() {
  const t = useTranslations('connectors')

  return { t }
}
