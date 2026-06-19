import { z } from 'zod'
import { AiAgentTierEnum } from './create-agent.dto'

export const AiAgentStatusEnum = z.enum(['online', 'offline', 'degraded', 'maintenance'])

export const UpdateAgentSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  description: z.string().max(4096).nullable().optional(),
  model: z.string().min(1).max(100).optional(),
  tier: AiAgentTierEnum.optional(),
  status: AiAgentStatusEnum.optional(),
  soulMd: z.string().max(65536).nullable().optional(),
})

export type UpdateAgentDto = z.infer<typeof UpdateAgentSchema>
