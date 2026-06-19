import { z } from 'zod'
import {
  ReportFormat,
  ReportModule,
  ReportStatus,
  ReportType,
  SortOrder,
} from '../../../common/enums'

export const ListReportsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).max(10000).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  sortBy: z
    .enum(['createdAt', 'name', 'type', 'module', 'format', 'status', 'generatedAt'])
    .default('createdAt'),
  sortOrder: z.nativeEnum(SortOrder).default(SortOrder.DESC),
  type: z.nativeEnum(ReportType).optional(),
  module: z.nativeEnum(ReportModule).optional(),
  format: z.nativeEnum(ReportFormat).optional(),
  status: z.nativeEnum(ReportStatus).optional(),
  query: z.string().max(500).optional(),
})

export type ListReportsQueryDto = z.infer<typeof ListReportsQuerySchema>
