export enum DashboardDensity {
  COMPACT = 'compact',
  COMFORTABLE = 'comfortable',
  EXPANDED = 'expanded',
}

export enum DashboardPanelKey {
  OVERVIEW = 'overview',
  THREAT_OPERATIONS = 'threat_operations',
  OPERATIONS = 'operations',
  AUTOMATION = 'automation',
  GOVERNANCE = 'governance',
  INFRASTRUCTURE = 'infrastructure',
  ALERT_TRENDS = 'alert_trends',
  SEVERITY_DISTRIBUTION = 'severity_distribution',
  MITRE_TECHNIQUES = 'mitre_techniques',
  TARGETED_ASSETS = 'targeted_assets',
  INCIDENT_STATUS = 'incident_status',
  CASE_AGING = 'case_aging',
  RULE_PERFORMANCE = 'rule_performance',
  CONNECTOR_SYNC = 'connector_sync',
  RUNTIME_BACKLOG = 'runtime_backlog',
  AUTOMATION_QUALITY = 'automation_quality',
  EXPOSURE_SUMMARY = 'exposure_summary',
  REPORT_TEMPLATES = 'report_templates',
  AI_CANVAS = 'ai_canvas',
  RECENT_ACTIVITY = 'recent_activity',
}

export enum DashboardRulePerformanceMetric {
  HIT_COUNT = 'hit_count',
  FALSE_POSITIVE_RATE = 'false_positive_rate',
}
