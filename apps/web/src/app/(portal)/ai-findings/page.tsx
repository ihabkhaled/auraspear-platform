'use client'

import {
  CheckCircle,
  ChevronLeft,
  ChevronRight,
  Download,
  Search,
  Sparkles,
  X,
  XCircle,
} from 'lucide-react'
import { FindingDetailDrawer } from '@/components/ai-findings'
import { DataTable, PageHeader } from '@/components/common'
import {
  Badge,
  Button,
  Checkbox,
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui'
import { SortOrder } from '@/enums'
import { useAiFindingsPage } from '@/hooks'
import {
  resolveFindingConfidenceVariant,
  resolveFindingSeverityVariant,
  resolveFindingStatusVariant,
} from '@/lib/ai-config.utils'
import { formatTimestamp } from '@/lib/utils'
import type { AiExecutionFinding, Column } from '@/types'

export default function AiFindingsPage() {
  const {
    t,
    findings,
    stats,
    isLoading,
    isFetching,
    statsLoading,
    query,
    agentId,
    sourceModule,
    status,
    findingType,
    severity,
    sortBy,
    sortOrder,
    page,
    limit,
    totalPages,
    selectedFinding,
    detailOpen,
    activeFilters,
    agentOptions,
    moduleOptions,
    statusOptions,
    findingTypeOptions,
    severityOptions,
    handleQueryChange,
    handleFilterChange,
    handleSort,
    handleClearFilters,
    handleRowClick,
    handleRemoveFilter,
    handleUpdateStatus,
    statusLoading,
    handlePromote,
    promoteLoading,
    canPromote,
    handleExportFindings,
    handleBulkDismiss,
    handleBulkApply,
    isBulkLoading,
    selectedIds,
    toggleSelectFinding,
    toggleSelectAll,
    clearSelection,
    setPage,
    setDetailOpen,
    handleLimitChange,
  } = useAiFindingsPage()


  // Columns contain JSX render functions -- acceptable inline per CLAUDE.md rule 33
  const columns: Column<AiExecutionFinding>[] = [
    {
      key: 'id',
      label: '',
      render: (_value: unknown, row: AiExecutionFinding) => (
        <Checkbox
          checked={selectedIds.has(row.id)}
          onCheckedChange={() => toggleSelectFinding(row.id)}
          onClick={(e: React.MouseEvent) => e.stopPropagation()}
        />
      ),
    },
    {
      key: 'title',
      label: t('title'),
      sortable: true,
      render: (value: unknown) => (
        <span className="max-w-xs truncate text-sm font-medium">{(value as string) ?? '-'}</span>
      ),
    },
    {
      key: 'agentId',
      label: t('agent'),
      sortable: true,
      render: (value: unknown) => (
        <Badge variant="outline" className="font-mono text-xs">
          {(value as string) ?? '-'}
        </Badge>
      ),
    },
    {
      key: 'sourceModule',
      label: t('module'),
      sortable: true,
      render: (value: unknown) => (
        <Badge variant="secondary" className="text-xs">
          {(value as string) ?? '-'}
        </Badge>
      ),
    },
    {
      key: 'findingType',
      label: t('type'),
      sortable: true,
      render: (value: unknown) => (
        <span className="text-muted-foreground text-xs capitalize">
          {((value as string) ?? '-').replaceAll('_', ' ')}
        </span>
      ),
    },
    {
      key: 'severity',
      label: t('severity'),
      sortable: true,
      render: (value: unknown) => {
        const sev = value as string | null
        if (!sev) {
          return <span className="text-muted-foreground text-xs">-</span>
        }
        return (
          <Badge variant={resolveFindingSeverityVariant(sev)} className="text-xs capitalize">
            {sev}
          </Badge>
        )
      },
    },
    {
      key: 'confidenceScore',
      label: t('confidence'),
      sortable: true,
      defaultSortOrder: SortOrder.ASC,
      render: (value: unknown) => {
        const score = value as number | null
        if (score === null || score === undefined) {
          return <span className="text-muted-foreground text-xs">-</span>
        }
        const pct = score <= 1 ? Math.round(score * 100) : Math.round(score)
        return (
          <Badge variant={resolveFindingConfidenceVariant(pct)} className="text-xs">
            {`${String(pct)}%`}
          </Badge>
        )
      },
    },
    {
      key: 'status',
      label: t('status'),
      sortable: true,
      render: (value: unknown) => {
        const st = (value as string) ?? ''
        return (
          <Badge variant={resolveFindingStatusVariant(st)} className="text-xs capitalize">
            {st}
          </Badge>
        )
      },
    },
    {
      key: 'createdAt',
      label: t('createdAt'),
      sortable: true,
      defaultSortOrder: SortOrder.ASC,
      render: (value: unknown) => (
        <span className="text-muted-foreground text-xs">{formatTimestamp(value as string)}</span>
      ),
    },
  ]

  const hasFilters = activeFilters.length > 0

  return (
    <div className="space-y-4">
      <PageHeader
        title={t('pageTitle')}
        description={t('pageDescription')}
        action={{
          label: t('exportFindings'),
          icon: <Download className="h-4 w-4" />,
          onClick: handleExportFindings,
        }}
      />

      {/* KPI Cards */}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 sm:gap-3 lg:grid-cols-5">
        <div className="bg-card border-border rounded-lg border p-3">
          <p className="text-muted-foreground text-xs font-medium uppercase">{t('total')}</p>
          <p className="text-foreground text-2xl font-bold">
            {statsLoading ? '-' : String(stats.total)}
          </p>
        </div>
        <div className="bg-card border-border rounded-lg border p-3">
          <p className="text-muted-foreground text-xs font-medium uppercase">{t('proposed')}</p>
          <p className="text-foreground text-2xl font-bold">
            {statsLoading ? '-' : String(stats.proposed)}
          </p>
        </div>
        <div className="bg-card border-border rounded-lg border p-3">
          <p className="text-muted-foreground text-xs font-medium uppercase">{t('applied')}</p>
          <p className="text-status-success text-2xl font-bold">
            {statsLoading ? '-' : String(stats.applied)}
          </p>
        </div>
        <div className="bg-card border-border rounded-lg border p-3">
          <p className="text-muted-foreground text-xs font-medium uppercase">{t('dismissed')}</p>
          <p className="text-muted-foreground text-2xl font-bold">
            {statsLoading ? '-' : String(stats.dismissed)}
          </p>
        </div>
        <div className="bg-card border-border rounded-lg border p-3">
          <p className="text-muted-foreground text-xs font-medium uppercase">
            {t('highConfidence')}
          </p>
          <p className="text-status-info text-2xl font-bold">
            {statsLoading ? '-' : String(stats.highConfidence)}
          </p>
        </div>
      </div>

      {/* Search + Filters toolbar */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative w-full sm:w-72">
          <Search className="text-muted-foreground pointer-events-none absolute top-1/2 start-3 h-4 w-4 -translate-y-1/2" />
          <Input
            value={query}
            onChange={e => handleQueryChange(e.currentTarget.value)}
            placeholder={t('searchPlaceholder')}
            className="ps-9"
          />
        </div>

        <Select value={agentId || 'all'} onValueChange={v => handleFilterChange('agentId', v)}>
          <SelectTrigger className="w-full sm:w-40">
            <SelectValue placeholder={t('allAgents')} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t('allAgents')}</SelectItem>
            {agentOptions.map(a => (
              <SelectItem key={a} value={a}>
                {a}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={sourceModule || 'all'}
          onValueChange={v => handleFilterChange('sourceModule', v)}
        >
          <SelectTrigger className="w-full sm:w-40">
            <SelectValue placeholder={t('allModules')} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t('allModules')}</SelectItem>
            {moduleOptions.map(m => (
              <SelectItem key={m} value={m}>
                {m}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={severity || 'all'} onValueChange={v => handleFilterChange('severity', v)}>
          <SelectTrigger className="w-full sm:w-36">
            <SelectValue placeholder={t('allSeverities')} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t('allSeverities')}</SelectItem>
            {severityOptions.map(s => (
              <SelectItem key={s} value={s}>
                <span className="capitalize">{s}</span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={status || 'all'} onValueChange={v => handleFilterChange('status', v)}>
          <SelectTrigger className="w-full sm:w-36">
            <SelectValue placeholder={t('allStatuses')} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t('allStatuses')}</SelectItem>
            {statusOptions.map(s => (
              <SelectItem key={s} value={s}>
                <span className="capitalize">{s}</span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={findingType || 'all'}
          onValueChange={v => handleFilterChange('findingType', v)}
        >
          <SelectTrigger className="w-full sm:w-44">
            <SelectValue placeholder={t('allTypes')} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t('allTypes')}</SelectItem>
            {findingTypeOptions.map(ft => (
              <SelectItem key={ft} value={ft}>
                <span className="capitalize">{ft.replaceAll('_', ' ')}</span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {hasFilters && (
          <Button variant="ghost" size="sm" onClick={handleClearFilters}>
            <X className="me-1 h-3.5 w-3.5" />
            {t('clearFilters')}
          </Button>
        )}
      </div>

      {/* Active filter chips */}
      {hasFilters && (
        <div className="flex flex-wrap items-center gap-1.5">
          {activeFilters.map(f => (
            <Badge key={f.key} variant="secondary" className="gap-1 text-xs">
              <span className="text-muted-foreground">{f.label}:</span>
              <span className="max-w-[120px] truncate">{f.value}</span>
              <button
                type="button"
                className="hover:text-foreground ms-0.5"
                onClick={() => handleRemoveFilter(f.key)}
                aria-label={t('clearFilters')}
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
        </div>
      )}

      {/* Bulk action bar */}
      {selectedIds.size > 0 && (
        <div className="bg-muted flex flex-wrap items-center gap-3 rounded-lg border px-4 py-2">
          <Checkbox
            checked={selectedIds.size === findings.length && findings.length > 0}
            onCheckedChange={toggleSelectAll}
          />
          <span className="text-sm font-medium">{String(selectedIds.size)} {t('selected')}</span>
          <Button
            variant="default"
            size="sm"
            disabled={isBulkLoading}
            onClick={handleBulkApply}
          >
            <CheckCircle className="mr-1.5 h-3.5 w-3.5" />
            {t('bulkApply')}
          </Button>
          <Button
            variant="outline"
            size="sm"
            disabled={isBulkLoading}
            onClick={handleBulkDismiss}
          >
            <XCircle className="mr-1.5 h-3.5 w-3.5" />
            {t('bulkDismiss')}
          </Button>
          <Button variant="ghost" size="sm" onClick={clearSelection}>
            <X className="mr-1 h-3.5 w-3.5" />
            {t('clearSelection')}
          </Button>
        </div>
      )}

      {/* DataTable */}
      <DataTable
        columns={columns}
        data={findings}
        loading={isLoading || isFetching}
        onRowClick={handleRowClick}
        sortBy={sortBy}
        sortOrder={sortOrder as SortOrder}
        onSort={handleSort}
        emptyMessage={t('noFindings')}
        emptyIcon={<Sparkles className="h-6 w-6" />}
      />

      {/* Pagination with go-to-page */}
      {totalPages > 1 && (
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground text-xs">
              {t('perPage')}:
            </span>
            <Select value={String(limit)} onValueChange={handleLimitChange}>
              <SelectTrigger className="h-8 w-20">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="10">10</SelectItem>
                <SelectItem value="20">20</SelectItem>
                <SelectItem value="50">50</SelectItem>
                <SelectItem value="100">100</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page <= 1}
              onClick={() => setPage(page - 1)}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-muted-foreground text-xs">
              {String(page)} {t('of')} {String(totalPages)}
            </span>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= totalPages}
              onClick={() => setPage(page + 1)}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>

          <div className="flex items-center gap-1.5">
            <span className="text-muted-foreground text-xs">{t('goToPage')}:</span>
            <Input
              type="number"
              min={1}
              max={totalPages}
              className="h-8 w-16 text-xs"
              onKeyDown={e => {
                if (e.key === 'Enter') {
                  const val = Number(e.currentTarget.value)
                  if (val >= 1 && val <= totalPages) {
                    setPage(val)
                  }
                }
              }}
            />
          </div>
        </div>
      )}

      {/* Detail Drawer */}
      <FindingDetailDrawer
        finding={selectedFinding}
        open={detailOpen}
        onOpenChange={setDetailOpen}
        onUpdateStatus={handleUpdateStatus}
        onPromote={handlePromote}
        statusLoading={statusLoading}
        promoteLoading={promoteLoading}
        canPromote={canPromote}
        t={t}
      />
    </div>
  )
}
