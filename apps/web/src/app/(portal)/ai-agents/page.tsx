'use client'

import { Bot } from 'lucide-react'
import {
  AiAgentKpiCards,
  AiAgentFilters,
  AiAgentCreateDialog,
  AiAgentEditDialog,
  AiAgentDetailPanel,
} from '@/components/ai-agents'
import { DataTable, PageHeader, Pagination } from '@/components/common'
import { useAiAgentsPage } from '@/hooks'

export default function AiAgentsPage() {
  const {
    t,
    searchQuery,
    setSearchQuery,
    statusFilter,
    setStatusFilter,
    tierFilter,
    setTierFilter,
    isFetching,
    data,
    stats,
    pagination,
    columns,
    selectedAgent,
    handleRowClick,
    createDialogOpen,
    setCreateDialogOpen,
    handleCreateSubmit,
    isCreating,
    editDialogOpen,
    setEditDialogOpen,
    editInitialValues,
    handleEditOpen,
    handleEditSubmit,
    isUpdating,
    handleDeleteConfirm,
    handleCloseDetail,
    sortBy,
    sortOrder,
    handleSort,
    canCreate,
    canEdit,
    canDelete,
  } = useAiAgentsPage()

  return (
    <div className="space-y-4">
      <PageHeader title={t('title')} description={t('description')} />

      <AiAgentKpiCards stats={stats} />

      <AiAgentFilters
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        statusFilter={statusFilter}
        onStatusChange={setStatusFilter}
        tierFilter={tierFilter}
        onTierChange={setTierFilter}
        onCreateClick={canCreate ? () => setCreateDialogOpen(true) : undefined}
      />

      <DataTable
        columns={columns}
        data={data?.data ?? []}
        loading={isFetching}
        onRowClick={handleRowClick}
        sortBy={sortBy}
        sortOrder={sortOrder}
        onSort={handleSort}
        emptyMessage={t('noAgents')}
        emptyIcon={<Bot className="h-6 w-6" />}
        emptyDescription={t('emptyDescription')}
      />

      <Pagination
        page={pagination.page}
        totalPages={pagination.totalPages}
        onPageChange={pagination.setPage}
        total={pagination.total}
      />

      {selectedAgent && (
        <AiAgentDetailPanel
          agent={selectedAgent}
          onClose={handleCloseDetail}
          onEdit={canEdit ? () => handleEditOpen(selectedAgent) : undefined}
          onDelete={canDelete ? () => handleDeleteConfirm(selectedAgent.id) : undefined}
        />
      )}

      {canCreate && (
        <AiAgentCreateDialog
          open={createDialogOpen}
          onOpenChange={setCreateDialogOpen}
          onSubmit={handleCreateSubmit}
          loading={isCreating}
        />
      )}

      {canEdit && editInitialValues && (
        <AiAgentEditDialog
          open={editDialogOpen}
          onOpenChange={setEditDialogOpen}
          onSubmit={handleEditSubmit}
          initialValues={editInitialValues}
          loading={isUpdating}
        />
      )}
    </div>
  )
}
