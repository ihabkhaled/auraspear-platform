import { CORE_AGENT_IDS } from './agent-graph.constants'
import { AGENT_ALIAS_MAP, FEATURE_TO_AGENT_MAP } from '../../agent-config/agent-config.constants'
import { AGENT_DISPLAY_NAMES } from '../../ai/ai.constants'
import type { AgentGraphNode } from './agent-graph.types'
import type { AiAgentSchedule, AiFeatureConfig, TenantAgentConfig } from '@prisma/client'

export function buildAgentFeatureMap(featureConfigs: AiFeatureConfig[]): Map<string, string[]> {
  const agentFeatureMap = new Map<string, string[]>()
  for (const [featureKey, agentId] of Object.entries(FEATURE_TO_AGENT_MAP)) {
    const existing = agentFeatureMap.get(agentId) ?? []
    const config = featureConfigs.find(f => f.featureKey === featureKey)
    if (!config || config.enabled) {
      existing.push(featureKey)
      agentFeatureMap.set(agentId, existing)
    }
  }
  return agentFeatureMap
}

export function buildAgentGraphNode(
  agent: TenantAgentConfig,
  schedules: AiAgentSchedule[],
  agentFeatureMap: Map<string, string[]>
): AgentGraphNode {
  const isCore = CORE_AGENT_IDS.has(agent.agentId as never)
  const alias = AGENT_ALIAS_MAP[agent.agentId] as string | undefined

  const agentSchedules = schedules
    .filter(s => s.agentId === agent.agentId)
    .map(s => ({ id: s.id, cronExpression: s.cronExpression, isEnabled: s.isEnabled }))

  return {
    agentId: agent.agentId,
    displayName: AGENT_DISPLAY_NAMES[agent.agentId] ?? agent.agentId,
    isEnabled: agent.isEnabled,
    isCore,
    executionAgent: isCore ? null : (alias ?? null),
    schedules: agentSchedules,
    features: agentFeatureMap.get(agent.agentId) ?? [],
    lastStatus: null,
    tokenUsage: agent.tokensUsedMonth,
  }
}
