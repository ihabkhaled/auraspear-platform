import { z } from 'zod'
import { ConnectorType } from '../../../common/enums'
import { daysAgo, toDay } from '../../../common/utils/date-time.utility'

/** Valid connector types — matches Prisma ConnectorType enum */
const ConnectorTypeParameter = z.nativeEnum(ConnectorType)

export type ConnectorTypeParameter = z.infer<typeof ConnectorTypeParameter>

/** Pagination query params shared across list endpoints */
export const PaginationQuerySchema = z.object({
  page: z.coerce.number().int().min(1).max(1000).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
})

export type PaginationQuery = z.infer<typeof PaginationQuerySchema>

/** Search request body */
export const WorkspaceSearchSchema = z.object({
  query: z.string().min(1).max(500).trim(),
  filters: z
    .record(z.string().max(100), z.unknown())
    .refine(value => JSON.stringify(value).length <= 65536, {
      message: 'Filters too large (max 64KB)',
    })
    .optional(),
  page: z.number().int().min(1).max(1000).default(1),
  pageSize: z.number().int().min(1).max(100).default(20),
  from: z
    .string()
    .datetime()
    .optional()
    .refine(
      value => {
        if (!value) return true
        const date = toDay(value).toDate()
        const thirtyDaysAgo = daysAgo(30)
        return date >= thirtyDaysAgo
      },
      { message: 'from date cannot be more than 30 days in the past' }
    ),
  to: z.string().datetime().optional(),
})

export type WorkspaceSearchDto = z.infer<typeof WorkspaceSearchSchema>

/** Action request body */
export const WorkspaceActionSchema = z.object({
  params: z
    .record(z.string().max(100), z.unknown())
    .refine(value => Object.keys(value).length <= 20, {
      message: 'Too many action parameters (max 20)',
    })
    .optional(),
})

export type WorkspaceActionDto = z.infer<typeof WorkspaceActionSchema>

/** Action name param — alphanumeric + hyphens, max 50 chars */
export const ActionNameSchema = z
  .string()
  .min(1)
  .max(50)
  .regex(/^[\da-z-]+$/, 'Action name must be lowercase alphanumeric with hyphens')

export { ConnectorTypeParameter as ConnectorTypeParameterSchema }
