import { z } from 'zod'

export const OsintQuerySchema = z.object({
  sourceId: z.string().uuid().max(36),
  iocType: z.string().min(1).max(50),
  iocValue: z.string().min(1).max(1000),
})

export type OsintQueryDto = z.infer<typeof OsintQuerySchema>

export const OsintEnrichSchema = z.object({
  iocType: z.string().min(1).max(50),
  iocValue: z.string().min(1).max(1000),
  sourceIds: z.array(z.string().uuid().max(36)).min(1).max(10),
})

export type OsintEnrichDto = z.infer<typeof OsintEnrichSchema>
