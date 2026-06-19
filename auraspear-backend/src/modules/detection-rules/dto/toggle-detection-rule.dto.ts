import { z } from 'zod'

export const ToggleDetectionRuleSchema = z.object({
  enabled: z.boolean(),
})

export type ToggleDetectionRuleDto = z.infer<typeof ToggleDetectionRuleSchema>
