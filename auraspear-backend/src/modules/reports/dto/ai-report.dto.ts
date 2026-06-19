import { z } from 'zod'

export const AiExecutiveReportSchema = z.object({
  timeRange: z.enum(['7d', '14d', '30d', '90d']),
  connector: z.string().max(200).optional(),
})

export type AiExecutiveReportDto = z.infer<typeof AiExecutiveReportSchema>
