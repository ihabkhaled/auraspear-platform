'use client'

import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { Permission } from '@/enums'
import { hasPermission } from '@/lib/permissions'
import { aiSearchService } from '@/services'
import { useAuthStore, useTenantStore } from '@/stores'
import type { SemanticSearchResult } from '@/types'

export function useSemanticSearch() {
  const t = useTranslations('aiSearch')
  const permissions = useAuthStore(s => s.permissions)
  const tenantId = useTenantStore(s => s.currentTenantId)

  const canView = hasPermission(permissions, Permission.AI_OPS_VIEW)

  const [query, setQuery] = useState('')
  const [debouncedQuery, setDebouncedQuery] = useState('')
  const [selectedModules, setSelectedModules] = useState<string[]>([])

  const resultsQuery = useQuery<SemanticSearchResult[]>({
    queryKey: ['ai-search', tenantId, debouncedQuery, selectedModules],
    queryFn: () =>
      aiSearchService.search(
        debouncedQuery,
        selectedModules.length > 0 ? selectedModules : undefined,
        25
      ),
    enabled: canView && debouncedQuery.length >= 2,
    staleTime: 10_000,
  })

  const results = resultsQuery.data ?? []

  const handleSearch = (value: string) => {
    setQuery(value)
    setDebouncedQuery(value)
  }

  const toggleModule = (mod: string) => {
    setSelectedModules(prev =>
      prev.includes(mod) ? prev.filter(m => m !== mod) : [...prev, mod]
    )
  }

  return {
    t,
    canView,
    query,
    setQuery: handleSearch,
    selectedModules,
    toggleModule,
    results,
    isLoading: resultsQuery.isLoading,
    isFetching: resultsQuery.isFetching,
    hasSearched: debouncedQuery.length >= 2,
  }
}
