'use client'

import { useSoarDeleteDialog } from '@/hooks'
import type { SoarDeleteDialogProps } from '@/types'

export function SoarDeleteDialog(props: SoarDeleteDialogProps) {
  useSoarDeleteDialog(props)

  return null
}
