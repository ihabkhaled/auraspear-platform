import { useTranslations } from 'next-intl'

export function useCaseToolbar() {
  const t = useTranslations('cases')

  return { t }
}
