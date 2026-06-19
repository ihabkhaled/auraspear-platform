import { z } from 'zod'

export const ListRulesQuerySchema = z.object({
  page: z.coerce.number().int().min(1).max(10000).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  sortBy: z
    .enum([
      'createdAt',
      'updatedAt',
      'severity',
      'hitCount',
      'ruleNumber',
      'title',
      'status',
      'source',
    ])
    .default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
  source: z.string().max(100).optional(),
  severity: z.string().max(200).optional(),
  status: z.string().max(100).optional(),
  query: z.string().max(500).optional(),
})

export type ListRulesQueryDto = z.infer<typeof ListRulesQuerySchema>
