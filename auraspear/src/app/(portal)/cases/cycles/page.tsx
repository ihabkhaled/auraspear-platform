'use client'

import { Plus, History, AlertTriangle } from 'lucide-react'
import { CycleHistoryTable, CreateCycleDialog, EditCycleDialog } from '@/components/cases'
import { PageHeader, LoadingSpinner, EmptyState, Pagination } from '@/components/common'
import { useCycleHistoryPage } from '@/hooks'

export default function CycleHistoryPage() {
  const {
    t,
    router,
    isAdmin,
    orphanedStats,
    cycles,
    isLoading,
    isFetching,
    createDialogOpen,
    setCreateDialogOpen,
    createCyclePending,
    editDialogOpen,
    setEditDialogOpen,
    editingCycle,
    editCyclePending,
    sortBy,
    sortOrder,
    handleSort,
    handleCycleClick,
    handleCreateCycle,
    handleEditClick,
    handleEditCycle,
    handleActivateCycle,
    handleCloseCycle,
    handleDeleteCycle,
    pagination,
  } = useCycleHistoryPage()

  return (
    <div className="space-y-6">
      <PageHeader
        title={t('historyTitle')}
        description={t('historyDescription')}
        {...(isAdmin
          ? {
              action: {
                label: t('createCycle'),
                icon: <Plus className="h-4 w-4" />,
                onClick: () => setCreateDialogOpen(true),
              },
            }
          : {})}
      />

      {orphanedStats && orphanedStats.caseCount > 0 && (
        <button
          type="button"
          onClick={() => router.push('/cases?cycleId=none')}
          className="bg-status-warning border-status-warning flex w-full cursor-pointer items-center gap-3 rounded-lg border p-4 text-start transition-opacity hover:opacity-80"
        >
          <AlertTriangle className="text-status-warning h-5 w-5 shrink-0" />
          <div className="flex-1">
            <p className="text-status-warning text-sm font-semibold">{t('orphanedCases')}</p>
            <p className="text-status-warning text-xs">
              {t('orphanedCasesDescription', {
                total: orphanedStats.caseCount,
                open: orphanedStats.openCount,
                closed: orphanedStats.closedCount,
              })}
            </p>
          </div>
          <div className="text-status-warning flex items-center gap-4 text-sm font-medium">
            <span>
              {orphanedStats.caseCount} {t('caseCount')}
            </span>
          </div>
        </button>
      )}

      {(() => {
        if (isLoading) {
          return <LoadingSpinner />
        }
        if (cycles.length === 0) {
          return (
            <EmptyState
              icon={<History className="h-6 w-6" />}
              title={t('noCycles')}
              description={t('noCyclesDescription')}
            />
          )
        }
        return (
          <>
            <CycleHistoryTable
              cycles={cycles}
              onCycleClick={handleCycleClick}
              loading={isFetching}
              sortBy={sortBy}
              sortOrder={sortOrder}
              onSort={handleSort}
              showActions={isAdmin}
              onEdit={handleEditClick}
              onActivate={handleActivateCycle}
              onClose={handleCloseCycle}
              onDelete={handleDeleteCycle}
            />
            <Pagination
              page={pagination.page}
              totalPages={pagination.totalPages}
              onPageChange={pagination.setPage}
            />
          </>
        )
      })()}

      <CreateCycleDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        onSubmit={handleCreateCycle}
        loading={createCyclePending}
      />

      <EditCycleDialog
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        onSubmit={handleEditCycle}
        loading={editCyclePending}
        cycle={editingCycle}
      />
    </div>
  )
}
