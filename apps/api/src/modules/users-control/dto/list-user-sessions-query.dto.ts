import { z } from 'zod'
import { SortOrder, UserSessionStatus } from '../../../common/enums'
import { UsersControlSessionSortField } from '../users-control.enums'

export const ListUserSessionsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).max(10000).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  sortBy: z
    .nativeEnum(UsersControlSessionSortField)
    .default(UsersControlSessionSortField.LAST_SEEN_AT),
  sortOrder: z.nativeEnum(SortOrder).default(SortOrder.DESC),
  status: z.nativeEnum(UserSessionStatus).optional(),
})

export type ListUserSessionsQueryDto = z.infer<typeof ListUserSessionsQuerySchema>
