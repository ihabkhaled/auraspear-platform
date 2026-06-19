import { z } from 'zod'

export const CloseAlertSchema = z.object({
  resolution: z.string().min(1, 'Resolution is required').max(4096),
})

export type CloseAlertDto = z.infer<typeof CloseAlertSchema>
