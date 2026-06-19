'use client'

import { ChevronDown, ChevronUp, MessageSquare } from 'lucide-react'
import { LoadingSpinner } from '@/components/common'
import {
  Badge,
  Button,
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui'
import { useCaseCommentsPanel } from '@/hooks'
import type { CaseCommentsProps } from '@/types'
import { CommentComposer } from './CommentComposer'
import { CommentItem } from './CommentItem'

export function CaseComments({
  caseId,
  currentUserId,
  isAdmin,
  isCaseClosed,
  canAddComment = true,
}: CaseCommentsProps) {
  const {
    t,
    expanded,
    setExpanded,
    allComments,
    totalCount,
    isLoading,
    isError,
    hasNextPage,
    isFetchingNextPage,
    fetchNextPage,
    scrollContainerRef,
    loadMoreRef,
    composerKey,
    isCreating,
    handleSubmitComment,
    handleDeleteComment,
  } = useCaseCommentsPanel({ caseId })

  return (
    <Collapsible open={expanded} onOpenChange={setExpanded}>
      <div className="flex flex-col gap-4">
        <CollapsibleTrigger asChild>
          <button
            type="button"
            className="hover:bg-muted/50 flex w-full cursor-pointer items-center gap-2 rounded-md py-1 transition-colors"
          >
            <MessageSquare className="h-4 w-4" />
            <h3 className="text-base font-semibold">{t('title')}</h3>
            {totalCount > 0 && <Badge variant="secondary">{totalCount}</Badge>}
            <span className="ms-auto">
              {expanded ? (
                <ChevronUp className="text-muted-foreground h-4 w-4" />
              ) : (
                <ChevronDown className="text-muted-foreground h-4 w-4" />
              )}
            </span>
          </button>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <div className="flex flex-col gap-4">
            {/* Comment composer — hidden when case is closed or user lacks permission */}
            {!isCaseClosed && canAddComment && (
              <CommentComposer
                key={composerKey}
                caseId={caseId}
                currentUserId={currentUserId}
                onSubmit={handleSubmitComment}
                loading={isCreating}
              />
            )}

            {/* Loading state */}
            {isLoading && (
              <div className="flex justify-center py-6">
                <LoadingSpinner />
              </div>
            )}

            {/* Error state */}
            {isError && (
              <p className="text-destructive py-4 text-center text-sm">{t('loadError')}</p>
            )}

            {/* Empty state */}
            {!isLoading && !isError && allComments.length === 0 && (
              <p className="text-muted-foreground py-6 text-center text-sm">{t('noComments')}</p>
            )}

            {/* Scrollable comments list */}
            {allComments.length > 0 && (
              <div
                ref={scrollContainerRef}
                className="divide-border max-h-[400px] divide-y overflow-y-auto"
              >
                {allComments.map(comment => (
                  <CommentItem
                    key={comment.id}
                    comment={comment}
                    currentUserId={currentUserId}
                    isAdmin={isAdmin}
                    onDelete={handleDeleteComment}
                  />
                ))}

                {/* Load more trigger for infinite scroll */}
                <div ref={loadMoreRef} className="h-1" />

                {/* Loading more indicator */}
                {isFetchingNextPage && (
                  <div className="flex justify-center py-2">
                    <LoadingSpinner />
                  </div>
                )}

                {/* End of list */}
                {!hasNextPage && (
                  <p className="text-muted-foreground py-2 text-center text-xs">
                    {t('endOfComments')}
                  </p>
                )}
              </div>
            )}

            {/* Manual load more button as fallback */}
            {hasNextPage && !isFetchingNextPage && (
              <Button
                variant="outline"
                size="sm"
                className="self-center"
                onClick={() => void fetchNextPage()}
              >
                {t('loadMore')}
              </Button>
            )}
          </div>
        </CollapsibleContent>
      </div>
    </Collapsible>
  )
}
