import { DataTable } from '@/components/common'
import { Badge } from '@/components/ui'
import type { AgentGraphNode, Column, TranslationFn } from '@/types'

export function AgentGraphTable({
  t,
  data,
  loading,
}: {
  t: TranslationFn
  data: AgentGraphNode[]
  loading: boolean
}) {
  const safeData = Array.isArray(data) ? data : []

  const columns: Column<AgentGraphNode>[] = [
    { key: 'displayName', label: t('table.name') },
    {
      key: 'isCore',
      label: t('table.type'),
      render: (value) => (
        <Badge variant={value ? 'default' : 'secondary'}>
          {value ? t('table.core') : t('table.specialist')}
        </Badge>
      ),
    },
    {
      key: 'executionAgent',
      label: t('table.executionAgent'),
      render: (value) => (value as string | null) ?? '-',
    },
    {
      key: 'isEnabled',
      label: t('table.enabled'),
      render: (value) => (
        <Badge variant={value ? 'success' : 'destructive'}>
          {value ? t('table.yes') : t('table.no')}
        </Badge>
      ),
    },
    {
      key: 'schedules',
      label: t('table.schedules'),
      render: (_value, row) => String(row.schedules?.length ?? 0),
    },
    {
      key: 'features',
      label: t('table.features'),
      render: (_value, row) => String(row.features?.length ?? 0),
    },
    {
      key: 'tokenUsage',
      label: t('table.tokens'),
      render: (value) => String(value ?? 0),
    },
  ]

  return (
    <DataTable columns={columns} data={safeData} loading={loading} emptyMessage={t('table.empty')} />
  )
}
