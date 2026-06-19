'use client'

import { Badge } from '@/components/ui'
import { CaseCycleStatus } from '@/enums'
import { useCycleBadge } from '@/hooks'
import type { CycleBadgeProps } from '@/types'

export function CycleBadge({ status }: CycleBadgeProps) {
  const { t } = useCycleBadge()

  if (status === CaseCycleStatus.ACTIVE) {
    return <Badge className="bg-status-success text-white">{t('statusActive')}</Badge>
  }

  return <Badge variant="secondary">{t('statusClosed')}</Badge>
}
