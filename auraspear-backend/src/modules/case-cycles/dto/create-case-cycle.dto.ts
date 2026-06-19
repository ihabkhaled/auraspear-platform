import { z } from 'zod'

export const CreateCaseCycleSchema = z.object({
  name: z.string().min(1).max(255),
  description: z.string().max(4096).optional(),
  startDate: z.coerce.date(),
  endDate: z.coerce.date().optional(),
})

export type CreateCaseCycleDto = z.infer<typeof CreateCaseCycleSchema>
