import { z } from 'zod'
import { ReportFormat, ReportModule, ReportTemplateKey } from '../../../common/enums'

export const CreateReportFromTemplateSchema = z.object({
  templateKey: z.nativeEnum(ReportTemplateKey),
  module: z.nativeEnum(ReportModule),
  name: z.string().min(1).max(500).optional(),
  description: z.string().max(4096).optional(),
  format: z.nativeEnum(ReportFormat).optional(),
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

export type CreateReportFromTemplateDto = z.infer<typeof CreateReportFromTemplateSchema>
