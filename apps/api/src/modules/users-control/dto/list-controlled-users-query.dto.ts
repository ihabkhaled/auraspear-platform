import { z } from 'zod'
import { SortOrder } from '../../../common/enums'
import { UsersControlUserSortField } from '../users-control.enums'

export const ListControlledUsersQuerySchema = z.object({
  page: z.coerce.number().int().min(1).max(10000).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().max(255).optional(),
  sortBy: z.nativeEnum(UsersControlUserSortField).default(UsersControlUserSortField.NAME),
  sortOrder: z.nativeEnum(SortOrder).default(SortOrder.ASC),
})

export type ListControlledUsersQueryDto = z.infer<typeof ListControlledUsersQuerySchema>
