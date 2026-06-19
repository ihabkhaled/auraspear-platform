import { z } from 'zod'

export const UpdateCaseCycleSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  description: z.string().max(4096).optional(),
  startDate: z.coerce.date().optional(),
  endDate: z.coerce.date().optional(),
})

export type UpdateCaseCycleDto = z.infer<typeof UpdateCaseCycleSchema>
