import { useMemo, useState } from 'react'
import { useTranslations } from 'next-intl'
import { getComplianceScoreClass } from '@/lib/cloud-security.utils'
import type { CloudAccountDetailPanelProps } from '@/types'

export function useCloudAccountDetailPanel({
  account,
}: Pick<CloudAccountDetailPanelProps, 'account'>) {
  const t = useTranslations('cloudSecurity')
  const tCommon = useTranslations('common')

  const [findingsOpen, setFindingsOpen] = useState(true)

  const hasData = account !== null

  const complianceScoreClass = useMemo(
    () => (account ? getComplianceScoreClass(account.complianceScore) : ''),
    [account]
  )

  return { t, tCommon, hasData, findingsOpen, setFindingsOpen, complianceScoreClass }
}
