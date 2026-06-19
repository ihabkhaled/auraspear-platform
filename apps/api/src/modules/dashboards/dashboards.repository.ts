import { Injectable } from '@nestjs/common'
import {
  DASHBOARD_TOP_DETECTION_RULES_LIMIT,
  DASHBOARD_TOP_FAILING_CONNECTORS_LIMIT,
  OPEN_CASE_STATUSES,
  QUEUED_JOB_STATUSES,
  RESOLVED_ALERT_STATUSES,
} from './dashboards.constants'
import {
  AiAgentSessionStatus,
  AiAgentStatus,
  AlertSeverity,
  AttackPathStatus,
  CloudFindingSeverity,
  CloudFindingStatus,
  ComplianceControlStatus,
  ConnectorType,
  DetectionRuleStatus,
  IncidentStatus,
  ReportStatus,
  SoarExecutionStatus,
  SyncJobStatus,
  VulnerabilitySeverity,
} from '../../common/enums'
import { PrismaService } from '../../prisma/prisma.service'
import { JobStatus, JobType } from '../jobs/enums/job.enums'
import type {
  AlertTrendRow,
  AvgHoursRow,
  AvgMsRow,
  AvgPercentageRow,
  ConnectorFailureRow,
  ConnectorRow,
  DashboardAiSessionStatusRow,
  DashboardConnectorSyncStatusRow,
  DashboardIncidentStatusCountRow,
  DashboardSeverityCountRow,
  DashboardSoarStatusRow,
  DetectionRulePerformanceRow,
  MitreTechniqueRow,
  RecentNotificationRow,
  TopAssetRow,
} from './dashboards.types'

@Injectable()
export class DashboardsRepository {
  constructor(private readonly prisma: PrismaService) {}

  async countOpenCases(tenantId: string): Promise<number> {
    return this.prisma.case.count({
      where: {
        tenantId,
        status: { in: [...OPEN_CASE_STATUSES] },
      },
    })
  }

  async countAlertsSince(tenantId: string, since: Date): Promise<number> {
    return this.prisma.alert.count({
      where: { tenantId, timestamp: { gte: since } },
    })
  }

  async countResolvedAlertsSince(tenantId: string, since: Date): Promise<number> {
    return this.prisma.alert.count({
      where: {
        tenantId,
        status: { in: [...RESOLVED_ALERT_STATUSES] },
        closedAt: { gte: since },
      },
    })
  }

  async getAvgResolutionMsSince(tenantId: string, since: Date): Promise<AvgMsRow[]> {
    return this.prisma.$queryRaw<AvgMsRow[]>`
      SELECT AVG(EXTRACT(EPOCH FROM (closed_at - timestamp)) * 1000)::float AS avg_ms
      FROM alerts
      WHERE tenant_id = ${tenantId}::uuid
        AND closed_at IS NOT NULL
        AND timestamp >= ${since}
    `
  }

  async countAlertsBetween(tenantId: string, from: Date, to: Date): Promise<number> {
    return this.prisma.alert.count({
      where: { tenantId, timestamp: { gte: from, lte: to } },
    })
  }

  async countAlertsBetweenExclusiveEnd(tenantId: string, from: Date, to: Date): Promise<number> {
    return this.prisma.alert.count({
      where: { tenantId, timestamp: { gte: from, lt: to } },
    })
  }

  async countCriticalAlertsBetween(tenantId: string, from: Date, to: Date): Promise<number> {
    return this.prisma.alert.count({
      where: {
        tenantId,
        severity: AlertSeverity.CRITICAL,
        timestamp: { gte: from, lte: to },
      },
    })
  }

  async countCriticalAlertsBetweenExclusiveEnd(
    tenantId: string,
    from: Date,
    to: Date
  ): Promise<number> {
    return this.prisma.alert.count({
      where: {
        tenantId,
        severity: AlertSeverity.CRITICAL,
        timestamp: { gte: from, lt: to },
      },
    })
  }

  async countCasesCreatedBetween(tenantId: string, from: Date, to: Date): Promise<number> {
    return this.prisma.case.count({
      where: { tenantId, createdAt: { gte: from, lte: to } },
    })
  }

  async countCasesCreatedBetweenExclusiveEnd(
    tenantId: string,
    from: Date,
    to: Date
  ): Promise<number> {
    return this.prisma.case.count({
      where: { tenantId, createdAt: { gte: from, lt: to } },
    })
  }

  async getAvgResolutionMsBetween(tenantId: string, from: Date, to: Date): Promise<AvgMsRow[]> {
    return this.prisma.$queryRaw<AvgMsRow[]>`
      SELECT AVG(EXTRACT(EPOCH FROM (closed_at - timestamp)) * 1000)::float AS avg_ms
      FROM alerts
      WHERE tenant_id = ${tenantId}::uuid
        AND closed_at IS NOT NULL
        AND closed_at >= ${from}
        AND closed_at <= ${to}
    `
  }

