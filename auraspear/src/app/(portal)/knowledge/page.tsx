'use client'

import { Edit, Plus, Trash2 } from 'lucide-react'
import { DataTable, PageHeader, Pagination } from '@/components/common'
import {
  AiKnowledgePanel,
  RunbookCreateDialog,
  RunbookDetailPanel,
  RunbookEditDialog,
} from '@/components/knowledge'
import {
  Badge,
  Button,
  Card,
  CardContent,
  Input,
} from '@/components/ui'
import { useKnowledgePage } from '@/hooks'
import { formatDate } from '@/lib/utils'
import type { Column, RunbookRecord } from '@/types'

export default function KnowledgePage() {
  const {
    t,
    data,
    columns,
    isFetching,
    pagination,
    currentPage,
    searchQuery,
    sortBy,
    sortOrder,
    handleSearchChange,
    handleSort,
    handlePageChange,
    handleRowClick,
    createOpen,
    setCreateOpen,
    editOpen,
    setEditOpen,
    selectedRunbook,
    detailRunbook,
    setDetailRunbook,
    handleCreate,
    handleEdit,
    handleDelete,
    openEditDialog,
    createLoading,
    editLoading,
    canCreate,
    canEdit,
    canDelete,
    aiGenerate,
    aiSearch,
  } = useKnowledgePage()

  const enhancedColumns: Column<RunbookRecord>[] = [
    ...columns.map(col => {
      if (col.key === 'tags') {
        return {
          ...col,
          render: (value: unknown) => {
            const tags = value as string[]
            if (!tags || tags.length === 0) {
              return <span className="text-muted-foreground">-</span>
            }
            return (
              <div className="flex flex-wrap gap-1">
                {tags.slice(0, 3).map(tag => (
                  <Badge key={tag} variant="outline" className="text-xs">
                    {tag}
                  </Badge>
                ))}
                {tags.length > 3 && (
                  <Badge variant="secondary" className="text-xs">
                    {`+${String(tags.length - 3)}`}
                  </Badge>
                )}
              </div>
            )
          },
        }
      }
      if (col.key === 'updatedAt') {
        return {
          ...col,
          render: (value: unknown) => (
            <span className="text-muted-foreground text-xs">{formatDate(value as string)}</span>
          ),
        }
      }
      return col
    }),
    ...(canEdit || canDelete
      ? [
          {
            key: 'actions' as keyof RunbookRecord,
            label: t('colActions'),
            render: (_value: unknown, row: RunbookRecord) => (
              <div className="flex gap-1">
                {canEdit && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={e => {
                      e.stopPropagation()
                      openEditDialog(row)
                    }}
                    aria-label={t('editRunbook')}
                  >
                    <Edit className="h-3.5 w-3.5" />
                  </Button>
                )}
                {canDelete && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={e => {
                      e.stopPropagation()
                      void handleDelete(row)
                    }}
                    aria-label={t('deleteRunbook')}
                  >
                    <Trash2 className="text-destructive h-3.5 w-3.5" />
                  </Button>
                )}
              </div>
            ),
          },
        ]
      : []),
  ]

  return (
    <div className="space-y-4">
      <PageHeader
        title={t('title')}
        description={t('description')}
        action={
          canCreate
            ? {
                label: t('createRunbook'),
                icon: <Plus className="h-4 w-4" />,
                onClick: () => setCreateOpen(true),
              }
            : undefined
        }
      />

      <AiKnowledgePanel
        aiGenerate={aiGenerate}
        aiSearch={aiSearch}
        t={t}
      />

      <Card className="border-border bg-card">
        <CardContent className="pt-4">
          <div className="mb-4">
            <Input
              placeholder={t('searchPlaceholder')}
              value={searchQuery}
              onChange={e => handleSearchChange(e.target.value)}
              className="max-w-sm"
            />
          </div>

          <DataTable
            columns={enhancedColumns}
            data={data}
            loading={isFetching}
            emptyMessage={t('noRunbooks')}
            onRowClick={handleRowClick}
            sortBy={sortBy}
            sortOrder={sortOrder}
            onSort={handleSort}
          />

          {pagination && pagination.totalPages > 1 && (
            <div className="mt-4">
              <Pagination
                page={currentPage}
                totalPages={pagination.totalPages}
                onPageChange={handlePageChange}
                total={pagination.total}
              />
            </div>
          )}
        </CardContent>
      </Card>

      {detailRunbook && (
        <RunbookDetailPanel runbook={detailRunbook} onClose={() => setDetailRunbook(null)} t={t} />
      )}

      <RunbookCreateDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        onSubmit={handleCreate}
        isPending={createLoading}
        t={t}
      />

      <RunbookEditDialog
        open={editOpen}
        onOpenChange={setEditOpen}
        onSubmit={handleEdit}
        isPending={editLoading}
        runbook={selectedRunbook}
        t={t}
      />
    </div>
  )
}
