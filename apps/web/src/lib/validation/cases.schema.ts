import { z } from 'zod'
import { CaseSeverity } from '@/enums'

export const createCaseSchema = z.object({
  title: z.string().min(5),
  description: z.string().min(10),
  severity: z.nativeEnum(CaseSeverity),
  assignee: z.string().optional(),
  cycleId: z.string().uuid().optional(),
})

export const editCaseSchema = z.object({
  title: z.string().min(5),
  description: z.string().min(10),
  severity: z.nativeEnum(CaseSeverity),
})

export const createCommentSchema = z.object({
  body: z.string().min(1).max(10000),
})
