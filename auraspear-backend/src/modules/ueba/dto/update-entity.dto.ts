import { z } from 'zod'
import { UebaEntityType, UebaRiskLevel } from '../../../common/enums'

export const UpdateEntitySchema = z.object({
  entityName: z.string().min(1).max(320).optional(),
  entityType: z.nativeEnum(UebaEntityType).optional(),
  riskScore: z.number().min(0).max(100).optional(),
  riskLevel: z.nativeEnum(UebaRiskLevel).optional(),
  topAnomaly: z.string().max(500).optional(),
})

export type UpdateEntityDto = z.infer<typeof UpdateEntitySchema>
