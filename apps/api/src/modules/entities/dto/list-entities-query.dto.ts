import { z } from 'zod'
import { EntitySortField, EntityType, SortOrder } from '../../../common/enums'

export const ListEntitiesQuerySchema = z.object({
  search: z.string().max(500).optional(),
  type: z.nativeEnum(EntityType).optional(),
  minRiskScore: z.coerce.number().min(0).max(100).optional(),
  page: z.coerce.number().int().min(1).max(10000).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  sortBy: z.nativeEnum(EntitySortField).default(EntitySortField.LAST_SEEN),
  sortOrder: z.nativeEnum(SortOrder).default(SortOrder.DESC),
})

export type ListEntitiesQueryDto = z.infer<typeof ListEntitiesQuerySchema>
