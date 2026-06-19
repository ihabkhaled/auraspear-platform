'use client'

import { Search } from 'lucide-react'
import { Button, Card, Input } from '@/components/ui'
import { useKqlSearchBar } from '@/hooks'
import type { KQLSearchBarProps } from '@/types'

export function KqlSearchBar({ value, onChange, onSubmit, onSavedSearches }: KQLSearchBarProps) {
  const { t } = useKqlSearchBar()

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      onSubmit()
    }
  }

  return (
    <Card className="p-3">
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="text-muted-foreground absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2" />
          <Input
            value={value}
            onChange={e => onChange(e.currentTarget.value)}
            onKeyDown={handleKeyDown}
            placeholder={t('searchPlaceholder')}
            className="ps-9 font-mono text-sm"
          />
        </div>
        {onSavedSearches && (
          <Button variant="ghost" size="sm" onClick={onSavedSearches}>
            {t('savedSearches')}
          </Button>
        )}
        <Button onClick={onSubmit} size="sm" className="shrink-0">
          <Search className="h-4 w-4 sm:hidden" />
          <span className="hidden sm:inline">{t('submit')}</span>
        </Button>
      </div>
    </Card>
  )
}
