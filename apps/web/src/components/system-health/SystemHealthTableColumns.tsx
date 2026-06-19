'use client'

import { type HealthCheckStatus, type ServiceType, SortOrder } from '@/enums'
import {
  HEALTH_CHECK_STATUS_CLASSES,
  HEALTH_CHECK_STATUS_LABEL_KEYS,
  SERVICE_TYPE_LABEL_KEYS,
} from '@/lib/constants/system-health'
import { formatRelativeTime, cn, lookup } from '@/lib/utils'
import type { Column, SystemHealthCheck, SystemHealthColumnTranslations } from '@/types'

export function getSystemHealthColumns(
  t: SystemHealthColumnTranslations
): Column<SystemHealthCheck>[] {
  return [
    {
      key: 'serviceType',
      label: t.systemHealth('columnService'),
      sortable: true,
      render: (value: unknown) => {
        const svc = value as ServiceType
        const labelKey = lookup(SERVICE_TYPE_LABEL_KEYS, svc)
        return (
          <span className="text-sm font-medium">
            {labelKey ? t.systemHealth(labelKey) : String(value)}
          </span>
        )
      },
    },
    {
      key: 'status',
      label: t.common('status'),
      sortable: true,
      render: (value: unknown) => {
        const status = value as HealthCheckStatus
        const labelKey = lookup(HEALTH_CHECK_STATUS_LABEL_KEYS, status)
        return (
          <span
            className={cn(
              'inline-flex rounded-full px-2 py-0.5 text-xs font-medium',
              lookup(HEALTH_CHECK_STATUS_CLASSES, status)
            )}
          >
            {labelKey ? t.systemHealth(labelKey) : String(value)}
          </span>
        )
      },
    },
    {
      key: 'responseTimeMs',
      label: t.systemHealth('columnResponseTime'),
      sortable: true,
      render: (value: unknown) => (
        <span className="text-muted-foreground text-xs">
          {value !== null && value !== undefined ? `${String(value)}ms` : '-'}
        </span>
      ),
    },
    {
      key: 'version',
      label: t.systemHealth('columnVersion'),
      render: (value: unknown) => (
        <span className="text-muted-foreground font-mono text-xs">
          {value ? String(value) : '-'}
        </span>
      ),
    },
    {
      key: 'message',
      label: t.systemHealth('columnMessage'),
      className: 'max-w-xs',
      render: (value: unknown) => (
        <span className="text-muted-foreground block truncate text-xs">
          {value ? String(value) : '-'}
        </span>
      ),
    },
    {
      key: 'checkedAt',
      label: t.systemHealth('columnCheckedAt'),
      sortable: true,
      defaultSortOrder: SortOrder.DESC,
      render: (value: unknown) => (
        <span className="text-muted-foreground text-xs whitespace-nowrap">
          {formatRelativeTime(String(value))}
        </span>
      ),
    },
  ]
}
