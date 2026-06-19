import { z } from 'zod'
import { AgentActionType } from '../../../../common/enums'

export const DispatchTaskSchema = z.object({
  actionType: z.nativeEnum(AgentActionType),
  payload: z.record(z.string(), z.unknown()).default({}),
  targetId: z.string().trim().max(255).optional(),
  targetType: z.string().trim().max(100).optional(),
})

export type DispatchTaskDto = z.infer<typeof DispatchTaskSchema>
