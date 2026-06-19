import { Injectable, Logger } from '@nestjs/common'
import {
  CaseStatus,
  ComplianceControlStatus,
  IncidentStatus,
  ReportModule,
  ReportType,
} from '../../../common/enums'
import { nowDate, daysAgo, toIso } from '../../../common/utils/date-time.utility'
import { ReportsGenerationRepository } from '../../reports/reports-generation.repository'
import {
  REPORT_DEFAULT_LOOKBACK_DAYS,
  REPORT_TOP_ITEMS_LIMIT,
} from '../../reports/reports.constants'
import { ReportsRepository } from '../../reports/reports.repository'
import type { GeneratedReportContent, ReportContentSection } from '../../reports/reports.types'
import type { Job, Report } from '@prisma/client'

@Injectable()
export class ReportGenerationHandler {
  private readonly logger = new Logger(ReportGenerationHandler.name)

  constructor(
    private readonly reportsRepository: ReportsRepository,
    private readonly generationRepository: ReportsGenerationRepository
  ) {}

  async handle(job: Job): Promise<Record<string, unknown>> {
    const payload = job.payload as Record<string, unknown> | null
    const reportId = payload?.['reportId'] as string | undefined

    if (!reportId) {
      throw new Error('reportId is required in job payload')
    }

    const report = await this.reportsRepository.findReportByIdAndTenant(reportId, job.tenantId)

    if (!report) {
      throw new Error(`Report ${reportId} not found for tenant ${job.tenantId}`)
    }

    this.logger.log(
      `Generating report "${report.name}" (${report.type}/${report.format}) for tenant ${job.tenantId}`
    )

    try {
      const content = await this.generateContent(report, job.tenantId)
      const contentJson = JSON.stringify(content)

      await this.reportsRepository.updateReportById(reportId, job.tenantId, {
        status: 'completed',
        generatedAt: nowDate(),
        generatedContent: contentJson,
        fileUrl: `/api/reports/${reportId}/download`,
        fileSize: Buffer.byteLength(contentJson, 'utf-8'),
      })

      this.logger.log(
        `Report "${report.name}" generated successfully (${Buffer.byteLength(contentJson, 'utf-8')} bytes)`
      )

      return {
        reportId,
        reportName: report.name,
        reportType: report.type,
        format: report.format,
        contentSize: Buffer.byteLength(contentJson, 'utf-8'),
        generatedAt: toIso(),
      }
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown generation error'

      this.logger.error(`Report generation failed for "${report.name}": ${errorMessage}`)

      await this.reportsRepository.updateReportById(reportId, job.tenantId, {
        status: 'failed',
      })

      throw error
    }
  }

  /* ---------------------------------------------------------------- */
  /* CONTENT GENERATION                                                */
  /* ---------------------------------------------------------------- */

  private async generateContent(report: Report, tenantId: string): Promise<GeneratedReportContent> {
    const parameters = report.parameters as Record<string, unknown> | null
    const lookbackDays =
      (parameters?.['lookbackDays'] as number | undefined) ?? REPORT_DEFAULT_LOOKBACK_DAYS
    const since = daysAgo(lookbackDays)
    const now = nowDate()

    const sections = await this.buildSectionsByType(
      report.type as ReportType,
      report.module as ReportModule | null,
      tenantId,
      since
    )

    return {
      reportId: report.id,
      reportName: report.name,
      reportType: report.type,
      module: report.module,
      generatedAt: toIso(now),
      tenantId,
      dateRange: {
        from: toIso(since),
        to: toIso(now),
      },
      sections,
    }
  }

  private async buildSectionsByType(
    reportType: ReportType,
    reportModule: ReportModule | null,
    tenantId: string,
    since: Date
  ): Promise<ReportContentSection[]> {
    switch (reportType) {
      case ReportType.EXECUTIVE:
        return this.buildExecutiveSections(tenantId, since)
      case ReportType.COMPLIANCE:
        return this.buildComplianceSections(tenantId)
      case ReportType.INCIDENT:
        return this.buildIncidentSections(tenantId)
      case ReportType.THREAT:
        return this.buildThreatSections(tenantId, since)
      case ReportType.CUSTOM:
        return this.buildCustomSections(tenantId, reportModule, since)
      default:
        return this.buildExecutiveSections(tenantId, since)
    }
  }

