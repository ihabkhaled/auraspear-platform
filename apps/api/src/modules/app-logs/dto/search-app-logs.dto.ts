import { z } from 'zod'
import { SortOrder } from '../../../common/enums'

export const SearchAppLogsSchema = z.object({
  query: z.string().max(500).optional(),
  level: z.string().max(50).optional(),
  feature: z.string().max(100).optional(),
  action: z.string().max(100).optional(),
  functionName: z.string().max(255).optional(),
  actorEmail: z.string().max(320).optional(),
  actorUserId: z.string().max(100).optional(),
  tenantId: z.string().max(100).optional(),
  requestId: z.string().max(100).optional(),
  sourceType: z.string().max(50).optional(),
  outcome: z.string().max(50).optional(),
  from: z.string().datetime().optional(),
  to: z.string().datetime().optional(),
  sortBy: z.string().max(50).optional(),
  sortOrder: z.nativeEnum(SortOrder).optional(),
  page: z.coerce.number().int().min(1).max(10000).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
})

export type SearchAppLogsDto = z.infer<typeof SearchAppLogsSchema>
