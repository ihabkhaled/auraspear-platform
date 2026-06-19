import { Trash2 } from 'lucide-react'
import { DataTable } from '@/components/common'
import { Badge } from '@/components/ui'
import { formatTimestamp } from '@/lib/dayjs'
import type { AiSimulation, Column, TranslationFn } from '@/types'

export function SimulationsTable({
  t,
  data,
  loading,
  canManage,
  onDelete,
}: {
  t: TranslationFn
  data: AiSimulation[]
  loading: boolean
  canManage: boolean
  onDelete?: ((id: string) => void) | undefined
}) {
  const safeData = Array.isArray(data) ? data : []

  const columns: Column<AiSimulation>[] = [
    { key: 'name', label: t('table.name') },
    { key: 'agentId', label: t('table.agent') },
    {
      key: 'status',
      label: t('table.status'),
      render: (value) => {
        const status = value as string
        const variant =
          status === 'completed'
            ? 'success'
            : status === 'running'
              ? 'info'
              : status === 'failed'
                ? 'destructive'
                : 'secondary'
        return <Badge variant={variant}>{status}</Badge>
      },
    },
    {
      key: 'totalCases',
      label: t('table.cases'),
      render: (value, row) => `${row.completedCases}/${value as number}`,
    },
    {
      key: 'avgScore',
      label: t('table.avgScore'),
      render: (value) => (value !== null && value !== undefined ? `${((value as number) * 100).toFixed(1)}%` : '-'),
    },
    {
      key: 'totalTokens',
      label: t('table.tokens'),
      render: (value) => String(value ?? 0),
    },
    {
      key: 'createdAt',
      label: t('table.createdAt'),
      render: (value) => formatTimestamp(value as string),
    },
    ...(canManage
      ? [
          {
            key: 'id' as keyof AiSimulation,
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

  return (
    <DataTable columns={columns} data={safeData} loading={loading} emptyMessage={t('table.empty')} />
  )
}
