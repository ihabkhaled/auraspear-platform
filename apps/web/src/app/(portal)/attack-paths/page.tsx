'use client'

import { Network, Plus } from 'lucide-react'
import {
  AttackPathKpiCards,
  AttackPathFilters,
  AttackPathCreateDialog,
  AttackPathEditDialog,
  AttackPathDetailPanel,
} from '@/components/attack-paths'
import { DataTable, PageHeader, Pagination } from '@/components/common'
import { useAttackPathsPage } from '@/hooks'

export default function AttackPathsPage() {
  const {
    t,
    tCommon,
    searchQuery,
    setSearchQuery,
    severityFilter,
    setSeverityFilter,
    statusFilter,
    setStatusFilter,
    isFetching,
    data,
    stats,
    pagination,
    columns,
    selectedPathId,
    handleRowClick,
    handleCloseDetail,
    createDialogOpen,
    setCreateDialogOpen,
    handleCreate,
    createLoading,
    editDialogOpen,
    setEditDialogOpen,
    editInitialValues,
    handleOpenEdit,
    handleEdit,
    editLoading,
    handleDelete,
    canCreate,
    canEdit,
    canDelete,
  } = useAttackPathsPage()

  return (
    <div className="space-y-4">
      <PageHeader
        title={t('title')}
        description={t('description')}
        action={
          canCreate
            ? {
                label: t('createPath'),
                icon: <Plus className="h-4 w-4" />,
                onClick: () => setCreateDialogOpen(true),
              }
            : undefined
        }
      />

      <AttackPathKpiCards stats={stats} t={t} />

      <AttackPathFilters
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        severityFilter={severityFilter}
        onSeverityChange={setSeverityFilter}
        statusFilter={statusFilter}
        onStatusChange={setStatusFilter}
        t={t}
        tCommon={tCommon}
      />

      <DataTable
        columns={columns}
        data={data?.data ?? []}
        loading={isFetching}
        onRowClick={handleRowClick}
        emptyMessage={t('noAttackPaths')}
        emptyIcon={<Network className="h-6 w-6" />}
        emptyDescription={t('emptyDescription')}
      />

      <Pagination
        page={pagination.page}
        totalPages={pagination.totalPages}
        onPageChange={pagination.setPage}
        total={pagination.total}
      />

      {selectedPathId && (
        <AttackPathDetailPanel
          pathId={selectedPathId}
          onClose={handleCloseDetail}
          onEdit={canEdit ? handleOpenEdit : undefined}
          onDelete={canDelete ? handleDelete : undefined}
          t={t}
        />
      )}

      <AttackPathCreateDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        onSubmit={handleCreate}
        loading={createLoading}
      />

      {editInitialValues && (
        <AttackPathEditDialog
          open={editDialogOpen}
          onOpenChange={setEditDialogOpen}
          onSubmit={handleEdit}
          initialValues={editInitialValues}
          loading={editLoading}
        />
      )}
    </div>
  )
}
