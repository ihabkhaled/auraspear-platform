import { useMemo, useState } from 'react'
import { useTranslations } from 'next-intl'
import { IncidentStatus } from '@/enums'
import { buildIncidentStatusOptions } from '@/lib/incidents'
import { formatRelativeTime } from '@/lib/utils'
import type { Incident } from '@/types'

export function useIncidentDetailPanel(
  incident: Incident | null,
  onChangeStatus?: ((status: IncidentStatus) => void) | undefined
) {
  const t = useTranslations('incidents')
  const tCommon = useTranslations('common')
  const [selectedStatus, setSelectedStatus] = useState<IncidentStatus>(
    incident?.status ?? IncidentStatus.OPEN
  )

  const formattedCreatedAt = incident?.createdAt ? formatRelativeTime(incident.createdAt) : '-'
  const formattedUpdatedAt = incident?.updatedAt ? formatRelativeTime(incident.updatedAt) : '-'
  const formattedResolvedAt = incident?.resolvedAt ? formatRelativeTime(incident.resolvedAt) : null
  const statusOptions = useMemo(
    () => (incident ? buildIncidentStatusOptions(incident.status) : []),
    [incident]
  )
  const isStatusDirty = incident ? selectedStatus !== incident.status : false

  const handleStatusChange = (status: string) => {
    setSelectedStatus(status as IncidentStatus)
  }

  const handleStatusSubmit = () => {
    if (!incident || !isStatusDirty || !onChangeStatus) {
      return
    }

    onChangeStatus(selectedStatus)
  }

  return {
    t,
    tCommon,
    formattedCreatedAt,
    formattedUpdatedAt,
    formattedResolvedAt,
    selectedStatus,
    statusOptions,
    isStatusDirty,
    handleStatusChange,
    handleStatusSubmit,
  }
}
