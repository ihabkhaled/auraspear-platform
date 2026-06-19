'use client'

import { Plus, ShieldCheck } from 'lucide-react'
import { DataTable, PageHeader, Pagination } from '@/components/common'
import {
  ComplianceKpiCards,
  ComplianceFilters,
  ComplianceFrameworkCreateDialog,
  ComplianceFrameworkEditDialog,
  ComplianceFrameworkDeleteDialog,
  ComplianceFrameworkDetailPanel,
} from '@/components/compliance'
import { useCompliancePage } from '@/hooks'

export default function CompliancePage() {
  const {
    t,
    data,
    stats,
    columns,
    isFetching,
    pagination,
    searchQuery,
    standardFilter,
    sortBy,
    sortOrder,
    handleSearchChange,
    handleStandardChange,
    handleSort,
    handleRowClick,
    createOpen,
    setCreateOpen,
    editOpen,
    setEditOpen,
    detailOpen,
    setDetailOpen,
    selectedFramework,
    deleteFrameworkId,
    deleteFrameworkName,
    editInitialValues,
    handleCreate,
    handleEdit,
    handleDelete,
    openEditDialog,
    openDeleteDialog,
    createLoading,
    editLoading,
    canCreate,
    canEdit,
  } = useCompliancePage()

  return (
    <div className="space-y-4">
      <PageHeader
        title={t('title')}
        description={t('description')}
        {...(canCreate
          ? {
              action: {
                label: t('createFramework'),
                icon: <Plus className="h-4 w-4" />,
                onClick: () => setCreateOpen(true),
              },
            }
          : {})}
      />

      <ComplianceKpiCards stats={stats} />

      <ComplianceFilters
        searchQuery={searchQuery}
        standardFilter={standardFilter}
        onSearchChange={handleSearchChange}
        onStandardChange={handleStandardChange}
      />

      <DataTable
        columns={columns}
        data={data?.data ?? []}
        loading={isFetching}
        onRowClick={handleRowClick}
        emptyMessage={t('noFrameworks')}
        emptyIcon={<ShieldCheck className="h-6 w-6" />}
        emptyDescription={t('emptyDescription')}
        sortBy={sortBy}
        sortOrder={sortOrder}
        onSort={handleSort}
      />

      <Pagination
        page={pagination.page}
        totalPages={pagination.totalPages}
        onPageChange={pagination.setPage}
        total={pagination.total}
      />

      {canCreate && (
        <ComplianceFrameworkCreateDialog
          open={createOpen}
          onOpenChange={setCreateOpen}
          onSubmit={handleCreate}
          loading={createLoading}
        />
      )}

      {canEdit && (
        <ComplianceFrameworkEditDialog
          open={editOpen}
          onOpenChange={setEditOpen}
          onSubmit={handleEdit}
          initialValues={editInitialValues}
          loading={editLoading}
        />
      )}

      <ComplianceFrameworkDeleteDialog
        frameworkId={deleteFrameworkId}
        frameworkName={deleteFrameworkName}
        onConfirm={handleDelete}
      />

      <ComplianceFrameworkDetailPanel
        framework={selectedFramework}
        open={detailOpen}
        onOpenChange={setDetailOpen}
        onEdit={canEdit ? openEditDialog : undefined}
        onDelete={openDeleteDialog}
      />
    </div>
  )
}
