import { ConnectorType } from '../../../common/enums'

export const REDACTED = '***REDACTED***'

export const FIXED_AI_CONNECTORS = [
  { type: ConnectorType.BEDROCK, label: 'AWS Bedrock' },
  { type: ConnectorType.LLM_APIS, label: 'LLM APIs (Legacy)' },
  { type: ConnectorType.OPENCLAW_GATEWAY, label: 'OpenClaw Gateway' },
] as const
