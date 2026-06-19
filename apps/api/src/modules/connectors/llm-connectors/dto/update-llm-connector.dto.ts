import { z } from 'zod'

export const UpdateLlmConnectorSchema = z.object({
  name: z.string().trim().min(2).max(255).optional(),
  description: z.string().trim().max(500).nullish(),
  baseUrl: z
    .string()
    .trim()
    .max(500)
    .refine(v => /^(https?|wss?):\/\/.+/.test(v), {
      message: 'Must be a valid URL (http, https, ws, or wss)',
    })
    .optional(),
  apiKey: z.string().trim().min(1).max(500).optional(),
  defaultModel: z.string().trim().max(255).nullish(),
  organizationId: z.string().trim().max(255).nullish(),
  maxTokensParam: z.string().trim().max(50).optional(),
  timeout: z.number().int().min(1000).max(300000).optional(),
  enabled: z.boolean().optional(),
})

export type UpdateLlmConnectorDto = z.infer<typeof UpdateLlmConnectorSchema>
