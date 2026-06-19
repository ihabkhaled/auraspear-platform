import { Download, Lock, LockOpen, ShieldOff } from 'lucide-react'
import { DataTable } from '@/components/common'
import { Badge, Button } from '@/components/ui'
import { formatTimestamp } from '@/lib/dayjs'
import type { AiTranscriptThread, Column, TranslationFn } from '@/types'

export function TranscriptThreadsTable({
  t,
  data,
  loading,
  canManage,
  canExport,
  onToggleLegalHold,
  onRedact,
  onExport,
  onSelect,
}: {
  t: TranslationFn
  data: AiTranscriptThread[]
  loading: boolean
  canManage: boolean
  canExport: boolean
  onToggleLegalHold: (arg: { threadId: string; legalHold: boolean }) => void
  onRedact: (threadId: string) => void
  onExport: (threadId: string) => void
  onSelect: (threadId: string) => void
}) {
  const columns: Column<AiTranscriptThread>[] = [
    {
      key: 'title',
      label: t('table.title'),
      render: (value, row) => (
        <button type="button" className="text-start text-sm hover:underline" onClick={() => onSelect(row.id)}>
          {(value as string | null) ?? t('untitled')}
        </button>
      ),
    },
    {
      key: 'userId',
      label: t('table.user'),
      render: (_value, row) => {
        const email = row.user?.email
        return <span className="text-xs">{email ?? (row.userId as string).slice(0, 8)}</span>
      },
    },
    {
      key: 'messageCount',
      label: t('table.messages'),
      render: (value) => Number(value ?? 0).toLocaleString(),
    },
    {
      key: 'totalTokensUsed',
      label: t('table.tokens'),
      render: (value) => Number(value ?? 0).toLocaleString(),
    },
    {
      key: 'legalHold',
      label: t('table.legalHold'),
      render: (value) => (value as boolean) ? <Badge variant="destructive">{t('hold')}</Badge> : <Badge variant="secondary">{t('noHold')}</Badge>,
    },
    {
      key: 'complianceStatus',
      label: t('table.status'),
      render: (value) => {
        const status = value as string
        if (status === 'redacted') return <Badge variant="warning">{t('redacted')}</Badge>
        return <Badge variant="secondary">{status}</Badge>
      },
    },
    {
      key: 'lastActivityAt',
      label: t('table.lastActivity'),
      render: (value) => formatTimestamp(value as string),
    },
  ]

  if (canManage || canExport) {
    columns.push({
      key: 'id',
      label: '',
      render: (_value, row) => (
        <div className="flex gap-1">
          {canManage && (
            <Button variant="ghost" size="sm" onClick={() => onToggleLegalHold({ threadId: row.id, legalHold: !row.legalHold })} title={row.legalHold ? t('releaseLegalHold') : t('setLegalHold')}>
              {row.legalHold ? <LockOpen className="h-3.5 w-3.5" /> : <Lock className="h-3.5 w-3.5" />}
            </Button>
          )}
          {canManage && !row.legalHold && row.complianceStatus !== 'redacted' && (
            <Button variant="ghost" size="sm" onClick={() => onRedact(row.id)} title={t('redactThread')}>
              <ShieldOff className="h-3.5 w-3.5 text-status-warning" />
            </Button>
          )}
          {canExport && (
            <Button variant="ghost" size="sm" onClick={() => onExport(row.id)} title={t('exportThread')}>
              <Download className="h-3.5 w-3.5" />
            </Button>
          )}
        </div>
      ),
    })
  }

  return <DataTable columns={columns} data={data} loading={loading} emptyMessage={t('noThreads')} />
}
