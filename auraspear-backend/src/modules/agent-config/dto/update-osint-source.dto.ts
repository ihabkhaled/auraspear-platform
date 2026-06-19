import { z } from 'zod'
import { OsintAuthType } from '../../../common/enums'

export const UpdateOsintSourceSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  isEnabled: z.boolean().optional(),
  apiKey: z.string().max(1000).optional(),
  baseUrl: z.string().max(500).optional(),
  authType: z.nativeEnum(OsintAuthType).optional(),
  headerName: z.string().max(100).nullable().optional(),
  queryParamName: z.string().max(100).nullable().optional(),
  responsePath: z.string().max(500).nullable().optional(),
  requestMethod: z.enum(['GET', 'POST', 'PUT']).optional(),
  timeout: z.number().int().min(1000).max(120_000).optional(),
})

export type UpdateOsintSourceDto = z.infer<typeof UpdateOsintSourceSchema>
