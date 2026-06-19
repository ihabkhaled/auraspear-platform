'use client'

import type { UebaEntityType, UebaRiskLevel } from '@/enums'
import {
  UEBA_ENTITY_TYPE_LABEL_KEYS,
  UEBA_ENTITY_TYPE_CLASSES,
  UEBA_RISK_LEVEL_LABEL_KEYS,
  UEBA_RISK_LEVEL_CLASSES,
} from '@/lib/constants/ueba'
import { formatDate, lookup } from '@/lib/utils'
import type { Column, UebaColumnTranslations, UebaEntity } from '@/types'

export function getUebaColumns(t: UebaColumnTranslations): Column<UebaEntity>[] {
  return [
    {
      key: 'entityName',
      label: t.ueba('colEntityName'),
      sortable: true,
      render: (value: unknown) => <span className="font-medium">{String(value ?? '')}</span>,
    },
    {
      key: 'entityType',
      label: t.ueba('colEntityType'),
      className: 'w-28',
      render: (value: unknown) => {
        const entityType = value as UebaEntityType
        const labelKey = lookup(UEBA_ENTITY_TYPE_LABEL_KEYS, entityType)
        const className = lookup(UEBA_ENTITY_TYPE_CLASSES, entityType)
        return (
          <span
            className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${className ?? ''}`}
          >
            {labelKey ? t.ueba(labelKey) : String(value ?? '')}
          </span>
        )
      },
    },
    {
      key: 'riskScore',
      label: t.ueba('colRiskScore'),
      sortable: true,
      className: 'w-24 text-center',
      render: (value: unknown) => (
        <span className="font-mono text-sm font-medium">{String(value ?? 0)}</span>
      ),
    },
    {
      key: 'riskLevel',
      label: t.ueba('colRiskLevel'),
      className: 'w-24',
      render: (value: unknown) => {
        const level = value as UebaRiskLevel
        const labelKey = lookup(UEBA_RISK_LEVEL_LABEL_KEYS, level)
        const className = lookup(UEBA_RISK_LEVEL_CLASSES, level)
        return (
          <span
            className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${className ?? ''}`}
          >
            {labelKey ? t.ueba(labelKey) : String(value ?? '')}
          </span>
        )
      },
    },
    {
      key: 'anomalyCount',
      label: t.ueba('colAnomalyCount'),
      sortable: true,
      className: 'w-24 text-center',
      render: (value: unknown) => <span className="text-sm font-medium">{String(value ?? 0)}</span>,
    },
    {
      key: 'lastSeenAt',
      label: t.ueba('colLastSeen'),
      sortable: true,
      className: 'w-32',
      render: (value: unknown) => (
        <span className="text-muted-foreground text-xs">
          {value ? formatDate(String(value)) : '-'}
        </span>
      ),
    },
  ]
}
