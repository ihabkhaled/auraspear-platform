'use client'

import { useTranslations } from 'next-intl'

export function useLoadingSpinner() {
  const t = useTranslations('common')

  return { t }
}
