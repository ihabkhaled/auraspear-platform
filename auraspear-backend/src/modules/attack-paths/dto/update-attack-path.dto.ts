import { z } from 'zod'
import { AttackPathSeverityEnum } from './create-attack-path.dto'

export const AttackPathStatusEnum = z.enum(['active', 'mitigated', 'resolved'])

export const UpdateAttackPathSchema = z.object({
  title: z.string().min(1).max(500).optional(),
  description: z.string().max(4096).optional(),
  severity: AttackPathSeverityEnum.optional(),
  status: AttackPathStatusEnum.optional(),
  stages: z
    .array(
      z
        .record(z.string().max(500), z.unknown())
        .refine(value => JSON.stringify(value).length <= 16384, {
          message: 'Individual stage too large (max 16KB)',
        })
    )
    .max(100)
    .optional(),
  affectedAssets: z.number().int().min(0).max(1_000_000).optional(),
  killChainCoverage: z.number().min(0).max(100).optional(),
  mitreTactics: z.array(z.string().max(50)).max(50).optional(),
  mitreTechniques: z.array(z.string().max(50)).max(50).optional(),
})

export type UpdateAttackPathDto = z.infer<typeof UpdateAttackPathSchema>
