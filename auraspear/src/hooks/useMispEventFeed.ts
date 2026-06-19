import { useTranslations } from 'next-intl'

export function useMispEventFeed() {
  const t = useTranslations('intel')

  return { t }
}
