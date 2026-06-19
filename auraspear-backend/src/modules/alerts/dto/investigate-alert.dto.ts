import { z } from 'zod'

export const InvestigateAlertSchema = z.object({
  notes: z.string().max(4096).optional(),
})

export type InvestigateAlertDto = z.infer<typeof InvestigateAlertSchema>
