'use client'

import { Plus, Users } from 'lucide-react'
import { DataTable, PageHeader, Pagination } from '@/components/common'
import {
  UebaKpiCards,
  UebaFilters,
  UebaEntityCreateDialog,
  UebaEntityEditDialog,
  UebaEntityDetailPanel,
} from '@/components/ueba'
import { useUebaPage } from '@/hooks'

export default function UebaPage() {
  const {
    t,
    searchQuery,
    setSearchQuery,
    entityTypeFilter,
    setEntityTypeFilter,
    riskLevelFilter,
    setRiskLevelFilter,
    isFetching,
    data,
    stats,
    pagination,
    columns,
    handleRowClick,
    selectedEntityId,
    handleCloseDetailPanel,
    createDialogOpen,
    setCreateDialogOpen,
    handleCreateSubmit,
    createLoading,
    editDialogOpen,
    setEditDialogOpen,
    handleEditSubmit,
    editLoading,
    editInitialValues,
    canCreate,
    canEdit,
  } = useUebaPage()

  return (
    <div className="space-y-4">
      <PageHeader
        title={t('title')}
        description={t('description')}
        {...(canCreate
          ? {
              action: {
                label: t('createEntity'),
                icon: <Plus className="h-4 w-4" />,
                onClick: () => setCreateDialogOpen(true),
              },
            }
          : {})}
      />

      <UebaKpiCards stats={stats} />

      <UebaFilters
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        entityTypeFilter={entityTypeFilter}
        onEntityTypeChange={setEntityTypeFilter}
        riskLevelFilter={riskLevelFilter}
        onRiskLevelChange={setRiskLevelFilter}
      />

      <div className="flex flex-col gap-4 lg:flex-row">
        <div className={selectedEntityId ? 'min-w-0 flex-1' : 'w-full'}>
          <DataTable
            columns={columns}
            data={data?.data ?? []}
            loading={isFetching}
            onRowClick={handleRowClick}
            emptyMessage={t('noEntities')}
            emptyIcon={<Users className="h-6 w-6" />}
            emptyDescription={t('emptyDescription')}
          />
        </div>

        {selectedEntityId && (
          <div className="w-full shrink-0 lg:w-[400px]">
            <UebaEntityDetailPanel entityId={selectedEntityId} onClose={handleCloseDetailPanel} />
          </div>
        )}
      </div>

      <Pagination
        page={pagination.page}
        totalPages={pagination.totalPages}
        onPageChange={pagination.setPage}
        total={pagination.total}
      />

      {canCreate && (
        <UebaEntityCreateDialog
          open={createDialogOpen}
          onOpenChange={setCreateDialogOpen}
          onSubmit={handleCreateSubmit}
          loading={createLoading}
        />
      )}

      {canEdit && (
        <UebaEntityEditDialog
          open={editDialogOpen}
          onOpenChange={setEditDialogOpen}
          onSubmit={handleEditSubmit}
          initialValues={editInitialValues}
          loading={editLoading}
        />
      )}
    </div>
  )
}
