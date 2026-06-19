'use client'

import { Plus, ShieldAlert } from 'lucide-react'
import { DataTable, PageHeader, Pagination } from '@/components/common'
import {
  IncidentCreateDialog,
  IncidentDetailPanel,
  IncidentEditDialog,
  IncidentFilters,
  IncidentKpiCards,
} from '@/components/incidents'
import { useIncidentsPage } from '@/hooks'

export default function IncidentsPage() {
  const {
    t,
    data,
    stats,
    statsLoading,
    columns,
    isFetching,
    pagination,
    searchQuery,
    statusFilter,
    severityFilter,
    categoryFilter,
    sortBy,
    sortOrder,
    createDialogOpen,
    editDialogOpen,
    detailPanelOpen,
    detailIncident,
    editInitialValues,
    createLoading,
    editLoading,
    changeStatusLoading,
    assigneeOptions,
    handleSearchChange,
    handleStatusChange,
    handleSeverityChange,
    handleCategoryChange,
    handleClearAllFilters,
    handleSort,
    handleRowClick,
    handleCreate,
    handleEdit,
    handleChangeStatus,
    setCreateDialogOpen,
    setEditDialogOpen,
    setDetailPanelOpen,
    canCreate,
    canEdit,
    canChangeStatus,
    handleOpenEdit,
  } = useIncidentsPage()

  return (
    <div className="space-y-4">
      <PageHeader
        title={t('title')}
        description={t('description')}
        action={
          canCreate
            ? {
                label: t('createIncident'),
                icon: <Plus className="h-4 w-4" />,
                onClick: () => setCreateDialogOpen(true),
              }
            : undefined
        }
      />

      <IncidentKpiCards stats={stats} isLoading={statsLoading} />

      <IncidentFilters
        searchQuery={searchQuery}
        statusFilter={statusFilter}
        severityFilter={severityFilter}
        categoryFilter={categoryFilter}
        onSearchChange={handleSearchChange}
        onStatusChange={handleStatusChange}
        onSeverityChange={handleSeverityChange}
        onCategoryChange={handleCategoryChange}
        onClearAll={handleClearAllFilters}
      />

      <DataTable
        columns={columns}
        data={data?.data ?? []}
        loading={isFetching}
        onRowClick={handleRowClick}
        emptyMessage={t('noIncidents')}
        emptyIcon={<ShieldAlert className="h-6 w-6" />}
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

      <IncidentCreateDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        onSubmit={handleCreate}
        assigneeOptions={assigneeOptions}
        loading={createLoading}
      />

      <IncidentEditDialog
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        onSubmit={handleEdit}
        initialValues={editInitialValues}
        assigneeOptions={assigneeOptions}
        loading={editLoading}
      />

      <IncidentDetailPanel
        key={`${detailIncident?.id ?? 'empty'}-${detailIncident?.status ?? 'empty'}`}
        incident={detailIncident}
        open={detailPanelOpen}
        onOpenChange={setDetailPanelOpen}
        canEditIncident={canEdit}
        canChangeStatus={canChangeStatus}
        onEditIncident={detailIncident ? () => handleOpenEdit(detailIncident) : undefined}
        onChangeStatus={handleChangeStatus}
        isChangingStatus={changeStatusLoading}
      />
    </div>
  )
}
