import { AGENT_DISPLAY_NAMES } from './ai.constants'

export function agentDisabledKey(agentId: string): string {
  return `errors.ai.agent.${agentId}.disabled`
}

export function agentNotConfiguredKey(agentId: string): string {
  return `errors.ai.agent.${agentId}.notConfigured`
}

export function agentUnreachableKey(agentId: string): string {
  return `errors.ai.agent.${agentId}.unreachable`
}

export function agentQuotaExceededKey(agentId: string): string {
  return `errors.ai.agent.${agentId}.quotaExceeded`
}

export function agentDisplayName(agentId: string): string {
  return (Reflect.get(AGENT_DISPLAY_NAMES, agentId) as string) ?? agentId
}
