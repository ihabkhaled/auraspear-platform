'use client'

import { Badge } from '@/components/ui'
import { type AiSessionTrigger } from '@/enums'
import { formatTimestamp } from '@/lib/dayjs'
import {
  AI_SESSION_CONNECTOR_LABELS,
  AI_SESSION_TRIGGER_LABEL_KEYS,
  AI_SESSION_TRIGGER_VARIANTS,
} from '@/lib/constants/ai-agents'
import { lookup } from '@/lib/utils'
import type { AiAgentSession, Column, SessionColumnTranslations } from '@/types'

function TriggerBadge({
  trigger,
  t,
}: {
  trigger: AiSessionTrigger | null
  t: SessionColumnTranslations
}) {
  if (!trigger) {
    return <span className="text-muted-foreground text-xs">—</span>
  }
  const labelKey = lookup(AI_SESSION_TRIGGER_LABEL_KEYS, trigger)
  const variant = lookup(AI_SESSION_TRIGGER_VARIANTS, trigger) ?? 'default'
  const label = labelKey ? t(labelKey) : trigger
  return (
    <Badge variant={variant as 'default'} className="text-xs">
      {label}
    </Badge>
  )
}

export function getAiAgentSessionColumns(t: SessionColumnTranslations): Column<AiAgentSession>[] {
  return [
    {
      key: 'input',
      label: t('sessionInput'),
      render: (value: unknown) => (
        <span className="max-w-[200px] truncate text-sm">{String(value ?? '')}</span>
      ),
    },
    {
      key: 'status',
      label: t('colStatus'),
      className: 'w-24',
      render: (value: unknown) => <span className="text-xs capitalize">{String(value ?? '')}</span>,
    },
    {
      key: 'trigger',
      label: t('sessionTrigger'),
      className: 'w-28',
      render: (_value: unknown, row: AiAgentSession) => (
        <TriggerBadge trigger={row.trigger} t={t} />
      ),
    },
    {
      key: 'sourceModule',
      label: t('sessionSourceModule'),
      className: 'w-44',
      render: (_value: unknown, row: AiAgentSession) => {
        if (!row.sourceModule) {
          return <span className="text-muted-foreground text-xs">—</span>
        }
        const entityLabel = row.sourceEntity
          ? `${row.sourceModule}: ${row.sourceEntity}`
          : row.sourceModule
        return (
          <span className="max-w-[180px] truncate text-xs" title={entityLabel}>
            {entityLabel}
          </span>
        )
      },
    },
    {
      key: 'provider',
      label: t('sessionProvider'),
      className: 'w-36',
      render: (value: unknown) => {
        const raw = String(value ?? '')
        const label = raw ? (lookup(AI_SESSION_CONNECTOR_LABELS, raw) ?? raw) : '—'
        return <span className="text-xs font-medium">{label}</span>
      },
    },
    {
      key: 'model',
      label: t('sessionModel'),
      className: 'w-32',
      render: (value: unknown) => <span className="font-mono text-xs">{String(value ?? '—')}</span>,
    },
    {
      key: 'output',
      label: t('sessionOutput'),
      render: (value: unknown) => (
        <span className="max-w-[240px] truncate text-sm">{String(value ?? '') || '—'}</span>
      ),
    },
    {
      key: 'tokensUsed',
      label: t('colTokens'),
      className: 'w-24 text-end',
      render: (value: unknown) => (
        <span className="font-mono text-xs">{Number(value ?? 0).toLocaleString()}</span>
      ),
    },
    {
      key: 'cost',
      label: t('colCost'),
      className: 'w-20 text-end',
      render: (value: unknown) => (
        <span className="font-mono text-xs">{`$${Number(value ?? 0).toFixed(4)}`}</span>
      ),
    },
    {
      key: 'startedAt',
      label: t('sessionStarted'),
      className: 'w-36',
      render: (value: unknown) => (
        <span className="text-muted-foreground text-xs">
          {value ? formatTimestamp(String(value)) : '-'}
        </span>
      ),
    },
  ]
}
