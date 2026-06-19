import { z } from 'zod'
import { SortOrder } from '../../../common/enums'

export const ListHealthChecksQuerySchema = z.object({
  page: z.coerce.number().int().min(1).max(10000).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  sortBy: z
    .enum(['checkedAt', 'serviceName', 'status', 'responseTimeMs', 'serviceType'])
    .default('checkedAt'),
  sortOrder: z.nativeEnum(SortOrder).default(SortOrder.DESC),
  serviceType: z.string().max(200).optional(),
  status: z.string().max(200).optional(),
})

export type ListHealthChecksQueryDto = z.infer<typeof ListHealthChecksQuerySchema>
