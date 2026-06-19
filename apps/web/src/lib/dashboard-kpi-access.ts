import { Permission } from '@/enums'
import type {
  AiAgentStats,
  AttackPathStats,
  ConnectorStats,
  ComplianceStatsSource,
  ExtendedKpiAccess,
  ExtendedKPIStats,
  IncidentStats,
  JobRuntimeStats,
  SoarStats,
  SoarStatsSource,
  SystemHealthStats,
  UebaStats,
  VulnerabilityStats,
} from '@/types'

export function getExtendedKpiAccess(permissions: string[]): ExtendedKpiAccess {
  const permissionSet = new Set(permissions)

  return {
    openIncidents: permissionSet.has(Permission.INCIDENTS_VIEW),
    criticalVulnerabilities: permissionSet.has(Permission.VULNERABILITIES_VIEW),
    highRiskEntities: permissionSet.has(Permission.UEBA_VIEW),
    activeAttackPaths: permissionSet.has(Permission.ATTACK_PATHS_VIEW),
    complianceScore: permissionSet.has(Permission.COMPLIANCE_VIEW),
    soarExecutions: permissionSet.has(Permission.SOAR_VIEW),
    systemHealthScore: permissionSet.has(Permission.SYSTEM_HEALTH_VIEW),
    jobBacklog: permissionSet.has(Permission.JOBS_VIEW),
    onlineAiAgents: permissionSet.has(Permission.AI_AGENTS_VIEW),
    failingConnectors: permissionSet.has(Permission.CONNECTORS_VIEW),
  }
}

export function normalizeSoarStats(source: SoarStatsSource | null | undefined): SoarStats {
  const successfulExecutions = source?.successfulExecutions ?? 0
  const failedExecutions = source?.failedExecutions ?? 0
  const completedExecutionCount = successfulExecutions + failedExecutions

  const successRate =
    source?.successRate ??
    (completedExecutionCount > 0 ? (successfulExecutions / completedExecutionCount) * 100 : null)

  const avgDurationSeconds =
    source?.avgDurationSeconds ??
    (typeof source?.avgExecutionTimeMs === 'number' ? source.avgExecutionTimeMs / 1000 : null)

  return {
    totalPlaybooks: source?.totalPlaybooks ?? 0,
    activePlaybooks: source?.activePlaybooks ?? 0,
    totalExecutions30d: source?.totalExecutions30d ?? source?.totalExecutions ?? 0,
    successRate,
    avgDurationSeconds,
  }
}

function computeHealthScore(stats: SystemHealthStats): number {
  if (stats.totalServices <= 0) {
    return 0
  }

  return Math.round((stats.healthyServices / stats.totalServices) * 100)
}

export function buildExtendedKpiStats(params: {
  access: ExtendedKpiAccess
  incidents: IncidentStats
  vulnerabilities: VulnerabilityStats
  ueba: UebaStats
  attackPaths: AttackPathStats
  compliance: ComplianceStatsSource
  soar: SoarStats
  systemHealth: SystemHealthStats
  jobs: JobRuntimeStats
  aiAgents: AiAgentStats
  connectors: ConnectorStats
}): ExtendedKPIStats {
  return {
    ...(params.access.openIncidents
      ? {
          openIncidents: params.incidents.open + params.incidents.inProgress,
        }
      : {}),
    ...(params.access.criticalVulnerabilities
      ? {
          criticalVulnerabilities: params.vulnerabilities.critical,
        }
      : {}),
    ...(params.access.highRiskEntities
      ? {
          highRiskEntities: params.ueba.criticalRiskEntities + params.ueba.highRiskEntities,
        }
      : {}),
    ...(params.access.activeAttackPaths
      ? {
          activeAttackPaths: params.attackPaths.activePaths,
        }
      : {}),
    ...(params.access.complianceScore
      ? {
          complianceScore:
            params.compliance.avgComplianceScore ??
            params.compliance.overallComplianceScore ??
            null,
        }
      : {}),
    ...(params.access.soarExecutions
      ? {
          soarExecutions: params.soar.totalExecutions30d,
        }
      : {}),
    ...(params.access.systemHealthScore
      ? {
          systemHealthScore: computeHealthScore(params.systemHealth),
        }
      : {}),
    ...(params.access.jobBacklog
      ? {
          jobBacklog:
            params.jobs.pending + params.jobs.running + params.jobs.retrying + params.jobs.delayed,
        }
      : {}),
    ...(params.access.onlineAiAgents
      ? {
          onlineAiAgents: params.aiAgents.onlineAgents,
        }
      : {}),
    ...(params.access.failingConnectors
      ? {
          failingConnectors: params.connectors.failingConnectors,
        }
      : {}),
  }
}
