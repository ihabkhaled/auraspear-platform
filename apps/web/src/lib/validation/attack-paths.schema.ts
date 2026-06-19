import { z } from 'zod'
import { AttackPathSeverity, AttackPathStatus } from '@/enums'

const stageSchema = z.object({
  name: z.string().min(1).max(200),
  mitreId: z.string().min(1).max(50),
  description: z.string().max(1000),
  assets: z.array(z.string().max(200)).max(50),
})

export const createAttackPathSchema = z.object({
  title: z.string().min(3).max(300),
  description: z.string().min(5).max(5000),
  severity: z.nativeEnum(AttackPathSeverity),
  stages: z.array(stageSchema).min(1).max(50),
  affectedAssets: z.coerce.number().int().min(0).max(1000000).default(0),
})

export const editAttackPathSchema = z.object({
  title: z.string().min(3).max(300),
  description: z.string().min(5).max(5000),
  severity: z.nativeEnum(AttackPathSeverity),
  status: z.nativeEnum(AttackPathStatus),
  stages: z.array(stageSchema).min(1).max(50),
  affectedAssets: z.coerce.number().int().min(0).max(1000000).default(0),
})
