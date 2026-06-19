'use client'

import { Ban } from 'lucide-react'
import {
  Button,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui'
import { JOB_STATUS_FILTER_OPTIONS, JOB_TYPE_FILTER_OPTIONS } from '@/lib/constants/jobs'
import type { JobFiltersProps } from '@/types'

export function JobFilters({
  statusFilter,
  typeFilter,
  allFilterValue,
  isMutating,
  canCancelAll,
  onStatusChange,
  onTypeChange,
  onCancelAll,
  isJobStatus,
  isJobType,
  t,
}: JobFiltersProps) {
  return (
    <div className="flex flex-col gap-3 rounded-lg border p-4 md:flex-row md:items-center">
      <Select
        value={statusFilter ?? allFilterValue}
        onValueChange={value => onStatusChange(isJobStatus(value) ? value : undefined)}
      >
        <SelectTrigger className="w-full md:w-56">
          <SelectValue placeholder={t('filters.status')} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={allFilterValue}>{t('filters.allStatuses')}</SelectItem>
          {JOB_STATUS_FILTER_OPTIONS.map(jobStatus => (
            <SelectItem key={jobStatus} value={jobStatus}>
              {t(`status.${jobStatus}`)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select
        value={typeFilter ?? allFilterValue}
        onValueChange={value => onTypeChange(isJobType(value) ? value : undefined)}
      >
        <SelectTrigger className="w-full md:w-64">
          <SelectValue placeholder={t('filters.type')} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={allFilterValue}>{t('filters.allTypes')}</SelectItem>
          {JOB_TYPE_FILTER_OPTIONS.map(jobType => (
            <SelectItem key={jobType} value={jobType}>
              {t(`types.${jobType}`)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {canCancelAll && (
        <Button
          variant="destructive"
          size="sm"
          disabled={isMutating}
          onClick={onCancelAll}
          className="ms-auto gap-1.5"
        >
          <Ban className="h-3.5 w-3.5" />
          {t('cancelAll')}
        </Button>
      )}
    </div>
  )
}
