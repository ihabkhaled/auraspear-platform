import { z } from 'zod'
import { CaseSeverityEnum } from './create-case.dto'

export const CaseStatusEnum = z.enum(['open', 'in_progress', 'closed'])

export const UpdateCaseSchema = z.object({
  title: z.string().min(1).max(256).optional(),
  description: z.string().min(1).max(4096).optional(),
  severity: CaseSeverityEnum.optional(),
  status: CaseStatusEnum.optional(),
  ownerUserId: z.string().uuid().nullable().optional(),
  cycleId: z.string().uuid().nullable().optional(),
})

export type UpdateCaseDto = z.infer<typeof UpdateCaseSchema>
