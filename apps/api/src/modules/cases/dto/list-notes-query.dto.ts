import { z } from 'zod'

export const ListNotesQuerySchema = z.object({
  page: z.coerce.number().int().min(1).max(10000).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(50),
})

export type ListNotesQueryDto = z.infer<typeof ListNotesQuerySchema>
