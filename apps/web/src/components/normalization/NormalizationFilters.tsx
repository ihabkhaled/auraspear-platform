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
import { NormalizationPipelineStatus, NormalizationSourceType } from '@/enums'
import { useNormalizationFilters } from '@/hooks'
import {
  NORMALIZATION_PIPELINE_STATUS_LABEL_KEYS,
  NORMALIZATION_SOURCE_TYPE_LABEL_KEYS,
} from '@/lib/constants/normalization'
import { lookup } from '@/lib/utils'
import type { NormalizationFiltersProps } from '@/types'

export function NormalizationFilters({
  searchQuery,
  sourceTypeFilter,
  statusFilter,
  onSearchChange,
  onSourceTypeChange,
  onStatusChange,
}: NormalizationFiltersProps) {
  const { t, tCommon } = useNormalizationFilters()

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

      <Select value={sourceTypeFilter} onValueChange={onSourceTypeChange}>
        <SelectTrigger className="w-full sm:w-40">
          <SelectValue placeholder={t('filterSourceType')} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="__all__">{tCommon('all')}</SelectItem>
          {Object.values(NormalizationSourceType).map(src => (
            <SelectItem key={src} value={src}>
              {t(lookup(NORMALIZATION_SOURCE_TYPE_LABEL_KEYS, src))}
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
          {Object.values(NormalizationPipelineStatus).map(status => (
            <SelectItem key={status} value={status}>
              {t(lookup(NORMALIZATION_PIPELINE_STATUS_LABEL_KEYS, status))}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}
