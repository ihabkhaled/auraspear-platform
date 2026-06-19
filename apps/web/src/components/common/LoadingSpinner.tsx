'use client'

import { Loader2 } from 'lucide-react'
import { useLoadingSpinner } from '@/hooks'
import { cn } from '@/lib/utils'
import type { LoadingSpinnerProps } from '@/types'

export function LoadingSpinner({ className }: LoadingSpinnerProps) {
  const { t } = useLoadingSpinner()

  return (
    <div className={cn('flex flex-col items-center justify-center gap-3 py-12', className)}>
      <Loader2 className="text-primary h-8 w-8 animate-spin" />
      <p className="text-muted-foreground text-sm">{t('loading')}</p>
    </div>
  )
}
