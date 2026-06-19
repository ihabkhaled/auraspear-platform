export enum AiAgentId {
  ORCHESTRATOR = 'orchestrator',
  L1_ANALYST = 'l1_analyst',
  L2_ANALYST = 'l2_analyst',
  THREAT_HUNTER = 'threat_hunter',
  RULES_ANALYST = 'rules_analyst',
  NORM_VERIFIER = 'norm_verifier',
  DASHBOARD_BUILDER = 'dashboard_builder',
  ALERT_TRIAGE = 'alert-triage',
  CASE_CREATION = 'case-creation',
  INCIDENT_ESCALATION = 'incident-escalation',
  CORRELATION_SYNTHESIS = 'correlation-synthesis',
  SIGMA_DRAFTING = 'sigma-drafting',
  VULN_PRIORITIZATION = 'vuln-prioritization',
  UEBA_NARRATIVE = 'ueba-narrative',
  ATTACK_PATH_SUMMARY = 'attack-path-summary',
  NORM_VERIFICATION = 'norm-verification',
  RULES_HYGIENE = 'rules-hygiene',
  REPORTING = 'reporting',
  ENTITY_LINKING = 'entity-linking',
  JOB_HEALTH = 'job-health',
  CLOUD_TRIAGE = 'cloud-triage',
  SOAR_DRAFTING = 'soar-drafting',
  THREAT_INTEL_SYNTHESIS = 'threat-intel-synthesis',
  IOC_ENRICHMENT = 'ioc-enrichment',
  MISP_FEED_REVIEW = 'misp-feed-review',
  KNOWLEDGE_BASE = 'knowledge-base',
  NOTIFICATION_DIGEST = 'notification-digest',
  PROVIDER_HEALTH = 'provider-health',
  APPROVAL_ADVISOR = 'approval-advisor',
}

export enum AiTriggerMode {
  MANUAL_ONLY = 'manual_only',
  AUTO_ON_ALERT = 'auto_on_alert',
  AUTO_BY_AGENT = 'auto_by_agent',
  SCHEDULED = 'scheduled',
}

export enum AiOutputFormat {
  STRUCTURED_JSON = 'structured_json',
  MARKDOWN = 'markdown',
  RICH_CARDS = 'rich_cards',
  PLAIN_TEXT = 'plain_text',
}

export enum OsintSourceType {
  VIRUSTOTAL = 'virustotal',
  SHODAN = 'shodan',
  ABUSEIPDB = 'abuseipdb',
  NVD_NIST = 'nvd_nist',
  ALIENVAULT_OTX = 'alienvault_otx',
  GREYNOISE = 'greynoise',
  URLSCAN = 'urlscan',
  CENSYS = 'censys',
  MALWARE_BAZAAR = 'malware_bazaar',
  THREATFOX = 'threatfox',
  PULSEDIVE = 'pulsedive',
  WEB_SEARCH = 'web_search',
  CUSTOM = 'custom',
}

export enum OsintAuthType {
  NONE = 'none',
  API_KEY_HEADER = 'api_key_header',
  API_KEY_QUERY = 'api_key_query',
  BEARER = 'bearer',
  BASIC = 'basic',
}

export enum ApprovalStatus {
  PENDING = 'pending',
  APPROVED = 'approved',
  REJECTED = 'rejected',
  EXPIRED = 'expired',
}

export enum ApprovalRiskLevel {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical',
}

export enum TokenResetPeriod {
  HOUR = 'hour',
  DAY = 'day',
  MONTH = 'month',
}
