import { z } from 'zod'
import { UebaEntityType, UebaRiskLevel } from '../../../common/enums'

export const CreateEntitySchema = z.object({
  entityName: z.string().min(1).max(320),
  entityType: z.nativeEnum(UebaEntityType),
  riskScore: z.number().min(0).max(100).default(0),
  riskLevel: z.nativeEnum(UebaRiskLevel).default(UebaRiskLevel.NORMAL),
  topAnomaly: z.string().max(500).optional(),
})

export type CreateEntityDto = z.infer<typeof CreateEntitySchema>
