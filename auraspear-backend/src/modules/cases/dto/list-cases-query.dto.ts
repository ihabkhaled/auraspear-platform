import { z } from 'zod'
import { SortOrder } from '../../../common/enums'

export const ListCasesQuerySchema = z.object({
  page: z.coerce.number().int().min(1).max(10000).default(1),
  limit: z.coerce.number().int().min(1).max(500).default(20),
  sortBy: z
    .enum(['createdAt', 'updatedAt', 'severity', 'status', 'caseNumber', 'title'])
    .default('createdAt'),
  sortOrder: z.nativeEnum(SortOrder).default(SortOrder.DESC),
  status: z.enum(['open', 'in_progress', 'closed']).optional(),
  severity: z.enum(['critical', 'high', 'medium', 'low']).optional(),
  query: z.string().max(500).optional(),
  cycleId: z.union([z.string().uuid(), z.literal('none')]).optional(),
  ownerUserId: z.string().uuid().optional(),
})

export type ListCasesQueryDto = z.infer<typeof ListCasesQuerySchema>
