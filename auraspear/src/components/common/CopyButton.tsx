'use client'

import { Copy, Check } from 'lucide-react'
import { Button } from '@/components/ui'
import { useCopyButton } from '@/hooks'
import type { CopyButtonProps } from '@/types'

export function CopyButton({ value, label }: CopyButtonProps) {
  const { t, copied, handleCopy } = useCopyButton(value)

  return (
    <Button variant="ghost" size="icon-xs" onClick={handleCopy} aria-label={label ?? t('copyId')}>
      {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
    </Button>
  )
}
