import { z } from 'zod'

export const CreateRunbookSchema = z.object({
  title: z.string().min(2, 'Title must be at least 2 characters').max(500),
  content: z.string().min(10, 'Content must be at least 10 characters').max(100000),
  category: z.string().max(100).optional(),
  tags: z.array(z.string().max(100)).max(20).optional(),
})

export type CreateRunbookDto = z.infer<typeof CreateRunbookSchema>