  async getAvgResolutionMsBetweenExclusiveEnd(
    tenantId: string,
    from: Date,
    to: Date
  ): Promise<AvgMsRow[]> {
    return this.prisma.$queryRaw<AvgMsRow[]>`
      SELECT AVG(EXTRACT(EPOCH FROM (closed_at - timestamp)) * 1000)::float AS avg_ms
      FROM alerts
      WHERE tenant_id = ${tenantId}::uuid
        AND closed_at IS NOT NULL
        AND closed_at >= ${from}
        AND closed_at < ${to}
    `
  }

  async getAlertCountsByDateAndSeverity(
    tenantId: string,
    since: Date,
    until: Date
  ): Promise<AlertTrendRow[]> {
    return this.prisma.$queryRaw<AlertTrendRow[]>`
      SELECT DATE(timezone('UTC', timestamp))::text AS date, severity, COUNT(*)::bigint AS count
      FROM alerts
      WHERE tenant_id = ${tenantId}::uuid
        AND timestamp >= ${since}
        AND timestamp < ${until}
      GROUP BY DATE(timezone('UTC', timestamp)), severity
      ORDER BY date ASC
    `
  }

  async groupAlertsBySeveritySince(
    tenantId: string,
    since: Date
  ): Promise<DashboardSeverityCountRow[]> {
    const results = await this.prisma.alert.groupBy({
      by: ['severity'],
      where: { tenantId, timestamp: { gte: since } },
      _count: true,
    })

    return results.map(result => ({
      severity: result.severity as AlertSeverity,
      _count: result._count,
    }))
  }

  async getTopMitreTechniques(tenantId: string, since: Date): Promise<MitreTechniqueRow[]> {
    return this.prisma.$queryRaw<MitreTechniqueRow[]>`
      SELECT unnest(mitre_techniques) AS technique, COUNT(*)::bigint AS count
      FROM alerts
      WHERE tenant_id = ${tenantId}::uuid
        AND timestamp >= ${since}
      GROUP BY technique
      ORDER BY count DESC
      LIMIT 10
    `
  }

  async getTopTargetedAssets(tenantId: string, since: Date): Promise<TopAssetRow[]> {
    return this.prisma.$queryRaw<TopAssetRow[]>`
      SELECT
        agent_name AS hostname,
        COUNT(*)::bigint AS alert_count,
        COUNT(*) FILTER (WHERE severity = ${AlertSeverity.CRITICAL}::"AlertSeverity")::bigint AS critical_count,
        MAX(timestamp) AS last_seen
      FROM alerts
      WHERE tenant_id = ${tenantId}::uuid
        AND agent_name IS NOT NULL
        AND timestamp >= ${since}
      GROUP BY agent_name
      ORDER BY alert_count DESC
      LIMIT 10
    `
  }

  async findEnabledConnectors(tenantId: string): Promise<ConnectorRow[]> {
    const results = await this.prisma.connectorConfig.findMany({
      where: { tenantId, enabled: true },
      select: {
        type: true,
        name: true,
        lastTestAt: true,
        lastTestOk: true,
        lastError: true,
      },
    })

    return results.map(result => ({
      type: result.type as ConnectorType,
      name: result.name,
      lastTestAt: result.lastTestAt,
      lastTestOk: result.lastTestOk,
      lastError: result.lastError,
    }))
  }

  async findRecentNotifications(tenantId: string, limit: number): Promise<RecentNotificationRow[]> {
    return this.prisma.notification.findMany({
      where: { tenantId },
      orderBy: { createdAt: 'desc' },
      take: limit,
      select: {
        id: true,
        type: true,
        actorUserId: true,
        title: true,
        message: true,
        readAt: true,
        createdAt: true,
      },
    })
  }

  async findUsersByIds(ids: string[]): Promise<Array<{ id: string; name: string | null }>> {
    return this.prisma.user.findMany({
      where: { id: { in: ids } },
      select: { id: true, name: true },
    })
  }

  async countNotifications(tenantId: string): Promise<number> {
    return this.prisma.notification.count({ where: { tenantId } })
  }

  async countOpenIncidents(tenantId: string): Promise<number> {
    return this.prisma.incident.count({
      where: {
        tenantId,
        status: {
          in: [IncidentStatus.OPEN, IncidentStatus.IN_PROGRESS, IncidentStatus.CONTAINED],
        },
      },
    })
  }

  async countVulnerabilitiesBySeverity(
    tenantId: string,
    severity: VulnerabilitySeverity
  ): Promise<number> {
    return this.prisma.vulnerability.count({
      where: { tenantId, severity },
    })
  }

