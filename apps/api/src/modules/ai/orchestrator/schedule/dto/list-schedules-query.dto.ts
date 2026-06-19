import { z } from 'zod'

export const ListSchedulesQuerySchema = z.object({
  module: z.string().trim().max(50).optional(),
  isEnabled: z
    .enum(['true', 'false'])
    .transform(v => v === 'true')
    .optional(),
})

export type ListSchedulesQueryDto = z.infer<typeof ListSchedulesQuerySchema>
