'use client'

import { useState } from 'react'
import { Play, Save } from 'lucide-react'
import { Button, Input, Switch } from '@/components/ui'
import { formatTimestamp } from '@/lib/dayjs'
import type { MemoryRetentionPolicy, TranslationFn } from '@/types'

export function MemoryRetentionPanel({
  t,
  retention,
  onSave,
  isSaving,
  onRunCleanup,
  isCleaningUp,
}: {
  t: TranslationFn
  retention: MemoryRetentionPolicy | null
  onSave: (data: { retentionDays: number; autoCleanup: boolean }) => void
  isSaving: boolean
  onRunCleanup: () => void
  isCleaningUp: boolean
}) {
  const [days, setDays] = useState(String(retention?.retentionDays ?? 0))
  const [autoCleanup, setAutoCleanup] = useState(retention?.autoCleanup ?? false)

  function handleSave() {
    onSave({ retentionDays: Number(days), autoCleanup })
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="space-y-1.5">
          <label className="text-muted-foreground text-sm">{t('retention.days')}</label>
          <Input
            type="number"
            min="0"
            value={days}
            onChange={e => setDays(e.currentTarget.value)}
            placeholder="0 = never expire"
          />
          <p className="text-muted-foreground text-xs">{t('retention.daysHint')}</p>
        </div>
        <div className="flex items-center gap-3 pt-6">
          <Switch checked={autoCleanup} onCheckedChange={setAutoCleanup} />
          <span className="text-sm">{t('retention.autoCleanup')}</span>
        </div>
        <div className="flex items-end gap-2">
          <Button size="sm" onClick={handleSave} disabled={isSaving}>
            <Save className="mr-1.5 h-3.5 w-3.5" />
            {t('retention.save')}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={onRunCleanup}
            disabled={isCleaningUp || Number(days) <= 0}
          >
            <Play className="mr-1.5 h-3.5 w-3.5" />
            {t('retention.runNow')}
          </Button>
        </div>
      </div>

      {retention?.lastCleanupAt && (
        <p className="text-muted-foreground text-xs">
          {t('retention.lastCleanup')}: {formatTimestamp(retention.lastCleanupAt)} (
          {String(retention.lastCleanupCount)} {t('retention.memoriesCleaned')})
        </p>
      )}
    </div>
  )
}
