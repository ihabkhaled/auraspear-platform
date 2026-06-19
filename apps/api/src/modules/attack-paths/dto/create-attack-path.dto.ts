import { z } from 'zod'

export const AttackPathSeverityEnum = z.enum(['critical', 'high', 'medium', 'low'])

export const CreateAttackPathSchema = z.object({
  title: z.string().min(1).max(500),
  description: z.string().max(4096).optional(),
  severity: AttackPathSeverityEnum,
  stages: z
    .array(
      z
        .record(z.string().max(500), z.unknown())
        .refine(value => JSON.stringify(value).length <= 16384, {
          message: 'Individual stage too large (max 16KB)',
        })
    )
    .max(100),
  affectedAssets: z.number().int().min(0).max(1_000_000).default(0),
  killChainCoverage: z.number().min(0).max(100).default(0),
  mitreTactics: z.array(z.string().max(50)).max(50).optional(),
  mitreTechniques: z.array(z.string().max(50)).max(50).optional(),
})

export type CreateAttackPathDto = z.infer<typeof CreateAttackPathSchema>
