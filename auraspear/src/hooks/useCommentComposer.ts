import { useCallback, useMemo, useRef, useState } from 'react'
import { useTranslations } from 'next-intl'
import { useMentionableUsers, useDebounce } from '@/hooks'
import { COMMENT_MAX_LENGTH, COMMENT_MENTIONS_MAX } from '@/lib/constants/cases'
import type { MentionableUser, UseCommentComposerProps } from '@/types'

export function useCommentComposer({
  caseId,
  currentUserId,
  onSubmit,
  loading,
}: UseCommentComposerProps) {
  const t = useTranslations('cases.comments')
  const [body, setBody] = useState('')
  const [mentionQuery, setMentionQuery] = useState('')
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [selectedMentions, setSelectedMentions] = useState<MentionableUser[]>([])
  const [cursorPosition, setCursorPosition] = useState(0)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const debouncedMentionQuery = useDebounce(mentionQuery, 300)
  const { data: rawSuggestions } = useMentionableUsers(caseId, debouncedMentionQuery)

  const mentionSuggestions = useMemo(
    () => rawSuggestions?.filter(user => user.id !== currentUserId),
    [rawSuggestions, currentUserId]
  )

  const extractMentionQuery = useCallback((text: string, cursor: number): string | null => {
    const beforeCursor = text.slice(0, cursor)
    const match = /@(\w*)$/.exec(beforeCursor)
    if (match) {
      return match[1] ?? ''
    }
    return null
  }, [])

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      const newValue = e.currentTarget.value
      if (newValue.length > COMMENT_MAX_LENGTH) return
      setBody(newValue)

      const cursor = e.currentTarget.selectionStart ?? 0
      setCursorPosition(cursor)

      const query = extractMentionQuery(newValue, cursor)
      if (query !== null && query.length >= 1) {
        setMentionQuery(query)
        setShowSuggestions(true)
      } else {
        setShowSuggestions(false)
        setMentionQuery('')
      }
    },
    [extractMentionQuery]
  )

  const handleSelectMention = useCallback(
    (user: MentionableUser) => {
      const beforeCursor = body.slice(0, cursorPosition)
      const afterCursor = body.slice(cursorPosition)

      const atIndex = beforeCursor.lastIndexOf('@')
      if (atIndex === -1) return

      const newBody = `${beforeCursor.slice(0, atIndex)}@${user.name} ${afterCursor}`
      setBody(newBody)
      setShowSuggestions(false)
      setMentionQuery('')

      if (
        !selectedMentions.some(m => m.id === user.id) &&
        selectedMentions.length < COMMENT_MENTIONS_MAX
      ) {
        setSelectedMentions(prev => [...prev, user])
      }

      // Refocus textarea
      setTimeout(() => {
        const newCursor = atIndex + user.name.length + 2
        textareaRef.current?.focus()
        textareaRef.current?.setSelectionRange(newCursor, newCursor)
      }, 0)
    },
    [body, cursorPosition, selectedMentions]
  )

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === 'Escape' && showSuggestions) {
        setShowSuggestions(false)
        e.preventDefault()
      } else if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
        e.preventDefault()
        const trimmed = body.trim()
        if (trimmed.length > 0 && !loading) {
          const mentionedUserIds = selectedMentions.map(m => m.id)
          onSubmit(trimmed, mentionedUserIds)
        }
      }
    },
    [showSuggestions, body, loading, selectedMentions, onSubmit]
  )

  const handleSubmit = useCallback(() => {
    const trimmed = body.trim()
    if (trimmed.length === 0) return

    const mentionedUserIds = selectedMentions.map(m => m.id)
    onSubmit(trimmed, mentionedUserIds)
  }, [body, selectedMentions, onSubmit])

  const isValid = body.trim().length > 0

  return {
    t,
    body,
    textareaRef,
    mentionSuggestions,
    showSuggestions,
    isValid,
    handleChange,
    handleKeyDown,
    handleSubmit,
    handleSelectMention,
  }
}
