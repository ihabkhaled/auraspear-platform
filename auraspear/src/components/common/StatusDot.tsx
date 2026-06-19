import { StatusDotSize } from '@/enums'
import {
  STATUS_DOT_COLOR_MAP,
  STATUS_DOT_PING_COLOR_MAP,
  STATUS_DOT_SIZE_MAP,
} from '@/lib/constants/system-health'
import { cn, lookup } from '@/lib/utils'
import type { StatusDotProps } from '@/types'

export function StatusDot({ status, size = StatusDotSize.SM }: StatusDotProps) {
  return (
    <span className="relative inline-flex">
      <span
        className={cn(
          'absolute inline-flex animate-ping rounded-full opacity-75',
          lookup(STATUS_DOT_SIZE_MAP, size),
          lookup(STATUS_DOT_PING_COLOR_MAP, status)
        )}
      />
      <span
        className={cn(
          'relative inline-flex rounded-full',
          lookup(STATUS_DOT_SIZE_MAP, size),
          lookup(STATUS_DOT_COLOR_MAP, status)
        )}
      />
    </span>
  )
}