  /* ---------------------------------------------------------------- */
  /* EXECUTIVE REPORT                                                  */
  /* ---------------------------------------------------------------- */

  private async buildExecutiveSections(
    tenantId: string,
    since: Date
  ): Promise<ReportContentSection[]> {
    const [
      totalAlerts,
      resolvedAlerts,
      severityDistribution,
      statusDistribution,
      avgResolutionMs,
      totalCases,
      openCases,
      closedCases,
      avgCaseResolutionHours,
      totalIncidents,
      openIncidents,
      resolvedIncidents,
      enabledConnectors,
      topTechniques,
      completedReports,
    ] = await Promise.all([
      this.generationRepository.countAlerts(tenantId, since),
      this.generationRepository.countResolvedAlerts(tenantId, since),
      this.generationRepository.groupAlertsBySeverity(tenantId, since),
      this.generationRepository.groupAlertsByStatus(tenantId, since),
      this.generationRepository.getAvgAlertResolutionMs(tenantId, since),
      this.generationRepository.countCases(tenantId),
      this.generationRepository.countCasesByStatus(tenantId, CaseStatus.OPEN),
      this.generationRepository.countCasesByStatus(tenantId, CaseStatus.CLOSED),
      this.generationRepository.getAvgCaseResolutionHours(tenantId),
      this.generationRepository.countIncidents(tenantId),
      this.generationRepository.countIncidentsByStatus(tenantId, IncidentStatus.OPEN),
      this.generationRepository.countIncidentsByStatus(tenantId, IncidentStatus.RESOLVED),
      this.generationRepository.countEnabledConnectors(tenantId),
      this.generationRepository.getTopMitreTechniques(tenantId, REPORT_TOP_ITEMS_LIMIT, since),
      this.generationRepository.countCompletedReports(tenantId),
    ])

    const mttrMinutes = Math.round(avgResolutionMs / 60_000)

    return [
      {
        title: 'Executive Summary',
        description: 'High-level overview of the security posture for the reporting period.',
        metrics: [
          { label: 'Total Alerts', value: totalAlerts },
          { label: 'Resolved Alerts', value: resolvedAlerts },
          { label: 'Mean Time to Respond', value: mttrMinutes > 0 ? `${mttrMinutes}m` : 'N/A' },
          { label: 'Open Cases', value: openCases },
          { label: 'Open Incidents', value: openIncidents },
          { label: 'Connected Sources', value: enabledConnectors },
        ],
      },
      {
        title: 'Alert Severity Distribution',
        description: 'Breakdown of alerts by severity level during the reporting period.',
        tables: [
          {
            title: 'Severity Breakdown',
            columns: ['Severity', 'Count'],
            rows: severityDistribution.map(s => ({
              Severity: s.severity,
              Count: s._count,
            })),
          },
        ],
      },
      {
        title: 'Alert Status Distribution',
        description: 'Current distribution of alert statuses.',
        tables: [
          {
            title: 'Status Breakdown',
            columns: ['Status', 'Count'],
            rows: statusDistribution.map(s => ({
              Status: s.status,
              Count: s._count,
            })),
          },
        ],
      },
      {
        title: 'Case Management Overview',
        description: 'Summary of case management activity.',
        metrics: [
          { label: 'Total Cases', value: totalCases },
          { label: 'Open Cases', value: openCases },
          { label: 'Closed Cases', value: closedCases },
          {
            label: 'Avg Resolution Time',
            value: avgCaseResolutionHours > 0 ? `${avgCaseResolutionHours}h` : 'N/A',
          },
        ],
      },
      {
        title: 'Incident Management Overview',
        description: 'Summary of incident response activity.',
        metrics: [
          { label: 'Total Incidents', value: totalIncidents },
          { label: 'Open Incidents', value: openIncidents },
          { label: 'Resolved Incidents', value: resolvedIncidents },
          { label: 'Completed Reports', value: completedReports },
        ],
      },
      {
        title: 'Top MITRE ATT&CK Techniques',
        description: 'Most frequently observed MITRE ATT&CK techniques.',
        tables: [
          {
            title: 'Top Techniques',
            columns: ['Technique', 'Count'],
            rows: topTechniques.map(t => ({
              Technique: t.technique,
              Count: Number(t.count),
            })),
          },
        ],
      },
    ]
  }

