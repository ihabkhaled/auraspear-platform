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
import { ReportFormat, ReportStatus, ReportType } from '@/enums'
import { useReportFilters } from '@/hooks'
import {
  REPORT_FORMAT_LABEL_KEYS,
  REPORT_STATUS_LABEL_KEYS,
  REPORT_TYPE_LABEL_KEYS,
} from '@/lib/constants/reports'
import { lookup } from '@/lib/utils'
import type { ReportFiltersProps } from '@/types'

export function ReportFilters({
  searchQuery,
  typeFilter,
  formatFilter,
  statusFilter,
  onSearchChange,
  onTypeChange,
  onFormatChange,
  onStatusChange,
}: ReportFiltersProps) {
  const { t, tCommon } = useReportFilters()

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

      <Select value={typeFilter} onValueChange={onTypeChange}>
        <SelectTrigger className="w-full sm:w-36">
          <SelectValue placeholder={t('typeLabel')} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="__all__">{tCommon('all')}</SelectItem>
          {Object.values(ReportType).map(reportType => (
            <SelectItem key={reportType} value={reportType}>
              {t(lookup(REPORT_TYPE_LABEL_KEYS, reportType))}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select value={formatFilter} onValueChange={onFormatChange}>
        <SelectTrigger className="w-full sm:w-36">
          <SelectValue placeholder={t('formatLabel')} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="__all__">{tCommon('all')}</SelectItem>
          {Object.values(ReportFormat).map(fmt => (
            <SelectItem key={fmt} value={fmt}>
              {t(lookup(REPORT_FORMAT_LABEL_KEYS, fmt))}
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
          {Object.values(ReportStatus).map(status => (
            <SelectItem key={status} value={status}>
              {t(lookup(REPORT_STATUS_LABEL_KEYS, status))}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}
