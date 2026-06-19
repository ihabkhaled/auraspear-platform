import { useTranslations } from 'next-intl'
import type { CorrelationFiltersProps } from '@/types'

export function useCorrelationFilters({
  searchQuery,
  onSearchChange,
  activeTab,
  onTabChange,
  severityFilter,
  onSeverityChange,
  statusFilter,
  onStatusChange,
}: CorrelationFiltersProps) {
  const t = useTranslations('correlation')

  return {
    t,
    searchQuery,
    onSearchChange,
    activeTab,
    onTabChange,
    severityFilter,
    onSeverityChange,
    statusFilter,
    onStatusChange,
  }
}
