import { z } from 'zod'

export const DryRunPipelineSchema = z.object({
  events: z
    .array(z.record(z.unknown()))
    .min(1, 'At least one event is required')
    .max(100, 'Maximum 100 events allowed'),
})

export type DryRunPipelineDto = z.infer<typeof DryRunPipelineSchema>
