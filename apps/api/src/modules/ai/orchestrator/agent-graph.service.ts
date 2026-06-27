import { Injectable, Logger } from '@nestjs/common'
import { CORE_AGENT_IDS } from './agent-graph.constants'
import { AgentGraphRepository } from './agent-graph.repository'
import { buildAgentFeatureMap, buildAgentGraphNode } from './agent-graph.utilities'
import type { AgentGraphNode, ScheduleHealthSummary } from './agent-graph.types'

@Injectable()
export class AgentGraphService {
  private readonly logger = new Logger(AgentGraphService.name)

  constructor(private readonly agentGraphRepository: AgentGraphRepository) {}

  async getAgentGraph(tenantId: string): Promise<AgentGraphNode[]> {
    const [agents, schedules, featureConfigs] = await Promise.all([
      this.agentGraphRepository.findAgentConfigs(tenantId),
      this.agentGraphRepository.findAgentSchedules(tenantId),
      this.agentGraphRepository.findFeatureConfigs(tenantId),
    ])

    const agentFeatureMap = buildAgentFeatureMap(featureConfigs)
    return agents.map(agent => buildAgentGraphNode(agent, schedules, agentFeatureMap))
  }

  async getScheduleHealth(tenantId: string): Promise<ScheduleHealthSummary> {
    const [agents, schedules] = await Promise.all([
      this.agentGraphRepository.findAgentConfigs(tenantId),
      this.agentGraphRepository.findAgentSchedules(tenantId),
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
