import { z } from 'zod'
import { SortOrder } from '../../../common/enums'

export const ListMetricsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).max(10000).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  sortBy: z.enum(['recordedAt', 'metricName', 'value']).default('recordedAt'),
  sortOrder: z.nativeEnum(SortOrder).default(SortOrder.DESC),
  metricType: z.string().max(200).optional(),
  metricName: z.string().max(200).optional(),
})

export type ListMetricsQueryDto = z.infer<typeof ListMetricsQuerySchema>
