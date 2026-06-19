-- ============================================================
-- Backfill ALL 29 agent configs for every tenant that is missing them.
-- Uses the same values as the original seed migrations.
-- ON CONFLICT DO NOTHING ensures idempotency.
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
    -- 7 core agents (from fix migration)
    ('orchestrator',          0.3, 4096, 'manual_only',   'structured_json', ARRAY['task_routing','workflow_summary']),
    ('l1_analyst',            0.5, 2048, 'auto_on_alert', 'rich_cards',      ARRAY['risk_gauge','ioc_table','severity_badge']),
    ('l2_analyst',            0.5, 4096, 'manual_only',   'rich_cards',      ARRAY['timeline','mitre_map','ioc_table','risk_gauge']),
    ('threat_hunter',         0.7, 4096, 'manual_only',   'markdown',        ARRAY['hunt_query','mitre_map','ioc_table']),
    ('rules_analyst',         0.4, 4096, 'manual_only',   'structured_json', ARRAY['rule_preview','mitre_map']),
    ('norm_verifier',         0.3, 2048, 'manual_only',   'structured_json', ARRAY['field_mapping_table','validation_report']),
    ('dashboard_builder',     0.6, 2048, 'manual_only',   'rich_cards',      ARRAY['chart_preview','kpi_card']),
    -- 22 specialist agents (from original seed_agent_catalog migration)
    ('alert-triage',           0.4,  2048, 'manual_only', 'rich_cards',      ARRAY['risk_gauge','severity_badge']),
    ('case-creation',          0.5,  4096, 'manual_only', 'structured_json', ARRAY['case_preview']),
    ('incident-escalation',    0.3,  2048, 'manual_only', 'rich_cards',      ARRAY['severity_badge','timeline']),
    ('correlation-synthesis',  0.5,  4096, 'manual_only', 'rich_cards',      ARRAY['timeline','ioc_table','mitre_map']),
    ('sigma-drafting',         0.4,  4096, 'manual_only', 'structured_json', ARRAY['rule_preview']),
    ('vuln-prioritization',    0.4,  2048, 'manual_only', 'rich_cards',      ARRAY['risk_gauge','severity_badge']),
    ('ueba-narrative',         0.6,  2048, 'manual_only', 'markdown',        ARRAY['timeline','risk_gauge']),
    ('attack-path-summary',    0.5,  4096, 'manual_only', 'rich_cards',      ARRAY['timeline','mitre_map']),
    ('norm-verification',      0.3,  2048, 'manual_only', 'structured_json', ARRAY['field_mapping_table','validation_report']),
    ('rules-hygiene',          0.4,  2048, 'manual_only', 'rich_cards',      ARRAY['rule_preview']),
    ('reporting',              0.5,  4096, 'manual_only', 'markdown',        ARRAY['chart_preview','kpi_card']),
    ('entity-linking',         0.5,  4096, 'manual_only', 'rich_cards',      ARRAY['ioc_table']),
    ('job-health',             0.3,  2048, 'scheduled',   'rich_cards',      ARRAY['kpi_card']),
    ('cloud-triage',           0.4,  2048, 'manual_only', 'rich_cards',      ARRAY['risk_gauge','severity_badge']),
    ('soar-drafting',          0.5,  4096, 'manual_only', 'structured_json', ARRAY['workflow_summary']),
    ('threat-intel-synthesis',  0.5,  4096, 'manual_only', 'rich_cards',      ARRAY['ioc_table','mitre_map']),
    ('ioc-enrichment',         0.4,  2048, 'manual_only', 'rich_cards',      ARRAY['ioc_table','risk_gauge']),
    ('misp-feed-review',       0.4,  2048, 'manual_only', 'rich_cards',      ARRAY['ioc_table']),
    ('knowledge-base',         0.5,  4096, 'manual_only', 'markdown',        ARRAY['workflow_summary']),
    ('notification-digest',    0.4,  2048, 'scheduled',   'markdown',        ARRAY['kpi_card']),
    ('provider-health',        0.3,  1024, 'scheduled',   'rich_cards',      ARRAY['kpi_card']),
    ('approval-advisor',       0.4,  2048, 'manual_only', 'rich_cards',      ARRAY['risk_gauge','severity_badge'])
) AS a(agent_id, temperature, max_tokens_per_call, trigger_mode, output_format, presentation_skills)
ON CONFLICT ("tenant_id", "agent_id") DO NOTHING;
