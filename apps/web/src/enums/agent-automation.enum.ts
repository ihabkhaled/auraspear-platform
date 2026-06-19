export enum AgentAutomationMode {
  DISABLED = 'disabled',
  MANUAL_ONLY = 'manual_only',
  SUGGEST_ONLY = 'suggest_only',
  DRAFT_ONLY = 'draft_only',
  ENRICH_ONLY = 'enrich_only',
  APPROVAL_REQUIRED = 'approval_required',
  AUTO_LOW_RISK = 'auto_low_risk',
  AUTO_GOVERNED = 'auto_governed',
  SCHEDULED = 'scheduled',
  EVENT_DRIVEN = 'event_driven',
  ANALYST_INVOKED = 'analyst_invoked',
  ORCHESTRATOR_INVOKED = 'orchestrator_invoked',
}

export enum AgentActionType {
  CREATE = 'create',
  UPDATE = 'update',
  ENRICH = 'enrich',
  SCORE = 'score',
  CLASSIFY = 'classify',
  SUMMARIZE = 'summarize',
  DRAFT = 'draft',
  PROPOSE = 'propose',
  ESCALATE = 'escalate',
  TRIAGE = 'triage',
  CORRELATE = 'correlate',
  INVESTIGATE = 'investigate',
  RECOMMEND = 'recommend',
  VALIDATE = 'validate',
  SYNC = 'sync',
  REVIEW = 'review',
  REPORT = 'report',
  EXPLAIN = 'explain',
}

export enum AgentRiskLevel {
  NONE = 'none',
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical',
}
