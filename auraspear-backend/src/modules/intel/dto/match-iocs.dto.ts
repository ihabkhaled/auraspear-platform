import { z } from 'zod'

export const MatchIocsSchema = z.object({
  alertIds: z
    .array(z.string().min(1).max(255))
    .min(1, 'At least one alert ID is required')
    .max(500),
})

export type MatchIocsDto = z.infer<typeof MatchIocsSchema>
