import { z } from 'zod'
import { SortOrder } from '../../../common/enums'

const NOTIFICATION_SORT_FIELDS = ['createdAt', 'type', 'title', 'actorName', 'isRead'] as const

export const ListNotificationsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).max(10000).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(20),
  sortBy: z.enum(NOTIFICATION_SORT_FIELDS).default('createdAt'),
  sortOrder: z.nativeEnum(SortOrder).default(SortOrder.DESC),
  query: z.string().max(500).optional(),
  type: z.string().max(50).optional(),
  isRead: z.enum(['true', 'false']).optional(),
})

export type ListNotificationsQueryDto = z.infer<typeof ListNotificationsQuerySchema>
