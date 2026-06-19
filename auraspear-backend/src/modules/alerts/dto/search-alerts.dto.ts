import { z } from 'zod'
import { AlertSortField, AlertStatus, AlertTimeRange, SortOrder } from '../../../common/enums'

export { AlertTimeRange }

export type AlertTimeRangeValue = `${AlertTimeRange}`

export const SearchAlertsSchema = z.object({
  query: z.string().max(1000).default('*'),
  /** Comma-separated severity values: e.g. "critical,high" */
  severity: z.string().max(200).optional(),
  status: z.nativeEnum(AlertStatus).optional(),
  source: z.string().max(100).optional(),
  agentName: z.string().max(255).optional(),
  ruleGroup: z.string().max(500).optional(),
  timeRange: z.nativeEnum(AlertTimeRange).optional(),
  from: z.string().datetime().optional(),
  to: z.string().datetime().optional(),
  page: z.coerce.number().int().min(1).max(10000).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  sortBy: z.nativeEnum(AlertSortField).default(AlertSortField.TIMESTAMP),
  sortOrder: z.nativeEnum(SortOrder).default(SortOrder.DESC),
})

export type SearchAlertsDto = z.infer<typeof SearchAlertsSchema>
