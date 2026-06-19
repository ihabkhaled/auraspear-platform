import { z } from 'zod'

export const AssignCaseSchema = z.object({
  ownerUserId: z.string().uuid().nullable(),
})

export type AssignCaseDto = z.infer<typeof AssignCaseSchema>
