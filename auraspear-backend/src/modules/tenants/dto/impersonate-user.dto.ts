import { z } from 'zod'

export const ImpersonateUserSchema = z.object({
  reason: z.string().min(1).max(500).optional(),
})

export type ImpersonateUserDto = z.infer<typeof ImpersonateUserSchema>
