'use client'

import { useState, useCallback, useMemo } from 'react'
import { useTranslations } from 'next-intl'
import { getLlmConnectorColumns } from '@/components/connectors/LlmConnectorColumns'
import type { LlmConnectorRecord } from '@/types'
import { useDebounce } from './useDebounce'
import { useLlmConnectors } from './useLlmConnectors'

export function useLlmConnectorsPageFilters() {
  const t = useTranslations('llmConnectors')
  const [searchQuery, setSearchQuery] = useState('')
  const debouncedQuery = useDebounce(searchQuery, 400)

  const { data, isFetching } = useLlmConnectors()

  const filteredData = useMemo(() => {
    const connectors = data?.data ?? []
    if (debouncedQuery.length === 0) return connectors
    const query = debouncedQuery.toLowerCase()
    return connectors.filter(
      (c: LlmConnectorRecord) =>
        c.name.toLowerCase().includes(query) ||
        c.baseUrl.toLowerCase().includes(query) ||
        (c.defaultModel?.toLowerCase().includes(query) ?? false) ||
        (c.description?.toLowerCase().includes(query) ?? false)
    )
  }, [data, debouncedQuery])

  const handleSearchChange = useCallback((value: string) => {
    setSearchQuery(value)
  }, [])

  const columns = useMemo(() => getLlmConnectorColumns({ llmConnectors: t }), [t])

  return {
    t,
    searchQuery,
    setSearchQuery: handleSearchChange,
    isFetching,
    data: filteredData,
    columns,
  }
}
