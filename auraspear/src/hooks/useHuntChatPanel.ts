'use client'

import { useEffect, useRef } from 'react'
import { useTranslations } from 'next-intl'
import type { HuntMessage } from '@/types'

export function useHuntChatPanel(messages: HuntMessage[]) {
  const t = useTranslations('hunt')
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  return {
    t,
    bottomRef,
  }
}
