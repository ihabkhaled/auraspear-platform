import { z } from 'zod'

export const LinkAlertSchema = z.object({
  alertId: z.string().min(1, 'Alert ID is required').max(255),
  indexName: z.string().min(1, 'Index name is required').max(255),
})

export type LinkAlertDto = z.infer<typeof LinkAlertSchema>
