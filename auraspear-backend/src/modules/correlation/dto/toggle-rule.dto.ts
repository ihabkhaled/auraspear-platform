import { z } from 'zod'

export const ToggleRuleSchema = z.object({
  enabled: z.boolean(),
})

export type ToggleRuleDto = z.infer<typeof ToggleRuleSchema>