  /* ---------------------------------------------------------------- */
  /* COMPLIANCE REPORT                                                 */
  /* ---------------------------------------------------------------- */

  private async buildComplianceSections(tenantId: string): Promise<ReportContentSection[]> {
    const [totalFrameworks, passedControls, failedControls, notAssessedControls, frameworks] =
      await Promise.all([
        this.generationRepository.countComplianceFrameworks(tenantId),
        this.generationRepository.countComplianceControlsByStatus(
          tenantId,
          ComplianceControlStatus.PASSED
        ),
        this.generationRepository.countComplianceControlsByStatus(
          tenantId,
          ComplianceControlStatus.FAILED
        ),
        this.generationRepository.countComplianceControlsByStatus(
          tenantId,
          ComplianceControlStatus.NOT_ASSESSED
        ),
        this.generationRepository.getComplianceFrameworkSummaries(tenantId),
      ])

    const totalControls = passedControls + failedControls + notAssessedControls
    const complianceScore =
      totalControls > 0 ? Math.round((passedControls / totalControls) * 100) : 0

    return [
      {
        title: 'Compliance Overview',
        description: 'Summary of compliance posture across all frameworks.',
        metrics: [
          { label: 'Total Frameworks', value: totalFrameworks },
          { label: 'Total Controls', value: totalControls },
          { label: 'Compliance Score', value: `${complianceScore}%` },
        ],
      },
      {
        title: 'Control Status Distribution',
        description: 'Breakdown of compliance control results.',
        metrics: [
          { label: 'Passed Controls', value: passedControls },
          { label: 'Failed Controls', value: failedControls },
          { label: 'Not Assessed', value: notAssessedControls },
        ],
      },
      {
        title: 'Framework Summary',
        description: 'List of active compliance frameworks.',
        tables: [
          {
            title: 'Frameworks',
            columns: ['Name', 'Standard'],
            rows: frameworks.map(f => ({
              Name: f.name,
              Standard: f.standard,
            })),
          },
        ],
      },
    ]
  }

  /* ---------------------------------------------------------------- */
  /* INCIDENT REPORT                                                   */
  /* ---------------------------------------------------------------- */

