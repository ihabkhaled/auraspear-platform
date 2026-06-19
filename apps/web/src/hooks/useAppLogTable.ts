import { useTranslations } from 'next-intl'

export function useAppLogTable() {
  const t = useTranslations('admin')

  return { t }
}
