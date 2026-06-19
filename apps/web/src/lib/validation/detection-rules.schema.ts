import { z } from 'zod'
import { DetectionRuleSeverity, DetectionRuleStatus, DetectionRuleType } from '@/enums'

const jsonStringValidator = z
  .string()
  .min(2)
  .refine(
    val => {
      try {
        JSON.parse(val)
        return true
      } catch {
        return false
      }
    },
    { message: 'Must be valid JSON' }
  )

export const createDetectionRuleSchema = z.object({
  name: z.string().min(3).max(500),
  ruleType: z.nativeEnum(DetectionRuleType),
  severity: z.nativeEnum(DetectionRuleSeverity),
  conditions: jsonStringValidator,
  actions: jsonStringValidator,
})

export const editDetectionRuleSchema = z.object({
  name: z.string().min(3).max(500),
  ruleType: z.nativeEnum(DetectionRuleType),
  severity: z.nativeEnum(DetectionRuleSeverity),
  status: z.nativeEnum(DetectionRuleStatus),
  conditions: jsonStringValidator,
  actions: jsonStringValidator,
})
