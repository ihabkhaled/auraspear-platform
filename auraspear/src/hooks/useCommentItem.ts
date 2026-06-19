import { useCallback, useRef, useState } from 'react'
import { useTranslations } from 'next-intl'
import { CommentPartType } from '@/enums'
import { COMMENT_COLLAPSE_HEIGHT_PX } from '@/lib/constants/cases'
import type { CaseComment, CommentPart } from '@/types'

export function useCommentItem(comment: CaseComment) {
  const t = useTranslations('cases.comments')
  const [expanded, setExpanded] = useState(false)
  const [isOverflowing, setIsOverflowing] = useState(false)
  const contentRef = useRef<HTMLDivElement>(null)

  const measureOverflow = useCallback((node: HTMLDivElement | null) => {
    if (node) {
      contentRef.current = node
      setIsOverflowing(node.scrollHeight > COMMENT_COLLAPSE_HEIGHT_PX)
    }
  }, [])

  const toggleExpanded = () => {
    setExpanded(prev => !prev)
  }

  const parseMentions = useCallback((): CommentPart[] => {
    const { body, mentions } = comment

    if (mentions.length === 0) {
      return [{ type: CommentPartType.TEXT, value: body }]
    }

    const mentionNames = new Set(mentions.map(m => m.name))

    // Split on mention tokens (@Name) using a known-safe literal marker approach.
    // We locate each @Name occurrence by scanning the string linearly.
    const parts: CommentPart[] = []
    let remaining = body

    while (remaining.length > 0) {
      const atIndex = remaining.indexOf('@')
      if (atIndex === -1) {
        parts.push({ type: CommentPartType.TEXT, value: remaining })
        break
      }

      if (atIndex > 0) {
        parts.push({ type: CommentPartType.TEXT, value: remaining.slice(0, atIndex) })
        remaining = remaining.slice(atIndex)
        continue
      }

      // remaining starts with '@' — check if it matches a known mention
      const current = remaining
      const matched = [...mentionNames].find(name => current.startsWith(`@${name}`))
      if (matched) {
        parts.push({ type: CommentPartType.MENTION, value: `@${matched}` })
        remaining = remaining.slice(1 + matched.length)
      } else {
        parts.push({ type: CommentPartType.TEXT, value: '@' })
        remaining = remaining.slice(1)
      }
    }

    return parts
  }, [comment])

  return {
    t,
    expanded,
    isOverflowing,
    measureOverflow,
    toggleExpanded,
    parseMentions,
  }
}
