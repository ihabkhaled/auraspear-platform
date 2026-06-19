export enum AiAgentStatus {
  ONLINE = 'online',
  OFFLINE = 'offline',
  DEGRADED = 'degraded',
  MAINTENANCE = 'maintenance',
}

export enum AiAgentTier {
  L0 = 'L0',
  L1 = 'L1',
  L2 = 'L2',
  L3 = 'L3',
}

export enum AiAgentSessionStatus {
  RUNNING = 'running',
  COMPLETED = 'completed',
  FAILED = 'failed',
  CANCELLED = 'cancelled',
}

export enum AiAgentPanelTab {
  OVERVIEW = 'overview',
  SOUL = 'soul',
  SESSIONS = 'sessions',
  TOOLS = 'tools',
}

export enum AiConnectorPreference {
  DEFAULT = 'default',
  BEDROCK = 'bedrock',
  LLM_APIS = 'llm_apis',
  OPENCLAW_GATEWAY = 'openclaw_gateway',
}

export enum AiSessionTrigger {
  USER = 'user',
  SYSTEM = 'system',
  SCHEDULED = 'scheduled',
  EVENT = 'event',
}
