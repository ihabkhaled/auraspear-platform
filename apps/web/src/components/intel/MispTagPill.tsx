'use client'

import { getTagClasses } from '@/lib/intel-utils'
import { cn } from '@/lib/utils'
import type { MISPTagPillProps } from '@/types'

export function MispTagPill({ name }: MISPTagPillProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] leading-tight font-medium',
        getTagClasses(name)
      )}
    >
      {name}
    </span>
  )
}
