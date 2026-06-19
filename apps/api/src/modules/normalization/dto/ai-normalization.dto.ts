import { z } from 'zod'

export const AiVerifyPipelineSchema = z.object({
  sampleEvents: z
    .array(z.record(z.unknown()))
    .min(1, 'At least one sample event is required')
    .max(5, 'Maximum 5 sample events allowed'),
  connector: z.string().max(200).optional(),
})

export type AiVerifyPipelineDto = z.infer<typeof AiVerifyPipelineSchema>