  private async buildIncidentSections(tenantId: string): Promise<ReportContentSection[]> {
    const [
      totalIncidents,
      incidentStatusDistribution,
      incidentSeverityDistribution,
      openIncidents,
      inProgressIncidents,
      containedIncidents,
      resolvedIncidents,
      closedIncidents,
      avgResolutionHours,
      totalCases,
      caseStatusDistribution,
      caseSeverityDistribution,
    ] = await Promise.all([
      this.generationRepository.countIncidents(tenantId),
      this.generationRepository.groupIncidentsByStatus(tenantId),
      this.generationRepository.groupIncidentsBySeverity(tenantId),
      this.generationRepository.countIncidentsByStatus(tenantId, IncidentStatus.OPEN),
      this.generationRepository.countIncidentsByStatus(tenantId, IncidentStatus.IN_PROGRESS),
      this.generationRepository.countIncidentsByStatus(tenantId, IncidentStatus.CONTAINED),
      this.generationRepository.countIncidentsByStatus(tenantId, IncidentStatus.RESOLVED),
      this.generationRepository.countIncidentsByStatus(tenantId, IncidentStatus.CLOSED),
      this.generationRepository.getAvgIncidentResolutionHours(tenantId),
      this.generationRepository.countCases(tenantId),
      this.generationRepository.groupCasesByStatus(tenantId),
      this.generationRepository.groupCasesBySeverity(tenantId),
    ])

    return [
      {
        title: 'Incident Overview',
        description: 'Summary of incident management metrics.',
        metrics: [
          { label: 'Total Incidents', value: totalIncidents },
          { label: 'Open', value: openIncidents },
          { label: 'In Progress', value: inProgressIncidents },
          { label: 'Contained', value: containedIncidents },
          { label: 'Resolved', value: resolvedIncidents },
          { label: 'Closed', value: closedIncidents },
          {
            label: 'Avg Resolution Time',
            value: avgResolutionHours > 0 ? `${avgResolutionHours}h` : 'N/A',
          },
        ],
      },
      {
        title: 'Incident Status Distribution',
        tables: [
          {
            title: 'By Status',
            columns: ['Status', 'Count'],
            rows: incidentStatusDistribution.map(s => ({ Status: s.status, Count: s._count })),
          },
        ],
      },
      {
        title: 'Incident Severity Distribution',
        tables: [
          {
            title: 'By Severity',
            columns: ['Severity', 'Count'],
            rows: incidentSeverityDistribution.map(s => ({
              Severity: s.severity,
              Count: s._count,
            })),
          },
        ],
      },
      {
        title: 'Case Management Summary',
        description: 'Related case management activity.',
        metrics: [{ label: 'Total Cases', value: totalCases }],
        tables: [
          {
            title: 'Cases by Status',
            columns: ['Status', 'Count'],
            rows: caseStatusDistribution.map(s => ({ Status: s.status, Count: s._count })),
          },
          {
            title: 'Cases by Severity',
            columns: ['Severity', 'Count'],
            rows: caseSeverityDistribution.map(s => ({ Severity: s.severity, Count: s._count })),
          },
        ],
      },
    ]
  }

  /* ---------------------------------------------------------------- */
  /* THREAT REPORT                                                     */
  /* ---------------------------------------------------------------- */

  private async buildThreatSections(
    tenantId: string,
    since: Date
  ): Promise<ReportContentSection[]> {
    const [
      totalAlerts,
      severityDistribution,
      topTechniques,
      topRules,
      avgResolutionMs,
      vulnerabilityCount,
      vulnerabilitySeverityDistribution,
    ] = await Promise.all([
      this.generationRepository.countAlerts(tenantId, since),
      this.generationRepository.groupAlertsBySeverity(tenantId, since),
      this.generationRepository.getTopMitreTechniques(tenantId, REPORT_TOP_ITEMS_LIMIT, since),
      this.generationRepository.getTopAlertRules(tenantId, REPORT_TOP_ITEMS_LIMIT, since),
      this.generationRepository.getAvgAlertResolutionMs(tenantId, since),
      this.generationRepository.countVulnerabilities(tenantId),
      this.generationRepository.groupVulnerabilitiesBySeverity(tenantId),
    ])

    const mttrMinutes = Math.round(avgResolutionMs / 60_000)

    return [
      {
        title: 'Threat Landscape Overview',
        description: 'Summary of threat activity and detection performance.',
        metrics: [
          { label: 'Total Alerts', value: totalAlerts },
          { label: 'Mean Time to Respond', value: mttrMinutes > 0 ? `${mttrMinutes}m` : 'N/A' },
          { label: 'Total Vulnerabilities', value: vulnerabilityCount },
        ],
      },
      {
        title: 'Alert Severity Distribution',
        description: 'Breakdown of alerts by severity.',
        tables: [
          {
            title: 'Severity Breakdown',
            columns: ['Severity', 'Count'],
            rows: severityDistribution.map(s => ({ Severity: s.severity, Count: s._count })),
          },
        ],
      },
      {
        title: 'Top MITRE ATT&CK Techniques',
        description: 'Most frequently observed attack techniques.',
        tables: [
          {
            title: 'Top Techniques',
            columns: ['Technique', 'Count'],
            rows: topTechniques.map(t => ({
              Technique: t.technique,
              Count: Number(t.count),
            })),
          },
        ],
      },
      {
        title: 'Top Detection Rules',
        description: 'Most frequently triggered detection rules.',
        tables: [
          {
            title: 'Top Rules',
            columns: ['Rule', 'Count'],
            rows: topRules.map(r => ({
              Rule: r.rule_name,
              Count: Number(r.count),
            })),
          },
        ],
      },
      {
        title: 'Vulnerability Severity Distribution',
        description: 'Breakdown of known vulnerabilities by severity.',
        tables: [
          {
            title: 'Vulnerability Severities',
            columns: ['Severity', 'Count'],
            rows: vulnerabilitySeverityDistribution.map(v => ({
              Severity: v.severity,
              Count: v._count,
            })),
          },
        ],
      },
    ]
  }

