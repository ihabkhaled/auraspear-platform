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

export enum ApprovalStatus {
  PENDING = 'pending',
  APPROVED = 'approved',
  REJECTED = 'rejected',
  EXPIRED = 'expired',
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

export enum AiFeatureKey {
  ALERT_SUMMARIZE = 'alert.summarize',
  ALERT_EXPLAIN_SEVERITY = 'alert.explain_severity',
  ALERT_FALSE_POSITIVE_SCORE = 'alert.false_positive_score',
  ALERT_NEXT_ACTION = 'alert.next_action',
  CASE_SUMMARIZE = 'case.summarize',
  CASE_EXECUTIVE_SUMMARY = 'case.executive_summary',
  CASE_TIMELINE = 'case.timeline',
  CASE_NEXT_TASKS = 'case.next_tasks',
  HUNT_HYPOTHESIS = 'hunt.hypothesis',
  HUNT_NL_TO_QUERY = 'hunt.nl_to_query',
  HUNT_RESULT_INTERPRET = 'hunt.result_interpret',
  INTEL_IOC_ENRICH = 'intel.ioc_enrich',
  INTEL_ADVISORY_DRAFT = 'intel.advisory_draft',
  DETECTION_RULE_DRAFT = 'detection.rule_draft',
  DETECTION_TUNING = 'detection.tuning',
  REPORT_DAILY_SUMMARY = 'report.daily_summary',
  REPORT_EXECUTIVE = 'report.executive',
  DASHBOARD_ANOMALY = 'dashboard.anomaly',
  SOAR_PLAYBOOK_DRAFT = 'soar.playbook_draft',
  AGENT_TASK = 'agent.task',
  KNOWLEDGE_SEARCH = 'knowledge.search',
  KNOWLEDGE_GENERATE_RUNBOOK = 'knowledge.generate_runbook',
  KNOWLEDGE_SUMMARIZE_INCIDENT = 'knowledge.summarize_incident',
  ENTITY_RISK_EXPLAIN = 'entity.risk_explain',
  NORMALIZATION_VERIFY = 'normalization.verify',
}

export enum AiApprovalLevel {
  NONE = 'none',
  ANALYST_REVIEW = 'analyst_review',
  APPROVAL_REQUIRED = 'approval_required',
}
