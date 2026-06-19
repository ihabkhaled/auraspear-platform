import { Brain, Database, Trash2, Users } from 'lucide-react'
import { KpiCard } from '@/components/common'
import type { MemoryStats, TranslationFn } from '@/types'

export function MemoryGovernanceKpis({
  t,
  stats,
}: {
  t: TranslationFn
  stats: MemoryStats | null
}) {
  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
      <KpiCard
        label={t('kpi.activeMemories')}
        value={Number(stats?.totalActive ?? 0).toLocaleString()}
        accentColor={undefined}
        icon={<Brain className="h-4 w-4" />}
      />
      <KpiCard
        label={t('kpi.deletedMemories')}
        value={Number(stats?.totalDeleted ?? 0).toLocaleString()}
        accentColor={undefined}
        icon={<Trash2 className="h-4 w-4" />}
      />
      <KpiCard
        label={t('kpi.uniqueUsers')}
        value={Number(stats?.uniqueUsers ?? 0).toLocaleString()}
        accentColor={undefined}
        icon={<Users className="h-4 w-4" />}
      />
      <KpiCard
        label={t('kpi.categories')}
        value={String(stats?.byCategory?.length ?? 0)}
        accentColor={undefined}
        icon={<Database className="h-4 w-4" />}
      />
    </div>
  )
}
