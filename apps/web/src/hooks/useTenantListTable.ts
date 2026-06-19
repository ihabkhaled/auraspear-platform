import { useTranslations } from 'next-intl'

export function useTenantListTable() {
  const t = useTranslations('admin')
  const tCommon = useTranslations('common')

  return { t, tCommon }
}
