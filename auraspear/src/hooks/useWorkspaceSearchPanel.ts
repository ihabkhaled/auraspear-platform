import { useState, useCallback } from 'react'
import { useTranslations } from 'next-intl'
import type { UseWorkspaceSearchPanelParams } from '@/types'

export function useWorkspaceSearchPanel({ onSearch }: UseWorkspaceSearchPanelParams) {
  const t = useTranslations('connectors.workspace')
  const [query, setQuery] = useState('')

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault()
      if (!query.trim()) return
      onSearch({ query: query.trim(), page: 1, pageSize: 20 })
    },
    [query, onSearch]
  )

  return { t, query, setQuery, handleSubmit }
}
