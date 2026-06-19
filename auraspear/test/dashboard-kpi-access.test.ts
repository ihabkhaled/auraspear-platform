import { describe, expect, it } from 'vitest'
import { Permission } from '@/enums'
import {
  buildExtendedKpiStats,
  getExtendedKpiAccess,
  normalizeSoarStats,
} from '@/lib/dashboard-kpi-access'

describe('dashboard KPI access helpers', () => {
  it('normalizes backend SOAR stats into the frontend SOAR shape', () => {
    expect(
      normalizeSoarStats({
        totalPlaybooks: 4,
        activePlaybooks: 2,
        totalExecutions: 17,
        successfulExecutions: 12,
        failedExecutions: 3,
        avgExecutionTimeMs: 2500,
      })
    ).toEqual({
      totalPlaybooks: 4,
      activePlaybooks: 2,
      totalExecutions30d: 17,
      successRate: 80,
      avgDurationSeconds: 2.5,
    })
  })

  it('maps permissions to extended KPI visibility', () => {
    expect(
      getExtendedKpiAccess([
        Permission.INCIDENTS_VIEW,
        Permission.SOAR_VIEW,
        Permission.SYSTEM_HEALTH_VIEW,
        Permission.JOBS_VIEW,
        Permission.AI_AGENTS_VIEW,
      ])
    ).toEqual({
      openIncidents: true,
      criticalVulnerabilities: false,
      highRiskEntities: false,
      activeAttackPaths: false,
      complianceScore: false,
      soarExecutions: true,
      systemHealthScore: true,
      jobBacklog: true,
      onlineAiAgents: true,
      failingConnectors: false,
    })
  })

  it('omits unauthorized KPI values when building the extended KPI response', () => {
    const stats = buildExtendedKpiStats({
      access: {
        openIncidents: true,
        criticalVulnerabilities: false,
        highRiskEntities: false,
        activeAttackPaths: true,
        complianceScore: false,
        soarExecutions: true,
        systemHealthScore: false,
        jobBacklog: true,
        onlineAiAgents: true,
        failingConnectors: true,
      },
      incidents: {
        open: 9,
        inProgress: 2,
        contained: 0,
        resolved30d: 0,
        avgResolveHours: null,
      },
      vulnerabilities: {
        critical: 7,
        high: 4,
        medium: 1,
        patched30d: 0,
        exploitAvailable: 0,
      },
      ueba: {
        totalEntities: 0,
        criticalRiskEntities: 0,
        highRiskEntities: 0,
        anomalies24h: 0,
        activeModels: 0,
      },
      attackPaths: {
        activePaths: 5,
        assetsAtRisk: 2,
        avgKillChainCoverage: 40,
      },
      compliance: {
        totalFrameworks: 0,
        avgComplianceScore: 76,
        overallComplianceScore: null,
        passedControls: 0,
        failedControls: 0,
        notAssessedControls: 0,
      },
      soar: {
        totalPlaybooks: 1,
        activePlaybooks: 1,
        totalExecutions30d: 23,
        successRate: 90,
        avgDurationSeconds: 11,
      },
      systemHealth: {
        totalServices: 4,
        healthyServices: 4,
        degradedServices: 0,
        downServices: 0,
        avgResponseTimeMs: null,
        lastCheckedAt: null,
      },
      jobs: {
        total: 8,
        pending: 2,
        running: 1,
        retrying: 1,
        failed: 2,
        completed: 2,
        cancelled: 0,
        delayed: 1,
        staleRunning: 0,
        typeBreakdown: [],
      },
      aiAgents: {
        totalAgents: 4,
        onlineAgents: 3,
        totalSessions: 22,
        totalTokens: 1200,
        totalCost: 2.4,
      },
      connectors: {
        totalConnectors: 8,
        enabledConnectors: 6,
        healthyConnectors: 4,
        failingConnectors: 2,
        untestedConnectors: 2,
      },
    })

    expect(stats).toEqual({
      openIncidents: 11,
      criticalVulnerabilities: undefined,
      highRiskEntities: undefined,
      activeAttackPaths: 5,
      complianceScore: undefined,
      soarExecutions: 23,
      systemHealthScore: undefined,
      jobBacklog: 5,
      onlineAiAgents: 3,
      failingConnectors: 2,
    })
  })
})
