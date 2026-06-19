'use client'

import { type NormalizationPipelineStatus, type NormalizationSourceType, SortOrder } from '@/enums'
import {
  NORMALIZATION_PIPELINE_STATUS_CLASSES,
  NORMALIZATION_PIPELINE_STATUS_LABEL_KEYS,
  NORMALIZATION_SOURCE_TYPE_LABEL_KEYS,
} from '@/lib/constants/normalization'
import { formatRelativeTime, cn, lookup } from '@/lib/utils'
import type { Column, NormalizationColumnTranslations, NormalizationPipeline } from '@/types'

export function getNormalizationColumns(
  t: NormalizationColumnTranslations
): Column<NormalizationPipeline>[] {
  return [
    {
      key: 'name',
      label: t.common('name'),
      sortable: true,
      render: (value: unknown) => <span className="text-sm font-medium">{String(value)}</span>,
    },
    {
      key: 'sourceType',
      label: t.normalization('columnSourceType'),
      sortable: true,
      render: (value: unknown) => {
        const src = value as NormalizationSourceType
        const labelKey = lookup(NORMALIZATION_SOURCE_TYPE_LABEL_KEYS, src)
        return (
          <span className="text-muted-foreground text-xs">
            {labelKey ? t.normalization(labelKey) : String(value)}
          </span>
        )
      },
    },
    {
      key: 'status',
      label: t.common('status'),
      sortable: true,
      render: (value: unknown) => {
        const status = value as NormalizationPipelineStatus
        const labelKey = lookup(NORMALIZATION_PIPELINE_STATUS_LABEL_KEYS, status)
        return (
          <span
            className={cn(
              'inline-flex rounded-full px-2 py-0.5 text-xs font-medium',
              lookup(NORMALIZATION_PIPELINE_STATUS_CLASSES, status)
            )}
          >
            {labelKey ? t.normalization(labelKey) : String(value)}
          </span>
        )
      },
    },
    {
      key: 'processedCount',
      label: t.normalization('columnEventsProcessed'),
      sortable: true,
      render: (value: unknown) => (
        <span className="text-muted-foreground text-xs">{Number(value).toLocaleString()}</span>
      ),
    },
    {
      key: 'errorCount',
      label: t.normalization('columnErrorRate'),
      sortable: true,
      render: (value: unknown) => (
        <span className="text-muted-foreground text-xs">{Number(value).toLocaleString()}</span>
      ),
    },
    {
      key: 'createdAt',
      label: t.common('createdAt'),
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
