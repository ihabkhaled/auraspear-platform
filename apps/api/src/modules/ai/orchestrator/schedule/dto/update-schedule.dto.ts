import { CronExpressionParser } from 'cron-parser'
import { z } from 'zod'

/**
 * Validates a cron expression using cron-parser for safe, reliable parsing.
 */
function isValidCron(value: string): boolean {
  try {
    CronExpressionParser.parse(value)
    return true
  } catch {
    return false
  }
}

export const UpdateScheduleSchema = z.object({
  cronExpression: z
    .string()
    .trim()
    .min(9)
    .max(100)
    .refine(isValidCron, { message: 'Invalid cron expression' })
    .optional(),
  timezone: z.string().trim().min(1).max(50).optional(),
  executionMode: z.string().trim().max(30).optional(),
  riskMode: z.string().trim().max(20).optional(),
  approvalMode: z.string().trim().max(30).optional(),
  maxConcurrency: z.number().int().min(1).max(10).optional(),
  providerPreference: z.string().trim().max(50).nullable().optional(),
  modelPreference: z.string().trim().max(100).nullable().optional(),
  scopeJson: z.record(z.string(), z.unknown()).nullable().optional(),
})

export type UpdateScheduleDto = z.infer<typeof UpdateScheduleSchema>
