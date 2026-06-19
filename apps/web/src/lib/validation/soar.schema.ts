import { z } from 'zod'
import { SoarTriggerType } from '@/enums'

function isValidJsonArray(value: string): boolean {
  try {
    const parsed = JSON.parse(value)
    return Array.isArray(parsed) && parsed.length > 0
  } catch {
    return false
  }
}

export const createSoarPlaybookSchema = z.object({
  name: z.string().min(3).max(500),
  description: z.string().min(5).max(4096),
  triggerType: z.nativeEnum(SoarTriggerType),
  steps: z.string().min(2).max(50000).refine(isValidJsonArray, { message: 'validationStepsJson' }),
  triggerConditions: z.string().max(50000).optional(),
  cronExpression: z.string().max(200),
})

export const editSoarPlaybookSchema = z.object({
  name: z.string().min(3).max(500),
  description: z.string().min(5).max(4096),
  triggerType: z.nativeEnum(SoarTriggerType),
  steps: z.string().min(2).max(50000).refine(isValidJsonArray, { message: 'validationStepsJson' }),
  triggerConditions: z.string().max(50000).optional(),
  cronExpression: z.string().max(200),
})
