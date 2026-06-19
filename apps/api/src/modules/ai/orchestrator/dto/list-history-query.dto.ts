import { z } from 'zod'
import { SortOrder } from '../../../../common/enums'

export const ListHistoryQuerySchema = z.object({
  page: z.coerce.number().int().min(1).max(10000).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  status: z.string().max(50).optional(),
  sortBy: z
    .enum(['startedAt', 'completedAt', 'durationMs', 'tokensUsed', 'status'])
    .default('startedAt'),
  sortOrder: z.nativeEnum(SortOrder).default(SortOrder.DESC),
})

export type ListHistoryQueryDto = z.infer<typeof ListHistoryQuerySchema>
