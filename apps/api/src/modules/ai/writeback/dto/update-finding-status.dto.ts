import { z } from 'zod'
import { AiFindingStatus } from '../../../../common/enums'

export const UpdateFindingStatusSchema = z.object({
  status: z.nativeEnum(AiFindingStatus),
})

export type UpdateFindingStatusDto = z.infer<typeof UpdateFindingStatusSchema>
