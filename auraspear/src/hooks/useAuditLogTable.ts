import { useTranslations } from 'next-intl'

export function useAuditLogTable() {
  const t = useTranslations('admin')

  return { t }
}
