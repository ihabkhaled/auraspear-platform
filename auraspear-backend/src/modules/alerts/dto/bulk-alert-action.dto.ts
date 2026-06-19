import { z } from 'zod'

export const BulkAcknowledgeSchema = z.object({
  ids: z.array(z.string().uuid()).min(1).max(100),
})
export type BulkAcknowledgeDto = z.infer<typeof BulkAcknowledgeSchema>

export const BulkCloseSchema = z.object({
  ids: z.array(z.string().uuid()).min(1).max(100),
  resolution: z.string().min(1).max(1000),
})
export type BulkCloseDto = z.infer<typeof BulkCloseSchema>
