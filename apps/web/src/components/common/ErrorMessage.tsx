'use client'

import { AlertTriangle } from 'lucide-react'
import { Button } from '@/components/ui'
import { useErrorMessage } from '@/hooks'
import { cn } from '@/lib/utils'
import type { ErrorMessageProps } from '@/types'

export function ErrorMessage({ message, onRetry, className }: ErrorMessageProps) {
  const { t } = useErrorMessage()

  return (
    <div className={cn('flex flex-col items-center justify-center gap-4 py-12', className)}>
      <div className="bg-status-error flex h-12 w-12 items-center justify-center rounded-full">
        <AlertTriangle className="text-status-error h-6 w-6" />
      </div>
      <div className="text-center">
        <p className="text-status-error text-sm font-medium">
          {message ?? t('errors.common.unknown')}
        </p>
      </div>
      {onRetry && (
        <Button variant="outline" size="sm" onClick={onRetry}>
          {t('common.refresh')}
        </Button>
      )}
    </div>
  )
}
