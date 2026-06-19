'use client'

import {
  AlertTriangle,
  CheckCircle,
  Clock,
  FlaskConical,
  PercentCircle,
  Play,
  Plus,
} from 'lucide-react'
import { EvalRunsTable, EvalSuitesTable } from '@/components/ai-eval'
import { CollapsibleSection, KpiCard, LoadingSpinner, PageHeader } from '@/components/common'
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
import { useAiEvalLab } from '@/hooks'

export default function AiEvalLabPage() {
  const {
    t,
    canView,
    canManage,
    suites,
    runs,
    stats,
    availableConnectors,
    isLoading,
    isFetching,
    deleteSuite,
    isCreatingSuite,
    isStartingRun,
    showCreateSuite,
    setShowCreateSuite,
    newSuiteName,
    setNewSuiteName,
    newSuiteDesc,
    setNewSuiteDesc,
    handleCreateSuite,
    showStartRun,
    setShowStartRun,
    runSuiteId,
    setRunSuiteId,
    runProvider,
    setRunProvider,
    runModel,
    setRunModel,
    handleStartRun,
  } = useAiEvalLab()

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
          <KpiCard label={t('kpi.totalSuites')} value={String(stats.totalSuites ?? 0)} icon={<FlaskConical className="h-4 w-4" />} accentColor={undefined} />
          <KpiCard label={t('kpi.totalRuns')} value={String(stats.totalRuns ?? 0)} icon={<Play className="h-4 w-4" />} accentColor={undefined} />
          <KpiCard label={t('kpi.avgScore')} value={stats.avgScore !== null && stats.avgScore !== undefined ? `${(Number(stats.avgScore) * 100).toFixed(1)}%` : '-'} icon={<PercentCircle className="h-4 w-4" />} accentColor={undefined} />
          <KpiCard label={t('kpi.pendingRuns')} value={String(stats.pendingRuns ?? 0)} icon={<Clock className="h-4 w-4" />} accentColor={undefined} />
          <KpiCard label={t('kpi.completedRuns')} value={String(stats.completedRuns ?? 0)} icon={<CheckCircle className="h-4 w-4" />} accentColor={undefined} />
          <KpiCard label={t('kpi.failedRuns')} value={String(stats.failedRuns ?? 0)} icon={<AlertTriangle className="h-4 w-4" />} accentColor={undefined} />
        </div>
      )}

      <CollapsibleSection title={t('sections.suites')} defaultOpen>
        <div className="space-y-4">
          {canManage && !showCreateSuite && (
            <div className="flex justify-end">
              <Button variant="outline" size="sm" onClick={() => setShowCreateSuite(true)}>
                <Plus className="mr-1.5 h-3.5 w-3.5" />
                {t('suites.create')}
              </Button>
            </div>
          )}
          {showCreateSuite && (
            <div className="bg-muted/50 grid grid-cols-1 gap-3 rounded-lg border p-4 sm:grid-cols-3">
              <Input placeholder={t('suites.namePlaceholder')} value={newSuiteName} onChange={e => setNewSuiteName(e.currentTarget.value)} />
              <Textarea placeholder={t('suites.descPlaceholder')} value={newSuiteDesc} onChange={e => setNewSuiteDesc(e.currentTarget.value)} rows={1} />
              <div className="flex gap-2">
                <Button size="sm" onClick={handleCreateSuite} disabled={isCreatingSuite || newSuiteName.trim().length === 0}>
                  {t('suites.save')}
                </Button>
                <Button variant="outline" size="sm" onClick={() => setShowCreateSuite(false)}>
                  {t('suites.cancel')}
                </Button>
              </div>
            </div>
          )}
          <EvalSuitesTable t={t} data={suites} loading={isFetching} canManage={canManage} onDelete={canManage ? (id: string) => { deleteSuite(id) } : undefined} />
        </div>
      </CollapsibleSection>

      <CollapsibleSection title={t('sections.runs')} defaultOpen>
        <div className="space-y-4">
          {canManage && !showStartRun && (
            <div className="flex justify-end">
              <Button variant="outline" size="sm" onClick={() => setShowStartRun(true)}>
                <Play className="mr-1.5 h-3.5 w-3.5" />
                {t('runs.start')}
              </Button>
            </div>
          )}
          {showStartRun && (
            <div className="bg-muted/50 grid grid-cols-1 gap-3 rounded-lg border p-4 sm:grid-cols-4">
              {/* Suite dropdown */}
              <Select value={runSuiteId || 'none'} onValueChange={v => setRunSuiteId(v === 'none' ? '' : v)}>
                <SelectTrigger>
                  <SelectValue placeholder={t('runs.selectSuite')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">{t('runs.selectSuite')}</SelectItem>
                  {suites.map(s => (
                    <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Connector dropdown */}
              <Select value={runProvider || 'default'} onValueChange={setRunProvider}>
                <SelectTrigger>
                  <SelectValue placeholder={t('runs.selectConnector')} />
                </SelectTrigger>
                <SelectContent>
                  {availableConnectors.map(c => (
                    <SelectItem key={c.key} value={c.key}>{c.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Model name */}
              <Input placeholder={t('runs.modelPlaceholder')} value={runModel} onChange={e => setRunModel(e.currentTarget.value)} />

              <div className="flex gap-2">
                <Button size="sm" onClick={handleStartRun} disabled={isStartingRun || !runSuiteId || !runModel.trim()}>
                  {t('runs.execute')}
                </Button>
                <Button variant="outline" size="sm" onClick={() => setShowStartRun(false)}>
                  {t('runs.cancel')}
                </Button>
              </div>
            </div>
          )}
          <EvalRunsTable t={t} data={runs} loading={isFetching} availableConnectors={availableConnectors} />
        </div>
      </CollapsibleSection>
    </div>
  )
}
