'use client'

import { Bot, Calendar, Clock, Network, Power, Zap } from 'lucide-react'
import { AgentGraphTable } from '@/components/ai-agent-graph'
import { KpiCard, LoadingSpinner, PageHeader } from '@/components/common'
import { useAgentGraph } from '@/hooks'

export default function AiAgentGraphPage() {
  const { t, canView, agents, health, isLoading, isFetching } = useAgentGraph()

  if (!canView) {
    return (
      <div className="flex h-64 items-center justify-center text-muted-foreground">
        {t('noAccess')}
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <LoadingSpinner />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <PageHeader title={t('title')} description={t('description')} />

      {health ? (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
          <KpiCard
            label={t('kpi.totalAgents')}
            value={health.totalAgents}
            icon={<Bot className="h-4 w-4" />}
            accentColor={undefined}
          />
          <KpiCard
            label={t('kpi.enabledAgents')}
            value={health.enabledAgents}
            icon={<Power className="h-4 w-4" />}
            accentColor={undefined}
          />
          <KpiCard
            label={t('kpi.coreAgents')}
            value={health.coreAgents}
            icon={<Zap className="h-4 w-4" />}
            accentColor={undefined}
          />
          <KpiCard
            label={t('kpi.specialistAgents')}
            value={health.specialistAgents}
            icon={<Network className="h-4 w-4" />}
            accentColor={undefined}
          />
          <KpiCard
            label={t('kpi.totalSchedules')}
            value={health.totalSchedules}
            icon={<Calendar className="h-4 w-4" />}
            accentColor={undefined}
          />
          <KpiCard
            label={t('kpi.enabledSchedules')}
            value={health.enabledSchedules}
            icon={<Clock className="h-4 w-4" />}
            accentColor={undefined}
          />
        </div>
      ) : null}

      <AgentGraphTable t={t} data={agents} loading={isFetching} />
    </div>
  )
}
