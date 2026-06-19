'use client'

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui'
import { HealthCheckStatus, ServiceType } from '@/enums'
import { useSystemHealthFilters } from '@/hooks'
import {
  HEALTH_CHECK_STATUS_LABEL_KEYS,
  SERVICE_TYPE_LABEL_KEYS,
} from '@/lib/constants/system-health'
import { lookup } from '@/lib/utils'
import type { SystemHealthFiltersProps } from '@/types'

export function SystemHealthFilters({
  serviceTypeFilter,
  statusFilter,
  onServiceTypeChange,
  onStatusChange,
}: SystemHealthFiltersProps) {
  const { t, tCommon } = useSystemHealthFilters()

  return (
    <div className="flex flex-wrap items-center gap-3">
      <Select value={serviceTypeFilter} onValueChange={onServiceTypeChange}>
        <SelectTrigger className="w-full sm:w-40">
          <SelectValue placeholder={t('filterService')} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="__all__">{tCommon('all')}</SelectItem>
          {Object.values(ServiceType).map(svc => (
            <SelectItem key={svc} value={svc}>
              {t(lookup(SERVICE_TYPE_LABEL_KEYS, svc))}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select value={statusFilter} onValueChange={onStatusChange}>
        <SelectTrigger className="w-full sm:w-36">
          <SelectValue placeholder={tCommon('status')} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="__all__">{tCommon('all')}</SelectItem>
          {Object.values(HealthCheckStatus).map(status => (
            <SelectItem key={status} value={status}>
              {t(lookup(HEALTH_CHECK_STATUS_LABEL_KEYS, status))}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}
