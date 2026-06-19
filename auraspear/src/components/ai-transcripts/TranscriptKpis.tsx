import { FileText, Lock, MessageSquare, ScrollText, ShieldOff } from 'lucide-react'
import { KpiCard } from '@/components/common'
import type { AiTranscriptStats, TranslationFn } from '@/types'

export function TranscriptKpis({
  t,
  stats,
}: {
  t: TranslationFn
  stats: AiTranscriptStats | null
}) {
  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
      <KpiCard label={t('kpi.threads')} value={Number(stats?.totalThreads ?? 0).toLocaleString()} accentColor={undefined} icon={<MessageSquare className="h-4 w-4" />} />
      <KpiCard label={t('kpi.messages')} value={Number(stats?.totalMessages ?? 0).toLocaleString()} accentColor={undefined} icon={<FileText className="h-4 w-4" />} />
      <KpiCard label={t('kpi.auditLogs')} value={Number(stats?.totalAuditLogs ?? 0).toLocaleString()} accentColor={undefined} icon={<ScrollText className="h-4 w-4" />} />
      <KpiCard label={t('kpi.onHold')} value={Number(stats?.threadsOnHold ?? 0).toLocaleString()} accentColor={undefined} icon={<Lock className="h-4 w-4" />} />
      <KpiCard label={t('kpi.redacted')} value={Number(stats?.threadsRedacted ?? 0).toLocaleString()} accentColor={undefined} icon={<ShieldOff className="h-4 w-4" />} />
    </div>
  )
}
