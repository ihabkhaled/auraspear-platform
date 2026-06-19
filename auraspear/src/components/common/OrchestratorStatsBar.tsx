import { Activity, Bot, CheckCircle2, Clock, XCircle } from 'lucide-react'
import { Badge } from '@/components/ui'
import type { OrchestratorStatsBarProps } from '@/types'

export function OrchestratorStatsBar({ stats, t }: OrchestratorStatsBarProps) {
  return (
    <div className="bg-card border-border flex flex-wrap items-center gap-3 rounded-lg border px-4 py-3">
      <div className="flex items-center gap-1.5">
        <Activity className="text-muted-foreground h-3.5 w-3.5" />
        <span className="text-muted-foreground text-xs">{t('orchestrator.totalDispatches')}</span>
        <Badge variant="outline" className="text-xs font-semibold">
          {stats.totalDispatches24h}
        </Badge>
      </div>

      <div className="bg-border h-4 w-px" />

      <div className="flex items-center gap-1.5">
        <CheckCircle2 className="text-status-success h-3.5 w-3.5" />
        <span className="text-muted-foreground text-xs">{t('orchestrator.successCount')}</span>
        <Badge variant="success" className="text-xs">
          {stats.successCount24h}
        </Badge>
      </div>

      <div className="bg-border h-4 w-px" />

      <div className="flex items-center gap-1.5">
        <XCircle className="text-status-error h-3.5 w-3.5" />
        <span className="text-muted-foreground text-xs">{t('orchestrator.failureCount')}</span>
        <Badge variant="destructive" className="text-xs">
          {stats.failureCount24h}
        </Badge>
      </div>

      <div className="bg-border h-4 w-px" />

      <div className="flex items-center gap-1.5">
        <Clock className="text-status-warning h-3.5 w-3.5" />
        <span className="text-muted-foreground text-xs">{t('orchestrator.pendingApprovals')}</span>
        <Badge variant="warning" className="text-xs">
          {stats.pendingApprovals}
        </Badge>
      </div>

      <div className="bg-border h-4 w-px" />

      <div className="flex items-center gap-1.5">
        <Bot className="text-muted-foreground h-3.5 w-3.5" />
        <span className="text-muted-foreground text-xs">{t('orchestrator.activeAgents')}</span>
        <Badge variant="outline" className="text-xs font-semibold">
          {`${stats.activeAgents} / ${stats.totalAgents}`}
        </Badge>
      </div>
    </div>
  )
}
