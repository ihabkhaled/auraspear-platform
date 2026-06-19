-- ============================================================
-- Fix 1: Seed the 7 MISSING agent configs per tenant
-- (orchestrator, l1_analyst, l2_analyst, threat_hunter,
--  rules_analyst, norm_verifier, dashboard_builder)
-- ============================================================

INSERT INTO "tenant_agent_configs" (
  "id", "tenant_id", "agent_id", "is_enabled",
  "provider_mode", "temperature", "max_tokens_per_call",
  "tokens_per_hour", "tokens_per_day", "tokens_per_month",
  "tokens_used_hour", "tokens_used_day", "tokens_used_month",
  "max_concurrent_runs", "trigger_mode", "trigger_config",
  "osint_sources", "output_format", "index_patterns",
  "presentation_skills", "created_at", "updated_at"
)
SELECT
  gen_random_uuid(),
  t.id,
  a.agent_id,
  false,
  'default',
  a.temperature,
  a.max_tokens_per_call,
  50000, 500000, 5000000,
  0, 0, 0,
  3,
  a.trigger_mode,
  '{}'::jsonb,
  '[]'::jsonb,
  a.output_format,
  ARRAY[]::text[],
  a.presentation_skills,
  NOW(), NOW()
FROM "tenants" t
CROSS JOIN (
  VALUES
    ('orchestrator',      0.3, 4096, 'manual_only',   'structured_json', ARRAY['task_routing','workflow_summary']),
    ('l1_analyst',        0.5, 2048, 'auto_on_alert', 'rich_cards',      ARRAY['risk_gauge','ioc_table','severity_badge']),
    ('l2_analyst',        0.5, 4096, 'manual_only',   'rich_cards',      ARRAY['timeline','mitre_map','ioc_table','risk_gauge']),
    ('threat_hunter',     0.7, 4096, 'manual_only',   'markdown',        ARRAY['hunt_query','mitre_map','ioc_table']),
    ('rules_analyst',     0.4, 4096, 'manual_only',   'structured_json', ARRAY['rule_preview','mitre_map']),
    ('norm_verifier',     0.3, 2048, 'manual_only',   'structured_json', ARRAY['field_mapping_table','validation_report']),
    ('dashboard_builder', 0.6, 2048, 'manual_only',   'rich_cards',      ARRAY['chart_preview','kpi_card'])
) AS a(agent_id, temperature, max_tokens_per_call, trigger_mode, output_format, presentation_skills)
ON CONFLICT ("tenant_id", "agent_id") DO NOTHING;


-- ============================================================
-- Fix 2: Delete global schedules (tenantId IS NULL)
--         They should be per-tenant for proper segregation
-- ============================================================

DELETE FROM "ai_agent_schedules" WHERE "tenant_id" IS NULL;


-- ============================================================
-- Fix 3: Delete old per-tenant schedules with wrong agent_ids
--         (triage-agent, enrichment-agent, etc. don't match
--          the AiAgentId enum values)
-- ============================================================

DELETE FROM "ai_agent_schedules"
WHERE "agent_id" IN (
  'triage-agent', 'enrichment-agent', 'escalation-agent',
  'correlation-agent', 'detection-agent', 'vuln-agent',
  'ueba-agent', 'attack-path-agent', 'norm-agent',
  'rules-agent', 'report-agent', 'entity-agent',
  'cloud-agent', 'soar-agent', 'intel-agent',
  'ioc-agent', 'misp-agent'
);


-- ============================================================
-- Fix 4: Re-seed ALL 29 per-tenant schedules with correct
--         AiAgentId enum values and appropriate cron expressions
-- ============================================================

