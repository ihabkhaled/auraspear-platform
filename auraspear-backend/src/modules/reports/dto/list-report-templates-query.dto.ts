import { z } from 'zod'
import { ReportModule } from '../../../common/enums'

export const ListReportTemplatesQuerySchema = z.object({
  module: z.nativeEnum(ReportModule).optional(),
})

export type ListReportTemplatesQueryDto = z.infer<typeof ListReportTemplatesQuerySchema>
