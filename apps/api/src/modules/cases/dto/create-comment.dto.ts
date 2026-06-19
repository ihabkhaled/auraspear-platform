import { z } from 'zod'

export const CreateCommentSchema = z.object({
  body: z.string().min(1).max(10000),
  mentionedUserIds: z.array(z.string().uuid()).max(20).default([]),
})

export type CreateCommentDto = z.infer<typeof CreateCommentSchema>
