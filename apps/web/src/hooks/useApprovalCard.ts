'use client'

import { useCallback, useState } from 'react'
import { ApprovalStatus } from '@/enums'
import type { ApprovalRequest, ResolveApprovalInput } from '@/types'

export function useApprovalCard(
  approval: ApprovalRequest,
  onResolve: (id: string, data: ResolveApprovalInput) => void
) {
  const [comment, setComment] = useState('')
  const isPending = approval.status === ApprovalStatus.PENDING

  const handleApprove = useCallback(() => {
    onResolve(approval.id, {
      status: ApprovalStatus.APPROVED,
      comment: comment.length > 0 ? comment : null,
    })
  }, [approval.id, comment, onResolve])

  const handleReject = useCallback(() => {
    onResolve(approval.id, {
      status: ApprovalStatus.REJECTED,
      comment: comment.length > 0 ? comment : null,
    })
  }, [approval.id, comment, onResolve])

  const statusVariant = (() => {
    switch (approval.status) {
      case ApprovalStatus.APPROVED:
        return 'success' as const
      case ApprovalStatus.REJECTED:
        return 'destructive' as const
      case ApprovalStatus.EXPIRED:
        return 'secondary' as const
      default:
        return 'warning' as const
    }
  })()

  return {
    comment,
    setComment,
    isPending,
    statusVariant,
    handleApprove,
    handleReject,
  }
}
