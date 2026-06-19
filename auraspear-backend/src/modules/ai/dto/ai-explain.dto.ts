import { z } from 'zod'

export const AiExplainSchema = z.object({
  prompt: z.string().min(1, 'Prompt is required').max(4096),
})

export type AiExplainDto = z.infer<typeof AiExplainSchema>
