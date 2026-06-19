'use client'

import { LayoutGrid, List, ArrowUp, ArrowDown } from 'lucide-react'
import {
  Badge,
  Button,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui'
import { CaseSortField, CaseViewMode, SortOrder } from '@/enums'
import { useCaseToolbar } from '@/hooks'
import { CASE_SEVERITY_FILTERS } from '@/lib/constants/cases'
import { cn } from '@/lib/utils'
import type { CaseToolbarProps } from '@/types'

export function CaseToolbar({
  viewMode,
  onViewModeChange,
  activeSeverityFilter,
  onSeverityFilterChange,
  sortField,
  onSortFieldChange,
  sortOrder,
  onSortOrderChange,
}: CaseToolbarProps) {
  const { t } = useCaseToolbar()

  const toggleSortOrder = (): void => {
    onSortOrderChange(sortOrder === SortOrder.DESC ? SortOrder.ASC : SortOrder.DESC)
  }

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex flex-wrap items-center gap-2">
        <div className="border-border flex items-center rounded-lg border">
          <Button
            variant={viewMode === CaseViewMode.BOARD ? 'default' : 'ghost'}
            size="sm"
            onClick={() => onViewModeChange(CaseViewMode.BOARD)}
            className="rounded-e-none"
          >
            <LayoutGrid className="h-4 w-4" />
            {t('viewBoard')}
          </Button>
          <Button
            variant={viewMode === CaseViewMode.LIST ? 'default' : 'ghost'}
            size="sm"
            onClick={() => onViewModeChange(CaseViewMode.LIST)}
            className="rounded-s-none"
          >
            <List className="h-4 w-4" />
            {t('viewList')}
          </Button>
        </div>

        <div className="bg-border mx-2 hidden h-6 w-px sm:block" />

        <div className="flex flex-wrap items-center gap-1.5">
          {CASE_SEVERITY_FILTERS.map(severity => (
            <button
              key={severity}
              type="button"
              onClick={() =>
                onSeverityFilterChange(activeSeverityFilter === severity ? undefined : severity)
              }
              className={cn(
                'transition-opacity',
                activeSeverityFilter !== undefined &&
                  activeSeverityFilter !== severity &&
                  'opacity-40'
              )}
            >
              <Badge variant="outline" className="cursor-pointer capitalize">
                {severity}
              </Badge>
            </button>
          ))}
        </div>
      </div>

      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          size="sm"
          onClick={toggleSortOrder}
          title={sortOrder === SortOrder.DESC ? t('sortAsc') : t('sortDesc')}
          className="px-2"
        >
          {sortOrder === SortOrder.DESC ? (
            <ArrowDown className="h-4 w-4" />
          ) : (
            <ArrowUp className="h-4 w-4" />
          )}
        </Button>
        <Select value={sortField} onValueChange={v => onSortFieldChange(v as CaseSortField)}>
          <SelectTrigger className="w-[140px]" size="sm">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={CaseSortField.CREATED}>{t('sortCreated')}</SelectItem>
            <SelectItem value={CaseSortField.UPDATED}>{t('sortUpdated')}</SelectItem>
            <SelectItem value={CaseSortField.SEVERITY}>{t('sortSeverity')}</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  )
}
