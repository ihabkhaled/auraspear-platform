import { z } from 'zod'
import { SortOrder } from '../../../common/enums'

export const ListPipelinesQuerySchema = z.object({
  page: z.coerce.number().int().min(1).max(10000).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  sortBy: z
    .enum([
      'createdAt',
      'updatedAt',
      'name',
      'sourceType',
      'status',
      'processedCount',
      'errorCount',
    ])
    .default('createdAt'),
  sortOrder: z.nativeEnum(SortOrder).default(SortOrder.DESC),
  sourceType: z.string().max(200).optional(),
  status: z.string().max(200).optional(),
  query: z.string().max(500).optional(),
})

export type ListPipelinesQueryDto = z.infer<typeof ListPipelinesQuerySchema>
