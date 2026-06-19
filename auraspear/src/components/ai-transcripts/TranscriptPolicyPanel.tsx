'use client'

import { useState } from 'react'
import { Play, Save } from 'lucide-react'
import { Button, Input, Switch } from '@/components/ui'
import { formatTimestamp } from '@/lib/dayjs'
import type { AiTranscriptPolicy, TranslationFn } from '@/types'

export function TranscriptPolicyPanel({
  t,
  policy,
  onSave,
  isSaving,
  onRunCleanup,
  isCleaningUp,
}: {
  t: TranslationFn
  policy: AiTranscriptPolicy | null
  onSave: (data: { chatRetentionDays: number; auditRetentionDays: number; autoRedactPii: boolean; requireLegalHold: boolean }) => void
  isSaving: boolean
  onRunCleanup: () => void
  isCleaningUp: boolean
}) {
  const [chatDays, setChatDays] = useState(String(policy?.chatRetentionDays ?? 0))
  const [auditDays, setAuditDays] = useState(String(policy?.auditRetentionDays ?? 0))
  const [autoRedact, setAutoRedact] = useState(policy?.autoRedactPii ?? false)
  const [requireHold, setRequireHold] = useState(policy?.requireLegalHold ?? false)

  function handleSave() {
    onSave({
      chatRetentionDays: Number(chatDays),
      auditRetentionDays: Number(auditDays),
      autoRedactPii: autoRedact,
      requireLegalHold: requireHold,
    })
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="space-y-1.5">
          <label className="text-muted-foreground text-sm">{t('policy.chatRetention')}</label>
          <Input type="number" min="0" value={chatDays} onChange={e => setChatDays(e.currentTarget.value)} />
          <p className="text-muted-foreground text-xs">{t('policy.daysHint')}</p>
        </div>
        <div className="space-y-1.5">
          <label className="text-muted-foreground text-sm">{t('policy.auditRetention')}</label>
          <Input type="number" min="0" value={auditDays} onChange={e => setAuditDays(e.currentTarget.value)} />
          <p className="text-muted-foreground text-xs">{t('policy.daysHint')}</p>
        </div>
        <div className="space-y-3 pt-6">
          <div className="flex items-center gap-3">
            <Switch checked={autoRedact} onCheckedChange={setAutoRedact} />
            <span className="text-sm">{t('policy.autoRedactPii')}</span>
          </div>
          <div className="flex items-center gap-3">
            <Switch checked={requireHold} onCheckedChange={setRequireHold} />
            <span className="text-sm">{t('policy.requireLegalHold')}</span>
          </div>
        </div>
        <div className="flex items-end gap-2">
          <Button size="sm" onClick={handleSave} disabled={isSaving}>
            <Save className="mr-1.5 h-3.5 w-3.5" />
            {t('policy.save')}
          </Button>
          <Button variant="outline" size="sm" onClick={onRunCleanup} disabled={isCleaningUp}>
            <Play className="mr-1.5 h-3.5 w-3.5" />
            {t('policy.runCleanup')}
          </Button>
        </div>
      </div>
      {policy?.lastCleanupAt && (
        <p className="text-muted-foreground text-xs">
          {t('policy.lastCleanup')}: {formatTimestamp(policy.lastCleanupAt)} ({String(policy.lastCleanupCount)} {t('policy.itemsCleaned')})
        </p>
      )}
    </div>
  )
}
