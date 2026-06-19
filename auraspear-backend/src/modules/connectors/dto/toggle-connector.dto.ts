import { z } from 'zod'

export const ToggleConnectorSchema = z.object({
  enabled: z.boolean(),
})

export type ToggleConnectorDto = z.infer<typeof ToggleConnectorSchema>
