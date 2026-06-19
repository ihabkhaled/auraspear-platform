import { z } from 'zod'
import { HuntTimeRange } from '../../../common/enums'

export const RunHuntSchema = z.object({
  query: z.string().min(1, 'Hunt query is required').max(2000),
  timeRange: z.nativeEnum(HuntTimeRange),
  description: z.string().max(4096).optional(),
})

export type RunHuntDto = z.infer<typeof RunHuntSchema>
