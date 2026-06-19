import { useTranslations } from 'next-intl'

export function useCycleSelector() {
  const t = useTranslations('cases.cycles')

  return { t }
}
