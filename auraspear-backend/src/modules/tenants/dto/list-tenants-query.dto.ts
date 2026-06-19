import { z } from 'zod'
import { SortOrder } from '../../../common/enums'

export const ListTenantsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).max(10000).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().max(255).optional(),
  sortBy: z
    .enum(['name', 'slug', 'userCount', 'alertCount', 'caseCount', 'createdAt'])
    .default('name'),
  sortOrder: z.nativeEnum(SortOrder).default(SortOrder.ASC),
})

export type ListTenantsQueryDto = z.infer<typeof ListTenantsQuerySchema>
