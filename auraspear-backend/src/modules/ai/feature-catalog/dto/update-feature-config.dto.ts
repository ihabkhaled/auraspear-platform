import { z } from 'zod'
import { AiApprovalLevel } from '../../../../common/enums'

export const UpdateFeatureConfigSchema = z.object({
  enabled: z.boolean().optional(),
  preferredProvider: z.string().trim().max(100).nullish(),
  maxTokens: z.number().int().min(100).max(32000).optional(),
  approvalLevel: z.nativeEnum(AiApprovalLevel).optional(),
  monthlyTokenBudget: z.number().int().min(0).nullish(),
})

export type UpdateFeatureConfigDto = z.infer<typeof UpdateFeatureConfigSchema>
