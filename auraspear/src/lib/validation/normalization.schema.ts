import { z } from 'zod'
import { NormalizationSourceType } from '@/enums'

function isValidJson(value: string): boolean {
  try {
    JSON.parse(value)
    return true
  } catch {
    return false
  }
}

export const createNormalizationSchema = z.object({
  name: z.string().min(3).max(255),
  sourceType: z.nativeEnum(NormalizationSourceType),
  parserConfig: z.string().min(2).refine(isValidJson, { message: 'Must be valid JSON' }),
  fieldMappings: z.string().min(2).refine(isValidJson, { message: 'Must be valid JSON' }),
})

export const editNormalizationSchema = z.object({
  name: z.string().min(3).max(255),
  sourceType: z.nativeEnum(NormalizationSourceType),
  parserConfig: z.string().min(2).refine(isValidJson, { message: 'Must be valid JSON' }),
  fieldMappings: z.string().min(2).refine(isValidJson, { message: 'Must be valid JSON' }),
})
