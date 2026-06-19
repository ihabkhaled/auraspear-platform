import { DataTable } from '@/components/common'
import { Badge } from '@/components/ui'
import { formatTimestamp } from '@/lib/dayjs'
import type { AiEvalRun, Column, TranslationFn } from '@/types'

export function EvalRunsTable({
  t,
  data,
  loading,
  availableConnectors,
}: {
  t: TranslationFn
  data: AiEvalRun[]
  loading: boolean
  availableConnectors?: Array<{ key: string; label: string }>
}) {
  const resolveConnectorName = (key: string): string => {
    const connector = availableConnectors?.find(c => c.key === key)
    return connector?.label ?? key
  }

  const columns: Column<AiEvalRun>[] = [
    {
      key: 'suite',
      label: t('runs.suite'),
      render: (_value, row) => row.suite?.name ?? '-',
    },
    {
      key: 'provider',
      label: t('runs.provider'),
      render: value => <span>{resolveConnectorName(value as string)}</span>,
    },
    { key: 'model', label: t('runs.model') },
    {
      key: 'status',
      label: t('runs.status'),
      render: (value) => {
        const status = value as string
        const variant =
          status === 'completed'
            ? 'success'
            : status === 'failed'
              ? 'destructive'
              : status === 'running'
                ? 'info'
                : 'secondary'
        return <Badge variant={variant}>{status}</Badge>
      },
    },
    {
      key: 'avgScore',
      label: t('runs.avgScore'),
      render: (value) => {
        const score = value as number | null
        if (score === null) {
          return '-'
        }
        const variant = score >= 0.8 ? 'success' : score >= 0.5 ? 'warning' : 'destructive'
        return <Badge variant={variant}>{`${(score * 100).toFixed(1)}%`}</Badge>
      },
    },
    {
      key: 'passedCases',
      label: t('runs.passed'),
      render: (value, row) => `${value as number}/${row.totalCases}`,
    },
    {
      key: 'avgLatencyMs',
      label: t('runs.latency'),
      render: (value) => {
        const latency = value as number | null
        return latency !== null ? `${latency.toFixed(0)}ms` : '-'
      },
    },
    {
      key: 'totalTokens',
      label: t('runs.tokens'),
      render: (value) => String(value as number),
    },
    {
      key: 'createdAt',
      label: t('runs.createdAt'),
      render: (value) => formatTimestamp(value as string),
    },
  ]

  return <DataTable columns={columns} data={data} loading={loading} emptyMessage={t('runs.empty')} />
}
