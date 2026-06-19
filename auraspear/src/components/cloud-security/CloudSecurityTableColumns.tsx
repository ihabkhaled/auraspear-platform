'use client'

import { type CloudAccountStatus, type CloudProvider, SortOrder } from '@/enums'
import {
  CLOUD_ACCOUNT_STATUS_CLASSES,
  CLOUD_ACCOUNT_STATUS_LABEL_KEYS,
  CLOUD_PROVIDER_LABEL_KEYS,
} from '@/lib/constants/cloud-security'
import { cn, formatRelativeTime, lookup } from '@/lib/utils'
import type { CloudAccount, CloudSecurityColumnTranslations, Column } from '@/types'

export function getCloudSecurityColumns(
  t: CloudSecurityColumnTranslations
): Column<CloudAccount>[] {
  return [
    {
      key: 'alias',
      label: t.cloudSecurity('fieldAlias'),
      sortable: true,
      render: (value: unknown) => (
        <span className="text-sm font-medium">{value ? String(value) : '-'}</span>
      ),
    },
    {
      key: 'provider',
      label: t.cloudSecurity('columnProvider'),
      sortable: true,
      render: (value: unknown) => {
        const provider = value as CloudProvider
        const labelKey = lookup(CLOUD_PROVIDER_LABEL_KEYS, provider)
        return (
          <span className="text-muted-foreground text-xs uppercase">
            {labelKey ? t.cloudSecurity(labelKey) : String(value)}
          </span>
        )
      },
    },
    {
      key: 'accountId',
      label: t.cloudSecurity('columnAccountId'),
      sortable: true,
      render: (value: unknown) => <span className="font-mono text-xs">{String(value)}</span>,
    },
    {
      key: 'status',
      label: t.common('status'),
      sortable: true,
      render: (value: unknown) => {
        const status = value as CloudAccountStatus
        const labelKey = lookup(CLOUD_ACCOUNT_STATUS_LABEL_KEYS, status)
        return (
          <span
            className={cn(
              'inline-flex rounded-full px-2 py-0.5 text-xs font-medium',
              lookup(CLOUD_ACCOUNT_STATUS_CLASSES, status)
            )}
          >
            {labelKey ? t.cloudSecurity(labelKey) : String(value)}
          </span>
        )
      },
    },
    {
      key: 'findingsCount',
      label: t.cloudSecurity('columnFindings'),
      sortable: true,
      render: (value: unknown) => (
        <span className="text-muted-foreground text-xs">{Number(value).toLocaleString()}</span>
      ),
    },
    {
      key: 'complianceScore',
      label: t.cloudSecurity('columnComplianceScore'),
      sortable: true,
      render: (value: unknown) => {
        const score = Number(value)
        let colorClass = 'text-status-error'
        if (score >= 80) {
          colorClass = 'text-status-success'
        } else if (score >= 50) {
          colorClass = 'text-status-warning'
        }
        return <span className={cn('text-xs font-medium', colorClass)}>{`${score}%`}</span>
      },
    },
    {
      key: 'lastScanAt',
      label: t.cloudSecurity('columnLastScan'),
      sortable: true,
      defaultSortOrder: SortOrder.DESC,
      render: (value: unknown) => (
        <span className="text-muted-foreground text-xs whitespace-nowrap">
          {value ? formatRelativeTime(String(value)) : '-'}
        </span>
      ),
    },
  ]
}
