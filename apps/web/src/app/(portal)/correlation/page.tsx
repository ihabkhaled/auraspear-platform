'use client'

import { GitBranch, Plus } from 'lucide-react'
import { PageHeader, DataTable, Pagination, LoadingSpinner } from '@/components/common'
import {
  CorrelationKpiCards,
  CorrelationFilters,
  CorrelationCreateDialog,
  CorrelationEditDialog,
  CorrelationDeleteDialog,
  CorrelationDetailPanel,
} from '@/components/correlation'
import { useCorrelationPage } from '@/hooks'

export default function CorrelationPage() {
  const {
    t,
    searchQuery,
    setSearchQuery,
    activeTab,
    setActiveTab,
    severityFilter,
    setSeverityFilter,
    statusFilter,
    setStatusFilter,
    selectedRule,
    isFetching,
    data,
    stats,
    pagination,
    columns,
    handleRowClick,
    createDialogOpen,
    setCreateDialogOpen,
    editDialogOpen,
    setEditDialogOpen,
    editingRule,
    deletingRule,
    detailPanelOpen,
    setDetailPanelOpen,
    handleCreateSubmit,
    handleEditSubmit,
    handleDeleteConfirm,
    handleOpenCreate,
    handleOpenEdit,
    handleOpenDelete,
    isCreating,
    isUpdating,
    isDeleting,
    canCreate,
    canDelete,
  } = useCorrelationPage()

  return (
    <div className="space-y-4">
      <PageHeader
        title={t('title')}
        description={t('description')}
        {...(canCreate
          ? {
              action: {
                label: t('createRule'),
                icon: <Plus className="h-4 w-4" />,
                onClick: handleOpenCreate,
              },
            }
          : {})}
      />

      <CorrelationKpiCards stats={stats} />

      <CorrelationFilters
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        severityFilter={severityFilter}
        onSeverityChange={setSeverityFilter}
        statusFilter={statusFilter}
        onStatusChange={setStatusFilter}
      />

      {isFetching ? (
        <LoadingSpinner />
      ) : (
        <DataTable
          columns={columns}
          data={data?.data ?? []}
          onRowClick={handleRowClick}
          emptyMessage={t('noRules')}
          emptyIcon={<GitBranch className="h-6 w-6" />}
          emptyDescription={t('emptyDescription')}
          loading={isFetching}
        />
      )}

      <Pagination
        page={pagination.page}
        totalPages={pagination.totalPages}
        onPageChange={pagination.setPage}
        total={pagination.total}
      />

      <CorrelationCreateDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        onSubmit={handleCreateSubmit}
        loading={isCreating}
      />

      <CorrelationEditDialog
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        onSubmit={handleEditSubmit}
        rule={editingRule}
        loading={isUpdating}
      />

      <CorrelationDeleteDialog
        rule={deletingRule}
        onConfirm={handleDeleteConfirm}
        loading={isDeleting}
      />

      <CorrelationDetailPanel
        rule={selectedRule}
        open={detailPanelOpen}
        onOpenChange={setDetailPanelOpen}
        onEdit={canCreate ? handleOpenEdit : undefined}
        onDelete={canDelete ? handleOpenDelete : undefined}
      />
    </div>
  )
}
