'use client'

import { Badge } from '@/components/ui'
import { useStatusBadge } from '@/hooks'
import {
  CONNECTOR_STATUS_STYLES,
  CONNECTOR_STATUS_KEYS,
} from '@/lib/constants/connectors.constants'
import { lookup } from '@/lib/utils'
import type { StatusBadgeProps } from '@/types'

export function StatusBadge({ status }: StatusBadgeProps) {
  const { t } = useStatusBadge()
  return (
    <Badge variant="outline" className={lookup(CONNECTOR_STATUS_STYLES, status)}>
      {t(lookup(CONNECTOR_STATUS_KEYS, status))}
    </Badge>
  )
}
