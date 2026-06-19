import { z } from 'zod'

export const UpdateCommentSchema = z.object({
  body: z.string().min(1).max(10000),
  mentionedUserIds: z.array(z.string().uuid()).max(20).default([]),
})

export type UpdateCommentDto = z.infer<typeof UpdateCommentSchema>
