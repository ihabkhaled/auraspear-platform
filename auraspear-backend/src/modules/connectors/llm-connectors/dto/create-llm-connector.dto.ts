import { z } from 'zod'

export const CreateLlmConnectorSchema = z.object({
  name: z.string().trim().min(2).max(255),
  description: z.string().trim().max(500).optional(),
  baseUrl: z
    .string()
    .trim()
    .max(500)
    .refine(v => /^(https?|wss?):\/\/.+/.test(v), {
      message: 'Must be a valid URL (http, https, ws, or wss)',
    }),
  apiKey: z.string().trim().min(1).max(500),
  defaultModel: z.string().trim().max(255).optional(),
  organizationId: z.string().trim().max(255).optional(),
  maxTokensParam: z.string().trim().max(50).default('max_tokens'),
  timeout: z.number().int().min(1000).max(300000).default(60000),
})

export type CreateLlmConnectorDto = z.infer<typeof CreateLlmConnectorSchema>
