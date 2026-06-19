import { z } from 'zod'
import { EntityType } from '../../../common/enums'

export const CreateEntitySchema = z.object({
  type: z.nativeEnum(EntityType),
  value: z.string().min(1).max(1000),
  displayName: z.string().max(500).optional(),
  metadata: z.record(z.unknown()).optional(),
})

export type CreateEntityDto = z.infer<typeof CreateEntitySchema>
