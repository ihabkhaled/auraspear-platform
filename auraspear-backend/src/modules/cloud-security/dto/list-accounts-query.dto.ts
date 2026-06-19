import { z } from 'zod'
import { SortOrder } from '../../../common/enums'

export const ListAccountsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).max(10000).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  sortBy: z
    .enum([
      'createdAt',
      'updatedAt',
      'provider',
      'status',
      'accountId',
      'alias',
      'findingsCount',
      'complianceScore',
      'lastScanAt',
    ])
    .default('createdAt'),
  sortOrder: z.nativeEnum(SortOrder).default(SortOrder.DESC),
  provider: z.string().max(200).optional(),
  status: z.string().max(200).optional(),
})

export type ListAccountsQueryDto = z.infer<typeof ListAccountsQuerySchema>
