import { z } from 'zod'
import { ComplianceStandardEnum } from './create-framework.dto'

export const UpdateFrameworkSchema = z.object({
  name: z.string().min(1).max(500).optional(),
  description: z.string().max(4096).optional(),
  standard: ComplianceStandardEnum.optional(),
  version: z.string().min(1).max(50).optional(),
})

export type UpdateFrameworkDto = z.infer<typeof UpdateFrameworkSchema>
