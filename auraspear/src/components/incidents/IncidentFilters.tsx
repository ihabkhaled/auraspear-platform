'use client'

import { Search, X } from 'lucide-react'
import {
  Button,
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui'
import { IncidentCategory, IncidentSeverity, IncidentStatus } from '@/enums'
import { useIncidentFilters } from '@/hooks'
import {
  INCIDENT_CATEGORY_LABEL_KEYS,
  INCIDENT_SEVERITY_LABEL_KEYS,
  INCIDENT_STATUS_LABEL_KEYS,
} from '@/lib/constants/incidents'
import { lookup } from '@/lib/utils'
import type { IncidentFiltersProps } from '@/types'

export function IncidentFilters(props: IncidentFiltersProps) {
  const { t, tCommon, hasActiveFilters, handleClearAll } = useIncidentFilters(props)

  return (
    <div className="flex flex-wrap items-center gap-3">
      <div className="relative min-w-[200px] flex-1">
        <Search className="text-muted-foreground absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2" />
        <Input
          placeholder={t('searchPlaceholder')}
          value={props.searchQuery}
          onChange={e => props.onSearchChange(e.currentTarget.value)}
          className="ps-9"
        />
      </div>

      <Select value={props.statusFilter} onValueChange={props.onStatusChange}>
        <SelectTrigger className="w-full sm:w-36">
          <SelectValue placeholder={tCommon('status')} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="__all__">{tCommon('all')}</SelectItem>
          {Object.values(IncidentStatus).map(status => (
            <SelectItem key={status} value={status}>
              {t(lookup(INCIDENT_STATUS_LABEL_KEYS, status))}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select value={props.severityFilter} onValueChange={props.onSeverityChange}>
        <SelectTrigger className="w-full sm:w-36">
          <SelectValue placeholder={tCommon('severity')} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="__all__">{tCommon('all')}</SelectItem>
          {Object.values(IncidentSeverity).map(sev => (
            <SelectItem key={sev} value={sev}>
              {t(lookup(INCIDENT_SEVERITY_LABEL_KEYS, sev))}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select value={props.categoryFilter} onValueChange={props.onCategoryChange}>
        <SelectTrigger className="w-full sm:w-40">
          <SelectValue placeholder={t('categoryLabel')} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="__all__">{tCommon('all')}</SelectItem>
          {Object.values(IncidentCategory).map(cat => (
            <SelectItem key={cat} value={cat}>
              {t(lookup(INCIDENT_CATEGORY_LABEL_KEYS, cat))}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {hasActiveFilters && (
        <Button variant="ghost" size="sm" onClick={handleClearAll} className="gap-1.5">
          <X className="h-3.5 w-3.5" />
          {t('filtersClearAll')}
        </Button>
      )}
    </div>
  )
}
