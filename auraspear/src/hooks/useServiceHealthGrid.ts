import { useTranslations } from 'next-intl'

export function useServiceHealthGrid() {
  const t = useTranslations('admin')

  return { t }
}
