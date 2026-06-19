'use client'

import { type ReportType, type ReportFormat, type ReportStatus, SortOrder } from '@/enums'
import {
  REPORT_TYPE_CLASSES,
  REPORT_TYPE_LABEL_KEYS,
  REPORT_FORMAT_CLASSES,
  REPORT_FORMAT_LABEL_KEYS,
  REPORT_STATUS_CLASSES,
  REPORT_STATUS_LABEL_KEYS,
} from '@/lib/constants/reports'
import { formatRelativeTime, cn, lookup } from '@/lib/utils'
import type { Column, Report, ReportColumnTranslations } from '@/types'

export function getReportColumns(t: ReportColumnTranslations): Column<Report>[] {
  return [
    {
      key: 'name',
      label: t.reports('columnName'),
      sortable: true,
      render: (value: unknown) => <span className="text-sm font-medium">{String(value)}</span>,
    },
    {
      key: 'type',
      label: t.reports('columnType'),
      sortable: true,
      render: (value: unknown) => {
        const reportType = value as ReportType
        const labelKey = lookup(REPORT_TYPE_LABEL_KEYS, reportType)
        return (
          <span
            className={cn(
              'inline-flex rounded-full px-2 py-0.5 text-xs font-medium',
              lookup(REPORT_TYPE_CLASSES, reportType)
            )}
          >
            {labelKey ? t.reports(labelKey) : String(value)}
          </span>
        )
      },
    },
    {
      key: 'format',
      label: t.reports('columnFormat'),
      sortable: true,
      render: (value: unknown) => {
        const fmt = value as ReportFormat
        const labelKey = lookup(REPORT_FORMAT_LABEL_KEYS, fmt)
        return (
          <span
            className={cn(
              'inline-flex rounded-full px-2 py-0.5 text-xs font-medium uppercase',
              lookup(REPORT_FORMAT_CLASSES, fmt)
            )}
          >
            {labelKey ? t.reports(labelKey) : String(value)}
          </span>
        )
      },
    },
    {
      key: 'status',
      label: t.common('status'),
      sortable: true,
      render: (value: unknown) => {
        const status = value as ReportStatus
        const labelKey = lookup(REPORT_STATUS_LABEL_KEYS, status)
        return (
          <span
            className={cn(
              'inline-flex rounded-full px-2 py-0.5 text-xs font-medium',
              lookup(REPORT_STATUS_CLASSES, status)
            )}
          >
            {labelKey ? t.reports(labelKey) : String(value)}
          </span>
        )
      },
    },
    {
      key: 'generatedByName',
      label: t.reports('columnGeneratedBy'),
      render: (value: unknown) => <span className="text-sm">{value ? String(value) : '-'}</span>,
    },
    {
      key: 'createdAt',
      label: t.reports('columnCreated'),
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
