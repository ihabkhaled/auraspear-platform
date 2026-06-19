import { z } from 'zod'

export const UpdatePromptSchema = z.object({
  name: z.string().trim().min(2).max(255).optional(),
  content: z.string().trim().min(10).max(50000).optional(),
})

export type UpdatePromptDto = z.infer<typeof UpdatePromptSchema>