  async countExploitAvailableVulnerabilities(tenantId: string): Promise<number> {
    return this.prisma.vulnerability.count({
      where: {
        tenantId,
        exploitAvailable: true,
      },
    })
  }

  async countAttackPathsByStatus(tenantId: string, status: AttackPathStatus): Promise<number> {
    return this.prisma.attackPath.count({
      where: { tenantId, status },
    })
  }

  async countAiAgentsByStatus(tenantId: string, status: AiAgentStatus): Promise<number> {
    return this.prisma.aiAgent.count({
      where: { tenantId, status },
    })
  }

  async countAiAgentSessionsSince(tenantId: string, since: Date): Promise<number> {
    return this.prisma.aiAgentSession.count({
      where: {
        agent: { tenantId },
        startedAt: { gte: since },
      },
    })
  }

  async countJobs(tenantId: string): Promise<number> {
    return this.prisma.job.count({
      where: { tenantId },
    })
  }

  async countJobsByStatus(tenantId: string, status: JobStatus): Promise<number> {
    return this.prisma.job.count({
      where: { tenantId, status },
    })
  }

  async countDelayedJobs(tenantId: string, scheduledAfter: Date): Promise<number> {
    return this.prisma.job.count({
      where: {
        tenantId,
        status: { in: [...QUEUED_JOB_STATUSES] },
        scheduledAt: { gt: scheduledAfter },
      },
    })
  }

  async countComplianceFrameworks(tenantId: string): Promise<number> {
    return this.prisma.complianceFramework.count({
      where: { tenantId },
    })
  }

  async countComplianceControlsByStatus(
    tenantId: string,
    status: ComplianceControlStatus
  ): Promise<number> {
    return this.prisma.complianceControl.count({
      where: {
        framework: { tenantId },
        status,
      },
    })
  }

  async countCompletedReports(tenantId: string): Promise<number> {
    return this.prisma.report.count({
      where: {
        tenantId,
        status: ReportStatus.COMPLETED,
      },
    })
  }

  async countCompletedReportsSince(tenantId: string, since: Date): Promise<number> {
    return this.prisma.report.count({
      where: {
        tenantId,
        status: ReportStatus.COMPLETED,
        generatedAt: { gte: since },
      },
    })
  }

  async countAvailableReportTemplates(tenantId: string): Promise<number> {
    return this.prisma.reportTemplate.count({
      where: {
        OR: [{ tenantId }, { tenantId: null, isSystem: true }],
      },
    })
  }

  async groupIncidentsByStatus(tenantId: string): Promise<DashboardIncidentStatusCountRow[]> {
    const results = await this.prisma.incident.groupBy({
      by: ['status'],
      where: { tenantId },
      _count: true,
    })

    return results.map(result => ({
      status: result.status as IncidentStatus,
      _count: result._count,
    }))
  }

  async countUnassignedOpenCases(tenantId: string): Promise<number> {
    return this.prisma.case.count({
      where: {
        tenantId,
        status: { in: [...OPEN_CASE_STATUSES] },
        ownerUserId: null,
      },
    })
  }

  async countOpenCasesOlderThan(tenantId: string, before: Date): Promise<number> {
    return this.prisma.case.count({
      where: {
        tenantId,
        status: { in: [...OPEN_CASE_STATUSES] },
        createdAt: { lte: before },
      },
    })
  }

  async getAverageOpenCaseAgeHours(tenantId: string): Promise<AvgHoursRow[]> {
    return this.prisma.$queryRaw<AvgHoursRow[]>`
      SELECT AVG(EXTRACT(EPOCH FROM (NOW() - created_at)) / 3600)::float AS avg_hours
      FROM cases
      WHERE tenant_id = ${tenantId}::uuid
        AND status IN (
          ${OPEN_CASE_STATUSES[0]}::"CaseStatus",
          ${OPEN_CASE_STATUSES[1]}::"CaseStatus"
        )
    `
  }

  async countActiveDetectionRules(tenantId: string): Promise<number> {
    return this.prisma.detectionRule.count({
      where: {
        tenantId,
        status: DetectionRuleStatus.ACTIVE,
      },
    })
  }

  async findTopDetectionRules(
    tenantId: string,
    limit: number = DASHBOARD_TOP_DETECTION_RULES_LIMIT
  ): Promise<DetectionRulePerformanceRow[]> {
    return this.prisma.detectionRule.findMany({
      where: {
        tenantId,
        status: DetectionRuleStatus.ACTIVE,
      },
      orderBy: [{ hitCount: 'desc' }, { falsePositiveCount: 'desc' }, { createdAt: 'asc' }],
      take: limit,
      select: {
        id: true,
        name: true,
        hitCount: true,
        falsePositiveCount: true,
        lastTriggeredAt: true,
        createdAt: true,
      },
    })
  }

