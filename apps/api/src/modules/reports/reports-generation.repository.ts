import { Injectable } from '@nestjs/common'
import {
  AlertSeverity,
  CaseStatus,
  ComplianceControlStatus,
  IncidentStatus,
  ReportStatus,
} from '../../common/enums'
import { toDay } from '../../common/utils/date-time.utility'
import { PrismaService } from '../../prisma/prisma.service'

@Injectable()
export class ReportsGenerationRepository {
  constructor(private readonly prisma: PrismaService) {}

  /* ---------------------------------------------------------------- */
  /* ALERT QUERIES                                                     */
  /* ---------------------------------------------------------------- */

  async countAlerts(tenantId: string, since?: Date): Promise<number> {
    return this.prisma.alert.count({
      where: {
        tenantId,
        ...(since ? { timestamp: { gte: since } } : {}),
      },
    })
  }

  async countAlertsBySeverity(
    tenantId: string,
    severity: AlertSeverity,
    since?: Date
  ): Promise<number> {
    return this.prisma.alert.count({
      where: {
        tenantId,
        severity,
        ...(since ? { timestamp: { gte: since } } : {}),
      },
    })
  }

  async groupAlertsBySeverity(
    tenantId: string,
    since?: Date
  ): Promise<Array<{ severity: string; _count: number }>> {
    const results = await this.prisma.alert.groupBy({
      by: ['severity'],
      where: {
        tenantId,
        ...(since ? { timestamp: { gte: since } } : {}),
      },
      _count: true,
      orderBy: { _count: { severity: 'desc' } },
    })
    return results.map(r => ({ severity: r.severity, _count: r._count }))
  }

  async groupAlertsByStatus(
    tenantId: string,
    since?: Date
  ): Promise<Array<{ status: string; _count: number }>> {
    const results = await this.prisma.alert.groupBy({
      by: ['status'],
      where: {
        tenantId,
        ...(since ? { timestamp: { gte: since } } : {}),
      },
      _count: true,
      orderBy: { _count: { status: 'desc' } },
    })
    return results.map(r => ({ status: r.status, _count: r._count }))
  }

  async countResolvedAlerts(tenantId: string, since?: Date): Promise<number> {
    return this.prisma.alert.count({
      where: {
        tenantId,
        closedAt: { not: null },
        ...(since ? { closedAt: { gte: since } } : {}),
      },
    })
  }

  async getTopMitreTechniques(
    tenantId: string,
    limit: number,
    since?: Date
  ): Promise<Array<{ technique: string; count: bigint }>> {
    const sinceFilter = since ?? toDay(0).toDate()
    return this.prisma.$queryRaw<Array<{ technique: string; count: bigint }>>`
      SELECT unnest(mitre_techniques) AS technique, COUNT(*)::bigint AS count
      FROM alerts
      WHERE tenant_id = ${tenantId}::uuid
        AND timestamp >= ${sinceFilter}
      GROUP BY technique
      ORDER BY count DESC
      LIMIT ${limit}
    `
  }

  async getTopAlertRules(
    tenantId: string,
    limit: number,
    since?: Date
  ): Promise<Array<{ rule_name: string; count: bigint }>> {
    const sinceFilter = since ?? toDay(0).toDate()
    return this.prisma.$queryRaw<Array<{ rule_name: string; count: bigint }>>`
      SELECT rule_description AS rule_name, COUNT(*)::bigint AS count
      FROM alerts
      WHERE tenant_id = ${tenantId}::uuid
        AND timestamp >= ${sinceFilter}
        AND rule_description IS NOT NULL
      GROUP BY rule_description
      ORDER BY count DESC
      LIMIT ${limit}
    `
  }

  async getAvgAlertResolutionMs(tenantId: string, since?: Date): Promise<number> {
    const sinceFilter = since ?? toDay(0).toDate()
    const result = await this.prisma.$queryRaw<Array<{ avg_ms: number | null }>>`
      SELECT AVG(EXTRACT(EPOCH FROM (closed_at - timestamp)) * 1000)::float AS avg_ms
      FROM alerts
      WHERE tenant_id = ${tenantId}::uuid
        AND closed_at IS NOT NULL
        AND timestamp >= ${sinceFilter}
    `
    return result[0]?.avg_ms ?? 0
  }

  /* ---------------------------------------------------------------- */
  /* CASE QUERIES                                                      */
  /* ---------------------------------------------------------------- */

  async countCases(tenantId: string): Promise<number> {
    return this.prisma.case.count({ where: { tenantId } })
  }

  async countCasesByStatus(tenantId: string, status: CaseStatus): Promise<number> {
    return this.prisma.case.count({ where: { tenantId, status } })
  }

  async groupCasesBySeverity(
    tenantId: string
  ): Promise<Array<{ severity: string; _count: number }>> {
    const results = await this.prisma.case.groupBy({
      by: ['severity'],
      where: { tenantId },
      _count: true,
      orderBy: { _count: { severity: 'desc' } },
    })
    return results.map(r => ({ severity: r.severity, _count: r._count }))
  }

