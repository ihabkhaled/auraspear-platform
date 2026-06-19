'use client'

import { type SoarPlaybookStatus, type SoarTriggerType, SortOrder } from '@/enums'
import {
  SOAR_PLAYBOOK_STATUS_CLASSES,
  SOAR_PLAYBOOK_STATUS_LABEL_KEYS,
  SOAR_TRIGGER_TYPE_CLASSES,
  SOAR_TRIGGER_TYPE_LABEL_KEYS,
} from '@/lib/constants/soar'
import { formatRelativeTime, cn, lookup } from '@/lib/utils'
import type { Column, SoarColumnTranslations, SoarPlaybook } from '@/types'

export function getSoarPlaybookColumns(t: SoarColumnTranslations): Column<SoarPlaybook>[] {
  return [
    {
      key: 'name',
      label: t.soar('columnName'),
      sortable: true,
      render: (value: unknown) => <span className="text-sm font-medium">{String(value)}</span>,
    },
    {
      key: 'status',
      label: t.common('status'),
      sortable: true,
      render: (value: unknown) => {
        const status = value as SoarPlaybookStatus
        const labelKey = lookup(SOAR_PLAYBOOK_STATUS_LABEL_KEYS, status)
        return (
          <span
            className={cn(
              'inline-flex rounded-full px-2 py-0.5 text-xs font-medium',
              lookup(SOAR_PLAYBOOK_STATUS_CLASSES, status)
            )}
          >
            {labelKey ? t.soar(labelKey) : String(value)}
          </span>
        )
      },
    },
    {
      key: 'triggerType',
      label: t.soar('columnTrigger'),
      sortable: true,
      render: (value: unknown) => {
        const trigger = value as SoarTriggerType
        const labelKey = lookup(SOAR_TRIGGER_TYPE_LABEL_KEYS, trigger)
        return (
          <span
            className={cn(
              'inline-flex rounded-full px-2 py-0.5 text-xs font-medium',
              lookup(SOAR_TRIGGER_TYPE_CLASSES, trigger)
            )}
          >
            {labelKey ? t.soar(labelKey) : String(value)}
          </span>
        )
      },
    },
    {
      key: 'stepsCount',
      label: t.soar('columnSteps'),
      render: (value: unknown) => (
        <span className="text-muted-foreground text-sm">{String(value)}</span>
      ),
    },
    {
      key: 'executionCount',
      label: t.soar('columnExecutions'),
      sortable: true,
      render: (value: unknown) => (
        <span className="text-muted-foreground text-sm">{String(value)}</span>
      ),
    },
    {
      key: 'createdByName',
      label: t.soar('columnCreatedBy'),
      render: (value: unknown) => <span className="text-sm">{value ? String(value) : '-'}</span>,
    },
    {
      key: 'createdAt',
      label: t.soar('columnCreated'),
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
