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
import { SoarPlaybookStatus, SoarTriggerType } from '@/enums'
import { useSoarFilters } from '@/hooks'
import { SOAR_PLAYBOOK_STATUS_LABEL_KEYS, SOAR_TRIGGER_TYPE_LABEL_KEYS } from '@/lib/constants/soar'
import { lookup } from '@/lib/utils'
import type { SoarFiltersProps } from '@/types'

export function SoarFilters({
  searchQuery,
  statusFilter,
  triggerFilter,
  onSearchChange,
  onStatusChange,
  onTriggerChange,
}: SoarFiltersProps) {
  const { t, tCommon } = useSoarFilters()

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

      <Select value={statusFilter} onValueChange={onStatusChange}>
        <SelectTrigger className="w-full sm:w-36">
          <SelectValue placeholder={tCommon('status')} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="__all__">{tCommon('all')}</SelectItem>
          {Object.values(SoarPlaybookStatus).map(status => (
            <SelectItem key={status} value={status}>
              {t(lookup(SOAR_PLAYBOOK_STATUS_LABEL_KEYS, status))}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select value={triggerFilter} onValueChange={onTriggerChange}>
        <SelectTrigger className="w-full sm:w-40">
          <SelectValue placeholder={t('triggerLabel')} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="__all__">{tCommon('all')}</SelectItem>
          {Object.values(SoarTriggerType).map(trigger => (
            <SelectItem key={trigger} value={trigger}>
              {t(lookup(SOAR_TRIGGER_TYPE_LABEL_KEYS, trigger))}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}
