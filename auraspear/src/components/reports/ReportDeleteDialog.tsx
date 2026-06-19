'use client'

import { useReportDeleteDialog } from '@/hooks'
import type { ReportDeleteDialogProps } from '@/types'

export function ReportDeleteDialog(props: ReportDeleteDialogProps) {
  useReportDeleteDialog(props)

  return null
}
