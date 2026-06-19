import { useTranslations } from 'next-intl'

export function useCaseOwnerFilter() {
  const t = useTranslations('cases')

  return { t }
}
