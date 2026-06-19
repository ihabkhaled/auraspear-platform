import { z } from 'zod'
import { AiFeatureKey } from '../../../../common/enums'

export const CreatePromptSchema = z.object({
  taskType: z.nativeEnum(AiFeatureKey),
  name: z.string().trim().min(2).max(255),
  content: z.string().trim().min(10).max(50000),
})

export type CreatePromptDto = z.infer<typeof CreatePromptSchema>
