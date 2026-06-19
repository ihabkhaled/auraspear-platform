import { DataTable } from '@/components/common'
import { Badge } from '@/components/ui'
import { formatTimestamp } from '@/lib/dayjs'
import type { Column, SemanticSearchResult, TranslationFn } from '@/types'

export function SearchResultsTable({
  t,
  data,
  loading,
}: {
  t: TranslationFn
  data: SemanticSearchResult[]
  loading: boolean
}) {
  const safeData = Array.isArray(data) ? data : []

  const columns: Column<SemanticSearchResult>[] = [
    {
      key: 'module',
      label: t('table.module'),
      render: (value) => <Badge variant="secondary">{value as string}</Badge>,
    },
    { key: 'title', label: t('table.title') },
    {
      key: 'snippet',
      label: t('table.snippet'),
      render: (value) => {
        const text = value as string
        return text.length > 120 ? `${text.slice(0, 120)}...` : text || '-'
      },
    },
    {
      key: 'score',
      label: t('table.score'),
      render: (value) => `${((value as number) * 100).toFixed(0)}%`,
    },
    {
      key: 'createdAt',
      label: t('table.createdAt'),
      render: (value) => formatTimestamp(value as string),
    },
  ]

  return (
    <DataTable columns={columns} data={safeData} loading={loading} emptyMessage={t('table.empty')} />
  )
}
