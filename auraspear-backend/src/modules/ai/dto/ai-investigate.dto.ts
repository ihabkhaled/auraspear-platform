import { z } from 'zod'

export const AiInvestigateSchema = z.object({
  alertId: z.string().min(1, 'Alert ID is required').max(255),
  alertData: z
    .record(z.string().max(100), z.unknown())
    .refine(value => Object.keys(value).length <= 50, {
      message: 'alertData must have at most 50 properties',
    })
    .optional(),
})

export type AiInvestigateDto = z.infer<typeof AiInvestigateSchema>
