'use client'

import { Pen, Play, Trash2 } from 'lucide-react'
import { DataTable } from '@/components/common'
import { Badge, Button } from '@/components/ui'
import { AI_FEATURE_KEY_LABEL_KEYS } from '@/lib/constants/ai-config'
import { formatDate, lookup } from '@/lib/utils'
import type { AiPromptTemplate, Column, PromptTableProps } from '@/types'

export function PromptTable({
  prompts,
  loading,
  onEdit,
  onActivate,
  onDelete,
  t,
}: PromptTableProps) {
  // Columns contain JSX render functions — acceptable inline per CLAUDE.md rule 33
  const columns: Column<AiPromptTemplate>[] = [
    {
      key: 'taskType',
      label: t('promptTaskType'),
      render: (value: unknown) => {
        const labelKey = lookup(AI_FEATURE_KEY_LABEL_KEYS, value as string)
        return <span>{labelKey ? t(labelKey) : (value as string)}</span>
      },
    },
    { key: 'name', label: t('promptName') },
    { key: 'version', label: t('promptVersion') },
    {
      key: 'isActive',
      label: t('promptActive'),
      render: (value: unknown) => (
        <Badge variant={value ? 'success' : 'secondary'}>
          {value ? t('promptActive') : t('promptInactive')}
        </Badge>
      ),
    },
    { key: 'createdBy', label: t('promptCreatedBy') },
    {
      key: 'createdAt',
      label: t('createdAt'),
      render: (value: unknown) => <span>{formatDate(value as string)}</span>,
    },
    {
      key: 'actions',
      label: '',
      render: (_value: unknown, row: AiPromptTemplate) => (
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="sm" onClick={() => onEdit(row)}>
            <Pen className="h-3.5 w-3.5" />
          </Button>
          {!row.isActive && (
            <Button variant="ghost" size="sm" onClick={() => onActivate(row.id)}>
              <Play className="h-3.5 w-3.5" />
            </Button>
          )}
          <Button variant="ghost" size="sm" onClick={() => onDelete(row)}>
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      ),
    },
  ]

  return (
    <DataTable columns={columns} data={prompts} emptyMessage={t('noPrompts')} loading={loading} />
  )
}
