import { z } from 'zod'
import { SortOrder } from '../../../common/enums'

export const ListEntitiesQuerySchema = z.object({
  page: z.coerce.number().int().min(1).max(10000).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  sortBy: z
    .enum([
      'createdAt',
      'updatedAt',
      'riskScore',
      'entityName',
      'lastSeenAt',
      'riskLevel',
      'entityType',
    ])
    .default('riskScore'),
  sortOrder: z.nativeEnum(SortOrder).default(SortOrder.DESC),
  entityType: z.string().max(200).optional(),
  riskLevel: z.string().max(200).optional(),
  query: z.string().max(500).optional(),
})

export type ListEntitiesQueryDto = z.infer<typeof ListEntitiesQuerySchema>
