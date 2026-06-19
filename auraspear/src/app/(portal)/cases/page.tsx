'use client'

import { Plus, FolderOpen, History } from 'lucide-react'
import {
  CaseToolbar,
  CaseKanbanBoard,
  CaseListTable,
  CreateCaseDialog,
  CycleSelector,
  CaseOwnerFilter,
} from '@/components/cases'
import { PageHeader, LoadingSpinner, EmptyState } from '@/components/common'
import { Button } from '@/components/ui'
import { CaseViewMode } from '@/enums'
import { useCasesPage } from '@/hooks'

export default function CasesPage() {
  const {
    t,
    router,
    viewMode,
    setViewMode,
    severityFilter,
    setSeverityFilter,
    sortField,
    setSortField,
    sortOrder,
    setSortOrder,
    createDialogOpen,
    setCreateDialogOpen,
    isLoading,
    filteredCases,
    createCasePending,
    handleCaseClick,
    handleCreateCase,
    handleCaseSort,
    currentUserId,
    isAdmin,
    selectedCycleId,
    setSelectedCycleId,
    activeCycleId,
    cycles,
    cyclesFetching,
    ownerFilter,
    setOwnerFilter,
    membersList,
    assigneeOptions,
    cycleOptions,
    canCreateCase,
  } = useCasesPage()

  function renderCaseContent() {
    if (isLoading) return <LoadingSpinner />
    if (filteredCases.length === 0) {
      return (
        <EmptyState
          icon={<FolderOpen className="h-6 w-6" />}
          title={t('noCases')}
          description={t('emptyDescription')}
        />
      )
    }
    if (viewMode === CaseViewMode.BOARD) {
      return (
        <CaseKanbanBoard
          cases={filteredCases}
          onCaseClick={handleCaseClick}
          currentUserId={currentUserId}
          isAdmin={isAdmin}
        />
      )
    }
    return (
      <CaseListTable
        cases={filteredCases}
        onCaseClick={handleCaseClick}
        loading={isLoading}
        sortBy={sortField}
        sortOrder={sortOrder}
        onSort={handleCaseSort}
        currentUserId={currentUserId}
        isAdmin={isAdmin}
      />
    )
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={t('title')}
        description={t('description')}
        action={
          canCreateCase
            ? {
                label: t('createCase'),
                icon: <Plus className="h-4 w-4" />,
                onClick: () => setCreateDialogOpen(true),
              }
            : undefined
        }
      />

      <div className="flex flex-wrap items-center gap-3">
        <CycleSelector
          cycles={cycles}
          activeCycleId={activeCycleId}
          selectedCycleId={selectedCycleId}
          onCycleChange={setSelectedCycleId}
          loading={cyclesFetching}
        />
        <div className="border-border hidden h-6 border-s sm:block" />
        <CaseOwnerFilter
          members={membersList}
          selectedUserId={ownerFilter}
          onUserSelect={setOwnerFilter}
          currentUserId={currentUserId}
        />
        <div className="ms-auto">
          <Button variant="outline" size="sm" onClick={() => router.push('/cases/cycles')}>
            <History className="me-2 h-4 w-4" />
            {t('cycleHistory')}
          </Button>
        </div>
      </div>

      <CaseToolbar
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        activeSeverityFilter={severityFilter}
        onSeverityFilterChange={setSeverityFilter}
        sortField={sortField}
        onSortFieldChange={setSortField}
        sortOrder={sortOrder}
        onSortOrderChange={setSortOrder}
      />

      {renderCaseContent()}

      <CreateCaseDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        onSubmit={handleCreateCase}
        assigneeOptions={assigneeOptions}
        cycleOptions={cycleOptions}
        loading={createCasePending}
      />
    </div>
  )
}
