'use client'

import { useCallback, useMemo, useState } from 'react'
import type { CloudAccount, CloudFinding } from '@/types'
import { useCloudFindings } from './useCloudSecurity'

export function useCloudSecurityPageDialogs() {
  const [createOpen, setCreateOpen] = useState(false)
  const [editOpen, setEditOpen] = useState(false)
  const [detailOpen, setDetailOpen] = useState(false)
  const [selectedAccount, setSelectedAccount] = useState<CloudAccount | null>(null)

  const { data: findingsData } = useCloudFindings(
    selectedAccount ? { cloudAccountId: selectedAccount.id } : undefined
  )

  const accountFindings: CloudFinding[] = useMemo(() => findingsData?.data ?? [], [findingsData])

  const handleRowClick = useCallback((account: CloudAccount) => {
    setSelectedAccount(account)
    setDetailOpen(true)
  }, [])

  const handleOpenEdit = useCallback((account: CloudAccount) => {
    setSelectedAccount(account)
    setEditOpen(true)
  }, [])

  return {
    createOpen,
    setCreateOpen,
    editOpen,
    setEditOpen,
    detailOpen,
    setDetailOpen,
    selectedAccount,
    setSelectedAccount,
    accountFindings,
    handleRowClick,
    handleOpenEdit,
  }
}
