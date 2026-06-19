import { DataTable } from '@/components/common'
import type { AiUsageByModelEntry, Column, TranslationFn } from '@/types'

export function FinopsCostByModelTable({
  t,
  data,
  loading,
}: {
  t: TranslationFn
  data: AiUsageByModelEntry[]
  loading: boolean
}) {
  const columns: Column<AiUsageByModelEntry>[] = [
    { key: 'provider', label: t('table.provider') },
    {
      key: 'model',
      label: t('table.model'),
      render: value => (value as string | null) ?? t('unknown'),
    },
    {
      key: 'totalInputTokens',
      label: t('table.inputTokens'),
      render: value => (value as number).toLocaleString(),
    },
    {
      key: 'totalOutputTokens',
      label: t('table.outputTokens'),
      render: value => (value as number).toLocaleString(),
    },
    {
      key: 'totalCost',
      label: t('table.cost'),
      render: value => `$${(value as number).toFixed(4)}`,
    },
    {
      key: 'requestCount',
      label: t('table.requests'),
      render: value => (value as number).toLocaleString(),
    },
  ]

  return <DataTable columns={columns} data={data} loading={loading} emptyMessage={t('noData')} />
}
