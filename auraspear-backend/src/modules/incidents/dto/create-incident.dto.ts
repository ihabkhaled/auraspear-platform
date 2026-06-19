import { z } from 'zod'

export const IncidentSeverityEnum = z.enum(['critical', 'high', 'medium', 'low'])

export const IncidentCategoryEnum = z.enum([
  'intrusion',
  'insider',
  'brute_force',
  'exfiltration',
  'malware',
  'cloud',
  'phishing',
  'dos',
  'other',
])

export const CreateIncidentSchema = z.object({
  title: z.string().min(1).max(500),
  description: z.string().max(4096).optional(),
  severity: IncidentSeverityEnum,
  category: IncidentCategoryEnum,
  assigneeId: z.string().uuid().optional(),
  linkedAlertIds: z.array(z.string().max(200)).max(500).optional(),
  linkedCaseId: z.string().uuid().optional(),
  mitreTactics: z.array(z.string().max(50)).max(50).optional(),
  mitreTechniques: z.array(z.string().max(50)).max(50).optional(),
})

export type CreateIncidentDto = z.infer<typeof CreateIncidentSchema>
