import { z } from 'zod'

export const CloseCaseCycleSchema = z.object({
  endDate: z.coerce.date().optional(),
})

export type CloseCaseCycleDto = z.infer<typeof CloseCaseCycleSchema>
