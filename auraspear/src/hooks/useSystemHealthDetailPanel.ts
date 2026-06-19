import { useTranslations } from 'next-intl'
import type { SystemHealthDetailPanelProps } from '@/types'

export function useSystemHealthDetailPanel({
  healthCheck,
}: Pick<SystemHealthDetailPanelProps, 'healthCheck'>) {
  const t = useTranslations('systemHealth')
  const tCommon = useTranslations('common')

  const hasData = healthCheck !== null

  return { t, tCommon, hasData }
}
