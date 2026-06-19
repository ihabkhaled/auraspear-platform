import { Trash2 } from 'lucide-react'
import { DataTable } from '@/components/common'
import { Badge, Button } from '@/components/ui'
import { formatTimestamp } from '@/lib/dayjs'
import type { Column, TranslationFn, UserMemory } from '@/types'

export function MemoryGovernanceTable({
  t,
  data,
  loading,
  canAdmin,
  onDeleteUserMemories,
}: {
  t: TranslationFn
  data: UserMemory[]
  loading: boolean
  canAdmin: boolean
  onDeleteUserMemories: (userId: string) => void
}) {
  const columns: Column<UserMemory>[] = [
    {
      key: 'userId',
      label: t('table.user'),
      render: value => {
        const uid = value as string
        return <span className="font-mono text-xs">{uid.slice(0, 8)}</span>
      },
    },
    {
      key: 'content',
      label: t('table.content'),
      render: value => {
        const text = value as string
        return (
          <span className="line-clamp-2 max-w-xs text-sm" title={text}>
            {text}
          </span>
        )
      },
    },
    {
      key: 'category',
      label: t('table.category'),
      render: value => <Badge variant="secondary">{value as string}</Badge>,
    },
    {
      key: 'sourceType',
      label: t('table.source'),
    },
    {
      key: 'updatedAt',
      label: t('table.updated'),
      render: value => formatTimestamp(value as string),
    },
  ]

  if (canAdmin) {
    columns.push({
      key: 'id',
      label: '',
      render: (_value, row) => (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onDeleteUserMemories(row.userId)}
          title={t('deleteUserMemories')}
        >
          <Trash2 className="text-status-error h-3.5 w-3.5" />
        </Button>
      ),
    })
  }

  return (
    <DataTable columns={columns} data={data} loading={loading} emptyMessage={t('noMemories')} />
  )
}
