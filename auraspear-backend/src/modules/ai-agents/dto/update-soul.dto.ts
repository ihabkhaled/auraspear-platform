import { z } from 'zod'

export const UpdateSoulSchema = z.object({
  soulMd: z.string().max(65536),
})

export type UpdateSoulDto = z.infer<typeof UpdateSoulSchema>
