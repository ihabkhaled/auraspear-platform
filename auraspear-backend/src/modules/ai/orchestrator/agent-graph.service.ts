import { Injectable, Logger } from '@nestjs/common'
import {
  AGENT_ALIAS_MAP,
  FEATURE_TO_AGENT_MAP,
} from '../../agent-config/agent-config.constants'
import { AGENT_DISPLAY_NAMES } from '../../ai/ai.constants'
import { PrismaService } from '../../../prisma/prisma.service'

export interface AgentGraphNode {
  agentId: string
  displayName: string
  isEnabled: boolean
  isCore: boolean
  executionAgent: string | null
  schedules: Array<{ id: string; cronExpression: string; isEnabled: boolean }>
  features: string[]
  lastStatus: string | null
  tokenUsage: number
}

export interface ScheduleHealthSummary {
  totalSchedules: number
  enabledSchedules: number
  disabledSchedules: number
  totalAgents: number
  enabledAgents: number
  coreAgents: number
  specialistAgents: number
}

const CORE_AGENT_IDS = new Set(Object.values(FEATURE_TO_AGENT_MAP))

@Injectable()
export class AgentGraphService {
  private readonly logger = new Logger(AgentGraphService.name)

  constructor(private readonly prisma: PrismaService) {}

  async getAgentGraph(tenantId: string): Promise<AgentGraphNode[]> {
    const agents = await this.prisma.tenantAgentConfig.findMany({
      where: { tenantId },
      orderBy: { agentId: 'asc' },
    })

    const schedules = await this.prisma.aiAgentSchedule.findMany({
      where: { tenantId },
      orderBy: { agentId: 'asc' },
    })

    const featureConfigs = await this.prisma.aiFeatureConfig.findMany({
      where: { tenantId },
    })

    // Build a map of agentId -> feature keys using FEATURE_TO_AGENT_MAP
    const agentFeatureMap = new Map<string, string[]>()
    for (const [featureKey, agentId] of Object.entries(FEATURE_TO_AGENT_MAP)) {
      const existing = agentFeatureMap.get(agentId) ?? []
      // Only include features that are enabled for this tenant
      const config = featureConfigs.find(f => f.featureKey === featureKey)
      if (!config || config.enabled) {
        existing.push(featureKey)
        agentFeatureMap.set(agentId, existing)
      }
    }

    return agents.map(agent => {
      const isCore = CORE_AGENT_IDS.has(agent.agentId as never)
      const alias = AGENT_ALIAS_MAP[agent.agentId] as string | undefined

      const agentSchedules = schedules
        .filter(s => s.agentId === agent.agentId)
        .map(s => ({
          id: s.id,
          cronExpression: s.cronExpression,
          isEnabled: s.isEnabled,
        }))

      const features = agentFeatureMap.get(agent.agentId) ?? []

      return {
        agentId: agent.agentId,
        displayName: AGENT_DISPLAY_NAMES[agent.agentId] ?? agent.agentId,
        isEnabled: agent.isEnabled,
        isCore,
        executionAgent: isCore ? null : (alias ?? null),
        schedules: agentSchedules,
        features,
        lastStatus: null,
        tokenUsage: agent.tokensUsedMonth,
      }
    })
  }

  async getScheduleHealth(tenantId: string): Promise<ScheduleHealthSummary> {
    const [agents, schedules] = await Promise.all([
      this.prisma.tenantAgentConfig.findMany({ where: { tenantId } }),
      this.prisma.aiAgentSchedule.findMany({ where: { tenantId } }),
    ])

    const coreCount = agents.filter(a => CORE_AGENT_IDS.has(a.agentId as never)).length

    return {
      totalSchedules: schedules.length,
      enabledSchedules: schedules.filter(s => s.isEnabled).length,
      disabledSchedules: schedules.filter(s => !s.isEnabled).length,
      totalAgents: agents.length,
      enabledAgents: agents.filter(a => a.isEnabled).length,
      coreAgents: coreCount,
      specialistAgents: agents.length - coreCount,
    }
  }
}
