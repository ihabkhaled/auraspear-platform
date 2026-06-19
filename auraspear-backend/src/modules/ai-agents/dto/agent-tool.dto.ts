import { z } from 'zod'

export const CreateAgentToolSchema = z.object({
  name: z.string().min(1).max(255),
  description: z.string().min(1).max(4096),
  schema: z.record(z.unknown()).default({}),
})

export type CreateAgentToolDto = z.infer<typeof CreateAgentToolSchema>

export const UpdateAgentToolSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  description: z.string().min(1).max(4096).optional(),
  schema: z.record(z.unknown()).optional(),
})

export type UpdateAgentToolDto = z.infer<typeof UpdateAgentToolSchema>
