'use client'

import { type ComplianceStandard, SortOrder } from '@/enums'
import {
  COMPLIANCE_STANDARD_CLASSES,
  COMPLIANCE_STANDARD_LABEL_KEYS,
} from '@/lib/constants/compliance'
import { formatRelativeTime, cn, lookup } from '@/lib/utils'
import type { Column, ComplianceColumnTranslations, ComplianceFramework } from '@/types'

export function getComplianceColumns(
  t: ComplianceColumnTranslations
): Column<ComplianceFramework>[] {
  return [
    {
      key: 'name',
      label: t.compliance('columnName'),
      sortable: true,
      render: (value: unknown) => <span className="text-sm font-medium">{String(value)}</span>,
    },
    {
      key: 'standard',
      label: t.compliance('columnStandard'),
      sortable: true,
      render: (value: unknown) => {
        const standard = value as ComplianceStandard
        const labelKey = lookup(COMPLIANCE_STANDARD_LABEL_KEYS, standard)
        return (
          <span
            className={cn(
              'inline-flex rounded-full px-2 py-0.5 text-xs font-medium',
              lookup(COMPLIANCE_STANDARD_CLASSES, standard)
            )}
          >
            {labelKey ? t.compliance(labelKey) : String(value)}
          </span>
        )
      },
    },
    {
      key: 'complianceScore',
      label: t.compliance('columnScore'),
      sortable: true,
      render: (value: unknown) => {
        if (value === null || value === undefined) {
          return <span className="text-muted-foreground text-xs">-</span>
        }
        const score = Number(value)
        return <span className="text-sm font-medium">{`${Math.round(score)}%`}</span>
      },
    },
    {
      key: 'totalControls',
      label: t.compliance('columnControls'),
      sortable: true,
      render: (_value: unknown, row: ComplianceFramework) => (
        <span className="text-muted-foreground text-sm">
          {`${row.passedControls}/${row.totalControls}`}
        </span>
      ),
    },
    {
      key: 'lastAssessedAt',
      label: t.compliance('columnLastAssessed'),
      sortable: true,
      render: (value: unknown) => {
        if (!value) {
          return (
            <span className="text-muted-foreground text-xs">{t.compliance('neverAssessed')}</span>
          )
        }
        return (
          <span className="text-muted-foreground text-xs whitespace-nowrap">
            {formatRelativeTime(String(value))}
          </span>
        )
      },
    },
    {
      key: 'createdAt',
      label: t.compliance('columnCreated'),
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
