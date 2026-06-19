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
import { UebaEntityType, UebaRiskLevel } from '@/enums'
import { useUebaFilters } from '@/hooks'
import { UEBA_ENTITY_TYPE_LABEL_KEYS, UEBA_RISK_LEVEL_LABEL_KEYS } from '@/lib/constants/ueba'
import { lookup } from '@/lib/utils'
import type { UebaFiltersProps } from '@/types'

export function UebaFilters({
  searchQuery,
  onSearchChange,
  entityTypeFilter,
  onEntityTypeChange,
  riskLevelFilter,
  onRiskLevelChange,
}: UebaFiltersProps) {
  const { t, tCommon, handleSearchInput } = useUebaFilters({
    onSearchChange,
    onEntityTypeChange,
    onRiskLevelChange,
  })

  return (
    <div className="flex flex-wrap items-center gap-3">
      <div className="relative min-w-[200px] flex-1">
        <Search className="text-muted-foreground absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2" />
        <Input
          placeholder={t('searchPlaceholder')}
          value={searchQuery}
          onChange={handleSearchInput}
          className="ps-9"
        />
      </div>

      <Select value={entityTypeFilter} onValueChange={onEntityTypeChange}>
        <SelectTrigger className="w-full sm:w-40">
          <SelectValue placeholder={t('filterEntityType')} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="__all__">{tCommon('all')}</SelectItem>
          {Object.values(UebaEntityType).map(type => (
            <SelectItem key={type} value={type}>
              {t(lookup(UEBA_ENTITY_TYPE_LABEL_KEYS, type))}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select value={riskLevelFilter} onValueChange={onRiskLevelChange}>
        <SelectTrigger className="w-full sm:w-36">
          <SelectValue placeholder={t('filterRiskLevel')} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="__all__">{tCommon('all')}</SelectItem>
          {Object.values(UebaRiskLevel).map(level => (
            <SelectItem key={level} value={level}>
              {t(lookup(UEBA_RISK_LEVEL_LABEL_KEYS, level))}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}
