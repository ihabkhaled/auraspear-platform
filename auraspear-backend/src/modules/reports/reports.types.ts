import type { PaginatedResponse } from '../../common/interfaces/pagination.interface'
import type {
  Prisma,
  ReportFormat,
  ReportModule,
  ReportStatus,
  ReportTemplateKey,
  ReportType,
} from '@prisma/client'

export interface ReportRecord {
  id: string
  tenantId: string
  templateId: string | null
  name: string
  description: string | null
  type: ReportType
  module: ReportModule | null
  templateKey: ReportTemplateKey | null
  templateName: string | null
  format: ReportFormat
  status: ReportStatus
  parameters: Record<string, unknown> | null
  filterSnapshot: Record<string, unknown> | null
  fileUrl: string | null
  fileSize: string | null
  generatedAt: Date | null
  generatedBy: string
  generatedByName: string | null
  tenantName: string
  createdAt: Date
}

export type PaginatedReports = PaginatedResponse<ReportRecord>

export interface ReportStats {
  totalReports: number
  completedReports: number
  failedReports: number
  generatingReports: number
  availableTemplates: number
}

export interface ReportTemplateRecord {
  id: string
  tenantId: string | null
  key: ReportTemplateKey
  module: ReportModule
  name: string
  description: string | null
  type: ReportType
  defaultFormat: ReportFormat
  parameters: Record<string, unknown> | null
  isSystem: boolean
  tenantName: string | null
  createdAt: Date
  updatedAt: Date
}

export type ReportWithRelations = Prisma.ReportGetPayload<{
  include: {
    tenant: { select: { name: true } }
    template: { select: { id: true; key: true; module: true; name: true } }
  }
}>

export type ReportTemplateWithTenant = Prisma.ReportTemplateGetPayload<{
  include: {
    tenant: { select: { name: true } }
  }
}>

/* ---------------------------------------------------------------- */
/* REPORT CONTENT GENERATION TYPES                                   */
/* ---------------------------------------------------------------- */

export interface ReportMetricItem {
  label: string
  value: number | string
}

export interface ReportTableRow {
  [key: string]: string | number | boolean | null
}

export interface ReportTableSection {
  title: string
  columns: string[]
  rows: ReportTableRow[]
}

export interface ReportContentSection {
  title: string
  description?: string
  metrics?: ReportMetricItem[]
  tables?: ReportTableSection[]
}

export interface GeneratedReportContent {
  reportId: string
  reportName: string
  reportType: string
  module: string | null
  generatedAt: string
  tenantId: string
  dateRange: {
    from: string
    to: string
  }
  sections: ReportContentSection[]
}

export interface ReportDownloadResponse {
  filename: string
  contentType: string
  content: string | Buffer
}
