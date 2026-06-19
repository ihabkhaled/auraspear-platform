import { z } from 'zod'

export const ListCommentsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).max(10000).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
})

export type ListCommentsQueryDto = z.infer<typeof ListCommentsQuerySchema>
