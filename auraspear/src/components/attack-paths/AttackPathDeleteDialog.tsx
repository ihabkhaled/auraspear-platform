'use client'

import type { AttackPathDeleteDialogProps } from '@/types'

export function AttackPathDeleteDialog({ pathTitle, onConfirm, t }: AttackPathDeleteDialogProps) {
  return (
    <div className="flex flex-col gap-2">
      <p className="text-sm">
        {t('confirmDeleteMessage')} <span className="font-medium">{pathTitle}</span>?
      </p>
      <button type="button" onClick={onConfirm} className="hidden" aria-label={t('delete')}>
        {t('delete')}
      </button>
    </div>
  )
}
