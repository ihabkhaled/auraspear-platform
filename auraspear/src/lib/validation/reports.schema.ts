import { z } from 'zod'
import { ReportType, ReportFormat } from '@/enums'

function isValidJsonObjectOrEmpty(value: string): boolean {
  if (value.trim().length === 0) {
    return true
  }
  try {
    const parsed = JSON.parse(value)
    return typeof parsed === 'object' && parsed !== null && !Array.isArray(parsed)
  } catch {
    return false
  }
}

export const createReportSchema = z.object({
  name: z.string().min(3).max(500),
  description: z.string().min(5).max(4096),
  type: z.nativeEnum(ReportType),
  format: z.nativeEnum(ReportFormat),
  parameters: z
    .string()
    .max(50000)
    .refine(isValidJsonObjectOrEmpty, { message: 'validationParametersJson' }),
})

export const editReportSchema = z.object({
  name: z.string().min(3).max(500),
  description: z.string().min(5).max(4096),
  type: z.nativeEnum(ReportType),
  format: z.nativeEnum(ReportFormat),
  parameters: z
    .string()
    .max(50000)
    .refine(isValidJsonObjectOrEmpty, { message: 'validationParametersJson' }),
})
