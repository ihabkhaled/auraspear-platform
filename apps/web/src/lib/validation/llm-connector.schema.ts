import { z } from 'zod'

const URL_PATTERN = /^(https?|wss?):\/\/.+/

export function createLlmConnectorSchema(t: (key: string) => string) {
  return z.object({
    name: z.string().trim().min(2, t('nameRequired')).max(255),
    description: z.string().trim().max(500).default(''),
    baseUrl: z
      .string()
      .trim()
      .max(500)
      .refine(v => URL_PATTERN.test(v), t('baseUrlInvalid')),
    apiKey: z.string().trim().min(1, t('apiKeyRequired')).max(500),
    defaultModel: z.string().trim().max(255).default(''),
    organizationId: z.string().trim().max(255).default(''),
    maxTokensParam: z.string().trim().max(50).default('max_tokens'),
    timeout: z.coerce.number().int().min(1000).max(300000).default(30000),
  })
}

export function updateLlmConnectorSchema(t: (key: string) => string) {
  return z.object({
    name: z.string().trim().min(2, t('nameRequired')).max(255),
    description: z.string().trim().max(500).default(''),
    baseUrl: z
      .string()
      .trim()
      .max(500)
      .refine(v => URL_PATTERN.test(v), t('baseUrlInvalid')),
    apiKey: z.string().trim().max(500).default(''),
    defaultModel: z.string().trim().max(255).default(''),
    organizationId: z.string().trim().max(255).default(''),
    maxTokensParam: z.string().trim().max(50).default('max_tokens'),
    timeout: z.coerce.number().int().min(1000).max(300000).default(30000),
  })
}
