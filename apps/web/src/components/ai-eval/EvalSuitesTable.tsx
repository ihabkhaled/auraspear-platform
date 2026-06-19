import { Trash2 } from 'lucide-react'
import { DataTable } from '@/components/common'
import { Badge } from '@/components/ui'
import { formatTimestamp } from '@/lib/dayjs'
import type { AiEvalSuite, Column, TranslationFn } from '@/types'

export function EvalSuitesTable({
  t,
  data,
  loading,
  canManage,
  onDelete,
}: {
  t: TranslationFn
  data: AiEvalSuite[]
  loading: boolean
  canManage: boolean
  onDelete?: ((id: string) => void) | undefined
}) {
  const columns: Column<AiEvalSuite>[] = [
    { key: 'name', label: t('suites.name') },
    {
      key: 'description',
      label: t('suites.description'),
      render: (value) => (value as string | null) ?? '-',
    },
    {
      key: '_count',
      label: t('suites.runs'),
      render: (_value, row) => {
        const count = row._count?.runs ?? 0
        return <Badge variant="secondary">{String(count)}</Badge>
      },
    },
    {
      key: 'createdAt',
      label: t('suites.createdAt'),
      render: (value) => formatTimestamp(value as string),
    },
    ...(canManage
      ? [
          {
            key: 'id' as keyof AiEvalSuite,
            label: '',
            render: (value: unknown) => (
              <button
                type="button"
                className="text-muted-foreground hover:text-destructive"
                onClick={() => onDelete?.(value as string)}
              >
                <Trash2 className="h-4 w-4" />
              </button>
            ),
          },
        ]
      : []),
  ]

  return <DataTable columns={columns} data={data} loading={loading} emptyMessage={t('suites.empty')} />
}
