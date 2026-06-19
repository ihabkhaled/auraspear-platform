import { z } from 'zod'

export const UpdateRunbookSchema = z.object({
  title: z.string().min(2).max(500).optional(),
  content: z.string().min(10).max(100000).optional(),
  category: z.string().max(100).optional(),
  tags: z.array(z.string().max(100)).max(20).optional(),
})

export type UpdateRunbookDto = z.infer<typeof UpdateRunbookSchema>
