import { useState, useCallback } from 'react'
import { useTranslations } from 'next-intl'
import { type QUICK_PROMPT_KEYS } from '@/lib/constants/hunt'
import type { UseHuntInputAreaParams } from '@/types'

export function useHuntInputArea({ onSend }: UseHuntInputAreaParams) {
  const t = useTranslations('hunt')
  const [value, setValue] = useState('')

  const handleSend = useCallback(() => {
    const trimmed = value.trim()
    if (trimmed.length === 0) return
    onSend?.(trimmed)
    setValue('')
  }, [value, onSend])

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault()
        handleSend()
      }
    },
    [handleSend]
  )

  const handleQuickPrompt = useCallback(
    (key: (typeof QUICK_PROMPT_KEYS)[number]) => {
      const prompt = t(`quickPrompts.${key}`)
      onSend?.(prompt)
    },
    [onSend, t]
  )

  return { t, value, setValue, handleSend, handleKeyDown, handleQuickPrompt }
}
