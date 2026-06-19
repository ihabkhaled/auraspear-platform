'use client'

import { useTranslations } from 'next-intl'

export function useKqlSearchBar() {
  const t = useTranslations('alerts')

  return { t }
}
