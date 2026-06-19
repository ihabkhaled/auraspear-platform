import { resolveExecutionAgent, AGENT_ALIAS_MAP, FEATURE_TO_AGENT_MAP } from '../../src/modules/agent-config/agent-config.constants'
import { AiAgentId } from '../../src/common/enums/ai-agent-config.enum'

describe('Agent Alias Map', () => {
  it('should resolve orphaned agents to their core execution agent', () => {
    expect(resolveExecutionAgent(AiAgentId.ALERT_TRIAGE)).toBe(AiAgentId.L1_ANALYST)
    expect(resolveExecutionAgent(AiAgentId.CASE_CREATION)).toBe(AiAgentId.L2_ANALYST)
    expect(resolveExecutionAgent(AiAgentId.SIGMA_DRAFTING)).toBe(AiAgentId.RULES_ANALYST)
    expect(resolveExecutionAgent(AiAgentId.REPORTING)).toBe(AiAgentId.DASHBOARD_BUILDER)
    expect(resolveExecutionAgent(AiAgentId.JOB_HEALTH)).toBe(AiAgentId.ORCHESTRATOR)
    expect(resolveExecutionAgent(AiAgentId.CLOUD_TRIAGE)).toBe(AiAgentId.L1_ANALYST)
    expect(resolveExecutionAgent(AiAgentId.NORM_VERIFICATION)).toBe(AiAgentId.NORM_VERIFIER)
  })

  it('should return core agents as-is (no alias needed)', () => {
    expect(resolveExecutionAgent(AiAgentId.L1_ANALYST)).toBe(AiAgentId.L1_ANALYST)
    expect(resolveExecutionAgent(AiAgentId.L2_ANALYST)).toBe(AiAgentId.L2_ANALYST)
    expect(resolveExecutionAgent(AiAgentId.ORCHESTRATOR)).toBe(AiAgentId.ORCHESTRATOR)
    expect(resolveExecutionAgent(AiAgentId.THREAT_HUNTER)).toBe(AiAgentId.THREAT_HUNTER)
    expect(resolveExecutionAgent(AiAgentId.RULES_ANALYST)).toBe(AiAgentId.RULES_ANALYST)
    expect(resolveExecutionAgent(AiAgentId.NORM_VERIFIER)).toBe(AiAgentId.NORM_VERIFIER)
    expect(resolveExecutionAgent(AiAgentId.DASHBOARD_BUILDER)).toBe(AiAgentId.DASHBOARD_BUILDER)
  })

  it('should return unknown agent IDs as-is', () => {
    expect(resolveExecutionAgent('unknown-agent')).toBe('unknown-agent')
  })

  it('should have an alias for every orphaned agent', () => {
    const coreAgents = new Set([
      AiAgentId.ORCHESTRATOR,
      AiAgentId.L1_ANALYST,
      AiAgentId.L2_ANALYST,
      AiAgentId.THREAT_HUNTER,
      AiAgentId.RULES_ANALYST,
      AiAgentId.NORM_VERIFIER,
      AiAgentId.DASHBOARD_BUILDER,
    ])

    const allAgentIds = Object.values(AiAgentId)
    for (const agentId of allAgentIds) {
      if (!coreAgents.has(agentId)) {
        expect(AGENT_ALIAS_MAP[agentId]).toBeDefined()
      }
    }
  })

  it('should have all FEATURE_TO_AGENT_MAP values be core agents', () => {
    const coreAgents = new Set([
      AiAgentId.ORCHESTRATOR,
      AiAgentId.L1_ANALYST,
      AiAgentId.L2_ANALYST,
      AiAgentId.THREAT_HUNTER,
      AiAgentId.RULES_ANALYST,
      AiAgentId.NORM_VERIFIER,
      AiAgentId.DASHBOARD_BUILDER,
    ])

    for (const [, agentId] of Object.entries(FEATURE_TO_AGENT_MAP)) {
      expect(coreAgents.has(agentId)).toBe(true)
    }
  })
})

describe('Finding Quality Gate', () => {
  // Import the service method separately for testing
  const placeholderPatterns = [
    'awaiting input',
    'provide data',
    'no data available',
    'unable to analyze without',
    'no context provided',
    'waiting for context',
    'scheduler:heartbeat',
    'no alerts found',
    'no incidents found',
    'no cases found',
    'nothing to analyze',
  ]

  function isMeaningfulFinding(summary: string): boolean {
    if (summary.length < 50) return false
    const lower = summary.toLowerCase()
    for (const pattern of placeholderPatterns) {
      if (lower.includes(pattern)) return false
    }
    return true
  }

  it('should reject short summaries', () => {
    expect(isMeaningfulFinding('Short')).toBe(false)
    expect(isMeaningfulFinding('Too brief to be useful')).toBe(false)
  })

  it('should reject placeholder content', () => {
    expect(isMeaningfulFinding('This is a review result for scheduler:heartbeat — awaiting input from the system to provide meaningful analysis')).toBe(false)
    expect(isMeaningfulFinding('Unable to analyze without sufficient data. Please provide data for the alert triage operation.')).toBe(false)
    expect(isMeaningfulFinding('No alerts found in the system for analysis. Waiting for context to proceed with evaluation.')).toBe(false)
  })

  it('should accept meaningful content', () => {
    expect(isMeaningfulFinding('Critical alert detected on host 192.168.1.100 with signature matching known malware C2 beacon pattern. Recommend immediate isolation and forensic analysis.')).toBe(true)
    expect(isMeaningfulFinding('Vulnerability CVE-2024-1234 affects 15 hosts in the production subnet. CVSS score 9.8. Recommend emergency patching within 24 hours.')).toBe(true)
  })
})
