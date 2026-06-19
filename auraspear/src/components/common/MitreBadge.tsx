import { Shield } from 'lucide-react'
import { Badge } from '@/components/ui'
import type { MITREBadgeProps } from '@/types'

export function MitreBadge({ techniqueId }: MITREBadgeProps) {
  return (
    <Badge variant="outline" className="gap-1 font-mono text-xs">
      <Shield className="h-3 w-3" />
      {techniqueId}
    </Badge>
  )
}
