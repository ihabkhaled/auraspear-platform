import { useTranslations } from 'next-intl'

export function usePaginationComponent() {
  const t = useTranslations('common')

  return { t }
}
