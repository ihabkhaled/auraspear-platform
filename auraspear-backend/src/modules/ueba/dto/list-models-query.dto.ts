import { z } from 'zod'
import { SortOrder } from '../../../common/enums'

export const ListModelsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).max(10000).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  sortBy: z
    .enum(['createdAt', 'updatedAt', 'accuracy', 'name', 'lastTrained'])
    .default('updatedAt'),
  sortOrder: z.nativeEnum(SortOrder).default(SortOrder.DESC),
  status: z.string().max(200).optional(),
  modelType: z.string().max(200).optional(),
})

export type ListModelsQueryDto = z.infer<typeof ListModelsQuerySchema>
