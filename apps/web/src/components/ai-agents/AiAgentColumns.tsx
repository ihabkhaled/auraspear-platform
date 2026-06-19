'use client'

import type { AiAgentStatus, AiAgentTier } from '@/enums'
import {
  AI_AGENT_STATUS_LABEL_KEYS,
  AI_AGENT_STATUS_DOT_CLASSES,
  AI_AGENT_TIER_LABEL_KEYS,
  AI_AGENT_TIER_CLASSES,
} from '@/lib/constants/ai-agents'
import { lookup } from '@/lib/utils'
import type { AiAgent, AiAgentColumnTranslations, Column } from '@/types'

export function getAiAgentColumns(t: AiAgentColumnTranslations): Column<AiAgent>[] {
  return [
    {
      key: 'name',
      label: t.aiAgents('colName'),
      sortable: true,
      render: (value: unknown, row: AiAgent) => {
        const statusClass =
          lookup(AI_AGENT_STATUS_DOT_CLASSES, row.status as AiAgentStatus) ?? 'bg-muted-foreground'
        return (
          <div className="flex items-center gap-2">
            <span className={`h-2 w-2 shrink-0 rounded-full ${statusClass}`} />
            <span className="font-medium">{String(value ?? '')}</span>
          </div>
        )
      },
    },
    {
      key: 'model',
      label: t.aiAgents('colModel'),
      className: 'w-36',
      sortable: true,
      render: (value: unknown) => <span className="font-mono text-xs">{String(value ?? '')}</span>,
    },
    {
      key: 'tier',
      label: t.aiAgents('colTier'),
      className: 'w-24',
      sortable: true,
      render: (value: unknown) => {
        const tier = value as AiAgentTier
        const labelKey = lookup(AI_AGENT_TIER_LABEL_KEYS, tier)
        const className = lookup(AI_AGENT_TIER_CLASSES, tier)
        return (
          <span
            className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${className ?? ''}`}
          >
            {labelKey ? t.aiAgents(labelKey) : String(value ?? '')}
          </span>
        )
      },
    },
    {
      key: 'status',
      label: t.aiAgents('colStatus'),
      className: 'w-24',
      sortable: true,
      render: (value: unknown) => {
        const status = value as AiAgentStatus
        const labelKey = lookup(AI_AGENT_STATUS_LABEL_KEYS, status)
        const dotClass = lookup(AI_AGENT_STATUS_DOT_CLASSES, status) ?? 'bg-muted-foreground'
        return (
          <div className="flex items-center gap-1.5">
            <span className={`h-1.5 w-1.5 rounded-full ${dotClass}`} />
            <span className="text-xs">{labelKey ? t.aiAgents(labelKey) : String(value ?? '')}</span>
          </div>
        )
      },
    },
    {
      key: 'totalTasks',
      label: t.aiAgents('colTasks'),
      sortable: true,
      className: 'w-20 text-center',
      render: (value: unknown) => <span className="text-sm font-medium">{String(value ?? 0)}</span>,
    },
    {
      key: 'totalTokens',
      label: t.aiAgents('colTokens'),
      sortable: true,
      className: 'w-28 text-end',
      render: (value: unknown) => (
        <span className="font-mono text-xs">{Number(value ?? 0).toLocaleString()}</span>
      ),
    },
    {
      key: 'totalCost',
      label: t.aiAgents('colCost'),
      sortable: true,
      className: 'w-24 text-end',
      render: (value: unknown) => (
        <span className="font-mono text-xs">${Number(value ?? 0).toFixed(2)}</span>
      ),
    },
  ]
}
