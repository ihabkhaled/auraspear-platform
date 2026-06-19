import { z } from 'zod'
import { RuleSeverity, RuleSource, RuleStatus } from '@/enums'

export const createCorrelationSchema = z.object({
  title: z.string().min(3),
  description: z.string().min(5),
  source: z.nativeEnum(RuleSource),
  severity: z.nativeEnum(RuleSeverity),
  status: z.nativeEnum(RuleStatus),
  mitreTechniques: z.string(),
  yamlContent: z.string(),
  conditions: z.string(),
})

export const editCorrelationSchema = z.object({
  title: z.string().min(3),
  description: z.string().min(5),
  source: z.nativeEnum(RuleSource),
  severity: z.nativeEnum(RuleSeverity),
  status: z.nativeEnum(RuleStatus),
  mitreTechniques: z.string(),
  yamlContent: z.string(),
  conditions: z.string(),
})
