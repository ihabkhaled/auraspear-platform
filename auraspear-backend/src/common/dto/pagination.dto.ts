import { z } from 'zod'

export const PaginationSchema = z.object({
  page: z.coerce.number().int().min(1).max(10000).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
})

export type PaginationDto = z.infer<typeof PaginationSchema>
