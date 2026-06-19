import { z } from 'zod'
import { OsintAuthType, OsintSourceType } from '../../../common/enums'

export const CreateOsintSourceSchema = z.object({
  sourceType: z.nativeEnum(OsintSourceType),
  name: z.string().min(1).max(255),
  isEnabled: z.boolean().optional(),
  apiKey: z.string().max(1000).optional(),
  baseUrl: z.string().max(500).optional(),
  authType: z.nativeEnum(OsintAuthType),
  headerName: z.string().max(100).optional(),
  queryParamName: z.string().max(100).optional(),
  responsePath: z.string().max(500).optional(),
  requestMethod: z.enum(['GET', 'POST', 'PUT']).optional(),
  timeout: z.number().int().min(1000).max(120_000).optional(),
})

export type CreateOsintSourceDto = z.infer<typeof CreateOsintSourceSchema>
