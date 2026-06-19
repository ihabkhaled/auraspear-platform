import { z } from 'zod'

export const CaseSeverityEnum = z.enum(['critical', 'high', 'medium', 'low'])

export const CreateCaseSchema = z.object({
  title: z.string().min(1, 'Title is required').max(256),
  description: z.string().min(1, 'Description is required').max(4096),
  severity: CaseSeverityEnum,
  ownerUserId: z.string().uuid().optional(),
  linkedAlertIds: z.array(z.string().uuid()).max(500).optional(),
  cycleId: z.string().uuid().optional(),
})

export type CreateCaseDto = z.infer<typeof CreateCaseSchema>