  async groupCasesByStatus(tenantId: string): Promise<Array<{ status: string; _count: number }>> {
    const results = await this.prisma.case.groupBy({
      by: ['status'],
      where: { tenantId },
      _count: true,
      orderBy: { _count: { status: 'desc' } },
    })
    return results.map(r => ({ status: r.status, _count: r._count }))
  }

  async getAvgCaseResolutionHours(tenantId: string): Promise<number> {
    const result = await this.prisma.$queryRaw<Array<{ avg_hours: number | null }>>`
      SELECT AVG(EXTRACT(EPOCH FROM (closed_at - created_at)) / 3600)::float AS avg_hours
      FROM cases
      WHERE tenant_id = ${tenantId}::uuid
        AND closed_at IS NOT NULL
    `
    return Math.round((result[0]?.avg_hours ?? 0) * 10) / 10
  }

  /* ---------------------------------------------------------------- */
  /* INCIDENT QUERIES                                                  */
  /* ---------------------------------------------------------------- */

  async countIncidents(tenantId: string): Promise<number> {
    return this.prisma.incident.count({ where: { tenantId } })
  }

  async countIncidentsByStatus(tenantId: string, status: IncidentStatus): Promise<number> {
    return this.prisma.incident.count({ where: { tenantId, status } })
  }

  async groupIncidentsByStatus(
    tenantId: string
  ): Promise<Array<{ status: string; _count: number }>> {
    const results = await this.prisma.incident.groupBy({
      by: ['status'],
      where: { tenantId },
      _count: true,
      orderBy: { _count: { status: 'desc' } },
    })
    return results.map(r => ({ status: r.status, _count: r._count }))
  }

  async groupIncidentsBySeverity(
    tenantId: string
  ): Promise<Array<{ severity: string; _count: number }>> {
    const results = await this.prisma.incident.groupBy({
      by: ['severity'],
      where: { tenantId },
      _count: true,
      orderBy: { _count: { severity: 'desc' } },
    })
    return results.map(r => ({ severity: r.severity, _count: r._count }))
  }

  async getAvgIncidentResolutionHours(tenantId: string): Promise<number> {
    const result = await this.prisma.$queryRaw<Array<{ avg_hours: number | null }>>`
      SELECT AVG(EXTRACT(EPOCH FROM (resolved_at - created_at)) / 3600)::float AS avg_hours
      FROM incidents
      WHERE tenant_id = ${tenantId}::uuid
        AND resolved_at IS NOT NULL
    `
    return Math.round((result[0]?.avg_hours ?? 0) * 100) / 100
  }

  /* ---------------------------------------------------------------- */
  /* COMPLIANCE QUERIES                                                */
  /* ---------------------------------------------------------------- */

  async countComplianceFrameworks(tenantId: string): Promise<number> {
    return this.prisma.complianceFramework.count({ where: { tenantId } })
  }

  async countComplianceControlsByStatus(
    tenantId: string,
    status: ComplianceControlStatus
  ): Promise<number> {
    return this.prisma.complianceControl.count({
      where: { framework: { tenantId }, status },
    })
  }

  async getComplianceFrameworkSummaries(
    tenantId: string
  ): Promise<Array<{ id: string; name: string; standard: string }>> {
    return this.prisma.complianceFramework.findMany({
      where: { tenantId },
      select: { id: true, name: true, standard: true },
      orderBy: { name: 'asc' },
    })
  }

  /* ---------------------------------------------------------------- */
  /* CONNECTOR QUERIES                                                 */
  /* ---------------------------------------------------------------- */

  async countEnabledConnectors(tenantId: string): Promise<number> {
    return this.prisma.connectorConfig.count({
      where: { tenantId, enabled: true },
    })
  }

  async getConnectorSummaries(
    tenantId: string
  ): Promise<Array<{ name: string; type: string; enabled: boolean; lastTestOk: boolean | null }>> {
    return this.prisma.connectorConfig.findMany({
      where: { tenantId },
      select: { name: true, type: true, enabled: true, lastTestOk: true },
      orderBy: { name: 'asc' },
    })
  }

  /* ---------------------------------------------------------------- */
  /* REPORT QUERIES                                                    */
  /* ---------------------------------------------------------------- */

  async countCompletedReports(tenantId: string): Promise<number> {
    return this.prisma.report.count({
      where: { tenantId, status: ReportStatus.COMPLETED },
    })
  }

  /* ---------------------------------------------------------------- */
  /* VULNERABILITY QUERIES                                             */
  /* ---------------------------------------------------------------- */

  async countVulnerabilities(tenantId: string): Promise<number> {
    return this.prisma.vulnerability.count({ where: { tenantId } })
  }

  async groupVulnerabilitiesBySeverity(
    tenantId: string
  ): Promise<Array<{ severity: string; _count: number }>> {
    const results = await this.prisma.vulnerability.groupBy({
      by: ['severity'],
      where: { tenantId },
      _count: true,
      orderBy: { _count: { severity: 'desc' } },
    })
    return results.map(r => ({ severity: r.severity, _count: r._count }))
  }
}
