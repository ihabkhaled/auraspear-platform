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
  VULNERABILITY_PRIORITIZE = 'vulnerability.prioritize',
  CLOUD_FINDING_TRIAGE = 'cloud.finding_triage',
  UEBA_ANOMALY_EXPLAIN = 'ueba.anomaly_explain',
  ATTACK_PATH_SUMMARIZE = 'attack_path.summarize',
}

export enum AiApprovalLevel {
  NONE = 'none',
  ANALYST_REVIEW = 'analyst_review',
  APPROVAL_REQUIRED = 'approval_required',
}

export enum AiActionCategory {
  ANALYSIS_ONLY = 'analysis_only',
  SUGGESTED = 'suggested',
  APPROVAL_REQUIRED = 'approval_required',
  AUTO_ALLOWED = 'auto_allowed',
}
