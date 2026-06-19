'use client'

import { Layers, Plus } from 'lucide-react'
import { DataTable, PageHeader, Pagination } from '@/components/common'
import { NormalizationCreateDialog } from '@/components/normalization/NormalizationCreateDialog'
import { NormalizationDetailPanel } from '@/components/normalization/NormalizationDetailPanel'
import { NormalizationEditDialog } from '@/components/normalization/NormalizationEditDialog'
import { NormalizationFilters } from '@/components/normalization/NormalizationFilters'
import { NormalizationKpiCards } from '@/components/normalization/NormalizationKpiCards'
import { useNormalizationPage } from '@/hooks'

export default function NormalizationPage() {
  const {
    t,
    data,
    stats,
    statsLoading,
    columns,
    isFetching,
    pagination,
    searchQuery,
    sourceTypeFilter,
    statusFilter,
    sortBy,
    sortOrder,
    createOpen,
    setCreateOpen,
    editOpen,
    setEditOpen,
    detailOpen,
    setDetailOpen,
    selectedPipeline,
    createLoading,
    editLoading,
    editInitialValues,
    handleSearchChange,
    handleSourceTypeChange,
    handleStatusChange,
    handleSort,
    handleCreate,
    handleEdit,
    handleRowClick,
    handleOpenEdit,
    handleOpenDelete,
    canCreate,
    canEdit,
    canDelete,
    canAiVerify,
    handleAiVerify,
    aiVerifying,
  } = useNormalizationPage()

  return (
    <div className="space-y-4">
      <PageHeader
        title={t('title')}
        description={t('description')}
        {...(canCreate
          ? {
              action: {
                label: t('createPipeline'),
                icon: <Plus className="h-4 w-4" />,
                onClick: () => setCreateOpen(true),
              },
            }
          : {})}
      />

      <NormalizationKpiCards stats={stats} isLoading={statsLoading} />

      <NormalizationFilters
        searchQuery={searchQuery}
        sourceTypeFilter={sourceTypeFilter}
        statusFilter={statusFilter}
        onSearchChange={handleSearchChange}
        onSourceTypeChange={handleSourceTypeChange}
        onStatusChange={handleStatusChange}
      />

      <DataTable
        columns={columns}
        data={data?.data ?? []}
        loading={isFetching}
        onRowClick={handleRowClick}
        emptyMessage={t('noPipelines')}
        emptyIcon={<Layers className="h-6 w-6" />}
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
        <NormalizationCreateDialog
          open={createOpen}
          onOpenChange={setCreateOpen}
          onSubmit={handleCreate}
          loading={createLoading}
        />
      )}

      {canEdit && (
        <NormalizationEditDialog
          open={editOpen}
          onOpenChange={setEditOpen}
          onSubmit={handleEdit}
          initialValues={editInitialValues}
          loading={editLoading}
        />
      )}

      <NormalizationDetailPanel
        pipeline={selectedPipeline}
        open={detailOpen}
        onOpenChange={setDetailOpen}
        onEdit={canEdit ? handleOpenEdit : undefined}
        onDelete={canDelete ? handleOpenDelete : undefined}
        onAiVerify={
          canAiVerify ? (pipelineId: string) => handleAiVerify(pipelineId, []) : undefined
        }
        aiVerifying={aiVerifying}
      />
    </div>
  )
}
