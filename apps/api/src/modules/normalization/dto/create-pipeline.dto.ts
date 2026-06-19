import { z } from 'zod'

export const NormalizationSourceTypeEnum = z.enum([
  'syslog',
  'json',
  'csv',
  'cef',
  'leef',
  'custom',
])

export const CreatePipelineSchema = z.object({
  name: z.string().min(1).max(255),
  description: z.string().max(2048).optional(),
  sourceType: NormalizationSourceTypeEnum,
  parserConfig: z
    .record(z.unknown())
    .refine(value => JSON.stringify(value).length <= 65536, {
      message: 'Parser config too large (max 64KB)',
    })
    .default({}),
  fieldMappings: z
    .record(z.unknown())
    .refine(value => JSON.stringify(value).length <= 65536, {
      message: 'Field mappings too large (max 64KB)',
    })
    .default({}),
})

export type CreatePipelineDto = z.infer<typeof CreatePipelineSchema>
