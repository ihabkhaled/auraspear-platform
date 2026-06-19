import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Permission } from '@/enums'
import { NOTIFICATIONS_PAGE_SIZE } from '@/lib/constants/notifications'
import { requirePermission } from '@/lib/permissions'
import { notificationService } from '@/services'
import { useAuthStore, useTenantStore } from '@/stores'
import type { NotificationSearchParams } from '@/types'

export function useNotifications() {
  const tenantId = useTenantStore(s => s.currentTenantId)

  return useInfiniteQuery({
    queryKey: ['notifications', tenantId],
    queryFn: ({ pageParam }) =>
      notificationService.getNotifications({ page: pageParam, limit: NOTIFICATIONS_PAGE_SIZE }),
    initialPageParam: 1,
    getNextPageParam: lastPage => {
      if (lastPage.pagination?.hasNext) {
        return (lastPage.pagination.page ?? 1) + 1
      }
      return
    },
  })
}

export function useNotificationsList(params?: NotificationSearchParams) {
  const tenantId = useTenantStore(s => s.currentTenantId)

  return useQuery({
    queryKey: ['notifications', 'list', tenantId, params],
    queryFn: () => notificationService.getNotifications(params),
    placeholderData: prev => prev,
  })
}

export function useUnreadNotificationCount() {
  const tenantId = useTenantStore(s => s.currentTenantId)

  return useQuery({
    queryKey: ['notifications', tenantId, 'unread-count'],
    queryFn: () => notificationService.getUnreadCount(),
    refetchInterval: 30_000,
    staleTime: 15_000,
  })
}

export function useMarkNotificationRead() {
  const tenantId = useTenantStore(s => s.currentTenantId)
  const permissions = useAuthStore(s => s.permissions)
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => {
      requirePermission(permissions, Permission.NOTIFICATIONS_MANAGE)
      return notificationService.markAsRead(id)
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['notifications', tenantId] })
    },
  })
}

export function useMarkAllNotificationsRead() {
  const tenantId = useTenantStore(s => s.currentTenantId)
  const permissions = useAuthStore(s => s.permissions)
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: () => {
      requirePermission(permissions, Permission.NOTIFICATIONS_MANAGE)
      return notificationService.markAllAsRead()
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['notifications', tenantId] })
    },
  })
}
