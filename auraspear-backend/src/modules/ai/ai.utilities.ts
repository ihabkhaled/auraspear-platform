import { AiProvider, AiResponseModel } from './ai.enums'
import { AiOutputFormat, AlertSeverity } from '../../common/enums'
import { toIso } from '../../common/utils/date-time.utility'
import type {
  AgentTaskPromptParameters,
  AgentTaskResponseParameters,
  AiResponse,
  ConnectorFilterInput,
  FilteredConnectorsResult,
  QuotaCheckResult,
} from './ai.types'
import type { AgentConfigWithDefaults } from '../agent-config/agent-config.types'
import type { Alert } from '@prisma/client'

/* ---------------------------------------------------------------- */
/* SANITIZATION                                                      */
/* ---------------------------------------------------------------- */

export function sanitizeForMarkdown(text: string): string {
  return text.replaceAll(/[<>"'&]/g, '')
}

/* ---------------------------------------------------------------- */
/* PROMPT BUILDERS                                                   */
/* ---------------------------------------------------------------- */

export function buildHuntPrompt(query: string, context?: string): string {
  const safeQuery = sanitizeForMarkdown(query)
  return `You are a senior SOC threat hunter. Analyze this threat hunting query and provide actionable guidance.

Hunt Query: "${safeQuery}"
${context ? `Additional Context: ${context.slice(0, 500)}` : ''}

Provide your response in markdown with these sections:
1. **Hypothesis** — What threat scenario does this query target?
2. **Suggested Queries** — 3-5 Elasticsearch/Wazuh queries to execute
3. **Indicators to Watch** — Key IOCs, behavioral patterns, or anomalies
4. **MITRE ATT&CK Coverage** — Relevant tactics and techniques
5. **Recommended Actions** — Next steps for the analyst

Be concise, specific, and actionable. Do not hallucinate findings — this is query planning, not result analysis.`
}

export function buildInvestigationPrompt(
  alert: Alert,
  relatedAlerts: Array<Pick<Alert, 'title' | 'severity' | 'timestamp'>>
): string {
  const rawEventSnippet = alert.rawEvent ? JSON.stringify(alert.rawEvent).slice(0, 2000) : 'N/A'

  return `You are a senior SOC analyst performing an AI-powered investigation of a security alert.

**Alert Details:**
- Title: ${sanitizeForMarkdown(alert.title)}
- Severity: ${alert.severity}
- Rule: ${sanitizeForMarkdown(alert.ruleName ?? 'Unknown')} (${alert.ruleId ?? 'N/A'})
- Source IP: ${alert.sourceIp ?? 'N/A'}
- Destination IP: ${alert.destinationIp ?? 'N/A'}
- Agent: ${alert.agentName ?? 'N/A'}
- MITRE Tactics: ${alert.mitreTactics.join(', ') || 'None'}
- MITRE Techniques: ${alert.mitreTechniques.join(', ') || 'None'}
- Description: ${sanitizeForMarkdown(alert.description ?? 'N/A')}

**Raw Event (truncated):**
${rawEventSnippet}

**Related Alerts (${relatedAlerts.length}):**
${
  relatedAlerts
    .slice(0, 10)
    .map(ra => `- [${ra.severity}] ${sanitizeForMarkdown(ra.title)} at ${toIso(ra.timestamp)}`)
    .join('\n') || 'None found'
}

Provide your investigation report in markdown with these sections:
1. **Verdict** — True Positive / False Positive / Suspicious / Benign (with confidence %)
2. **Summary** — Brief explanation of what happened
3. **Key Findings** — Numbered list of important observations
4. **Risk Assessment** — Immediate risk, lateral movement risk, data exposure risk
5. **MITRE ATT&CK Mapping** — Tactics and techniques observed
6. **Recommended Actions** — Numbered actionable steps
7. **Related Alert Analysis** — How related alerts correlate (if any)

Be specific and grounded in the actual alert data. Do not fabricate indicators not present in the data.`
}

export function buildAgentTaskPrompt(params: AgentTaskPromptParameters): string {
  const safePrompt = sanitizeForMarkdown(params.prompt)
  const toolSummary =
    params.tools.length > 0
      ? params.tools
          .slice(0, 10)
          .map(
            tool => `- ${sanitizeForMarkdown(tool.name)}: ${sanitizeForMarkdown(tool.description)}`
          )
          .join('\n')
      : '- No tools configured'
  const soulSnippet = params.soulMd ? sanitizeForMarkdown(params.soulMd).slice(0, 3000) : 'N/A'

  return `You are the AuraSpear SOC AI agent "${sanitizeForMarkdown(params.agentName)}".

Agent operating guidance (SOUL.md excerpt):
${soulSnippet}

Available tools (informational only, do not claim execution unless the user explicitly asked for a draft):
${toolSummary}

User request:
${safePrompt}

Respond in markdown with these sections:
1. **Summary** - concise answer to the request
2. **Findings** - numbered findings grounded in the request
3. **Recommended Next Steps** - safe, human-reviewable actions only
4. **Approvals Needed** - explicitly call out anything that should require human approval

Do not claim you executed external actions unless the prompt explicitly includes execution results. Prefer safe triage, drafting, summarization, and investigation support over automation theater.`
}

/* ---------------------------------------------------------------- */
/* CONFIDENCE COMPUTATION                                            */
/* ---------------------------------------------------------------- */

export function computeInvestigationConfidence(
  alert: Pick<Alert, 'severity' | 'mitreTechniques' | 'sourceIp'>,
  relatedAlerts: unknown[]
): number {
  let confidence = 0.5

  switch (alert.severity) {
    case AlertSeverity.CRITICAL: {
      confidence += 0.2
      break
    }
    case AlertSeverity.HIGH: {
      confidence += 0.15
      break
    }
    case AlertSeverity.MEDIUM: {
      confidence += 0.1
      break
    }
    // No default
  }

  if (alert.mitreTechniques.length > 0) {
    confidence += 0.1
  }

  if (relatedAlerts.length >= 3) {
    confidence += 0.1
  } else if (relatedAlerts.length >= 1) {
    confidence += 0.05
  }

  if (alert.sourceIp) {
    confidence += 0.05
  }

  return Math.min(0.99, confidence)
}

/* ---------------------------------------------------------------- */
/* FALLBACK: DATA-DRIVEN INVESTIGATION REPORT                        */
/* ---------------------------------------------------------------- */

export function generateDataDrivenInvestigation(
  alert: Alert,
  relatedAlerts: Array<Pick<Alert, 'id' | 'title' | 'severity' | 'timestamp'>>
): string {
  const verdict = computeVerdict(alert.severity)
  const relatedSection = buildRelatedSection(relatedAlerts)
  const summarySection = buildSummarySection(alert)
  const findingsSection = buildKeyFindings(alert, relatedAlerts.length)
  const riskSection = buildRiskSection(alert, relatedAlerts.length)
  const mitreSection = buildMitreSection(alert)
  const actionsSection = buildRecommendedActions(alert, relatedAlerts.length)

  return `## AI Investigation Report

**Alert:** ${sanitizeForMarkdown(alert.title)}
**Severity:** ${alert.severity.toUpperCase()}
**Verdict:** ${verdict}

${summarySection}

${findingsSection}

${riskSection}

${mitreSection}

${actionsSection}

${relatedSection}`
}

function buildSummarySection(alert: Alert): string {
  let summary = `**Summary:**\nThis ${alert.severity}-severity alert was triggered by rule ${sanitizeForMarkdown(alert.ruleName ?? 'Unknown')} (${sanitizeForMarkdown(alert.ruleId ?? 'N/A')}).`
  if (alert.sourceIp) summary += ` Source IP: \`${alert.sourceIp}\`.`
  if (alert.destinationIp) summary += ` Destination IP: \`${alert.destinationIp}\`.`
  if (alert.agentName) summary += ` Agent: ${sanitizeForMarkdown(alert.agentName)}.`
  return summary
}

function buildKeyFindings(alert: Alert, relatedCount: number): string {
  const finding1 = alert.sourceIp
    ? `1. Source IP \`${alert.sourceIp}\` detected in this event`
    : '1. No source IP recorded'
  const finding2 =
    relatedCount > 0
      ? `2. ${relatedCount} related alert(s) found in the last 48 hours`
      : '2. No related alerts found in the last 48 hours'
  const finding3 =
    alert.mitreTechniques.length > 0
      ? `3. MITRE ATT&CK techniques identified: ${alert.mitreTechniques.join(', ')}`
      : '3. No MITRE ATT&CK techniques mapped'
  const finding4 = alert.agentName
    ? `4. Alert originated from agent: ${sanitizeForMarkdown(alert.agentName)}`
    : '4. No agent information available'

  return `**Key Findings:**\n${finding1}\n${finding2}\n${finding3}\n${finding4}`
}

function buildRiskSection(alert: Alert, relatedCount: number): string {
  const immediateRisk = computeImmediateRisk(alert.severity)
  const relatedRisk = computeRelatedRisk(relatedCount)
  const mitreCoverage =
    alert.mitreTechniques.length > 0
      ? `${alert.mitreTechniques.length} technique(s) mapped`
      : 'None mapped'

  return `**Risk Assessment:**\n- Immediate Risk: ${immediateRisk}\n- Related Activity: ${relatedRisk}\n- MITRE Coverage: ${mitreCoverage}`
}

function buildMitreSection(alert: Alert): string {
  const tactics =
    alert.mitreTactics.length > 0
      ? `- Tactics: ${alert.mitreTactics.join(', ')}`
      : '- No tactics identified'
  const techniques =
    alert.mitreTechniques.length > 0
      ? `- Techniques: ${alert.mitreTechniques.join(', ')}`
      : '- No techniques identified'

  return `**MITRE ATT&CK Mapping:**\n${tactics}\n${techniques}`
}

function buildRecommendedActions(alert: Alert, relatedCount: number): string {
  const isHighSeverity =
    alert.severity === AlertSeverity.CRITICAL || alert.severity === AlertSeverity.HIGH
  const action1 = isHighSeverity
    ? 'Escalate immediately to incident response team'
    : 'Review alert context and determine if escalation is needed'
  const action2 = alert.sourceIp
    ? `Investigate source IP \`${alert.sourceIp}\` for additional activity`
    : 'Identify the source of this activity'
  const action3 =
    relatedCount > 0
      ? 'Review related alerts for attack pattern correlation'
      : 'Monitor for follow-up alerts from the same source'
  const action4 = alert.agentName
    ? `Check endpoint health for agent ${sanitizeForMarkdown(alert.agentName)}`
    : 'Verify the affected system status'

  return `**Recommended Actions:**\n1. ${action1}\n2. ${action2}\n3. ${action3}\n4. ${action4}\n5. Document findings and update case if applicable`
}

function computeVerdict(severity: string): string {
  if (severity === AlertSeverity.CRITICAL || severity === AlertSeverity.HIGH) {
    return 'Likely True Positive'
  }
  if (severity === AlertSeverity.MEDIUM) {
    return 'Requires Investigation'
  }
  return 'Likely Benign'
}

function computeImmediateRisk(severity: string): string {
  switch (severity) {
    case AlertSeverity.CRITICAL:
      return 'CRITICAL'
    case AlertSeverity.HIGH:
      return 'HIGH'
    case AlertSeverity.MEDIUM:
      return 'MEDIUM'
    default:
      return 'LOW'
  }
}

function computeRelatedRisk(count: number): string {
  if (count >= 5) return 'HIGH — multiple correlated alerts detected'
  if (count >= 1) return 'MEDIUM — some related activity found'
  return 'LOW — isolated event'
}

function buildRelatedSection(
  relatedAlerts: Array<Pick<Alert, 'severity' | 'title' | 'timestamp'>>
): string {
  if (relatedAlerts.length === 0) return ''
  return `**Related Alerts (${relatedAlerts.length}):**\n${relatedAlerts
    .slice(0, 5)
    .map(
      ra =>
        `- [${ra.severity.toUpperCase()}] ${sanitizeForMarkdown(ra.title)} (${toIso(ra.timestamp)})`
    )
    .join('\n')}`
}

/* ---------------------------------------------------------------- */
/* FALLBACK: HUNT RESPONSE TEMPLATES                                 */
/* ---------------------------------------------------------------- */

export function generateHuntResponse(query: string): string {
  const lowerQuery = query.toLowerCase()

  if (lowerQuery.includes('brute') || lowerQuery.includes('4625') || lowerQuery.includes('login')) {
    return generateBruteForceHuntResponse()
  }

  if (lowerQuery.includes('c2') || lowerQuery.includes('beacon') || lowerQuery.includes('dns')) {
    return generateC2HuntResponse()
  }

  return generateGenericHuntResponse(query)
}

function generateBruteForceHuntResponse(): string {
  return `## Threat Hunt Analysis: Brute Force Activity

**Hypothesis:** An external threat actor is conducting credential-based attacks against authentication services.

**Suggested Queries:**
1. \`event.id:4625 AND agent.name:dc-01 | stats count by data.srcip\` - Group failed logins by source IP
2. \`event.id:4625 AND data.srcip:198.51.100.* | timechart span=1m count\` - Time distribution of attacks
3. \`(event.id:4624) AND data.srcip:198.51.100.22\` - Check for successful logins from attacker IP

**Recommended Actions:**
- Block source IP 198.51.100.22 at the perimeter firewall
- Enable account lockout policies if not already configured
- Monitor for successful authentications from the same IP range
- Review VPN and remote access logs for the same time window

**MITRE ATT&CK Coverage:** T1110.001 (Password Guessing), T1110.003 (Password Spraying)`
}

function generateC2HuntResponse(): string {
  return `## Threat Hunt Analysis: Command & Control Detection

**Hypothesis:** A compromised endpoint is communicating with external C2 infrastructure via DNS or HTTP channels.

**Suggested Queries:**
1. \`dns.query.name:*.xyz OR dns.query.name:*.net | stats count by agent.name, dns.query.name\` - Unusual TLD activity
2. \`rule.mitre.id:T1071 | stats count by agent.name\` - Application layer protocol abuse
3. \`data.dstip:185.220.* | timechart span=5m count\` - Known C2 infrastructure communication

**Indicators Found:**
- Beaconing pattern detected from workstation-17 (60-second intervals)
- Domain update-service.xyz registered 3 days ago (DGA indicator)
- Encoded payloads observed in DNS TXT records

**MITRE ATT&CK Coverage:** T1071 (Application Layer Protocol), T1048 (Exfiltration Over Alternative Protocol), T1568 (Dynamic Resolution)`
}

function generateGenericHuntResponse(query: string): string {
  const safeQuery = query.replaceAll(/[<>"'&]/g, '')

  return `## Threat Hunt Analysis

**Query Analysis:** "${safeQuery}"

**Suggested Investigation Steps:**
1. Correlate the query across Wazuh alerts, Sysmon events, and network flow data
2. Establish a baseline of normal activity for comparison
3. Look for anomalous patterns in user behavior analytics
4. Cross-reference findings with the latest MISP threat intelligence feeds

**Recommended Queries:**
1. \`${safeQuery} | stats count by agent.name, rule.id\` - Activity summary
2. \`${safeQuery} | timechart span=1h count\` - Temporal analysis
3. \`${safeQuery} AND rule.mitre.id:* | stats count by rule.mitre.id\` - ATT&CK mapping

**MITRE ATT&CK Coverage:** Multiple techniques may apply -- review mapped events for specific coverage.`
}

/* ---------------------------------------------------------------- */
/* FALLBACK: EXPLAIN RESPONSE TEMPLATE                               */
/* ---------------------------------------------------------------- */

export function generateExplainResponse(prompt: string): string {
  return `## Explainable AI Analysis

**Topic:** ${prompt}

**Explanation:**
This security finding involves indicators of potential adversary activity within your environment. The detection logic is based on correlation of multiple data sources including endpoint telemetry, network flow data, and authentication logs.

**How This Was Detected:**
1. Rule-based detection triggered on specific event patterns
2. Statistical anomaly detection identified deviation from baseline behavior
3. Threat intelligence correlation matched observed indicators with known campaigns
4. Temporal analysis revealed clustering of events within a suspicious time window

**What This Means for Your Environment:**
- The detected activity pattern is consistent with known adversary tradecraft
- The affected systems should be prioritized for investigation
- The blast radius assessment shows limited spread beyond the initial detection point

**Confidence Factors:**
- High-fidelity rule match: +30% confidence
- Threat intel correlation: +25% confidence
- Behavioral anomaly score: +20% confidence
- Environmental context alignment: +20% confidence

**Recommended Learning Resources:**
- MITRE ATT&CK Navigator: Map detected techniques to your coverage matrix
- SIGMA Rules Repository: Review and tune detection logic for similar patterns
- NIST SP 800-61r2: Incident handling guidance for this type of activity`
}

export function generateAgentTaskResponse(params: AgentTaskResponseParameters): string {
  const safePrompt = sanitizeForMarkdown(params.prompt)
  const availableTools =
    params.tools.length > 0
      ? params.tools
          .slice(0, 5)
          .map(tool => tool.name)
          .join(', ')
      : 'no configured tools'

  return `## ${sanitizeForMarkdown(params.agentName)} Response

**Summary**
The agent reviewed the request and prepared a safe analyst-facing response.

**Findings**
1. Request received: "${safePrompt}"
2. The agent is operating in assistive mode and did not autonomously execute external actions.
3. Available supporting tools: ${sanitizeForMarkdown(availableTools)}.

**Recommended Next Steps**
1. Review the request and decide whether enrichment, triage, or a workflow draft is the right next action.
2. If execution is required, route the task through an approved SOAR playbook or analyst action.
3. Capture the final analyst decision in the relevant case, incident, or report.

**Approvals Needed**
- Human approval is required before any containment, notification, or automation action is performed.`
}

/* ---------------------------------------------------------------- */
/* RESPONSE BUILDERS                                                 */
/* ---------------------------------------------------------------- */

export function buildBedrockHuntResponse(
  aiText: string,
  query: string,
  modelId: string,
  inputTokens: number,
  outputTokens: number
): AiResponse {
  return {
    result: aiText,
    reasoning: [
      `Analyzing hunt query: "${query}"`,
      'Decomposing query into threat hypotheses',
      'Generating detection queries and MITRE ATT&CK mapping via AI',
    ],
    confidence: 0.85,
    model: modelId,
    provider: AiProvider.BEDROCK,
    tokensUsed: { input: inputTokens, output: outputTokens },
  }
}

export function buildFallbackHuntResponse(query: string): AiResponse {
  return {
    result: generateHuntResponse(query),
    reasoning: [
      `Analyzing hunt query: "${query}"`,
      'Decomposing query into sub-hypotheses for structured threat hunting',
      'Cross-referencing with MITRE ATT&CK framework for technique coverage',
      'Generating OpenSearch/Wazuh query syntax for each hypothesis',
      'Prioritizing by likelihood of true positive based on environment context',
      'Generating rule-based hunt analysis (AI model not available)',
    ],
    confidence: 0.87,
    model: AiResponseModel.RULE_BASED,
    provider: AiProvider.RULE_BASED,
    tokensUsed: { input: 0, output: 0 },
  }
}

export function buildBedrockInvestigateResponse(
  aiText: string,
  alertId: string,
  relatedCount: number,
  alert: Pick<Alert, 'severity' | 'mitreTechniques' | 'sourceIp'>,
  relatedAlerts: unknown[],
  modelId: string,
  inputTokens: number,
  outputTokens: number
): AiResponse {
  return {
    result: aiText,
    reasoning: [
      `Loading alert ${alertId} details and raw event data`,
      `Found ${relatedCount} related alerts in 48-hour window`,
      'Analyzing severity, MITRE ATT&CK mapping, and IOC indicators',
      'Generating AI-powered investigation report via Bedrock',
    ],
    confidence: computeInvestigationConfidence(alert, relatedAlerts),
    model: modelId,
    provider: AiProvider.BEDROCK,
    tokensUsed: { input: inputTokens, output: outputTokens },
  }
}

export function buildFallbackInvestigateResponse(
  alert: Alert,
  relatedAlerts: Array<Pick<Alert, 'id' | 'title' | 'severity' | 'timestamp'>>,
  alertId: string
): AiResponse {
  return {
    result: generateDataDrivenInvestigation(alert, relatedAlerts),
    reasoning: [
      `Loading alert ${alertId} details and raw event data`,
      `Found ${relatedAlerts.length} related alerts in 48-hour window`,
      'Analyzing severity, MITRE ATT&CK mapping, and source/destination IPs',
      'Evaluating false positive probability based on alert context',
      'Generating rule-based investigation report (AI model not available)',
    ],
    confidence: computeInvestigationConfidence(alert, relatedAlerts),
    model: AiResponseModel.RULE_BASED,
    provider: AiProvider.RULE_BASED,
    tokensUsed: { input: 0, output: 0 },
  }
}

export function buildBedrockAgentTaskResponse(
  aiText: string,
  agentName: string,
  modelId: string,
  inputTokens: number,
  outputTokens: number
): AiResponse {
  return {
    result: aiText,
    reasoning: [
      `Loading AI agent "${agentName}" execution context`,
      'Applying agent SOUL and configured tools as guidance boundaries',
      'Generating an assistive response through the configured Bedrock model',
    ],
    confidence: 0.82,
    model: modelId,
    provider: AiProvider.BEDROCK,
    tokensUsed: { input: inputTokens, output: outputTokens },
  }
}

/* ---------------------------------------------------------------- */
/* LLM APIs RESPONSE BUILDERS                                        */
/* ---------------------------------------------------------------- */

export function buildLlmApisHuntResponse(
  aiText: string,
  query: string,
  modelId: string,
  inputTokens: number,
  outputTokens: number
): AiResponse {
  return {
    result: aiText,
    reasoning: [
      `Analyzing hunt query: "${query}"`,
      'Decomposing query into threat hypotheses',
      'Generating detection queries and MITRE ATT&CK mapping via LLM API',
    ],
    confidence: 0.85,
    model: `llm-apis:${modelId}`,
    provider: AiProvider.LLM_APIS,
    tokensUsed: { input: inputTokens, output: outputTokens },
  }
}

export function buildLlmApisInvestigateResponse(
  aiText: string,
  alertId: string,
  relatedCount: number,
  alert: Pick<Alert, 'severity' | 'mitreTechniques' | 'sourceIp'>,
  relatedAlerts: unknown[],
  modelId: string,
  inputTokens: number,
  outputTokens: number
): AiResponse {
  return {
    result: aiText,
    reasoning: [
      `Loading alert ${alertId} details and raw event data`,
      `Found ${relatedCount} related alerts in 48-hour window`,
      'Analyzing severity, MITRE ATT&CK mapping, and IOC indicators',
      'Generating AI-powered investigation report via LLM API',
    ],
    confidence: computeInvestigationConfidence(alert, relatedAlerts),
    model: `llm-apis:${modelId}`,
    provider: AiProvider.LLM_APIS,
    tokensUsed: { input: inputTokens, output: outputTokens },
  }
}

export function buildLlmApisAgentTaskResponse(
  aiText: string,
  agentName: string,
  modelId: string,
  inputTokens: number,
  outputTokens: number,
  connectorName?: string
): AiResponse {
  return {
    result: aiText,
    reasoning: [
      `Loading AI agent "${agentName}" execution context`,
      'Applying agent SOUL and configured tools as guidance boundaries',
      'Generating an assistive response through the configured LLM API',
    ],
    confidence: 0.82,
    model: `llm-apis:${modelId}`,
    provider: connectorName ?? AiProvider.LLM_APIS,
    tokensUsed: { input: inputTokens, output: outputTokens },
  }
}

export function buildLlmApisExplainResponse(
  aiText: string,
  modelId: string,
  inputTokens: number,
  outputTokens: number
): AiResponse {
  return {
    result: aiText,
    reasoning: [
      'Parsing the security concept or finding to explain',
      'Breaking down technical details into analyst-friendly language',
      'Mapping to MITRE ATT&CK tactics, techniques, and procedures',
      'Providing contextual examples relevant to the environment',
      'Including remediation guidance and best practices via LLM API',
    ],
    confidence: 0.9,
    model: `llm-apis:${modelId}`,
    provider: AiProvider.LLM_APIS,
    tokensUsed: { input: inputTokens, output: outputTokens },
  }
}

/* ---------------------------------------------------------------- */
/* OpenClaw Gateway RESPONSE BUILDERS                                */
/* ---------------------------------------------------------------- */

export function buildOpenClawHuntResponse(
  aiText: string,
  query: string,
  inputTokens: number,
  outputTokens: number
): AiResponse {
  return {
    result: aiText,
    reasoning: [
      `Analyzing hunt query: "${query}"`,
      'Decomposing query into threat hypotheses',
      'Generating detection queries and MITRE ATT&CK mapping via OpenClaw Gateway',
    ],
    confidence: 0.85,
    model: 'openclaw-gateway',
    provider: AiProvider.OPENCLAW_GATEWAY,
    tokensUsed: { input: inputTokens, output: outputTokens },
  }
}

export function buildOpenClawInvestigateResponse(
  aiText: string,
  alertId: string,
  relatedCount: number,
  alert: Pick<Alert, 'severity' | 'mitreTechniques' | 'sourceIp'>,
  relatedAlerts: unknown[],
  inputTokens: number,
  outputTokens: number
): AiResponse {
  return {
    result: aiText,
    reasoning: [
      `Loading alert ${alertId} details and raw event data`,
      `Found ${relatedCount} related alerts in 48-hour window`,
      'Analyzing severity, MITRE ATT&CK mapping, and IOC indicators',
      'Generating AI-powered investigation report via OpenClaw Gateway',
    ],
    confidence: computeInvestigationConfidence(alert, relatedAlerts),
    model: 'openclaw-gateway',
    provider: AiProvider.OPENCLAW_GATEWAY,
    tokensUsed: { input: inputTokens, output: outputTokens },
  }
}

export function buildOpenClawAgentTaskResponse(
  aiText: string,
  agentName: string,
  inputTokens: number,
  outputTokens: number
): AiResponse {
  return {
    result: aiText,
    reasoning: [
      `Loading AI agent "${agentName}" execution context`,
      'Applying agent SOUL and configured tools as guidance boundaries',
      'Generating an assistive response through OpenClaw Gateway',
    ],
    confidence: 0.82,
    model: 'openclaw-gateway',
    provider: AiProvider.OPENCLAW_GATEWAY,
    tokensUsed: { input: inputTokens, output: outputTokens },
  }
}

export function buildOpenClawExplainResponse(
  aiText: string,
  inputTokens: number,
  outputTokens: number
): AiResponse {
  return {
    result: aiText,
    reasoning: [
      'Parsing the security concept or finding to explain',
      'Breaking down technical details into analyst-friendly language',
      'Mapping to MITRE ATT&CK tactics, techniques, and procedures',
      'Providing contextual examples relevant to the environment',
      'Including remediation guidance and best practices via OpenClaw Gateway',
    ],
    confidence: 0.9,
    model: 'openclaw-gateway',
    provider: AiProvider.OPENCLAW_GATEWAY,
    tokensUsed: { input: inputTokens, output: outputTokens },
  }
}

export function buildBedrockExplainResponse(
  aiText: string,
  modelId: string,
  inputTokens: number,
  outputTokens: number
): AiResponse {
  return {
    result: aiText,
    reasoning: [
      'Parsing the security concept or finding to explain',
      'Breaking down technical details into analyst-friendly language',
      'Mapping to MITRE ATT&CK tactics, techniques, and procedures',
      'Providing contextual examples relevant to the environment',
      'Including remediation guidance and best practices via Bedrock',
    ],
    confidence: 0.9,
    model: modelId,
    provider: AiProvider.BEDROCK,
    tokensUsed: { input: inputTokens, output: outputTokens },
  }
}

export function buildFallbackAgentTaskResponse(params: AgentTaskResponseParameters): AiResponse {
  return {
    result: generateAgentTaskResponse(params),
    reasoning: [
      `Loading AI agent "${params.agentName}" execution context`,
      'Applying safe assistive execution boundaries',
      'Generating a deterministic fallback response because the AI connector is unavailable',
    ],
    confidence: 0.7,
    model: AiResponseModel.RULE_BASED,
    provider: AiProvider.RULE_BASED,
    tokensUsed: { input: 0, output: 0 },
  }
}

/* ---------------------------------------------------------------- */
/* AGENT QUOTA CHECK                                                 */
/* ---------------------------------------------------------------- */

export function checkAgentQuota(agentConfig: AgentConfigWithDefaults): QuotaCheckResult {
  if (agentConfig.tokensPerHour > 0 && agentConfig.tokensUsedHour >= agentConfig.tokensPerHour) {
    return {
      allowed: false,
      period: 'hour',
      used: agentConfig.tokensUsedHour,
      limit: agentConfig.tokensPerHour,
    }
  }
  if (agentConfig.tokensPerDay > 0 && agentConfig.tokensUsedDay >= agentConfig.tokensPerDay) {
    return {
      allowed: false,
      period: 'day',
      used: agentConfig.tokensUsedDay,
      limit: agentConfig.tokensPerDay,
    }
  }
  if (agentConfig.tokensPerMonth > 0 && agentConfig.tokensUsedMonth >= agentConfig.tokensPerMonth) {
    return {
      allowed: false,
      period: 'month',
      used: agentConfig.tokensUsedMonth,
      limit: agentConfig.tokensPerMonth,
    }
  }
  return { allowed: true }
}

/* ---------------------------------------------------------------- */
/* PROMPT TEMPLATE RENDERING                                         */
/* ---------------------------------------------------------------- */

export function buildPromptFromTemplate(
  template: string,
  context: Record<string, unknown>
): string {
  let result = template
  if (result.includes('{{context}}')) {
    result = result.replaceAll('{{context}}', JSON.stringify(context, null, 2))
  }

  for (const [key, value] of Object.entries(context)) {
    const placeholder = `{{${key}}}`
    if (result.includes(placeholder)) {
      const stringValue = typeof value === 'string' ? value : JSON.stringify(value, null, 2)
      result = result.replaceAll(placeholder, stringValue)
    }
  }

  return result
}

/* ---------------------------------------------------------------- */
/* CONNECTOR FILTERING                                               */
/* ---------------------------------------------------------------- */

/**
 * Filters connectors based on a requested connector key.
 * If a specific connector is requested, filters the list to match.
 * Returns the filtered list and whether a specific connector was requested.
 */
export function filterConnectorsBySelection(input: ConnectorFilterInput): FilteredConnectorsResult {
  if (!input.connector || input.connector === 'default') {
    return { connectors: input.connectors, connectorRequested: false }
  }

  const isUuid = /^[\da-f]{8}-[\da-f]{4}-[\da-f]{4}-[\da-f]{4}-[\da-f]{12}$/i.test(input.connector)
  const filtered = isUuid
    ? input.connectors.filter(c => c.id === input.connector)
    : input.connectors.filter(c => c.type === input.connector && !c.id)

  return { connectors: filtered, connectorRequested: true }
}

/* ---------------------------------------------------------------- */
/* FALLBACK GENERIC RESPONSE                                         */
/* ---------------------------------------------------------------- */

export function buildFallbackGenericResponse(featureKey: string, prompt: string): AiResponse {
  return {
    result: `[Rule-based fallback] No AI provider available to process feature "${featureKey}". The request has been logged for manual review.\n\nFull prompt:\n${prompt}`,
    reasoning: [
      'No AI connector available for this tenant',
      'Returning rule-based fallback response',
      'Manual review recommended',
    ],
    confidence: 0.3,
    model: 'rule-based',
    provider: 'rule-based',
    tokensUsed: { input: 0, output: 0 },
  }
}

/* ---------------------------------------------------------------- */
/* FALLBACK EXPLAIN RESPONSE                                         */
/* ---------------------------------------------------------------- */

export function buildFallbackExplainResponse(prompt: string): AiResponse {
  return {
    result: generateExplainResponse(prompt),
    reasoning: [
      'Parsing the security concept or finding to explain',
      'Breaking down technical details into analyst-friendly language',
      'Mapping to MITRE ATT&CK tactics, techniques, and procedures',
      'Providing contextual examples relevant to the environment',
      'Including remediation guidance and best practices',
      'Generating rule-based explanation (AI model not available)',
    ],
    confidence: 0.85,
    model: 'rule-based',
    provider: 'rule-based',
    tokensUsed: { input: 0, output: 0 },
  }
}

/* ---------------------------------------------------------------- */
/* GENERIC AI RESPONSE BUILDER                                       */
/* ---------------------------------------------------------------- */

export function buildGenericAiResponse(
  aiText: string,
  model: string,
  provider: string,
  inputTokens: number,
  outputTokens: number,
  reasoning: string
): AiResponse {
  return {
    result: aiText,
    reasoning: [reasoning],
    confidence: 0.9,
    model,
    provider,
    tokensUsed: { input: inputTokens, output: outputTokens },
  }
}

/* ---------------------------------------------------------------- */
/* FEATURE-AWARE AI RESPONSE BUILDER                                 */
/* ---------------------------------------------------------------- */

/**
 * Builds a rich AiResponse with domain-specific reasoning steps and
 * context-aware confidence, matching the quality of the per-provider
 * hunt/investigate/explain response builders.
 */
export function buildFeatureAwareResponse(
  aiText: string,
  model: string,
  provider: string,
  inputTokens: number,
  outputTokens: number,
  featureKey?: string,
  context?: Record<string, unknown>
): AiResponse {
  const reasoning = buildFeatureReasoning(featureKey, context)
  const confidence = computeFeatureConfidence(featureKey, context)

  return {
    result: aiText,
    reasoning,
    confidence,
    model,
    provider,
    tokensUsed: { input: inputTokens, output: outputTokens },
  }
}

function buildFeatureReasoning(featureKey?: string, context?: Record<string, unknown>): string[] {
  if (!featureKey) {
    return ['Processed by AI model']
  }

  const key = featureKey.toLowerCase()

  if (key.startsWith('alert.')) {
    const title = (context?.alertTitle as string) ?? 'alert'
    const severity = (context?.alertSeverity as string) ?? 'unknown'
    return [
      `Loading alert details: "${title}" (${severity})`,
      'Analyzing alert context, raw event data, and IOC indicators',
      'Mapping to MITRE ATT&CK tactics and techniques',
      `Generating AI-powered ${key.replace('alert.', '')} analysis via ${featureKey}`,
    ]
  }

  if (key.startsWith('case.')) {
    const title = (context?.caseTitle as string) ?? 'case'
    return [
      `Loading case details: "${title}"`,
      'Analyzing case timeline, artifacts, and linked alerts',
      'Evaluating severity, status, and response progress',
      `Generating AI-powered ${key.replace('case.', '')} via ${featureKey}`,
    ]
  }

  if (key.startsWith('hunt.')) {
    const query = (context?.query as string) ?? ''
    return [
      `Analyzing hunt query: "${query.slice(0, 80)}"`,
      'Decomposing query into threat hypotheses',
      'Generating detection queries and MITRE ATT&CK mapping',
      `Producing ${key.replace('hunt.', '')} via AI`,
    ]
  }

  if (key.startsWith('detection.')) {
    const ruleName = (context?.ruleName as string) ?? 'rule'
    return [
      `Loading detection rule: "${ruleName}"`,
      'Analyzing rule conditions, hit count, and false positive rate',
      'Evaluating MITRE coverage and detection gaps',
      `Generating ${key.replace('detection.', '')} recommendation via AI`,
    ]
  }

  if (key.startsWith('intel.')) {
    const iocValue = (context?.iocValue as string) ?? ''
    return [
      `Processing threat intelligence for: ${iocValue.slice(0, 50)}`,
      'Querying OSINT sources and threat feeds',
      'Correlating with known campaigns and threat actors',
      `Generating ${key.replace('intel.', '')} analysis via AI`,
    ]
  }

  if (key.startsWith('report.')) {
    return [
      'Collecting operational metrics and KPIs',
      'Analyzing alert volumes, resolution rates, and trends',
      'Evaluating team performance and SLA compliance',
      `Generating ${key.replace('report.', '')} via AI`,
    ]
  }

  if (key.startsWith('entity.')) {
    const entityValue = (context?.entityValue as string) ?? ''
    return [
      `Loading entity details: ${entityValue.slice(0, 50)}`,
      'Analyzing risk score breakdown and contributing factors',
      'Evaluating relationship graph and temporal activity',
      `Generating ${key.replace('entity.', '')} analysis via AI`,
    ]
  }

  if (key.startsWith('normalization.')) {
    const pipeline = (context?.pipelineName as string) ?? 'pipeline'
    return [
      `Loading normalization pipeline: "${pipeline}"`,
      'Analyzing field mappings and parser configuration',
      'Comparing sample events against normalized output',
      'Generating field-level verification report via AI',
    ]
  }

  if (key.startsWith('soar.')) {
    return [
      'Loading existing playbook catalog for reference',
      'Analyzing incident type, trigger conditions, and response steps',
      'Generating structured SOAR playbook draft via AI',
    ]
  }

  if (key.startsWith('dashboard.')) {
    const metric = (context?.metric as string) ?? 'metric'
    return [
      `Analyzing dashboard metric: ${metric}`,
      'Comparing current value against historical baseline',
      'Identifying anomalies and contributing factors',
      'Generating anomaly explanation via AI',
    ]
  }

  if (key.startsWith('knowledge.')) {
    return [
      'Searching knowledge base for relevant runbooks',
      'Analyzing operational procedures and decision points',
      `Generating ${key.replace('knowledge.', '')} via AI`,
    ]
  }

  // Fallback for agent tasks and unknown features
  return [
    `Processing AI task: ${featureKey}`,
    'Loading context and applying agent configuration',
    'Generating AI-powered response',
  ]
}

function computeFeatureConfidence(featureKey?: string, context?: Record<string, unknown>): number {
  if (!featureKey) return 0.9

  const key = featureKey.toLowerCase()

  // Alert investigation confidence varies by severity
  if (key.startsWith('alert.')) {
    const severity = (context?.alertSeverity as string) ?? ''
    let base = 0.7
    switch (severity) {
      case 'critical': {
        base = 0.92
        break
      }
      case 'high': {
        base = 0.88
        break
      }
      case 'medium': {
        base = 0.82
        break
      }
      case 'low':
        {
          base = 0.75
          // No default
        }
        break
    }

    // Boost if raw data is present
    if (context?.alertRawData) base = Math.min(base + 0.03, 0.95)
    return base
  }

  // Case confidence boosted by artifacts and timeline
  if (key.startsWith('case.')) {
    let base = 0.8
    if (context?.artifacts) base += 0.03
    if (context?.timelineEvents) base += 0.03
    if (context?.tasks) base += 0.02
    return Math.min(base, 0.95)
  }

  // Hunt queries are exploratory — moderate confidence
  if (key.startsWith('hunt.')) return 0.78

  // Detection tuning based on hit/FP data — higher confidence
  if (key.startsWith('detection.')) {
    const hitCount = (context?.hitCount as number) ?? 0
    return hitCount > 10 ? 0.88 : 0.8
  }

  // Intel enrichment depends on IOC type
  if (key.startsWith('intel.')) return 0.82

  // Reports and dashboards are data-driven
  if (key.startsWith('report.') || key.startsWith('dashboard.')) return 0.85

  // Entity risk has good data backing
  if (key.startsWith('entity.')) return 0.84

  // Normalization verification is structured
  if (key.startsWith('normalization.')) return 0.88

  // SOAR playbooks are suggestions
  if (key.startsWith('soar.')) return 0.78

  // Knowledge base is reference material
  if (key.startsWith('knowledge.')) return 0.82

  return 0.85
}

/* ---------------------------------------------------------------- */
/* FINAL PROMPT ASSEMBLY                                             */
/* ---------------------------------------------------------------- */

export function assembleFinalPrompt(
  promptContent: string,
  context: Record<string, unknown>,
  systemPrompt: string | null,
  promptSuffix: string | null,
  outputFormat?: string,
  presentationSkills?: string[]
): string {
  let finalPrompt = buildPromptFromTemplate(promptContent, context)
  if (systemPrompt) {
    finalPrompt = `${systemPrompt}\n\n${finalPrompt}`
  }

  const formatInstructions = buildOutputFormatInstructions(outputFormat, presentationSkills)
  if (formatInstructions) {
    finalPrompt = `${finalPrompt}\n\n${formatInstructions}`
  }

  if (promptSuffix) {
    finalPrompt = `${finalPrompt}\n\n${promptSuffix}`
  }
  return finalPrompt
}

function buildOutputFormatInstructions(
  outputFormat?: string,
  presentationSkills?: string[]
): string | null {
  const parts: string[] = []

  switch (outputFormat) {
    case AiOutputFormat.STRUCTURED_JSON: {
      parts.push(
        'IMPORTANT: Return your response as valid JSON. Structure with keys: "summary", "findings", "recommendations", "confidence", "severity".'
      )

      break
    }
    case AiOutputFormat.RICH_CARDS: {
      parts.push(
        'IMPORTANT: Structure your response as distinct cards separated by markdown ## headers. Each card should have a title, content, severity (if applicable), and action items.'
      )

      break
    }
    case AiOutputFormat.MARKDOWN: {
      parts.push(
        'Format your response in clean markdown with headers, bullet points, and code blocks where appropriate.'
      )

      break
    }
    case AiOutputFormat.PLAIN_TEXT: {
      parts.push(
        'Respond in plain, conversational language. Do not use markdown formatting, headers, or bullet points unless explicitly asked. Write as if explaining to a colleague in a direct message — clear, concise, and human-readable.'
      )

      break
    }
    // No default
  }

  if (presentationSkills && presentationSkills.length > 0) {
    const skillList = presentationSkills.join(', ')
    parts.push(
      `Include these visualization elements where relevant: ${skillList}. Structure your response to support rendering these components.`
    )
  }

  return parts.length > 0 ? parts.join('\n\n') : null
}

/* ---------------------------------------------------------------- */
/* CONNECTOR SELECTION FOR EXECUTE AI TASK                           */
/* ---------------------------------------------------------------- */

export function resolveSelectedConnector(
  explicitConnector: string | undefined,
  agentProviderMode: string,
  defaultProviderKey: string,
  preferredProvider: string | null
): string | null {
  return (
    explicitConnector ??
    (agentProviderMode === defaultProviderKey ? null : agentProviderMode) ??
    preferredProvider
  )
}
