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
