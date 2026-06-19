import { z } from 'zod'

export const UpdateRuleSchema = z.object({
  title: z.string().min(1).max(500).optional(),
  description: z.string().max(4096).optional(),
  source: z.enum(['sigma', 'custom', 'ai_generated']).optional(),
  severity: z.enum(['critical', 'high', 'medium', 'low', 'info']).optional(),
  status: z.enum(['active', 'review', 'disabled']).optional(),
  yamlContent: z.string().max(50000).nullable().optional(),
  conditions: z
    .record(z.unknown())
    .refine(value => JSON.stringify(value).length <= 65536, {
      message: 'Conditions too large (max 64KB)',
    })
    .nullable()
    .optional(),
  mitreTactics: z.array(z.string().max(50)).max(50).optional(),
  mitreTechniques: z.array(z.string().max(50)).max(50).optional(),
})

export type UpdateRuleDto = z.infer<typeof UpdateRuleSchema>
