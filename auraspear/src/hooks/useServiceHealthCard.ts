import { useTranslations } from 'next-intl'

export function useServiceHealthCard() {
  const t = useTranslations('admin')

  return { t }
}
