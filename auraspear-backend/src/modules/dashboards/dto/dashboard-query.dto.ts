import { z } from 'zod'

export const AlertTrendQuerySchema = z.object({
  days: z.coerce.number().int().min(1).max(365).default(7),
})

export type AlertTrendQueryDto = z.infer<typeof AlertTrendQuerySchema>

export const RecentActivityQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(50).default(10),
})

export type RecentActivityQueryDto = z.infer<typeof RecentActivityQuerySchema>
