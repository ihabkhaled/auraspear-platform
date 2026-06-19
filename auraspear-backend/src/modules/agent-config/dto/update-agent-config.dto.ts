import { z } from 'zod'
import { AiOutputFormat, AiTriggerMode } from '../../../common/enums'

export const UpdateAgentConfigSchema = z.object({
  isEnabled: z.boolean().optional(),
  providerMode: z.string().trim().max(100).optional(),
  model: z.string().max(255).nullable().optional(),
  temperature: z.number().min(0).max(2).optional(),
  maxTokensPerCall: z.number().int().min(256).max(32768).optional(),
  systemPrompt: z.string().max(10000).nullable().optional(),
  promptSuffix: z.string().max(5000).nullable().optional(),
  indexPatterns: z.array(z.string().max(255)).max(50).optional(),
  tokensPerHour: z.number().int().min(0).max(10_000_000).optional(),
  tokensPerDay: z.number().int().min(0).max(100_000_000).optional(),
  tokensPerMonth: z.number().int().min(0).max(1_000_000_000).optional(),
  maxConcurrentRuns: z.number().int().min(1).max(20).optional(),
  triggerMode: z.nativeEnum(AiTriggerMode).optional(),
  triggerConfig: z
    .record(z.unknown())
    .refine(value => JSON.stringify(value).length <= 65536, {
      message: 'triggerConfig exceeds 64KB limit',
    })
    .optional(),
  osintSources: z.array(z.string().max(100)).max(20).optional(),
  outputFormat: z.nativeEnum(AiOutputFormat).optional(),
  presentationSkills: z.array(z.string().max(100)).max(20).optional(),
})

export type UpdateAgentConfigDto = z.infer<typeof UpdateAgentConfigSchema>
