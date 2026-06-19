import { z } from 'zod'
import { SortOrder } from '../../../common/enums'

export const ListDetectionRulesQuerySchema = z.object({
  page: z.coerce.number().int().min(1).max(10000).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  sortBy: z
    .enum([
      'createdAt',
      'updatedAt',
      'name',
      'severity',
      'status',
      'ruleNumber',
      'ruleType',
      'hitCount',
      'falsePositiveCount',
      'lastTriggeredAt',
    ])
    .default('createdAt'),
  sortOrder: z.nativeEnum(SortOrder).default(SortOrder.DESC),
  ruleType: z.string().max(200).optional(),
  severity: z.string().max(200).optional(),
  status: z.string().max(200).optional(),
  query: z.string().max(500).optional(),
})

export type ListDetectionRulesQueryDto = z.infer<typeof ListDetectionRulesQuerySchema>
