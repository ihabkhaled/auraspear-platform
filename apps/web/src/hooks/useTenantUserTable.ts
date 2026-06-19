import { useTranslations } from 'next-intl'

export function useTenantUserTable() {
  const t = useTranslations('admin')
  const tCommon = useTranslations('common')

  return { t, tCommon }
}
