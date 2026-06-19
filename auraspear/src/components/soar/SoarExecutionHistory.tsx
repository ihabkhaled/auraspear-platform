'use client'

import { DataTable } from '@/components/common'
import { type SoarExecutionStatus, SortOrder } from '@/enums'
import { useSoarExecutionHistory } from '@/hooks'
import {
  SOAR_EXECUTION_STATUS_CLASSES,
  SOAR_EXECUTION_STATUS_LABEL_KEYS,
} from '@/lib/constants/soar'
import { formatRelativeTime, cn, lookup } from '@/lib/utils'
import type { Column, SoarExecution, SoarExecutionHistoryProps } from '@/types'

export function SoarExecutionHistory({ playbookId }: SoarExecutionHistoryProps) {
  const { t, executions, isFetching } = useSoarExecutionHistory(playbookId)

  const columns: Column<SoarExecution>[] = [
    {
      key: 'status',
      label: t('execColumnStatus'),
      render: (value: unknown) => {
        const status = value as SoarExecutionStatus
        const labelKey = lookup(SOAR_EXECUTION_STATUS_LABEL_KEYS, status)
        return (
          <span
            className={cn(
              'inline-flex rounded-full px-2 py-0.5 text-xs font-medium',
              lookup(SOAR_EXECUTION_STATUS_CLASSES, status)
            )}
          >
            {labelKey ? t(labelKey) : String(value)}
          </span>
        )
      },
    },
    {
      key: 'stepsCompleted',
      label: t('execColumnProgress'),
      render: (value: unknown, row: SoarExecution) => `${String(value)}/${row.totalSteps}`,
    },
    {
      key: 'durationSeconds',
      label: t('execColumnDuration'),
      render: (value: unknown) =>
        value !== null && value !== undefined ? `${String(value)}s` : '-',
    },
    {
      key: 'startedAt',
      label: t('execColumnStarted'),
      defaultSortOrder: SortOrder.DESC,
      render: (value: unknown) => (
        <span className="text-muted-foreground text-xs whitespace-nowrap">
          {formatRelativeTime(String(value))}
        </span>
      ),
    },
  ]

  return (
    <DataTable
      columns={columns}
      data={executions}
      loading={isFetching}
      emptyMessage={t('noExecutions')}
    />
  )
}
