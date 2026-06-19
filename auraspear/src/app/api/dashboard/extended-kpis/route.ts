import { type NextRequest } from 'next/server'
import { fetchBackendJson, jsonNoStore } from '@/lib/backend-proxy'
import {
  buildExtendedKpiStats,
  getExtendedKpiAccess,
  normalizeSoarStats,
} from '@/lib/dashboard-kpi-access'
import { fetchStatsSafe } from '@/lib/dashboard.utils'
import type {
  AiAgentStats,
  ComplianceStatsSource,
  ConnectorStats,
  IncidentStats,
  JobRuntimeStats,
  MeResponse,
  SoarStatsSource,
  VulnerabilityStats,
  UebaStats,
  AttackPathStats,
  SystemHealthStats,
} from '@/types'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const { data: meData } = await fetchBackendJson(request, '/auth/me')
    const permissions = (meData as MeResponse | null)?.permissions ?? []
    const access = getExtendedKpiAccess(permissions)

    const [
      incidents,
      vulnerabilities,
      ueba,
      attackPaths,
      compliance,
      soarSource,
      systemHealth,
      jobs,
      aiAgents,
      connectors,
    ] = await Promise.all([
      access.openIncidents
        ? fetchStatsSafe<IncidentStats>(request, '/incidents/stats', {
            open: 0,
            inProgress: 0,
            contained: 0,
            resolved30d: 0,
            avgResolveHours: null,
          })
        : Promise.resolve({
            open: 0,
            inProgress: 0,
            contained: 0,
            resolved30d: 0,
            avgResolveHours: null,
          }),
      access.criticalVulnerabilities
        ? fetchStatsSafe<VulnerabilityStats>(request, '/vulnerabilities/stats', {
            critical: 0,
            high: 0,
            medium: 0,
            patched30d: 0,
            exploitAvailable: 0,
          })
        : Promise.resolve({
            critical: 0,
            high: 0,
            medium: 0,
            patched30d: 0,
            exploitAvailable: 0,
          }),
      access.highRiskEntities
        ? fetchStatsSafe<UebaStats>(request, '/ueba/stats', {
            totalEntities: 0,
            criticalRiskEntities: 0,
            highRiskEntities: 0,
            anomalies24h: 0,
            activeModels: 0,
          })
        : Promise.resolve({
            totalEntities: 0,
            criticalRiskEntities: 0,
            highRiskEntities: 0,
            anomalies24h: 0,
            activeModels: 0,
          }),
      access.activeAttackPaths
        ? fetchStatsSafe<AttackPathStats>(request, '/attack-paths/stats', {
            activePaths: 0,
            assetsAtRisk: 0,
            avgKillChainCoverage: 0,
          })
        : Promise.resolve({
            activePaths: 0,
            assetsAtRisk: 0,
            avgKillChainCoverage: 0,
          }),
      access.complianceScore
        ? fetchStatsSafe<ComplianceStatsSource>(request, '/compliance/stats', {
            totalFrameworks: 0,
            avgComplianceScore: null,
            overallComplianceScore: null,
            passedControls: 0,
            failedControls: 0,
            notAssessedControls: 0,
          })
        : Promise.resolve({
            totalFrameworks: 0,
            avgComplianceScore: null,
            overallComplianceScore: null,
            passedControls: 0,
            failedControls: 0,
            notAssessedControls: 0,
          }),
      access.soarExecutions
        ? fetchStatsSafe<SoarStatsSource>(request, '/soar/stats', {})
        : Promise.resolve({}),
      access.systemHealthScore
        ? fetchStatsSafe<SystemHealthStats>(request, '/system-health/stats', {
            totalServices: 0,
            healthyServices: 0,
            degradedServices: 0,
            downServices: 0,
            avgResponseTimeMs: null,
            lastCheckedAt: null,
          })
        : Promise.resolve({
            totalServices: 0,
            healthyServices: 0,
            degradedServices: 0,
            downServices: 0,
            avgResponseTimeMs: null,
            lastCheckedAt: null,
          }),
      access.jobBacklog
        ? fetchStatsSafe<JobRuntimeStats>(request, '/jobs/stats', {
            total: 0,
            pending: 0,
            running: 0,
            retrying: 0,
            failed: 0,
            completed: 0,
            cancelled: 0,
            delayed: 0,
            staleRunning: 0,
            typeBreakdown: [],
          })
        : Promise.resolve({
            total: 0,
            pending: 0,
            running: 0,
            retrying: 0,
            failed: 0,
            completed: 0,
            cancelled: 0,
            delayed: 0,
            staleRunning: 0,
            typeBreakdown: [],
          }),
      access.onlineAiAgents
        ? fetchStatsSafe<AiAgentStats>(request, '/ai-agents/stats', {
            totalAgents: 0,
            onlineAgents: 0,
            totalSessions: 0,
            totalTokens: 0,
            totalCost: 0,
          })
        : Promise.resolve({
            totalAgents: 0,
            onlineAgents: 0,
            totalSessions: 0,
            totalTokens: 0,
            totalCost: 0,
          }),
      access.failingConnectors
        ? fetchStatsSafe<ConnectorStats>(request, '/connectors/stats', {
            totalConnectors: 0,
            enabledConnectors: 0,
            healthyConnectors: 0,
            failingConnectors: 0,
            untestedConnectors: 0,
          })
        : Promise.resolve({
            totalConnectors: 0,
            enabledConnectors: 0,
            healthyConnectors: 0,
            failingConnectors: 0,
            untestedConnectors: 0,
          }),
    ])

    const data = buildExtendedKpiStats({
      access,
      incidents,
      vulnerabilities,
      ueba,
      attackPaths,
      compliance,
      soar: normalizeSoarStats(soarSource),
      systemHealth,
      jobs,
      aiAgents,
      connectors,
    })

    return jsonNoStore({ data })
  } catch (error) {
    console.error('[dashboard/extended-kpis]', error)
    return jsonNoStore({ data: null, error: 'Internal server error' }, { status: 502 })
  }
}
