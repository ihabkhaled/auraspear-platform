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
import { DetectionRuleSeverity, DetectionRuleStatus, DetectionRuleType } from '@/enums'
import { useDetectionRuleFilters } from '@/hooks'
import {
  DETECTION_RULE_SEVERITY_LABEL_KEYS,
  DETECTION_RULE_STATUS_LABEL_KEYS,
  DETECTION_RULE_TYPE_LABEL_KEYS,
} from '@/lib/constants/detection-rules'
import { lookup } from '@/lib/utils'
import type { DetectionRuleFiltersProps } from '@/types'

export function DetectionRuleFilters({
  searchQuery,
  ruleTypeFilter,
  severityFilter,
  statusFilter,
  onSearchChange,
  onRuleTypeChange,
  onSeverityChange,
  onStatusChange,
}: DetectionRuleFiltersProps) {
  const { t, tCommon } = useDetectionRuleFilters()

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

      <Select value={ruleTypeFilter} onValueChange={onRuleTypeChange}>
        <SelectTrigger className="w-full sm:w-36">
          <SelectValue placeholder={t('filterRuleType')} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="__all__">{tCommon('all')}</SelectItem>
          {Object.values(DetectionRuleType).map(rt => (
            <SelectItem key={rt} value={rt}>
              {t(lookup(DETECTION_RULE_TYPE_LABEL_KEYS, rt))}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select value={severityFilter} onValueChange={onSeverityChange}>
        <SelectTrigger className="w-full sm:w-36">
          <SelectValue placeholder={tCommon('severity')} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="__all__">{tCommon('all')}</SelectItem>
          {Object.values(DetectionRuleSeverity).map(sev => (
            <SelectItem key={sev} value={sev}>
              {t(lookup(DETECTION_RULE_SEVERITY_LABEL_KEYS, sev))}
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
          {Object.values(DetectionRuleStatus).map(status => (
            <SelectItem key={status} value={status}>
              {t(lookup(DETECTION_RULE_STATUS_LABEL_KEYS, status))}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}
