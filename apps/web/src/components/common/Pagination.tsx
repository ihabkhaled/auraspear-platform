'use client'

import { ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui'
import { usePaginationComponent } from '@/hooks'
import { cn } from '@/lib/utils'
import type { PaginationProps } from '@/types'

export function Pagination({ page, totalPages, onPageChange, total }: PaginationProps) {
  const { t } = usePaginationComponent()

  const getVisiblePages = (): number[] => {
    const pages: number[] = []
    const maxVisible = 5
    let start = Math.max(1, page - Math.floor(maxVisible / 2))
    const end = Math.min(totalPages, start + maxVisible - 1)

    if (end - start + 1 < maxVisible) {
      start = Math.max(1, end - maxVisible + 1)
    }

    for (let i = start; i <= end; i++) {
      pages.push(i)
    }

    return pages
  }

  const visiblePages = getVisiblePages()

  return (
    <div className="flex items-center justify-between gap-2 sm:gap-4">
      {total !== undefined && (
        <p className="text-muted-foreground hidden text-sm sm:block">
          {total} {t('rows')}
        </p>
      )}
      <div className="ms-auto flex items-center gap-1">
        <Button
          variant="outline"
          size="icon-sm"
          disabled={page <= 1}
          onClick={() => onPageChange(page - 1)}
          aria-label={t('previous')}
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        {/* Mobile: show page X/Y indicator */}
        <span className="text-muted-foreground px-2 text-xs sm:hidden">
          {page}/{totalPages}
        </span>
        {/* Desktop: show page buttons */}
        {visiblePages.map(p => (
          <Button
            key={p}
            variant={p === page ? 'default' : 'outline'}
            size="sm"
            className={cn('hidden min-w-8 sm:inline-flex', p === page && 'pointer-events-none')}
            onClick={() => onPageChange(p)}
          >
            {p}
          </Button>
        ))}
        <Button
          variant="outline"
          size="icon-sm"
          disabled={page >= totalPages}
          onClick={() => onPageChange(page + 1)}
          aria-label={t('next')}
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  )
}
