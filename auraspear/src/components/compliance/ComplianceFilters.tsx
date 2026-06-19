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
import { ComplianceStandard } from '@/enums'
import { useComplianceFilters } from '@/hooks'
import { COMPLIANCE_STANDARD_LABEL_KEYS } from '@/lib/constants/compliance'
import { lookup } from '@/lib/utils'
import type { ComplianceFiltersProps } from '@/types'

export function ComplianceFilters({
  searchQuery,
  standardFilter,
  onSearchChange,
  onStandardChange,
}: ComplianceFiltersProps) {
  const { t, tCommon } = useComplianceFilters()

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

      <Select value={standardFilter} onValueChange={onStandardChange}>
        <SelectTrigger className="w-full sm:w-44">
          <SelectValue placeholder={t('standardLabel')} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="__all__">{tCommon('all')}</SelectItem>
          {Object.values(ComplianceStandard).map(standard => (
            <SelectItem key={standard} value={standard}>
              {t(lookup(COMPLIANCE_STANDARD_LABEL_KEYS, standard))}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}
