import { z } from 'zod'
import { ReportFormat, ReportModule, ReportTemplateKey, ReportType } from '../../../common/enums'

export const ReportTypeEnum = z.nativeEnum(ReportType)
export const ReportFormatEnum = z.nativeEnum(ReportFormat)
export const ReportModuleEnum = z.nativeEnum(ReportModule)
export const ReportTemplateKeyEnum = z.nativeEnum(ReportTemplateKey)

export const CreateReportSchema = z.object({
  name: z.string().min(1).max(500),
  description: z.string().max(4096).optional(),
  type: ReportTypeEnum,
  module: ReportModuleEnum.optional(),
  templateKey: ReportTemplateKeyEnum.optional(),
  format: ReportFormatEnum,
  parameters: z
    .record(z.unknown())
    .refine(value => JSON.stringify(value).length <= 65536, {
      message: 'Parameters too large (max 64KB)',
    })
    .optional(),
  filterSnapshot: z
    .record(z.unknown())
    .refine(value => JSON.stringify(value).length <= 65536, {
      message: 'Filter snapshot too large (max 64KB)',
    })
    .optional(),
})

export type CreateReportDto = z.infer<typeof CreateReportSchema>
