import { useTranslations } from 'next-intl'

export function useCaseDetailHeader() {
  const t = useTranslations('cases')

  return { t }
}
