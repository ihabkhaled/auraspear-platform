'use client'

import { Search } from 'lucide-react'
import {
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui'
import { CloudAccountStatus, CloudProvider } from '@/enums'
import { useCloudSecurityFilters } from '@/hooks'
import {
  CLOUD_ACCOUNT_STATUS_LABEL_KEYS,
  CLOUD_PROVIDER_LABEL_KEYS,
} from '@/lib/constants/cloud-security'
import { lookup } from '@/lib/utils'
import type { CloudSecurityFiltersProps } from '@/types'

export function CloudSecurityFilters({
  searchQuery,
  providerFilter,
  statusFilter,
  onSearchChange,
  onProviderChange,
  onStatusChange,
}: CloudSecurityFiltersProps) {
  const { t, tCommon } = useCloudSecurityFilters()

  return (
    <div className="flex flex-wrap items-center gap-3">
      <div className="relative min-w-[200px] flex-1">
        <Search className="text-muted-foreground absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2" />
        <Input
          placeholder={t('searchPlaceholder')}
          value={searchQuery}
          onChange={e => onSearchChange(e.currentTarget.value)}
          className="ps-9"
        />
      </div>

      <Select value={providerFilter} onValueChange={onProviderChange}>
        <SelectTrigger className="w-full sm:w-36">
          <SelectValue placeholder={t('filterProvider')} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="__all__">{tCommon('all')}</SelectItem>
          {Object.values(CloudProvider).map(provider => (
            <SelectItem key={provider} value={provider}>
              {t(lookup(CLOUD_PROVIDER_LABEL_KEYS, provider))}
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
          {Object.values(CloudAccountStatus).map(status => (
            <SelectItem key={status} value={status}>
              {t(lookup(CLOUD_ACCOUNT_STATUS_LABEL_KEYS, status))}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}