INSERT INTO "ai_agent_schedules" (
  "id", "tenant_id", "agent_id", "seed_key", "module",
  "cron_expression", "timezone", "is_enabled", "is_paused",
  "execution_mode", "risk_mode", "approval_mode",
  "max_concurrency", "allow_overlap", "dedupe_window_seconds",
  "is_system_default", "failure_streak", "success_streak",
  "created_at", "updated_at"
)
SELECT
  gen_random_uuid(),
  t."id",
  v."agent_id",
  v."seed_key" || '.' || t."slug",
  v."module",
  v."cron_expression",
  'UTC',
  false, false,
  'suggest_only', 'low', 'not_required',
  1, false, 300,
  true, 0, 0,
  NOW(), NOW()
FROM "tenants" t
CROSS JOIN (
  VALUES
    -- Core agents
    ('orchestrator',          'orchestrator.workflow-processing',     'jobs',             '*/15 * * * *'),
    ('l1_analyst',            'l1-analyst.alert-triage',              'alerts',           '*/10 * * * *'),
    ('l2_analyst',            'l2-analyst.deep-investigation',        'cases',            '*/30 * * * *'),
    ('threat_hunter',         'threat-hunter.hypothesis-scan',        'hunt',             '0 */4 * * *'),
    ('rules_analyst',         'rules-analyst.tuning-review',          'detection_rules',  '30 2 * * *'),
    ('norm_verifier',         'norm-verifier.quality-review',         'normalization',    '*/45 * * * *'),
    ('dashboard_builder',     'dashboard-builder.kpi-refresh',        'dashboard',        '0 */6 * * *'),
    -- Specialist agents
    ('alert-triage',          'alert-triage.auto-triage',             'alerts',           '*/10 * * * *'),
    ('case-creation',         'case-creation.draft-generation',       'cases',            '*/20 * * * *'),
    ('incident-escalation',   'incident-escalation.watch',            'incidents',        '*/10 * * * *'),
    ('correlation-synthesis', 'correlation-synthesis.candidate-scan', 'correlation',      '*/30 * * * *'),
    ('sigma-drafting',        'sigma-drafting.rule-generation',       'detection_rules',  '0 3 * * *'),
    ('vuln-prioritization',   'vuln-prioritization.risk-scoring',     'vulnerabilities',  '0 */4 * * *'),
    ('ueba-narrative',        'ueba-narrative.anomaly-digest',        'ueba',             '*/30 * * * *'),
    ('attack-path-summary',   'attack-path-summary.chain-refresh',   'attack_paths',     '0 */6 * * *'),
    ('norm-verification',     'norm-verification.parser-check',       'normalization',    '*/45 * * * *'),
    ('rules-hygiene',         'rules-hygiene.policy-check',           'rules_engine',     '*/20 * * * *'),
    ('reporting',             'reporting.executive-weekly',            'reports',          '0 7 * * 1'),
    ('entity-linking',        'entity-linking.graph-enrichment',      'entities',         '*/25 * * * *'),
    ('job-health',            'job-health.queue-monitor',             'jobs',             '*/10 * * * *'),
    ('cloud-triage',          'cloud-triage.finding-triage',          'cloud_security',   '*/15 * * * *'),
    ('soar-drafting',         'soar-drafting.playbook-scan',          'soar',             '*/30 * * * *'),
    ('threat-intel-synthesis','threat-intel.feed-digest',             'intel',            '0 */3 * * *'),
    ('ioc-enrichment',        'ioc-enrichment.batch-enrich',          'ioc',              '*/20 * * * *'),
    ('misp-feed-review',      'misp-feed.poll',                       'misp',             '*/15 * * * *'),
    ('knowledge-base',        'knowledge-base.extraction',            'knowledge',        '0 */8 * * *'),
    ('notification-digest',   'notification-digest.compile',          'notifications',    '0 6 * * *'),
    ('provider-health',       'provider-health.check',                'system',           '*/5 * * * *'),
    ('approval-advisor',      'approval-advisor.review',              'approvals',        '*/15 * * * *')
) AS v("agent_id", "seed_key", "module", "cron_expression")
ON CONFLICT ("seed_key") DO NOTHING;
