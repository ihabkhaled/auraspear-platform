'use client'

import { type RuleSource } from '@/enums'
import {
  RULE_SOURCE_LABEL_KEYS,
  RULE_SOURCE_CLASSES,
  RULE_SEVERITY_LABEL_KEYS,
  RULE_SEVERITY_CLASSES,
  RULE_STATUS_LABEL_KEYS,
  RULE_STATUS_CLASSES,
} from '@/lib/constants/correlation'
import { lookup } from '@/lib/utils'
import type { Column, CorrelationColumnTranslations, CorrelationRule } from '@/types'

export function getCorrelationColumns(t: CorrelationColumnTranslations): Column<CorrelationRule>[] {
  return [
    {
      key: 'ruleNumber',
      label: t.correlation('ruleId'),
      className: 'w-28',
      render: (value: unknown) => <span className="font-mono text-xs">{String(value ?? '')}</span>,
    },
    {
      key: 'source',
      label: t.correlation('source'),
      className: 'w-28',
      render: (value: unknown) => {
        const src = value as RuleSource
        const labelKey = lookup(RULE_SOURCE_LABEL_KEYS, src)
        const className = lookup(RULE_SOURCE_CLASSES, src)
        return (
          <span
            className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${className ?? ''}`}
          >
            {labelKey ? t.correlation(labelKey) : String(value ?? '')}
          </span>
        )
      },
    },
    {
      key: 'title',
      label: t.correlation('ruleTitle'),
      sortable: true,
    },
    {
      key: 'mitreTechniques',
      label: t.correlation('mitre'),
      className: 'w-36',
      render: (value: unknown) => {
        const techniques = value as string[]
        if (!techniques || techniques.length === 0) {
          return <span className="text-muted-foreground">-</span>
        }
        return <span className="font-mono text-xs">{techniques.slice(0, 2).join(', ')}</span>
      },
    },
    {
      key: 'hitCount',
      label: t.correlation('hits'),
      sortable: true,
      className: 'w-20 text-center',
      render: (value: unknown) => <span className="text-sm font-medium">{String(value ?? 0)}</span>,
    },
    {
      key: 'severity',
      label: t.correlation('severity'),
      className: 'w-24',
      render: (value: unknown) => {
        const sev = value as keyof typeof RULE_SEVERITY_LABEL_KEYS
        const labelKey = lookup(RULE_SEVERITY_LABEL_KEYS, sev)
        const className = lookup(RULE_SEVERITY_CLASSES, sev)
        return (
          <span
            className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${className ?? ''}`}
          >
            {labelKey ? t.correlation(labelKey) : String(value ?? '')}
          </span>
        )
      },
    },
    {
      key: 'status',
      label: t.correlation('status'),
      className: 'w-24',
      render: (value: unknown) => {
        const st = value as keyof typeof RULE_STATUS_LABEL_KEYS
        const labelKey = lookup(RULE_STATUS_LABEL_KEYS, st)
        const className = lookup(RULE_STATUS_CLASSES, st)
        return (
          <span
            className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${className ?? ''}`}
          >
            {labelKey ? t.correlation(labelKey) : String(value ?? '')}
          </span>
        )
      },
    },
  ]
}
