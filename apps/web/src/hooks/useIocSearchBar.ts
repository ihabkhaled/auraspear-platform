import { useState } from 'react'
import { useTranslations } from 'next-intl'
import type { UseIocSearchBarParams } from '@/types'

export function useIocSearchBar({ onSearch }: UseIocSearchBarParams) {
  const t = useTranslations('intel')
  const [query, setQuery] = useState('')
  const [type, setType] = useState('all')
  const [source, setSource] = useState('all')

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSearch(query.trim(), type === 'all' ? '' : type, source === 'all' ? '' : source)
  }

  return { t, query, setQuery, type, setType, source, setSource, handleSubmit }
}
