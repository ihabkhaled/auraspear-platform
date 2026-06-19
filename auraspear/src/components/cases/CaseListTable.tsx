'use client'

import { DataTable, SeverityBadge } from '@/components/common'
import { Badge } from '@/components/ui'
import { type CaseStatus, type CaseSeverity } from '@/enums'
import { useCaseListTable } from '@/hooks'
import { STATUS_VARIANT_MAP } from '@/lib/case.utils'
import { CASE_STATUS_LABEL_KEYS } from '@/lib/constants/cases'
import { formatDate, lookup } from '@/lib/utils'
import type { Case, CaseListTableProps, Column } from '@/types'

export function CaseListTable({
  cases,
  onCaseClick,
  loading = false,
  sortBy,
  sortOrder,
  onSort,
  currentUserId,
  isAdmin,
}: CaseListTableProps) {
  const { t, getRowClassName } = useCaseListTable({ currentUserId, isAdmin })

  const columns: Column<Case>[] = [
    {
      key: 'caseNumber',
      label: t('caseNumber'),
      className: 'font-mono text-xs',
    },
    {
      key: 'title',
      label: t('fieldTitle'),
    },
    {
      key: 'status',
      label: t('fieldStatus'),
      sortable: true,
      render: value => {
        const status = value as CaseStatus
        const labelKey = lookup(CASE_STATUS_LABEL_KEYS, status)
        return (
          <Badge variant={lookup(STATUS_VARIANT_MAP, status)} className="capitalize">
            {labelKey ? t(labelKey) : String(value ?? '')}
          </Badge>
        )
      },
    },
    {
      key: 'severity',
      label: t('fieldSeverity'),
      sortable: true,
      render: value => <SeverityBadge severity={value as CaseSeverity} />,
    },
    {
      key: 'tenantName',
      label: t('tenant'),
    },
    {
      key: 'ownerName',
      label: t('fieldAssignee'),
      render: value => <span className="text-sm">{String(value ?? '—')}</span>,
    },
    {
      key: 'createdAt',
      label: t('created'),
      sortable: true,
      render: value => (
        <span className="text-muted-foreground text-xs">{formatDate(String(value ?? ''))}</span>
      ),
    },
  ]

  return (
    <DataTable
      columns={columns}
      data={cases}
      loading={loading}
      emptyMessage={t('noCases')}
      onRowClick={onCaseClick}
      sortBy={sortBy}
      sortOrder={sortOrder}
      onSort={onSort}
      rowClassName={getRowClassName}
    />
  )
}
