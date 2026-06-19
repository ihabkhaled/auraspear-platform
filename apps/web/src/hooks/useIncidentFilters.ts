import { useCallback, useMemo } from 'react'
import { useTranslations } from 'next-intl'
import { ALL_FILTER } from '@/lib/constants/filters'
import type { IncidentFiltersProps } from '@/types'

export function useIncidentFilters(props: IncidentFiltersProps) {
  const t = useTranslations('incidents')
  const tCommon = useTranslations('common')

  const hasActiveFilters = useMemo(
    () =>
      props.searchQuery.length > 0 ||
      props.statusFilter !== ALL_FILTER ||
      props.severityFilter !== ALL_FILTER ||
      props.categoryFilter !== ALL_FILTER,
    [props.searchQuery, props.statusFilter, props.severityFilter, props.categoryFilter]
  )

  const handleClearAll = useCallback(() => {
    props.onClearAll()
  }, [props])

  return {
    t,
    tCommon,
    hasActiveFilters,
    handleClearAll,
  }
}
