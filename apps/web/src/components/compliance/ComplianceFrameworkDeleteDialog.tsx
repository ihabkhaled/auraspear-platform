'use client'

import { useComplianceDeleteDialog } from '@/hooks'
import type { ComplianceDeleteDialogProps } from '@/types'

export function ComplianceFrameworkDeleteDialog(props: ComplianceDeleteDialogProps) {
  useComplianceDeleteDialog(props)

  return null
}
