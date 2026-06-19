'use client'

import { ClipboardCheck } from 'lucide-react'
import { Button } from '@/components/ui'
import { useComplianceControlCard } from '@/hooks'
import {
  COMPLIANCE_CONTROL_STATUS_CLASSES,
  COMPLIANCE_CONTROL_STATUS_LABEL_KEYS,
} from '@/lib/constants/compliance'
import { cn, lookup } from '@/lib/utils'
import type { ComplianceControlCardProps } from '@/types'

export function ComplianceControlCard({ control, onAssess }: ComplianceControlCardProps) {
  const { t } = useComplianceControlCard()

  return (
    <div className="border-border bg-card flex items-center justify-between rounded-lg border p-3">
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="text-muted-foreground font-mono text-xs">{control.controlId}</span>
          <span
            className={cn(
              'inline-flex rounded-full px-2 py-0.5 text-xs font-medium',
              lookup(COMPLIANCE_CONTROL_STATUS_CLASSES, control.status)
            )}
          >
            {t(lookup(COMPLIANCE_CONTROL_STATUS_LABEL_KEYS, control.status))}
          </span>
        </div>
        <p className="text-foreground mt-1 text-sm font-medium">{control.title}</p>
        {control.evidence && (
          <p className="text-muted-foreground mt-1 truncate text-xs">{control.evidence}</p>
        )}
      </div>
      <Button variant="ghost" size="sm" onClick={() => onAssess(control)} className="ms-2 shrink-0">
        <ClipboardCheck className="me-1 h-3.5 w-3.5" />
        {t('assessButton')}
      </Button>
    </div>
  )
}
