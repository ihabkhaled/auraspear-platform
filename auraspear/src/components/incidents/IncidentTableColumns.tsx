'use client'

import {
  type IncidentCategory,
  type IncidentSeverity,
  type IncidentStatus,
  SortOrder,
} from '@/enums'
import {
  INCIDENT_CATEGORY_LABEL_KEYS,
  INCIDENT_SEVERITY_CLASSES,
  INCIDENT_SEVERITY_LABEL_KEYS,
  INCIDENT_STATUS_CLASSES,
  INCIDENT_STATUS_LABEL_KEYS,
} from '@/lib/constants/incidents'
import { formatRelativeTime, cn, lookup } from '@/lib/utils'
import type { Column, Incident, IncidentColumnTranslations } from '@/types'

export function getIncidentColumns(t: IncidentColumnTranslations): Column<Incident>[] {
  return [
    {
      key: 'incidentNumber',
      label: t.incidents('columnId'),
      sortable: true,
      render: (value: unknown) => (
        <span className="font-mono text-xs font-medium">{String(value)}</span>
      ),
    },
    {
      key: 'severity',
      label: t.common('severity'),
      sortable: true,
      render: (value: unknown) => {
        const sev = value as IncidentSeverity
        const labelKey = lookup(INCIDENT_SEVERITY_LABEL_KEYS, sev)
        return (
          <span
            className={cn(
              'inline-flex rounded-full px-2 py-0.5 text-xs font-medium',
              lookup(INCIDENT_SEVERITY_CLASSES, sev)
            )}
          >
            {labelKey ? t.incidents(labelKey) : String(value)}
          </span>
        )
      },
    },
    {
      key: 'title',
      label: t.incidents('columnTitle'),
      className: 'max-w-xs',
      render: (value: unknown) => (
        <span className="block truncate text-sm font-medium">{String(value ?? '-')}</span>
      ),
    },
    {
      key: 'category',
      label: t.incidents('columnCategory'),
      sortable: true,
      render: (value: unknown) => {
        const cat = value as IncidentCategory
        const labelKey = lookup(INCIDENT_CATEGORY_LABEL_KEYS, cat)
        return (
          <span className="text-muted-foreground text-xs capitalize">
            {labelKey ? t.incidents(labelKey) : String(value)}
          </span>
        )
      },
    },
    {
      key: 'status',
      label: t.common('status'),
      sortable: true,
      render: (value: unknown) => {
        const status = value as IncidentStatus
        const labelKey = lookup(INCIDENT_STATUS_LABEL_KEYS, status)
        return (
          <span
            className={cn(
              'inline-flex rounded-full px-2 py-0.5 text-xs font-medium',
              lookup(INCIDENT_STATUS_CLASSES, status)
            )}
          >
            {labelKey ? t.incidents(labelKey) : String(value)}
          </span>
        )
      },
    },
    {
      key: 'assigneeName',
      label: t.common('assignee'),
      render: (value: unknown) => (
        <span className="text-sm">{value ? String(value) : t.incidents('unassigned')}</span>
      ),
    },
    {
      key: 'mitreTechniques',
      label: t.incidents('columnMitre'),
      render: (value: unknown) => {
        const techniques = value as string[]
        const first = techniques.at(0)
        if (!first) {
          return <span className="text-muted-foreground text-xs">-</span>
        }
        return (
          <div className="flex items-center gap-1">
            <span className="border-border rounded border px-1.5 py-0.5 font-mono text-xs">
              {first}
            </span>
            {techniques.length > 1 && (
              <span className="text-muted-foreground text-xs">+{techniques.length - 1}</span>
            )}
          </div>
        )
      },
    },
    {
      key: 'createdAt',
      label: t.incidents('columnAge'),
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
