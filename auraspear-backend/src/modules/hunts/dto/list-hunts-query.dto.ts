import { z } from 'zod'

export const ListHuntsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).max(10000).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
})

export type ListHuntsQueryDto = z.infer<typeof ListHuntsQuerySchema>

export const ListHuntEventsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).max(10000).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(50),
})

export type ListHuntEventsQueryDto = z.infer<typeof ListHuntEventsQuerySchema>
