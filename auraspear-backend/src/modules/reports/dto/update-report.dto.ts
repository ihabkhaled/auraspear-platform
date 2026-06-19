import { z } from 'zod'
import {
  ReportFormatEnum,
  ReportModuleEnum,
  ReportTemplateKeyEnum,
  ReportTypeEnum,
} from './create-report.dto'
import { ReportStatus } from '../../../common/enums'

export const UpdateReportStatusEnum = z.nativeEnum(ReportStatus)

export const UpdateReportSchema = z.object({
  name: z.string().min(1).max(500).optional(),
  description: z.string().max(4096).optional(),
  type: ReportTypeEnum.optional(),
  module: ReportModuleEnum.optional(),
  templateKey: ReportTemplateKeyEnum.optional(),
  format: ReportFormatEnum.optional(),
  status: UpdateReportStatusEnum.optional(),
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

export type UpdateReportDto = z.infer<typeof UpdateReportSchema>
