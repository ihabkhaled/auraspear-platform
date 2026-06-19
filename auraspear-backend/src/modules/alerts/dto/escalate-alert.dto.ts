import { z } from 'zod'

export const EscalateAlertSchema = z.object({
  reason: z.string().min(1).max(4096),
})

export type EscalateAlertDto = z.infer<typeof EscalateAlertSchema>
