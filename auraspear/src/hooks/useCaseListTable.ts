import { useCallback } from 'react'
import { useTranslations } from 'next-intl'
import { getCaseRowClassName } from '@/lib/case.utils'
import type { Case, UseCaseListTableParams } from '@/types'

export function useCaseListTable({ currentUserId, isAdmin }: UseCaseListTableParams) {
  const t = useTranslations('cases')
  const getRowClassName = useCallback(
    (row: Case): string => getCaseRowClassName(row, currentUserId, isAdmin),
    [currentUserId, isAdmin]
  )

  return { t, getRowClassName }
}
