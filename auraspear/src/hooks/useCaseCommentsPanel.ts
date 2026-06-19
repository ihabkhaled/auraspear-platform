import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useTranslations } from 'next-intl'
import { SweetAlertDialog, SweetAlertIcon, Toast } from '@/components/common'
import { useCaseComments, useCreateCaseComment, useDeleteCaseComment } from '@/hooks'
import { getErrorKey } from '@/lib/api-error'
import type { CaseComment, CaseCommentsProps } from '@/types'

export function useCaseCommentsPanel({ caseId }: Pick<CaseCommentsProps, 'caseId'>) {
  const t = useTranslations('cases.comments')
  const tError = useTranslations('errors')
  const [expanded, setExpanded] = useState(true)
  const { data, isLoading, isError, fetchNextPage, hasNextPage, isFetchingNextPage } =
    useCaseComments(caseId)

  const createComment = useCreateCaseComment(caseId)
  const deleteComment = useDeleteCaseComment(caseId)
  const scrollContainerRef = useRef<HTMLDivElement>(null)
  const [composerKey, setComposerKey] = useState(0)

  const allComments = useMemo<CaseComment[]>(
    () => data?.pages.flatMap(page => page.data) ?? [],
    [data?.pages]
  )
  const totalCount = data?.pages[0]?.pagination?.total ?? 0

  // Scroll to a specific comment when navigating via notification deep-link
  const hasScrolledToComment = useRef(false)
  useEffect(() => {
    if (hasScrolledToComment.current || allComments.length === 0) return
    const { hash } = window.location
    if (!hash.startsWith('#comment-')) return

    const element = document.querySelector(hash)
    if (element) {
      hasScrolledToComment.current = true
      setTimeout(() => {
        element.scrollIntoView({ behavior: 'smooth', block: 'center' })
        element.classList.add('bg-primary/10')
        setTimeout(() => {
          element.classList.remove('bg-primary/10')
        }, 3000)
      }, 100)
    }
  }, [allComments])

  // Infinite scroll via IntersectionObserver inside the scroll container
  const loadMoreRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const target = loadMoreRef.current
    const root = scrollContainerRef.current
    if (!target || !root) return

    const observer = new IntersectionObserver(
      entries => {
        const entry = entries[0]
        if (entry?.isIntersecting && hasNextPage && !isFetchingNextPage) {
          void fetchNextPage()
        }
      },
      { root, threshold: 0.1 }
    )

    observer.observe(target)
    return () => {
      observer.disconnect()
    }
  }, [hasNextPage, isFetchingNextPage, fetchNextPage])

  const handleSubmitComment = useCallback(
    (body: string, mentionedUserIds: string[]) => {
      createComment.mutate(
        { body, mentionedUserIds },
        {
          onSuccess: () => {
            setComposerKey(prev => prev + 1)
            Toast.success(t('commentAdded'))
          },
          onError: (error: unknown) => {
            Toast.error(tError(getErrorKey(error)))
          },
        }
      )
    },
    [createComment, t, tError]
  )

  const handleDeleteComment = useCallback(
    async (commentId: string) => {
      const confirmed = await SweetAlertDialog.show({
        text: t('confirmDelete'),
        icon: SweetAlertIcon.QUESTION,
      })
      if (!confirmed) return

      deleteComment.mutate(commentId, {
        onSuccess: () => {
          Toast.success(t('commentDeleted'))
        },
        onError: (error: unknown) => {
          Toast.error(tError(getErrorKey(error)))
        },
      })
    },
    [deleteComment, t, tError]
  )

  return {
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
    isCreating: createComment.isPending,
    handleSubmitComment,
    handleDeleteComment,
  }
}
