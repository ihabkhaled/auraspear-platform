import {
  Activity,
  Bot,
  DollarSign,
  FileText,
  Hash,
  Lock,
  MessageSquare,
  ScrollText,
  Sparkles,
  Wifi,
  Zap,
} from 'lucide-react'
import { KpiCard } from '@/components/common'
import type { AiOpsWorkspace, TranslationFn } from '@/types'

export function OpsKpiGrid({
  t,
  workspace,
}: {
  t: TranslationFn
  workspace: AiOpsWorkspace
}) {
  return (
    <div className="space-y-4">
      <h3 className="text-sm font-semibold text-muted-foreground">{t('sections.agents')}</h3>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <KpiCard
          label={t('kpi.totalAgents')}
          value={String(workspace.agents.total)}
          accentColor={undefined}
          icon={<Bot className="h-4 w-4" />}
        />
        <KpiCard
          label={t('kpi.onlineAgents')}
          value={String(workspace.agents.online)}
          accentColor={undefined}
          icon={<Wifi className="h-4 w-4" />}
        />
        <KpiCard
          label={t('kpi.sessions24h')}
          value={String(workspace.agents.totalSessions24h)}
          accentColor={undefined}
          icon={<Zap className="h-4 w-4" />}
        />
      </div>

      <h3 className="text-sm font-semibold text-muted-foreground">
        {t('sections.orchestration')}
      </h3>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <KpiCard
          label={t('kpi.dispatches24h')}
          value={String(workspace.orchestration.dispatches24h)}
          accentColor={undefined}
          icon={<Activity className="h-4 w-4" />}
        />
        <KpiCard
          label={t('kpi.success24h')}
          value={String(workspace.orchestration.success24h)}
          accentColor={undefined}
          icon={<Sparkles className="h-4 w-4" />}
        />
        <KpiCard
          label={t('kpi.failures24h')}
          value={String(workspace.orchestration.failures24h)}
          accentColor={undefined}
          icon={<Activity className="h-4 w-4" />}
        />
        <KpiCard
          label={t('kpi.pendingApprovals')}
          value={String(workspace.orchestration.pendingApprovals)}
          accentColor={undefined}
          icon={<Lock className="h-4 w-4" />}
        />
      </div>

      <h3 className="text-sm font-semibold text-muted-foreground">{t('sections.findings')}</h3>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        <KpiCard
          label={t('kpi.totalFindings')}
          value={String(workspace.findings.total)}
          accentColor={undefined}
          icon={<FileText className="h-4 w-4" />}
        />
        <KpiCard
          label={t('kpi.proposed')}
          value={String(workspace.findings.proposed)}
          accentColor={undefined}
          icon={<FileText className="h-4 w-4" />}
        />
        <KpiCard
          label={t('kpi.applied')}
          value={String(workspace.findings.applied)}
          accentColor={undefined}
          icon={<Sparkles className="h-4 w-4" />}
        />
        <KpiCard
          label={t('kpi.dismissed')}
          value={String(workspace.findings.dismissed)}
          accentColor={undefined}
          icon={<FileText className="h-4 w-4" />}
        />
        <KpiCard
          label={t('kpi.highConfidence')}
          value={String(workspace.findings.highConfidence)}
          accentColor={undefined}
          icon={<Sparkles className="h-4 w-4" />}
        />
      </div>

      <h3 className="text-sm font-semibold text-muted-foreground">
        {t('sections.chatUsageAudit')}
      </h3>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <KpiCard
          label={t('kpi.chatThreads')}
          value={String(workspace.chat.totalThreads)}
          accentColor={undefined}
          icon={<MessageSquare className="h-4 w-4" />}
        />
        <KpiCard
          label={t('kpi.chatMessages')}
          value={Number(workspace.chat.totalMessages).toLocaleString()}
          accentColor={undefined}
          icon={<MessageSquare className="h-4 w-4" />}
        />
        <KpiCard
          label={t('kpi.legalHold')}
          value={String(workspace.chat.legalHoldCount)}
          accentColor={undefined}
          icon={<Lock className="h-4 w-4" />}
        />
        <KpiCard
          label={t('kpi.tokens24h')}
          value={Number(workspace.usage24h.totalTokens).toLocaleString()}
          accentColor={undefined}
          icon={<Hash className="h-4 w-4" />}
        />
        <KpiCard
          label={t('kpi.cost24h')}
          value={`$${Number(workspace.usage24h.estimatedCost).toFixed(2)}`}
          accentColor={undefined}
          icon={<DollarSign className="h-4 w-4" />}
        />
        <KpiCard
          label={t('kpi.auditLogs24h')}
          value={String(workspace.audit.totalLogs24h)}
          accentColor={undefined}
          icon={<ScrollText className="h-4 w-4" />}
        />
      </div>
    </div>
  )
}
