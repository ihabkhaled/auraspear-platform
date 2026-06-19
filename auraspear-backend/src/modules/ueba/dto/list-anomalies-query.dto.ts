import { z } from 'zod'
import { SortOrder } from '../../../common/enums'

export const ListAnomaliesQuerySchema = z.object({
  page: z.coerce.number().int().min(1).max(10000).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  sortBy: z.enum(['detectedAt', 'score', 'severity']).default('detectedAt'),
  sortOrder: z.nativeEnum(SortOrder).default(SortOrder.DESC),
  severity: z.string().max(200).optional(),
  entityId: z.string().max(200).optional(),
  resolved: z
    .enum(['true', 'false'])
    .transform(v => v === 'true')
    .optional(),
})

export type ListAnomaliesQueryDto = z.infer<typeof ListAnomaliesQuerySchema>
