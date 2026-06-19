'use client'

import { use } from 'react'
import { ArrowLeft, Lock } from 'lucide-react'
import { CycleBadge } from '@/components/cases'
import { DataTable, LoadingSpinner } from '@/components/common'
import { Badge, Button } from '@/components/ui'
import { CaseCycleStatus } from '@/enums'
import { useCycleDetailPage } from '@/hooks'
import { formatDate } from '@/lib/utils'
import type { Case, Column } from '@/types'

export default function CycleDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)

  const {
    t,
    tCases,
    router,
    isLoading,
    isAdmin,
    cycle,
    closeCyclePending,
    handleCloseCycle,
    handleCaseClick,
  } = useCycleDetailPage(id)

  if (isLoading) {
    return <LoadingSpinner />
  }

  if (!cycle) {
    return <div className="text-muted-foreground p-8 text-center">{t('notFound')}</div>
  }

  const columns: Column<Case>[] = [
    { key: 'caseNumber', label: tCases('caseNumber') },
    { key: 'title', label: tCases('caseTitle') },
    {
      key: 'severity',
      label: tCases('severity'),
      render: (value: unknown) => <Badge variant="outline">{String(value)}</Badge>,
    },
    {
      key: 'status',
      label: tCases('status'),
      render: (value: unknown) => <Badge variant="secondary">{String(value)}</Badge>,
    },
    {
      key: 'ownerName',
      label: tCases('assignee'),
      render: (value: unknown) => (value as string | null) ?? '—',
    },
    {
      key: 'createdAt',
      label: tCases('createdAt'),
      render: (value: unknown) => formatDate(value as string),
    },
  ]

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" onClick={() => router.push('/cases/cycles')}>
          <ArrowLeft className="me-2 h-4 w-4" />
          {t('backToHistory')}
        </Button>
      </div>

      <div className="bg-card border-border rounded-lg border p-4 sm:p-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0 space-y-1">
            <div className="flex flex-wrap items-center gap-2 sm:gap-3">
              <h1 className="text-xl font-bold sm:text-2xl">{cycle.name}</h1>
              <CycleBadge status={cycle.status as CaseCycleStatus} />
            </div>
            {cycle.description && (
              <p className="text-muted-foreground text-sm">{cycle.description}</p>
            )}
          </div>
          {isAdmin && cycle.status === CaseCycleStatus.ACTIVE && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleCloseCycle}
              disabled={closeCyclePending}
              className="shrink-0 self-start"
            >
              <Lock className="me-2 h-4 w-4" />
              {t('closeCycle')}
            </Button>
          )}
        </div>

        <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-4">
          <div>
            <p className="text-muted-foreground text-sm">{t('startDate')}</p>
            <p className="font-medium">{formatDate(cycle.startDate)}</p>
          </div>
          <div>
            <p className="text-muted-foreground text-sm">{t('endDate')}</p>
            <p className="font-medium">{cycle.endDate ? formatDate(cycle.endDate) : '—'}</p>
          </div>
          <div>
            <p className="text-muted-foreground text-sm">{t('caseCount')}</p>
            <p className="font-medium">{cycle.caseCount}</p>
          </div>
          <div>
            <p className="text-muted-foreground text-sm">{t('openCount')}</p>
            <p className="font-medium">{cycle.openCount}</p>
          </div>
        </div>
      </div>

      <div>
        <h2 className="mb-4 text-lg font-semibold">{t('cycleCases')}</h2>
        <DataTable
          columns={columns}
          data={cycle.cases as Case[]}
          emptyMessage={t('noCasesInCycle')}
          onRowClick={handleCaseClick}
        />
      </div>
    </div>
  )
}
