'use client'

import { useCallback, useState } from 'react'
import type { UseAiKnowledgePanelInput } from '@/types'

export function useAiKnowledgePanel({ aiGenerate, aiSearch }: UseAiKnowledgePanelInput) {
  const [generateInput, setGenerateInput] = useState('')
  const [searchInput, setSearchInput] = useState('')

  const handleGenerate = useCallback(() => {
    if (generateInput.length >= 10) {
      aiGenerate.mutate(generateInput)
    }
  }, [generateInput, aiGenerate])

  const handleSearch = useCallback(() => {
    if (searchInput.length >= 2) {
      aiSearch.mutate(searchInput)
    }
  }, [searchInput, aiSearch])

  return {
    generateInput,
    setGenerateInput,
    searchInput,
    setSearchInput,
    handleGenerate,
    handleSearch,
  }
}
