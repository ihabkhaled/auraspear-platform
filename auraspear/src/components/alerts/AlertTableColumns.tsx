'use client'

import { Badge } from '@/components/ui'
import { type AlertSeverity, type AlertStatus, SortOrder } from '@/enums'
import { ALERT_STATUS_CLASSES, ALERT_STATUS_LABEL_KEYS } from '@/lib/constants/alerts'
import { getSeverityVariant } from '@/lib/severity-utils'
import { formatTimestamp, cn, lookup } from '@/lib/utils'
import type { Column, Alert, AlertColumnTranslations, GetAlertColumnsOptions } from '@/types'
import { AlertRowActions } from './AlertRowActions'

function SeverityBadge({ severity }: { severity: AlertSeverity }) {
  return (
    <Badge variant="outline" className={cn('text-xs capitalize', getSeverityVariant(severity))}>
      {severity}
    </Badge>
  )
}

function StatusBadge({ status, label }: { status: AlertStatus; label: string }) {
  return (
    <Badge
      variant="outline"
      className={cn(
        'text-xs',
        lookup(ALERT_STATUS_CLASSES, status) ?? 'border-muted-foreground text-muted-foreground'
      )}
    >
      {label}
    </Badge>
  )
}

function MITREBadge({ techniques }: { techniques: string[] }) {
  const first = techniques.at(0)
  if (!first) {
    return <span className="text-muted-foreground text-xs">-</span>
  }

  return (
    <div className="flex items-center gap-1">
      <Badge variant="outline" className="font-mono text-xs">
        {first}
      </Badge>
      {techniques.length > 1 && (
        <span className="text-muted-foreground text-xs">+{techniques.length - 1}</span>
      )}
    </div>
  )
}

export function getAlertColumns(
  t: AlertColumnTranslations,
  options?: GetAlertColumnsOptions
): Column<Alert>[] {
  return [
    {
      key: 'timestamp',
      label: t.common('timestamp'),
      sortable: true,
      defaultSortOrder: SortOrder.DESC,
      render: value => (
        <span className="text-muted-foreground font-mono text-xs whitespace-nowrap">
          {formatTimestamp(String(value))}
        </span>
      ),
    },
    {
      key: 'severity',
      label: t.common('severity'),
      sortable: true,
      render: value => <SeverityBadge severity={value as AlertSeverity} />,
    },
    {
      key: 'status',
      label: t.common('status'),
      sortable: true,
      render: (_value, row) => {
        const labelKey = lookup(ALERT_STATUS_LABEL_KEYS, row.status) ?? row.status
        return <StatusBadge status={row.status} label={t.alerts(labelKey)} />
      },
    },
    {
      key: 'title',
      label: t.alerts('rule'),
      className: 'max-w-xs',
      render: value => <span className="block truncate text-sm">{String(value ?? '-')}</span>,
    },
    {
      key: 'source',
      label: t.alerts('source'),
      sortable: true,
      render: value => <span className="text-xs capitalize">{String(value)}</span>,
    },
    {
      key: 'agentName',
      label: t.alerts('agent'),
      sortable: true,
      render: value => <span className="text-sm">{String(value)}</span>,
    },
    {
      key: 'sourceIp',
      label: t.alerts('sourceIp'),
      sortable: true,
      render: value => <span className="font-mono text-xs">{String(value)}</span>,
    },
    {
      key: 'mitreTechniques',
      label: t.alerts('mitre'),
      render: value => <MITREBadge techniques={value as string[]} />,
    },
    {
      key: 'createdAt',
      label: t.alerts('createdAt'),
      sortable: true,
      render: value => (
        <span className="text-muted-foreground font-mono text-xs whitespace-nowrap">
          {formatTimestamp(String(value))}
        </span>
      ),
    },
    {
      key: 'actions',
      label: '',
      render: (_value, row) => (
        <AlertRowActions
          alert={row}
          onView={options?.onView}
          onInvestigate={options?.onInvestigate}
          onCreateCase={options?.onCreateCase}
          onCopyId={options?.onCopyId}
        />
      ),
    },
  ]
}
