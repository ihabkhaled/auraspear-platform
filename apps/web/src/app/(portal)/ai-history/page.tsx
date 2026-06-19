'use client'

import { ChevronLeft, ChevronRight } from 'lucide-react'
import { DataTable, PageHeader } from '@/components/common'
import {
  Badge,
  Button,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui'
import { BadgeVariant } from '@/enums'
import { useAiHistoryPage } from '@/hooks'
import { formatDate } from '@/lib/utils'
import type { AiJobRunSummary, Column } from '@/types'

export default function AiHistoryPage() {
  const {
    t,
    runs,
    pagination,
    isLoading,
    page,
    setPage,
    agentFilter,
    statusFilter,
    moduleFilter,
    handleFilterChange,
    selectedRun,
    detailOpen,
    setDetailOpen,
    handleOpenDetail,
  } = useAiHistoryPage()

  // Columns contain JSX render functions — acceptable inline per CLAUDE.md rule 33
  const columns: Column<AiJobRunSummary>[] = [
    {
      key: 'agentId',
      label: t('agent'),
      render: (value: unknown) => (
        <Badge variant="outline" className="font-mono text-xs">
          {(value as string) ?? '-'}
        </Badge>
      ),
    },
    {
      key: 'sourceModule',
      label: t('module'),
      render: (value: unknown) => (
        <Badge variant="secondary" className="text-xs">
          {(value as string) ?? '-'}
        </Badge>
      ),
    },
    {
      key: 'status',
      label: t('status'),
      render: (value: unknown) => {
        const status = value as string
        let variant: BadgeVariant = BadgeVariant.SECONDARY
        if (status === 'completed') variant = BadgeVariant.SUCCESS
        else if (status === 'failed') variant = BadgeVariant.DESTRUCTIVE
        return (
          <Badge variant={variant} className="text-xs capitalize">
            {status}
          </Badge>
        )
      },
    },
    {
      key: 'providerKey',
      label: t('provider'),
      render: (value: unknown) => <span className="text-xs">{(value as string) ?? '-'}</span>,
    },
    {
      key: 'modelKey',
      label: t('model'),
      render: (value: unknown) => (
        <span className="font-mono text-xs">{(value as string) ?? '-'}</span>
      ),
    },
    {
      key: 'tokensUsed',
      label: t('tokens'),
      render: (value: unknown) => <span className="text-xs">{String(value ?? 0)}</span>,
    },
    {
      key: 'durationMs',
      label: t('duration'),
      render: (value: unknown) => {
        const ms = value as number | null
        if (ms === null) return <span className="text-muted-foreground text-xs">-</span>
        return <span className="text-xs">{`${String(ms)}ms`}</span>
      },
    },
    {
      key: 'createdAt',
      label: t('date'),
      render: (value: unknown) => (
        <span className="text-muted-foreground text-xs">{formatDate(value as string)}</span>
      ),
    },
    {
      key: 'actions',
      label: '',
      render: (_value: unknown, row: AiJobRunSummary) => (
        <Button variant="ghost" size="sm" onClick={() => handleOpenDetail(row)}>
          {t('viewDetail')}
        </Button>
      ),
    },
  ]

  return (
    <div className="space-y-4">
      <PageHeader title={t('title')} description={t('description')} />

      <div className="flex flex-wrap items-center gap-3">
        <Select value={agentFilter || 'all'} onValueChange={v => handleFilterChange('agent', v)}>
          <SelectTrigger className="w-full sm:w-48">
            <SelectValue placeholder={t('filterAgent')} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t('allAgents')}</SelectItem>
            {[...new Set(runs.map(r => r.agentId).filter(Boolean))].sort().map(a => (
              <SelectItem key={a} value={a ?? ''}>
                {a}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={statusFilter || 'all'} onValueChange={v => handleFilterChange('status', v)}>
          <SelectTrigger className="w-full sm:w-40">
            <SelectValue placeholder={t('filterStatus')} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t('allStatuses')}</SelectItem>
            <SelectItem value="completed">{t('completed')}</SelectItem>
            <SelectItem value="failed">{t('failed')}</SelectItem>
          </SelectContent>
        </Select>

        <Select value={moduleFilter || 'all'} onValueChange={v => handleFilterChange('module', v)}>
          <SelectTrigger className="w-full sm:w-48">
            <SelectValue placeholder={t('filterModule')} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t('allModules')}</SelectItem>
            {[...new Set(runs.map(r => r.sourceModule).filter(Boolean))].sort().map(m => (
              <SelectItem key={m} value={m ?? ''}>
                {m}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {pagination && (
          <span className="text-muted-foreground ms-auto text-xs">
            {t('totalRuns')}: {String(pagination.total)}
          </span>
        )}
      </div>

      <DataTable columns={columns} data={runs} emptyMessage={t('noHistory')} loading={isLoading} />

      {pagination && pagination.totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 pt-2">
          <Button
            variant="outline"
            size="sm"
            disabled={page <= 1}
            onClick={() => setPage(page - 1)}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-muted-foreground text-xs">
            {String(page)} / {String(pagination.totalPages)}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={page >= pagination.totalPages}
            onClick={() => setPage(page + 1)}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      )}

      {/* Detail Modal */}
      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="max-w-[95vw] sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>{t('runDetail')}</DialogTitle>
          </DialogHeader>
          {selectedRun && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 gap-2 text-sm sm:grid-cols-2 sm:gap-3">
                <div>
                  <span className="text-muted-foreground">{t('agent')}: </span>
                  <span className="font-medium">{selectedRun.agentId ?? '-'}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">{t('module')}: </span>
                  <span>{selectedRun.sourceModule ?? '-'}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">{t('provider')}: </span>
                  <span>{selectedRun.providerKey ?? '-'}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">{t('model')}: </span>
                  <span className="font-mono">{selectedRun.modelKey ?? '-'}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">{t('tokens')}: </span>
                  <span>{String(selectedRun.tokensUsed)}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">{t('duration')}: </span>
                  <span>
                    {selectedRun.durationMs === null ? '-' : `${String(selectedRun.durationMs)}ms`}
                  </span>
                </div>
                <div>
                  <span className="text-muted-foreground">{t('date')}: </span>
                  <span>{formatDate(selectedRun.createdAt)}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">{t('triggerType')}: </span>
                  <span>{selectedRun.triggerType}</span>
                </div>
              </div>

              {selectedRun.summaryText && (
                <div>
                  <p className="text-muted-foreground mb-1 text-xs font-medium uppercase">
                    {t('summary')}
                  </p>
                  <div className="bg-muted/50 max-h-80 overflow-auto rounded-lg p-3">
                    <pre className="text-foreground text-sm leading-relaxed whitespace-pre-wrap">
                      {selectedRun.summaryText}
                    </pre>
                  </div>
                </div>
              )}

              {selectedRun.errorMessage && (
                <div>
                  <p className="text-status-error mb-1 text-xs font-medium uppercase">
                    {t('error')}
                  </p>
                  <p className="text-status-error text-sm">{selectedRun.errorMessage}</p>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
