import { z } from 'zod'

export const AddTimelineEntrySchema = z.object({
  event: z.string().min(1).max(2000),
  actorType: z.enum(['user', 'ai_agent', 'system']).optional(),
})

export type AddTimelineEntryDto = z.infer<typeof AddTimelineEntrySchema>
