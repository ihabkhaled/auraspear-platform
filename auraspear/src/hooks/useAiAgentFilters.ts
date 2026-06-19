import { useTranslations } from 'next-intl'
import type { AiAgentFiltersProps } from '@/types'

export function useAiAgentFilters({
  searchQuery,
  onSearchChange,
  statusFilter,
  onStatusChange,
  tierFilter,
  onTierChange,
  onCreateClick,
}: AiAgentFiltersProps) {
  const t = useTranslations('aiAgents')

  const handleSearchInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    onSearchChange(e.currentTarget.value)
  }

  return {
    t,
    searchQuery,
    handleSearchInput,
    statusFilter,
    onStatusChange,
    tierFilter,
    onTierChange,
    onCreateClick,
  }
}
