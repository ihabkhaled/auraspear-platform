'use client'

import { useTranslations } from 'next-intl'

export function useAlertFilterSidebar() {
  const t = useTranslations('alerts')
  const tCommon = useTranslations('common')

  return { t, tCommon }
}
