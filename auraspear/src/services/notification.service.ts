import api from '@/lib/api'
import type {
  ApiResponse,
  NotificationItem,
  NotificationSearchParams,
  UnreadCountResponse,
} from '@/types'

export const notificationService = {
  getNotifications: (params?: NotificationSearchParams) =>
    api.get<ApiResponse<NotificationItem[]>>('/notifications', { params }).then(r => r.data),

  getUnreadCount: () =>
    api.get<{ data: UnreadCountResponse }>('/notifications/unread-count').then(r => r.data.data),

  markAsRead: (id: string) =>
    api.patch<{ data: { success: boolean } }>(`/notifications/${id}/read`).then(r => r.data.data),

  markAllAsRead: () =>
    api.patch<{ data: { success: boolean } }>('/notifications/read-all').then(r => r.data.data),
}
