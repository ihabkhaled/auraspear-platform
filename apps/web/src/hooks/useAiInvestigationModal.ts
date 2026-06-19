'use client'

import { useTranslations } from 'next-intl'

export function useAiInvestigationModal() {
  const t = useTranslations('alerts')

  return { t }
}
