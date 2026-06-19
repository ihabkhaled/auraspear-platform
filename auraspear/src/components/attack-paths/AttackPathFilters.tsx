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
import { AttackPathSeverity, AttackPathStatus } from '@/enums'
import {
  ATTACK_PATH_SEVERITY_LABEL_KEYS,
  ATTACK_PATH_STATUS_LABEL_KEYS,
} from '@/lib/constants/attack-paths'
import { lookup } from '@/lib/utils'
import type { AttackPathFiltersProps } from '@/types'

export function AttackPathFilters({
  searchQuery,
  onSearchChange,
  severityFilter,
  onSeverityChange,
  statusFilter,
  onStatusChange,
  t,
  tCommon,
}: AttackPathFiltersProps) {
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

      <Select value={severityFilter} onValueChange={onSeverityChange}>
        <SelectTrigger className="w-full sm:w-36">
          <SelectValue placeholder={t('severityFilter')} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="__all__">{tCommon('all')}</SelectItem>
          {Object.values(AttackPathSeverity).map(sev => (
            <SelectItem key={sev} value={sev}>
              {t(lookup(ATTACK_PATH_SEVERITY_LABEL_KEYS, sev))}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select value={statusFilter} onValueChange={onStatusChange}>
        <SelectTrigger className="w-full sm:w-36">
          <SelectValue placeholder={t('statusFilter')} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="__all__">{tCommon('all')}</SelectItem>
          {Object.values(AttackPathStatus).map(status => (
            <SelectItem key={status} value={status}>
              {t(lookup(ATTACK_PATH_STATUS_LABEL_KEYS, status))}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}
