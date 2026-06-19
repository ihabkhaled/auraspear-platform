'use client'

import { Plus, Workflow } from 'lucide-react'
import { DataTable, PageHeader, Pagination } from '@/components/common'
import {
  AiSoarPanel,
  SoarKpiCards,
  SoarFilters,
  SoarCreateDialog,
  SoarEditDialog,
  SoarDeleteDialog,
  SoarRunDialog,
  SoarDetailPanel,
} from '@/components/soar'
import { Card, CardContent } from '@/components/ui'
import { useSoarPage } from '@/hooks'

export default function SoarPage() {
  const {
    t,
    data,
    stats,
    columns,
    isFetching,
    pagination,
    searchQuery,
    statusFilter,
    triggerFilter,
    sortBy,
    sortOrder,
    handleSearchChange,
    handleStatusChange,
    handleTriggerChange,
    handleSort,
    handleRowClick,
    createOpen,
    setCreateOpen,
    editOpen,
    setEditOpen,
    detailOpen,
    setDetailOpen,
    selectedPlaybook,
    deletePlaybookId,
    deletePlaybookName,
    runPlaybookId,
    runPlaybookName,
    editInitialValues,
    handleCreate,
    handleEdit,
    handleDelete,
    handleExecute,
    openEditDialog,
    openDeleteDialog,
    openRunDialog,
    createLoading,
    editLoading,
    canCreate,
    canEdit,
    canDelete,
    canExecute,
    aiSoar,
  } = useSoarPage()

  return (
    <div className="space-y-4">
      <PageHeader
        title={t('title')}
        description={t('description')}
        action={
          canCreate
            ? {
                label: t('createPlaybook'),
                icon: <Plus className="h-4 w-4" />,
                onClick: () => setCreateOpen(true),
              }
            : undefined
        }
      />

      <SoarKpiCards stats={stats} />

      <Card>
        <CardContent className="pt-4">
          <AiSoarPanel
            canUseCopilot={aiSoar.canUseCopilot}
            description={aiSoar.description}
            onDescriptionChange={aiSoar.setDescription}
            isLoading={aiSoar.isLoading}
            draftResult={aiSoar.draftResult}
            onDraftPlaybook={aiSoar.handleDraftPlaybook}
            tCommon={aiSoar.tCommon}
            t={t}
          />
        </CardContent>
      </Card>

      <SoarFilters
        searchQuery={searchQuery}
        statusFilter={statusFilter}
        triggerFilter={triggerFilter}
        onSearchChange={handleSearchChange}
        onStatusChange={handleStatusChange}
        onTriggerChange={handleTriggerChange}
      />

      <DataTable
        columns={columns}
        data={data?.data ?? []}
        loading={isFetching}
        onRowClick={handleRowClick}
        emptyMessage={t('noPlaybooks')}
        emptyIcon={<Workflow className="h-6 w-6" />}
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

      <SoarCreateDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        onSubmit={handleCreate}
        loading={createLoading}
      />

      <SoarEditDialog
        open={editOpen}
        onOpenChange={setEditOpen}
        onSubmit={handleEdit}
        initialValues={editInitialValues}
        loading={editLoading}
      />

      <SoarDeleteDialog
        playbookId={deletePlaybookId}
        playbookName={deletePlaybookName}
        onConfirm={handleDelete}
      />

      <SoarRunDialog
        playbookId={runPlaybookId}
        playbookName={runPlaybookName}
        onConfirm={handleExecute}
      />

      <SoarDetailPanel
        playbook={selectedPlaybook}
        open={detailOpen}
        onOpenChange={setDetailOpen}
        onEdit={canEdit ? openEditDialog : undefined}
        onDelete={canDelete ? openDeleteDialog : undefined}
        onRun={canExecute ? openRunDialog : undefined}
      />
    </div>
  )
}
