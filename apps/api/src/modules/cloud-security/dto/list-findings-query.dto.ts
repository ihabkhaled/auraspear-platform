import { z } from 'zod'
import { SortOrder } from '../../../common/enums'

export const ListFindingsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).max(10000).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  sortBy: z.enum(['createdAt', 'detectedAt', 'severity', 'status', 'title']).default('detectedAt'),
  sortOrder: z.nativeEnum(SortOrder).default(SortOrder.DESC),
  severity: z.string().max(200).optional(),
  status: z.string().max(200).optional(),
  cloudAccountId: z.string().uuid().optional(),
})

export type ListFindingsQueryDto = z.infer<typeof ListFindingsQuerySchema>
