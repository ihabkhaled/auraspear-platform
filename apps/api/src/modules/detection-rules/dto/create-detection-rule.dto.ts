import { z } from 'zod'

export const DetectionRuleTypeEnum = z.enum(['threshold', 'anomaly', 'chain', 'scheduled'])

export const DetectionRuleSeverityEnum = z.enum(['critical', 'high', 'medium', 'low', 'info'])

export const CreateDetectionRuleSchema = z.object({
  name: z.string().min(1).max(500),
  description: z.string().max(4096).optional(),
  ruleType: DetectionRuleTypeEnum,
  severity: DetectionRuleSeverityEnum,
  conditions: z
    .record(z.unknown())
    .refine(value => JSON.stringify(value).length <= 65536, {
      message: 'Conditions too large (max 64KB)',
    })
    .default({}),
  actions: z
    .record(z.unknown())
    .refine(value => JSON.stringify(value).length <= 65536, {
      message: 'Actions too large (max 64KB)',
    })
    .default({}),
})

export type CreateDetectionRuleDto = z.infer<typeof CreateDetectionRuleSchema>
