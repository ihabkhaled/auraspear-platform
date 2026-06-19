'use client'

import { useTranslations } from 'next-intl'

export function useAlertBulkActionBar() {
  const t = useTranslations('alerts')
  const tCommon = useTranslations('common')

  return { t, tCommon }
}