  /* ---------------------------------------------------------------- */
  /* CUSTOM / MODULE-SPECIFIC REPORT                                   */
  /* ---------------------------------------------------------------- */

  private async buildCustomSections(
    tenantId: string,
    reportModule: ReportModule | null,
    since: Date
  ): Promise<ReportContentSection[]> {
    switch (reportModule) {
      case ReportModule.ALERTS:
        return this.buildAlertModuleSections(tenantId, since)
      case ReportModule.CASES:
        return this.buildCaseModuleSections(tenantId)
      case ReportModule.INCIDENTS:
        return this.buildIncidentSections(tenantId)
      case ReportModule.COMPLIANCE:
        return this.buildComplianceSections(tenantId)
      case ReportModule.VULNERABILITIES:
        return this.buildVulnerabilityModuleSections(tenantId)
      case ReportModule.CONNECTORS:
        return this.buildConnectorModuleSections(tenantId)
      default:
        return this.buildExecutiveSections(tenantId, since)
    }
  }

  private async buildAlertModuleSections(
    tenantId: string,
    since: Date
  ): Promise<ReportContentSection[]> {
    const [
      totalAlerts,
      resolvedAlerts,
      severityDistribution,
      statusDistribution,
      topTechniques,
      topRules,
      avgResolutionMs,
    ] = await Promise.all([
      this.generationRepository.countAlerts(tenantId, since),
      this.generationRepository.countResolvedAlerts(tenantId, since),
      this.generationRepository.groupAlertsBySeverity(tenantId, since),
      this.generationRepository.groupAlertsByStatus(tenantId, since),
      this.generationRepository.getTopMitreTechniques(tenantId, REPORT_TOP_ITEMS_LIMIT, since),
      this.generationRepository.getTopAlertRules(tenantId, REPORT_TOP_ITEMS_LIMIT, since),
      this.generationRepository.getAvgAlertResolutionMs(tenantId, since),
    ])

    const mttrMinutes = Math.round(avgResolutionMs / 60_000)

    return [
      {
        title: 'Alert Summary',
        description: 'Overview of alert activity for the reporting period.',
        metrics: [
          { label: 'Total Alerts', value: totalAlerts },
          { label: 'Resolved Alerts', value: resolvedAlerts },
          {
            label: 'Resolution Rate',
            value: totalAlerts > 0 ? `${Math.round((resolvedAlerts / totalAlerts) * 100)}%` : 'N/A',
          },
          { label: 'Mean Time to Respond', value: mttrMinutes > 0 ? `${mttrMinutes}m` : 'N/A' },
        ],
      },
      {
        title: 'Severity Distribution',
        tables: [
          {
            title: 'By Severity',
            columns: ['Severity', 'Count'],
            rows: severityDistribution.map(s => ({ Severity: s.severity, Count: s._count })),
          },
        ],
      },
      {
        title: 'Status Distribution',
        tables: [
          {
            title: 'By Status',
            columns: ['Status', 'Count'],
            rows: statusDistribution.map(s => ({ Status: s.status, Count: s._count })),
          },
        ],
      },
      {
        title: 'Top MITRE ATT&CK Techniques',
        tables: [
          {
            title: 'Techniques',
            columns: ['Technique', 'Count'],
            rows: topTechniques.map(t => ({ Technique: t.technique, Count: Number(t.count) })),
          },
        ],
      },
      {
        title: 'Top Detection Rules',
        tables: [
          {
            title: 'Rules',
            columns: ['Rule', 'Count'],
            rows: topRules.map(r => ({ Rule: r.rule_name, Count: Number(r.count) })),
          },
        ],
      },
    ]
  }

