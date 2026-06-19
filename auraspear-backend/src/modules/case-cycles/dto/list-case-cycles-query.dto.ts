import { z } from 'zod'
import { SortOrder } from '../../../common/enums'
import { CaseCycleStatus } from '../../../common/enums/case-cycle-status.enum'

export const ListCaseCyclesQuerySchema = z.object({
  page: z.coerce.number().int().min(1).max(10000).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  sortBy: z.enum(['name', 'startDate', 'endDate', 'createdAt', 'status']).default('createdAt'),
  sortOrder: z.nativeEnum(SortOrder).default(SortOrder.DESC),
  status: z.nativeEnum(CaseCycleStatus).optional(),
})

export type ListCaseCyclesQueryDto = z.infer<typeof ListCaseCyclesQuerySchema>
