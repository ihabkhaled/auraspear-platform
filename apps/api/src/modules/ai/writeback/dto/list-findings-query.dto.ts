import { z } from 'zod'
import { AiFindingStatus, AiFindingType, AlertSeverity, SortOrder } from '../../../../common/enums'

export const ListFindingsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).max(10000).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  sortBy: z
    .enum([
      'createdAt',
      'findingType',
      'severity',
      'confidenceScore',
      'status',
      'agentId',
      'title',
      'sourceModule',
    ])
    .default('createdAt'),
  sortOrder: z.nativeEnum(SortOrder).default(SortOrder.DESC),
  sourceModule: z.string().max(50).optional(),
  agentId: z.string().max(50).optional(),
  status: z.nativeEnum(AiFindingStatus).optional(),
  findingType: z.nativeEnum(AiFindingType).optional(),
  severity: z.nativeEnum(AlertSeverity).optional(),
  sourceEntityId: z.string().max(255).optional(),
  query: z.string().max(500).optional(),
  confidenceMin: z.coerce.number().min(0).max(1).optional(),
  confidenceMax: z.coerce.number().min(0).max(1).optional(),
  dateFrom: z.string().datetime({ offset: true }).optional(),
  dateTo: z.string().datetime({ offset: true }).optional(),
})

export type ListFindingsQueryDto = z.infer<typeof ListFindingsQuerySchema>
