import { useCallback } from 'react'
import { useTranslations } from 'next-intl'
import type { UseUebaFiltersInput } from '@/types'

export function useUebaFilters({
  onSearchChange,
  onEntityTypeChange,
  onRiskLevelChange,
}: UseUebaFiltersInput) {
  const t = useTranslations('ueba')
  const tCommon = useTranslations('common')

  const handleSearchInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      onSearchChange(e.currentTarget.value)
    },
    [onSearchChange]
  )

  return {
    t,
    tCommon,
    handleSearchInput,
    handleEntityTypeChange: onEntityTypeChange,
    handleRiskLevelChange: onRiskLevelChange,
  }
}
