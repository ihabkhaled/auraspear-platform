import { z } from 'zod'
import { IncidentCategoryEnum, IncidentSeverityEnum } from './create-incident.dto'

export const IncidentStatusEnum = z.enum(['open', 'in_progress', 'contained', 'resolved', 'closed'])

export const UpdateIncidentSchema = z.object({
  title: z.string().min(1).max(500).optional(),
  description: z.string().max(4096).optional(),
  severity: IncidentSeverityEnum.optional(),
  status: IncidentStatusEnum.optional(),
  category: IncidentCategoryEnum.optional(),
  assigneeId: z.string().uuid().nullable().optional(),
  linkedAlertIds: z.array(z.string().max(200)).max(500).optional(),
  linkedCaseId: z.string().uuid().nullable().optional(),
  mitreTactics: z.array(z.string().max(50)).max(50).optional(),
  mitreTechniques: z.array(z.string().max(50)).max(50).optional(),
})

export type UpdateIncidentDto = z.infer<typeof UpdateIncidentSchema>
