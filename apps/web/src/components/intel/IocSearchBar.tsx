'use client'

import { Search } from 'lucide-react'
import {
  Button,
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui'
import { useIocSearchBar } from '@/hooks'
import { IOC_SOURCE_OPTIONS, IOC_TYPE_OPTIONS } from '@/lib/constants/intel'
import type { IOCSearchBarProps } from '@/types'

export function IocSearchBar({ onSearch, loading = false }: IOCSearchBarProps) {
  const { t, query, setQuery, type, setType, source, setSource, handleSubmit } = useIocSearchBar({
    onSearch,
  })

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3 sm:flex-row sm:items-center">
      <div className="relative flex-1">
        <Search className="text-muted-foreground pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2" />
        <Input
          value={query}
          onChange={e => setQuery(e.currentTarget.value)}
          placeholder={t('search.placeholder')}
          className="ps-9"
        />
      </div>
      <Select value={type} onValueChange={setType}>
        <SelectTrigger className="w-[150px]">
          <SelectValue placeholder={t('search.allTypes')} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">{t('search.allTypes')}</SelectItem>
          {IOC_TYPE_OPTIONS.map(opt => (
            <SelectItem key={opt.value} value={opt.value}>
              {t(opt.labelKey)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Select value={source} onValueChange={setSource}>
        <SelectTrigger className="w-[150px]">
          <SelectValue placeholder={t('search.allSources')} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">{t('search.allSources')}</SelectItem>
          {IOC_SOURCE_OPTIONS.map(opt => (
            <SelectItem key={opt.value} value={opt.value}>
              {t(opt.labelKey)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Button type="submit" disabled={loading}>
        {loading ? t('search.searching') : t('search.filter')}
      </Button>
    </form>
  )
}
