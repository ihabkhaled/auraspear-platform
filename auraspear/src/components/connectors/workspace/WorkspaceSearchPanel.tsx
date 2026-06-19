'use client'

import { Search } from 'lucide-react'
import { LoadingSpinner } from '@/components/common'
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Input,
} from '@/components/ui'
import { useWorkspaceSearchPanel } from '@/hooks'
import { SEVERITY_CLASSES } from '@/lib/constants/connectors.constants'
import { cn, formatTimestamp, lookup } from '@/lib/utils'
import type { WorkspaceRecentItem, WorkspaceSearchPanelProps } from '@/types'

export function WorkspaceSearchPanel({ onSearch, results, loading }: WorkspaceSearchPanelProps) {
  const { t, query, setQuery, handleSubmit } = useWorkspaceSearchPanel({ onSearch })

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">{t('search')}</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="flex gap-2">
            <div className="relative flex-1">
              <Search className="text-muted-foreground absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2" />
              <Input
                value={query}
                onChange={e => setQuery(e.currentTarget.value)}
                placeholder={t('searchPlaceholder')}
                className="ps-9"
              />
            </div>
            <Button type="submit" disabled={loading || !query.trim()}>
              {loading ? <LoadingSpinner /> : t('searchButton')}
            </Button>
          </form>
        </CardContent>
      </Card>

      {results && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">
              {t('searchResults')} ({results.total})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {results.results.length === 0 ? (
              <p className="text-muted-foreground py-8 text-center text-sm">
                {t('noSearchResults')}
              </p>
            ) : (
              <div className="space-y-2">
                {results.results.map((item: WorkspaceRecentItem) => (
                  <div
                    key={item.id}
                    className="border-border flex items-start gap-3 rounded-lg border p-3"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className="truncate text-sm font-medium">{item.title}</p>
                        {item.severity && (
                          <Badge
                            variant="outline"
                            className={cn('text-[10px]', lookup(SEVERITY_CLASSES, item.severity))}
                          >
                            {item.severity}
                          </Badge>
                        )}
                      </div>
                      {item.description && (
                        <p className="text-muted-foreground mt-0.5 text-xs">{item.description}</p>
                      )}
                      {item.timestamp && (
                        <p className="text-muted-foreground mt-1 text-[10px]">
                          {formatTimestamp(item.timestamp)}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
