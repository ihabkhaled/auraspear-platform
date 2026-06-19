import { z } from 'zod'
import { SortOrder } from '../../../common/enums'

export const ListAttackPathsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).max(10000).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  sortBy: z
    .enum([
      'createdAt',
      'updatedAt',
      'severity',
      'status',
      'pathNumber',
      'killChainCoverage',
      'title',
      'affectedAssets',
      'detectedAt',
    ])
    .default('createdAt'),
  sortOrder: z.nativeEnum(SortOrder).default(SortOrder.DESC),
  severity: z.string().max(200).optional(),
  status: z.string().max(200).optional(),
  query: z.string().max(500).optional(),
})

export type ListAttackPathsQueryDto = z.infer<typeof ListAttackPathsQuerySchema>
