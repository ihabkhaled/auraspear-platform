import { Brain, Clock, Database, Search } from 'lucide-react'
import { DataTable, KpiCard } from '@/components/common'
import { Badge, Button, Input } from '@/components/ui'
import type { Column, RagRetrievedMemory, RagTracePanelProps } from '@/types'

const columns: Column<RagRetrievedMemory>[] = [
  {
    key: 'content',
    label: 'content',
    render: (value) => (
      <span className="line-clamp-2 max-w-md text-sm">{value as string}</span>
    ),
  },
  {
    key: 'category',
    label: 'category',
    render: (value) => <Badge variant="secondary">{value as string}</Badge>,
  },
  {
    key: 'similarity',
    label: 'similarity',
    render: (value) => {
      const score = Number(value ?? 0)
      const pct = Math.round(score * 100)
      if (pct >= 70) {
        return <Badge variant="success">{`${String(pct)}%`}</Badge>
      }
      if (pct >= 50) {
        return <Badge variant="warning">{`${String(pct)}%`}</Badge>
      }
      return <Badge variant="secondary">{`${String(pct)}%`}</Badge>
    },
  },
]

export function RagTracePanel({
  t,
  traceQuery,
  setTraceQuery,
  traceResult,
  onTrace,
  isTracing,
}: RagTracePanelProps) {
  const translatedColumns = columns.map(col => ({
    ...col,
    label: t(`trace.${col.key}`),
  }))

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-2 sm:flex-row">
        <Input
          className="flex-1"
          placeholder={t('trace.placeholder')}
          value={traceQuery}
          onChange={e => setTraceQuery(e.currentTarget.value)}
          onKeyDown={e => {
            if (e.key === 'Enter') {
              onTrace()
            }
          }}
        />
        <Button onClick={onTrace} disabled={isTracing || traceQuery.trim().length === 0}>
          <Search className="mr-1.5 h-4 w-4" />
          {t('trace.run')}
        </Button>
      </div>

      {traceResult && (
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <KpiCard
              label={t('trace.retrieved')}
              value={String(traceResult.memoriesRetrieved.length)}
              accentColor={undefined}
              icon={<Brain className="h-4 w-4" />}
            />
            <KpiCard
              label={t('trace.scanned')}
              value={String(traceResult.totalMemoriesScanned)}
              accentColor={undefined}
              icon={<Database className="h-4 w-4" />}
            />
            <KpiCard
              label={t('trace.threshold')}
              value={`${String(Math.round(traceResult.similarityThreshold * 100))}%`}
              accentColor={undefined}
              icon={<Search className="h-4 w-4" />}
            />
            <KpiCard
              label={t('trace.duration')}
              value={`${String(traceResult.retrievalDurationMs)}ms`}
              accentColor={undefined}
              icon={<Clock className="h-4 w-4" />}
            />
          </div>
          <DataTable
            columns={translatedColumns}
            data={traceResult.memoriesRetrieved}
            loading={false}
            emptyMessage={t('trace.noMemories')}
          />
        </div>
      )}
    </div>
  )
}