  async findTopNoisyDetectionRules(
    tenantId: string,
    limit: number = DASHBOARD_TOP_DETECTION_RULES_LIMIT
  ): Promise<DetectionRulePerformanceRow[]> {
    return this.prisma.detectionRule.findMany({
      where: {
        tenantId,
        status: DetectionRuleStatus.ACTIVE,
      },
      orderBy: [{ falsePositiveCount: 'desc' }, { hitCount: 'desc' }, { lastTriggeredAt: 'desc' }],
      take: limit,
      select: {
        id: true,
        name: true,
        hitCount: true,
        falsePositiveCount: true,
        lastTriggeredAt: true,
        createdAt: true,
      },
    })
  }

  async groupConnectorSyncJobsByStatusSince(
    tenantId: string,
    since: Date
  ): Promise<DashboardConnectorSyncStatusRow[]> {
    const results = await this.prisma.connectorSyncJob.groupBy({
      by: ['status'],
      where: {
        tenantId,
        startedAt: { gte: since },
      },
      _count: true,
    })

    return results.map(result => ({
      status: result.status as SyncJobStatus,
      _count: result._count,
    }))
  }

  async getTopFailingConnectorTypes(
    tenantId: string,
    since: Date,
    limit: number = DASHBOARD_TOP_FAILING_CONNECTORS_LIMIT
  ): Promise<ConnectorFailureRow[]> {
    const results = await this.prisma.connectorSyncJob.groupBy({
      by: ['connectorType'],
      where: {
        tenantId,
        status: SyncJobStatus.FAILED,
        startedAt: { gte: since },
      },
      _count: true,
      orderBy: {
        _count: {
          connectorType: 'desc',
        },
      },
      take: limit,
    })

    return results.map(result => ({
      connectorType: result.connectorType as ConnectorType,
      failures: result._count,
    }))
  }

  async countJobsByTypeAndStatuses(
    tenantId: string,
    type: JobType,
    statuses: JobStatus[]
  ): Promise<number> {
    return this.prisma.job.count({
      where: {
        tenantId,
        type,
        status: { in: statuses },
      },
    })
  }

  async countStaleRunningJobs(tenantId: string, startedBefore: Date): Promise<number> {
    return this.prisma.job.count({
      where: {
        tenantId,
        status: JobStatus.RUNNING,
        startedAt: { lt: startedBefore },
      },
    })
  }

  async groupAiAgentSessionsByStatusSince(
    tenantId: string,
    since: Date
  ): Promise<DashboardAiSessionStatusRow[]> {
    const results = await this.prisma.aiAgentSession.groupBy({
      by: ['status'],
      where: {
        agent: { tenantId },
        startedAt: { gte: since },
      },
      _count: true,
    })

    return results.map(result => ({
      status: result.status as AiAgentSessionStatus,
      _count: result._count,
    }))
  }

  async getAverageAiSessionDurationMsSince(tenantId: string, since: Date): Promise<AvgMsRow[]> {
    return this.prisma.$queryRaw<AvgMsRow[]>`
      SELECT AVG(duration_ms)::float AS avg_ms
      FROM ai_agent_sessions session
      INNER JOIN ai_agents agent ON session.agent_id = agent.id
      WHERE agent.tenant_id = ${tenantId}::uuid
        AND session.started_at >= ${since}
    `
  }

  async groupSoarExecutionsByStatusSince(
    tenantId: string,
    since: Date
  ): Promise<DashboardSoarStatusRow[]> {
    const results = await this.prisma.soarExecution.groupBy({
      by: ['status'],
      where: {
        tenantId,
        startedAt: { gte: since },
      },
      _count: true,
    })

    return results.map(result => ({
      status: result.status as SoarExecutionStatus,
      _count: result._count,
    }))
  }

  async getAverageSoarCompletionRateSince(
    tenantId: string,
    since: Date
  ): Promise<AvgPercentageRow[]> {
    return this.prisma.$queryRaw<AvgPercentageRow[]>`
      SELECT AVG((steps_completed::float / NULLIF(total_steps, 0)) * 100)::float AS avg_percentage
      FROM soar_executions
      WHERE tenant_id = ${tenantId}::uuid
        AND started_at >= ${since}
        AND total_steps > 0
        AND status IN (
          ${SoarExecutionStatus.COMPLETED}::"SoarExecutionStatus",
          ${SoarExecutionStatus.FAILED}::"SoarExecutionStatus"
        )
    `
  }

  async countCloudFindingsByStatus(tenantId: string, status: CloudFindingStatus): Promise<number> {
    return this.prisma.cloudFinding.count({
      where: {
        tenantId,
        status,
      },
    })
  }

  async countCloudFindingsBySeverity(
    tenantId: string,
    severity: CloudFindingSeverity
  ): Promise<number> {
    return this.prisma.cloudFinding.count({
      where: {
        tenantId,
        severity,
      },
    })
  }
}
