import { z } from 'zod'

export const ComplianceControlStatusEnum = z.enum([
  'passed',
  'failed',
  'not_assessed',
  'partially_met',
])

export const CreateControlSchema = z.object({
  controlNumber: z.string().min(1).max(50),
  title: z.string().min(1).max(500),
  description: z.string().max(4096).optional(),
  status: ComplianceControlStatusEnum,
  evidence: z.string().max(10000).optional(),
})

export type CreateControlDto = z.infer<typeof CreateControlSchema>
