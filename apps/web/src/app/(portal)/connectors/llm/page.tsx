'use client'

import { Pencil, Play, Power, Trash2, Unplug } from 'lucide-react'
import { DataTable, PageHeader } from '@/components/common'
import { LlmConnectorCreateDialog, LlmConnectorEditDialog } from '@/components/connectors'
import { Button, Input } from '@/components/ui'
import { useLlmConnectorsPage } from '@/hooks'
import type { LlmConnectorRecord } from '@/types'

export default function LlmConnectorsPage() {
  const {
    t,
    searchQuery,
    setSearchQuery,
    isFetching,
    data,
    columns,
    createDialogOpen,
    setCreateDialogOpen,
    editDialogOpen,
    setEditDialogOpen,
    editInitialValues,
    handleEditOpen,
    handleCreateSubmit,
    isCreating,
    handleEditSubmit,
    isUpdating,
    handleDeleteConfirm,
    handleTestConnector,
    handleToggleConnector,
    canCreate,
    canUpdate,
    canDelete,
    canTest,
  } = useLlmConnectorsPage()

  const actionsColumn = {
    key: 'actions' as keyof LlmConnectorRecord,
    label: t('colActions'),
    className: 'w-40',
    render: (_value: unknown, row: LlmConnectorRecord) => (
      <div className="flex items-center gap-1">
        {canUpdate && (
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={e => {
              e.stopPropagation()
              handleEditOpen(row)
            }}
            title={t('editConnector')}
          >
            <Pencil className="h-3.5 w-3.5" />
          </Button>
        )}
        {canTest && (
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={e => {
              e.stopPropagation()
              handleTestConnector(row.id)
            }}
            title={t('testSuccess')}
          >
            <Play className="h-3.5 w-3.5" />
          </Button>
        )}
        {canUpdate && (
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={e => {
              e.stopPropagation()
              handleToggleConnector(row.id)
            }}
            title={t('toggleConfirm')}
          >
            <Power className="h-3.5 w-3.5" />
          </Button>
        )}
        {canDelete && (
          <Button
            variant="ghost"
            size="icon"
            className="text-destructive h-7 w-7"
            onClick={e => {
              e.stopPropagation()
              void handleDeleteConfirm(row.id)
            }}
            title={t('deleteConnector')}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        )}
      </div>
    ),
  }

  const allColumns = [...columns, actionsColumn]

  return (
    <div className="flex flex-col gap-6 p-6">
      <PageHeader
        title={t('title')}
        description={t('description')}
        action={
          canCreate
            ? {
                label: t('createConnector'),
                onClick: () => setCreateDialogOpen(true),
              }
            : undefined
        }
      />

      <div className="flex items-center gap-4">
        <Input
          placeholder={t('searchPlaceholder')}
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          className="max-w-sm"
        />
      </div>

      <DataTable
        columns={allColumns}
        data={data}
        loading={isFetching}
        emptyMessage={t('noConnectors')}
        emptyIcon={<Unplug className="h-6 w-6" />}
        emptyDescription={t('noConnectorsDescription')}
      />

      {canCreate && (
        <LlmConnectorCreateDialog
          open={createDialogOpen}
          onOpenChange={setCreateDialogOpen}
          onSubmit={handleCreateSubmit}
          loading={isCreating}
        />
      )}

      {canUpdate && editInitialValues && (
        <LlmConnectorEditDialog
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
