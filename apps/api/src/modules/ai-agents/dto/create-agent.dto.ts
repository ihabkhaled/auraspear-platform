import { z } from 'zod'

export const AiAgentTierEnum = z.enum(['L0', 'L1', 'L2', 'L3'])

export const CreateAgentSchema = z.object({
  name: z.string().min(1).max(255),
  description: z.string().max(4096).optional(),
  model: z.string().min(1).max(100),
  tier: AiAgentTierEnum.default('L1'),
  soulMd: z.string().max(65536).optional(),
})

export type CreateAgentDto = z.infer<typeof CreateAgentSchema>
