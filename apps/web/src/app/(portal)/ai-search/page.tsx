'use client'

import { Search } from 'lucide-react'
import { SearchResultsTable } from '@/components/ai-search'
import { LoadingSpinner, PageHeader, SearchInput } from '@/components/common'
import { Badge } from '@/components/ui'
import { useSemanticSearch } from '@/hooks'

const MODULES = ['findings', 'chatThreads', 'memories', 'alerts', 'cases', 'incidents']

export default function AiSearchPage() {
  const {
    t,
    canView,
    query,
    setQuery,
    selectedModules,
    toggleModule,
    results,
    isLoading,
    isFetching,
    hasSearched,
  } = useSemanticSearch()

  if (!canView) {
    return (
      <div className="flex h-64 items-center justify-center text-muted-foreground">
        {t('noAccess')}
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <PageHeader title={t('title')} description={t('description')} />

      <div className="space-y-4">
        <SearchInput
          value={query}
          onChange={setQuery}
          placeholder={t('searchPlaceholder')}
        />

        <div className="flex flex-wrap gap-2">
          {MODULES.map(mod => (
            <button
              key={mod}
              type="button"
              onClick={() => toggleModule(mod)}
            >
              <Badge
                variant={selectedModules.includes(mod) ? 'default' : 'outline'}
              >
                {t(`modules.${mod}`)}
              </Badge>
            </button>
          ))}
        </div>
      </div>

      {isLoading && hasSearched ? (
        <div className="flex h-32 items-center justify-center">
          <LoadingSpinner />
        </div>
      ) : hasSearched ? (
        <SearchResultsTable t={t} data={results} loading={isFetching} />
      ) : (
        <div className="flex h-32 items-center justify-center text-muted-foreground">
          <Search className="me-2 h-5 w-5" />
          {t('enterQuery')}
        </div>
      )}
    </div>
  )
}
