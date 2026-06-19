import { z } from 'zod'

export const AiHuntSchema = z.object({
  query: z.string().min(1, 'Hunt query is required').max(2000),
  context: z.string().max(4096).optional(),
})

export type AiHuntDto = z.infer<typeof AiHuntSchema>
