'use client'

import { useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { useTheme } from 'next-themes'
import { getCookie, setCookie } from '@/lib/cookies'
import { useAuthStore } from '@/stores'
import { usePreferences } from './useSettings'

/**
 * Syncs backend user preferences (theme, language) to local state.
 * Runs on mount and whenever the authenticated user changes (login / switch).
 */
export function usePreferencesSync(): { syncing: boolean } {
  const router = useRouter()
  const { setTheme } = useTheme()
  const { user } = useAuthStore()
  const { data: preferences, isLoading } = usePreferences()
  const appliedForUser = useRef<string | null>(null)

  useEffect(() => {
    if (!preferences || !user) return

    // Only re-apply when the user changes (login / user switch)
    const userId = user.sub
    if (appliedForUser.current === userId) return
    appliedForUser.current = userId

    // Sync theme
    const backendTheme = preferences['theme'] as string | undefined
    if (backendTheme) {
      setTheme(backendTheme)
    }

    // Sync language — set cookie then refresh so next-intl picks it up
    const backendLanguage = preferences['language'] as string | undefined
    if (backendLanguage) {
      const currentLocale = getCookie('locale') ?? 'en'
      if (currentLocale !== backendLanguage) {
        setCookie('locale', backendLanguage)
        router.refresh()
      }
    }
  }, [preferences, user, setTheme, router])

  // Syncing = user is authenticated but preferences haven't loaded yet
  const syncing = Boolean(user) && isLoading
  return { syncing }
}
