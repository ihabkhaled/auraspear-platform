import { z } from 'zod'

export const ListRunbooksQuerySchema = z.object({
  page: z.coerce.number().int().min(1).max(10000).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  q: z.string().max(500).optional(),
  category: z.string().max(100).optional(),
  sortBy: z.enum(['createdAt', 'title', 'category', 'updatedAt']).default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
})

export type ListRunbooksQueryDto = z.infer<typeof ListRunbooksQuerySchema>
