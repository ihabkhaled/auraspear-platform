import { REPORT_SORT_FIELDS } from './reports.constants'
import { ReportFormat } from '../../common/enums'
import { buildOrderBy } from '../../common/utils/query.utility'
import type { UpdateReportDto } from './dto/update-report.dto'
import type {
  GeneratedReportContent,
  ReportContentSection,
  ReportDownloadResponse,
  ReportRecord,
  ReportStats,
  ReportTableSection,
  ReportTemplateRecord,
  ReportTemplateWithTenant,
  ReportWithRelations,
} from './reports.types'
import type { Prisma } from '@prisma/client'

/* ---------------------------------------------------------------- */
/* QUERY BUILDING                                                    */
/* ---------------------------------------------------------------- */

export function buildReportListWhere(
  tenantId: string,
  type?: string,
  module?: string,
  status?: string,
  query?: string,
  format?: string
): Prisma.ReportWhereInput {
  const where: Prisma.ReportWhereInput = { tenantId }

  if (type) {
    where.type = type as Prisma.ReportWhereInput['type']
  }

  if (module) {
    where.module = module as Prisma.ReportWhereInput['module']
  }

  if (status) {
    where.status = status as Prisma.ReportWhereInput['status']
  }

  if (format) {
    where.format = format as Prisma.ReportWhereInput['format']
  }

  if (query && query.trim().length > 0) {
    where.OR = [
      { name: { contains: query, mode: 'insensitive' } },
      { description: { contains: query, mode: 'insensitive' } },
    ]
  }

  return where
}

export function buildReportOrderBy(
  sortBy?: string,
  sortOrder?: string
): Prisma.ReportOrderByWithRelationInput {
  return buildOrderBy(
    REPORT_SORT_FIELDS,
    'createdAt',
    sortBy,
    sortOrder
  ) as Prisma.ReportOrderByWithRelationInput
}

/* ---------------------------------------------------------------- */
/* UPDATE DATA BUILDING                                              */
/* ---------------------------------------------------------------- */

export function buildReportUpdateData(dto: UpdateReportDto): Record<string, unknown> {
  const data: Record<string, unknown> = {}

  if (dto.name !== undefined) data['name'] = dto.name
  if (dto.description !== undefined) data['description'] = dto.description
  if (dto.type !== undefined) data['type'] = dto.type
  if (dto.module !== undefined) data['module'] = dto.module
  if (dto.templateKey !== undefined) data['templateKey'] = dto.templateKey
  if (dto.format !== undefined) data['format'] = dto.format
  if (dto.status !== undefined) data['status'] = dto.status
  if (dto.parameters !== undefined) data['parameters'] = dto.parameters
  if (dto.filterSnapshot !== undefined) data['filterSnapshot'] = dto.filterSnapshot

  return data
}

export function mergeReportParameters(
  templateParameters: Record<string, unknown> | null,
  overrideParameters?: Record<string, unknown>
): Record<string, unknown> | null {
  if (!templateParameters && !overrideParameters) {
    return null
  }

  return {
    ...(templateParameters ?? {}),
    ...(overrideParameters ?? {}),
  }
}

/* ---------------------------------------------------------------- */
/* RECORD MAPPING                                                    */
/* ---------------------------------------------------------------- */

export function buildReportRecord(
  report: ReportWithRelations,
  generatedByName: string | null
): ReportRecord {
  return {
    id: report.id,
    tenantId: report.tenantId,
    templateId: report.templateId ?? null,
    name: report.name,
    description: report.description,
    type: report.type,
    module: report.module ?? null,
    templateKey: report.templateKey ?? null,
    templateName: report.template?.name ?? null,
    format: report.format,
    status: report.status,
    parameters: report.parameters as Record<string, unknown> | null,
    filterSnapshot: report.filterSnapshot as Record<string, unknown> | null,
    fileUrl: report.fileUrl,
    fileSize: report.fileSize ? String(report.fileSize) : null,
    generatedAt: report.generatedAt,
    generatedBy: report.generatedBy,
    generatedByName,
    tenantName: report.tenant.name,
    createdAt: report.createdAt,
  }
}

export function buildReportTemplateRecord(
  template: ReportTemplateWithTenant
): ReportTemplateRecord {
  return {
    id: template.id,
    tenantId: template.tenantId ?? null,
    key: template.key,
    module: template.module,
    name: template.name,
    description: template.description,
    type: template.type,
    defaultFormat: template.defaultFormat,
    parameters: template.parameters as Record<string, unknown> | null,
    isSystem: template.isSystem,
    tenantName: template.tenant?.name ?? null,
    createdAt: template.createdAt,
    updatedAt: template.updatedAt,
  }
}

/* ---------------------------------------------------------------- */
/* STATS BUILDING                                                    */
/* ---------------------------------------------------------------- */

export function buildReportStats(
  totalReports: number,
  completedReports: number,
  failedReports: number,
  generatingReports: number,
  availableTemplates: number
): ReportStats {
  return {
    totalReports,
    completedReports,
    failedReports,
    generatingReports,
    availableTemplates,
  }
}

/* ---------------------------------------------------------------- */
/* REPORT DOWNLOAD / FORMAT CONVERSION                               */
/* ---------------------------------------------------------------- */

