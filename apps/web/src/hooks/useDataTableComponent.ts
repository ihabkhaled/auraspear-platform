import { useTranslations } from 'next-intl'

export function useDataTableComponent() {
  const t = useTranslations('common')

  return { t }
}
