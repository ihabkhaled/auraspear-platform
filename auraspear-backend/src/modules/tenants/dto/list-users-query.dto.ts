import { z } from 'zod'
import { SortOrder } from '../../../common/enums'
import {
  MembershipStatus,
  UserRole,
} from '../../../common/interfaces/authenticated-request.interface'

export const ListUsersQuerySchema = z.object({
  page: z.coerce.number().int().min(1).max(10000).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().max(255).optional(),
  sortBy: z.enum(['name', 'email', 'role', 'lastLoginAt', 'status', 'createdAt']).default('name'),
  sortOrder: z.nativeEnum(SortOrder).default(SortOrder.ASC),
  role: z.nativeEnum(UserRole).optional(),
  status: z
    .enum([MembershipStatus.ACTIVE, MembershipStatus.INACTIVE, MembershipStatus.SUSPENDED])
    .optional(),
})

export type ListUsersQueryDto = z.infer<typeof ListUsersQuerySchema>
