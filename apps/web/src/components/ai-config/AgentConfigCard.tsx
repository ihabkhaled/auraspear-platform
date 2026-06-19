'use client'

import { memo } from 'react'
import { Bot, Settings } from 'lucide-react'
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  Switch,
} from '@/components/ui'
import { AGENT_EXECUTION_MAP, AI_AGENT_LABEL_KEYS, AI_TRIGGER_MODE_LABEL_KEYS } from '@/lib/constants/ai-config'
import { AiAgentId } from '@/enums'
import { lookup } from '@/lib/utils'
import type { AgentCardProps } from '@/types'

function TokenBar({ used, limit, label }: { used: number; limit: number; label: string }) {
  const percent = limit > 0 ? Math.min((used / limit) * 100, 100) : 0
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs">
        <span className="text-muted-foreground">{label}</span>
        <span className="text-muted-foreground">
          {String(used)} / {String(limit)}
        </span>
      </div>
      <div className="bg-muted h-1.5 rounded-full">
        <div
          className="bg-primary h-1.5 rounded-full transition-all"
          style={{ width: `${String(percent)}%` }}
        />
      </div>
    </div>
  )
}

export const AgentConfigCard = memo(
  ({ config, onEdit, onToggle, availableConnectors, t }: AgentCardProps) => {
    const providerLabel =
      availableConnectors.find(c => c.key === config.providerMode)?.label ?? config.providerMode
    const triggerKey = lookup(AI_TRIGGER_MODE_LABEL_KEYS, config.triggerMode)
    const agentIdKey = config.agentId as AiAgentId
    const executionAgent = AGENT_EXECUTION_MAP[agentIdKey]
    const executionAgentLabel = executionAgent ? lookup(AI_AGENT_LABEL_KEYS, executionAgent) : null

    return (
      <Card className="border-border bg-card">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <div className="flex items-center gap-2">
            <Bot className="text-primary h-5 w-5" />
            <div>
              <h3 className="text-sm font-semibold">{config.displayName}</h3>
              <p className="text-muted-foreground text-xs">{config.description}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant={config.isEnabled ? 'success' : 'secondary'}>
              {config.isEnabled ? t('enabled') : t('disabled')}
            </Badge>
            <Switch
              checked={config.isEnabled}
              onCheckedChange={checked => onToggle(config.agentId, checked)}
              aria-label={t('enabled')}
            />
          </div>
        </CardHeader>
        <CardContent className="space-y-3 pt-0">
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div>
              <span className="text-muted-foreground">{t('provider')}: </span>
              <span>{providerLabel}</span>
            </div>
            <div>
              <span className="text-muted-foreground">{t('model')}: </span>
              <span>{config.model || '-'}</span>
            </div>
            <div>
              <span className="text-muted-foreground">{t('temperature')}: </span>
              <span>{String(config.temperature)}</span>
            </div>
            <div>
              <span className="text-muted-foreground">{t('triggerMode')}: </span>
              <span>
                {triggerKey ? t(triggerKey.replace('aiConfig.', '')) : config.triggerMode}
              </span>
            </div>
            {executionAgentLabel && (
              <div className="col-span-2">
                <span className="text-muted-foreground">{t('executesVia')}: </span>
                <Badge variant="info" className="text-xs">
                  {t(executionAgentLabel.replace('aiConfig.', ''))}
                </Badge>
              </div>
            )}
          </div>

          <div className="space-y-2">
            <p className="text-muted-foreground text-xs font-medium uppercase">{t('tokenUsage')}</p>
            <TokenBar
              used={config.tokensUsedHour}
              limit={config.tokensPerHour}
              label={t('tokensPerHour')}
            />
            <TokenBar
              used={config.tokensUsedDay}
              limit={config.tokensPerDay}
              label={t('tokensPerDay')}
            />
            <TokenBar
              used={config.tokensUsedMonth}
              limit={config.tokensPerMonth}
              label={t('tokensPerMonth')}
            />
          </div>

          <Button variant="outline" size="sm" className="w-full" onClick={() => onEdit(config)}>
            <Settings className="mr-1.5 h-3.5 w-3.5" />
            {t('configure')}
          </Button>
        </CardContent>
      </Card>
    )
  }
)

AgentConfigCard.displayName = 'AgentConfigCard'
