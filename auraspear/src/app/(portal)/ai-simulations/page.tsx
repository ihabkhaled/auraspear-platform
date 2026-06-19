'use client'

import { AlertTriangle, CheckCircle, Clock, Cpu, PlayCircle, Plus, Timer } from 'lucide-react'
import { SimulationsTable } from '@/components/ai-simulations'
import { KpiCard, LoadingSpinner, PageHeader } from '@/components/common'
import {
  Button,
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Textarea,
} from '@/components/ui'
import { useAiSimulations } from '@/hooks'

export default function AiSimulationsPage() {
  const {
    t,
    canView,
    canManage,
    agents,
    simulations,
    stats,
    isLoading,
    isFetching,
    deleteSimulation,
    isCreating,
    showCreate,
    setShowCreate,
    newName,
    setNewName,
    newDesc,
    setNewDesc,
    newAgentId,
    setNewAgentId,
    handleCreate,
  } = useAiSimulations()

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

      {stats && (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
          <KpiCard label={t('kpi.total')} value={String(stats.total ?? 0)} icon={<PlayCircle className="h-4 w-4" />} accentColor={undefined} />
          <KpiCard label={t('kpi.pending')} value={String(stats.pending ?? 0)} icon={<Clock className="h-4 w-4" />} accentColor={undefined} />
          <KpiCard label={t('kpi.running')} value={String(stats.running ?? 0)} icon={<Cpu className="h-4 w-4" />} accentColor={undefined} />
          <KpiCard label={t('kpi.completed')} value={String(stats.completed ?? 0)} icon={<CheckCircle className="h-4 w-4" />} accentColor={undefined} />
          <KpiCard label={t('kpi.failed')} value={String(stats.failed ?? 0)} icon={<AlertTriangle className="h-4 w-4" />} accentColor={undefined} />
          <KpiCard label={t('kpi.avgLatency')} value={stats.avgLatencyMs !== null && stats.avgLatencyMs !== undefined ? `${Number(stats.avgLatencyMs).toFixed(0)}ms` : '-'} icon={<Timer className="h-4 w-4" />} accentColor={undefined} />
        </div>
      )}

      <div className="space-y-4">
        {canManage && !showCreate && (
          <div className="flex justify-end">
            <Button variant="outline" size="sm" onClick={() => setShowCreate(true)}>
              <Plus className="mr-1.5 h-3.5 w-3.5" />
              {t('create')}
            </Button>
          </div>
        )}
        {showCreate && (
          <div className="bg-muted/50 grid grid-cols-1 gap-3 rounded-lg border p-4 sm:grid-cols-4">
            <Input placeholder={t('namePlaceholder')} value={newName} onChange={e => setNewName(e.currentTarget.value)} />
            <Select value={newAgentId || 'none'} onValueChange={v => setNewAgentId(v === 'none' ? '' : v)}>
              <SelectTrigger>
                <SelectValue placeholder={t('selectAgent')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">{t('selectAgent')}</SelectItem>
                {agents.map(a => (
                  <SelectItem key={a.agentId} value={a.agentId}>{a.displayName ?? a.agentId}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Textarea placeholder={t('descPlaceholder')} value={newDesc} onChange={e => setNewDesc(e.currentTarget.value)} rows={1} />
            <div className="flex gap-2">
              <Button size="sm" onClick={handleCreate} disabled={isCreating || !newName.trim() || !newAgentId}>
                {t('save')}
              </Button>
              <Button variant="outline" size="sm" onClick={() => setShowCreate(false)}>
                {t('cancel')}
              </Button>
            </div>
          </div>
        )}

        <SimulationsTable
          t={t}
          data={simulations}
          loading={isFetching}
          canManage={canManage}
          onDelete={canManage ? (id: string) => { deleteSimulation(id) } : undefined}
        />
      </div>
    </div>
  )
}
