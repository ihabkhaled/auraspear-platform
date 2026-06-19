import { z } from 'zod'

export const UpdateEntitySchema = z.object({
  displayName: z.string().max(500).optional(),
  metadata: z.record(z.unknown()).optional(),
})

export type UpdateEntityDto = z.infer<typeof UpdateEntitySchema>
