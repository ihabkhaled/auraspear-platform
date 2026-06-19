'use client'

import { useTranslations } from 'next-intl'
import { Permission } from '@/enums'
import { hasPermission } from '@/lib/permissions'
import { useAuthStore } from '@/stores'

export function useAiChatPage() {
  const t = useTranslations('aiChat')
  const permissions = useAuthStore(s => s.permissions)

  const canAccess = hasPermission(permissions, Permission.AI_CHAT_ACCESS)

  return {
    t,
    canAccess,
  }
}
