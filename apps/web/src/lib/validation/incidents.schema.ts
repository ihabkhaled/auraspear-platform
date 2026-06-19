import { z } from 'zod'
import { IncidentCategory, IncidentSeverity, IncidentStatus } from '@/enums'

export const createIncidentSchema = z.object({
  title: z.string().min(5),
  description: z.string().min(10),
  severity: z.nativeEnum(IncidentSeverity),
  category: z.nativeEnum(IncidentCategory),
  assigneeId: z.string().optional(),
  mitreTechniques: z.string().optional(),
})

export const editIncidentSchema = z.object({
  title: z.string().min(5),
  description: z.string().min(10),
  severity: z.nativeEnum(IncidentSeverity),
  category: z.nativeEnum(IncidentCategory),
  status: z.nativeEnum(IncidentStatus),
  assigneeId: z.string().optional(),
  mitreTechniques: z.string().optional(),
})