export function buildReportDownloadResponse(
  reportName: string,
  format: string,
  content: GeneratedReportContent,
  pdfBuffer?: Buffer
): ReportDownloadResponse {
  const safeName = reportName.replaceAll(/[^a-zA-Z0-9_-]/g, '_')

  switch (format) {
    case ReportFormat.PDF: {
      if (!pdfBuffer) {
        throw new Error('PDF buffer is required for PDF format downloads')
      }
      return { filename: `${safeName}.pdf`, contentType: 'application/pdf', content: pdfBuffer }
    }
    case ReportFormat.CSV:
      return {
        filename: `${safeName}.csv`,
        contentType: 'text/csv; charset=utf-8',
        content: convertReportToCsv(content),
      }
    case ReportFormat.HTML:
      return {
        filename: `${safeName}.html`,
        contentType: 'text/html; charset=utf-8',
        content: convertReportToHtml(content),
      }
    default:
      return {
        filename: `${safeName}.json`,
        contentType: 'application/json; charset=utf-8',
        content: JSON.stringify(content, null, 2),
      }
  }
}

function escapeHtml(text: string): string {
  return text
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;')
}

function convertSectionToCsvLines(section: ReportContentSection): string[] {
  const lines: string[] = []

  lines.push(`# ${section.title}`)
  if (section.description) {
    lines.push(section.description)
  }

  if (section.metrics) {
    lines.push('Metric,Value')
    for (const metric of section.metrics) {
      lines.push(`"${String(metric.label)}","${String(metric.value)}"`)
    }
  }

  if (section.tables) {
    for (const table of section.tables) {
      lines.push(...convertTableToCsvLines(table))
    }
  }

  lines.push('')
  return lines
}

function convertTableToCsvLines(table: ReportTableSection): string[] {
  const lines: string[] = ['', `## ${table.title}`]

  lines.push(table.columns.map(c => `"${c}"`).join(','))
  for (const row of table.rows) {
    const values = table.columns.map(col => {
      const cellValue = Reflect.get(row, col) as string | number | boolean | null
      return `"${String(cellValue ?? '')}"`
    })
    lines.push(values.join(','))
  }

  return lines
}

function convertReportToCsv(content: GeneratedReportContent): string {
  const lines: string[] = [
    `Report: ${content.reportName}`,
    `Type: ${content.reportType}`,
    `Generated: ${content.generatedAt}`,
    `Date Range: ${content.dateRange.from} to ${content.dateRange.to}`,
    '',
  ]

  for (const section of content.sections) {
    lines.push(...convertSectionToCsvLines(section))
  }

  return lines.join('\n')
}

function convertSectionToHtml(section: ReportContentSection): string {
  let html = `<section><h2>${escapeHtml(section.title)}</h2>`

  if (section.description) {
    html += `<p>${escapeHtml(section.description)}</p>`
  }

  if (section.metrics) {
    html += '<div class="metrics">'
    for (const metric of section.metrics) {
      html += `<div class="metric"><span class="label">${escapeHtml(String(metric.label))}</span><span class="value">${escapeHtml(String(metric.value))}</span></div>`
    }
    html += '</div>'
  }

  if (section.tables) {
    for (const table of section.tables) {
      html += convertTableToHtml(table)
    }
  }

  html += '</section>'
  return html
}

function convertTableToHtml(table: ReportTableSection): string {
  let html = `<h3>${escapeHtml(table.title)}</h3><table><thead><tr>`

  for (const col of table.columns) {
    html += `<th>${escapeHtml(col)}</th>`
  }
  html += '</tr></thead><tbody>'

  for (const row of table.rows) {
    html += '<tr>'
    for (const col of table.columns) {
      const cellValue = Reflect.get(row, col) as string | number | boolean | null
      html += `<td>${escapeHtml(String(cellValue ?? ''))}</td>`
    }
    html += '</tr>'
  }

  html += '</tbody></table>'
  return html
}

function convertReportToHtml(content: GeneratedReportContent): string {
  const sectionHtml = content.sections.map(convertSectionToHtml).join('\n')

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>${escapeHtml(content.reportName)}</title>
<style>
body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 960px; margin: 0 auto; padding: 2rem; background: #0f172a; color: #e2e8f0; }
h1 { color: #22d3ee; border-bottom: 2px solid #22d3ee; padding-bottom: 0.5rem; }
h2 { color: #67e8f9; margin-top: 2rem; }
h3 { color: #a5f3fc; }
.meta { color: #94a3b8; margin-bottom: 2rem; }
.metrics { display: flex; flex-wrap: wrap; gap: 1rem; margin: 1rem 0; }
.metric { background: #1e293b; border: 1px solid #334155; border-radius: 0.5rem; padding: 1rem; min-width: 150px; }
.metric .label { display: block; color: #94a3b8; font-size: 0.875rem; text-transform: uppercase; }
.metric .value { display: block; font-size: 1.5rem; font-weight: 700; color: #f1f5f9; margin-top: 0.25rem; }
table { width: 100%; border-collapse: collapse; margin: 1rem 0; }
th { background: #1e293b; color: #94a3b8; padding: 0.75rem; text-align: left; font-size: 0.875rem; text-transform: uppercase; border-bottom: 2px solid #334155; }
td { padding: 0.75rem; border-bottom: 1px solid #1e293b; }
tr:nth-child(even) { background: rgba(255,255,255,0.02); }
section { margin-bottom: 2rem; }
</style>
</head>
<body>
<h1>${escapeHtml(content.reportName)}</h1>
<div class="meta">
<p>Type: ${escapeHtml(content.reportType)} | Generated: ${escapeHtml(content.generatedAt)}</p>
<p>Period: ${escapeHtml(content.dateRange.from)} to ${escapeHtml(content.dateRange.to)}</p>
</div>
${sectionHtml}
</body>
</html>`
}
