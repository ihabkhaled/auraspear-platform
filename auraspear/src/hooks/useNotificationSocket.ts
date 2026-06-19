'use client'

import { useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { useQueryClient } from '@tanstack/react-query'
import { useTranslations } from 'next-intl'
import { io, type Socket } from 'socket.io-client'
import { Toast } from '@/components/common'
import { Permission } from '@/enums'
import { refreshCurrentSessionPermissions } from '@/lib/auth-session'
import { BACKEND_WS_URL } from '@/lib/constants/notifications'
import { useAuthStore, useTenantStore } from '@/stores'
import type { UnreadCountResponse } from '@/types'

/**
 * Connects to the backend realtime namespace and keeps the current
 * session in sync when notification or permission changes occur.
 */
export function useNotificationSocket(): void {
  const queryClient = useQueryClient()
  const router = useRouter()
  const t = useTranslations('notifications')
  const accessToken = useAuthStore(s => s.accessToken)
  const isAuthenticated = useAuthStore(s => s.isAuthenticated)
  const permissions = useAuthStore(s => s.permissions)
  const authTenantId = useAuthStore(s => s.user?.tenantId ?? '')
  const currentTenantId = useTenantStore(s => s.currentTenantId)
  const tenantId = currentTenantId || authTenantId
  const socketRef = useRef<Socket | null>(null)
  const permissionsRef = useRef<string[]>(permissions)

  useEffect(() => {
    permissionsRef.current = permissions
  }, [permissions])

  useEffect(() => {
    if (!isAuthenticated || accessToken.length === 0 || tenantId.length === 0) {
      return
    }

    const socket = io(`${BACKEND_WS_URL}/notifications`, {
      auth: { token: accessToken, tenantId },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 3000,
    })

    socketRef.current = socket

    socket.on('notification', () => {
      // Invalidate notification list so it refetches
      void queryClient.invalidateQueries({ queryKey: ['notifications', tenantId] })

      if (permissionsRef.current.includes(Permission.NOTIFICATIONS_VIEW)) {
        Toast.info(t('newNotification'))
      }
    })

    socket.on('unread-count', (data: UnreadCountResponse) => {
      // Directly update the cached unread count for instant UI update
      queryClient.setQueryData(['notifications', tenantId, 'unread-count'], { count: data.count })
    })

    socket.on('permissions-updated', () => {
      void refreshCurrentSessionPermissions(queryClient).then(() => {
        Toast.info(t('permissionsChanged'))
        router.refresh()
      })
    })

    return () => {
      socket.disconnect()
      socketRef.current = null
    }
  }, [accessToken, isAuthenticated, queryClient, router, t, tenantId])
}
