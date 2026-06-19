import { z } from 'zod'
import { ComplianceControlStatusEnum } from './create-control.dto'

export const UpdateControlSchema = z.object({
  controlNumber: z.string().min(1).max(50).optional(),
  title: z.string().min(1).max(500).optional(),
  description: z.string().max(4096).optional(),
  status: ComplianceControlStatusEnum.optional(),
  evidence: z.string().max(10000).optional(),
})

export type UpdateControlDto = z.infer<typeof UpdateControlSchema>