  private async buildCaseModuleSections(tenantId: string): Promise<ReportContentSection[]> {
    const [
      totalCases,
      statusDistribution,
      severityDistribution,
      openCases,
      closedCases,
      avgResolutionHours,
    ] = await Promise.all([
      this.generationRepository.countCases(tenantId),
      this.generationRepository.groupCasesByStatus(tenantId),
      this.generationRepository.groupCasesBySeverity(tenantId),
      this.generationRepository.countCasesByStatus(tenantId, CaseStatus.OPEN),
      this.generationRepository.countCasesByStatus(tenantId, CaseStatus.CLOSED),
      this.generationRepository.getAvgCaseResolutionHours(tenantId),
    ])

    return [
      {
        title: 'Case Management Summary',
        description: 'Overview of case management activity.',
        metrics: [
          { label: 'Total Cases', value: totalCases },
          { label: 'Open Cases', value: openCases },
          { label: 'Closed Cases', value: closedCases },
          {
            label: 'Avg Resolution Time',
            value: avgResolutionHours > 0 ? `${avgResolutionHours}h` : 'N/A',
          },
        ],
      },
      {
        title: 'Case Status Distribution',
        tables: [
          {
            title: 'By Status',
            columns: ['Status', 'Count'],
            rows: statusDistribution.map(s => ({ Status: s.status, Count: s._count })),
          },
        ],
      },
      {
        title: 'Case Severity Distribution',
        tables: [
          {
            title: 'By Severity',
            columns: ['Severity', 'Count'],
            rows: severityDistribution.map(s => ({ Severity: s.severity, Count: s._count })),
          },
        ],
      },
    ]
  }

  private async buildVulnerabilityModuleSections(
    tenantId: string
  ): Promise<ReportContentSection[]> {
    const [totalVulnerabilities, severityDistribution] = await Promise.all([
      this.generationRepository.countVulnerabilities(tenantId),
      this.generationRepository.groupVulnerabilitiesBySeverity(tenantId),
    ])

    return [
      {
        title: 'Vulnerability Overview',
        description: 'Summary of known vulnerabilities.',
        metrics: [{ label: 'Total Vulnerabilities', value: totalVulnerabilities }],
      },
      {
        title: 'Vulnerability Severity Distribution',
        tables: [
          {
            title: 'By Severity',
            columns: ['Severity', 'Count'],
            rows: severityDistribution.map(v => ({ Severity: v.severity, Count: v._count })),
          },
        ],
      },
    ]
  }

  private async buildConnectorModuleSections(tenantId: string): Promise<ReportContentSection[]> {
    const [enabledCount, connectors] = await Promise.all([
      this.generationRepository.countEnabledConnectors(tenantId),
      this.generationRepository.getConnectorSummaries(tenantId),
    ])

    const healthyCount = connectors.filter(c => c.enabled && c.lastTestOk === true).length
    const failingCount = connectors.filter(c => c.enabled && c.lastTestOk === false).length

    return [
      {
        title: 'Connector Health Overview',
        description: 'Summary of data source connector status.',
        metrics: [
          { label: 'Total Connectors', value: connectors.length },
          { label: 'Enabled', value: enabledCount },
          { label: 'Healthy', value: healthyCount },
          { label: 'Failing', value: failingCount },
        ],
      },
      {
        title: 'Connector Details',
        tables: [
          {
            title: 'All Connectors',
            columns: ['Name', 'Type', 'Enabled', 'Health'],
            rows: connectors.map(c => {
              let healthStatus = 'Unknown'
              if (c.lastTestOk === true) {
                healthStatus = 'Healthy'
              } else if (c.lastTestOk === false) {
                healthStatus = 'Failing'
              }
              return {
                Name: c.name,
                Type: c.type,
                Enabled: c.enabled ? 'Yes' : 'No',
                Health: healthStatus,
              }
            }),
          },
        ],
      },
    ]
  }
}
