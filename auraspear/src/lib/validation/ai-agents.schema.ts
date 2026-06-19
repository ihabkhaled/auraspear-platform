import { z } from 'zod'
import { AiAgentTier } from '@/enums'

export const createAiAgentSchema = z.object({
  name: z.string().min(3).max(100),
  description: z.string().min(5).max(500),
  model: z.string().min(2).max(100),
  tier: z.nativeEnum(AiAgentTier),
  soulMd: z.string().max(10000),
})

export const editAiAgentSchema = z.object({
  name: z.string().min(3).max(100),
  description: z.string().min(5).max(500),
  model: z.string().min(2).max(100),
  tier: z.nativeEnum(AiAgentTier),
  soulMd: z.string().max(10000),
})

export const aiAgentToolSchema = z.object({
  name: z.string().min(2).max(100),
  description: z.string().min(5).max(500),
  schema: z.string().min(2).max(50000),
})
