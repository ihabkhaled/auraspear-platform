import { z } from 'zod'
import { IncidentStatusEnum } from './update-incident.dto'

export const ChangeIncidentStatusSchema = z.object({
  status: IncidentStatusEnum,
})

export type ChangeIncidentStatusDto = z.infer<typeof ChangeIncidentStatusSchema>
