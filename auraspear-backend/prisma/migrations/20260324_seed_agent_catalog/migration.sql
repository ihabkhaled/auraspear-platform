-- Ensure tenant_agent_configs table exists before seeding.
-- The table is created by 20260322_add_agent_config_osint_approval, but on fresh DBs
-- Prisma may encounter ordering issues. This is idempotent.
CREATE TABLE IF NOT EXISTS "tenant_agent_configs" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "agent_id" VARCHAR(50) NOT NULL,
    "is_enabled" BOOLEAN NOT NULL DEFAULT true,
    "provider_mode" VARCHAR(100) NOT NULL DEFAULT 'default',
    "model" VARCHAR(255),
    "temperature" DOUBLE PRECISION NOT NULL DEFAULT 0.7,
    "max_tokens_per_call" INTEGER NOT NULL DEFAULT 2048,
    "system_prompt" TEXT,
    "prompt_suffix" TEXT,
    "index_patterns" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "tokens_per_hour" INTEGER NOT NULL DEFAULT 50000,
    "tokens_per_day" INTEGER NOT NULL DEFAULT 500000,
    "tokens_per_month" INTEGER NOT NULL DEFAULT 5000000,
    "tokens_used_hour" INTEGER NOT NULL DEFAULT 0,
    "tokens_used_day" INTEGER NOT NULL DEFAULT 0,
    "tokens_used_month" INTEGER NOT NULL DEFAULT 0,
    "max_concurrent_runs" INTEGER NOT NULL DEFAULT 3,
    "trigger_mode" VARCHAR(30) NOT NULL DEFAULT 'manual_only',
    "trigger_config" JSONB NOT NULL DEFAULT '{}',
    "osint_sources" JSONB NOT NULL DEFAULT '[]',
    "output_format" VARCHAR(20) NOT NULL DEFAULT 'markdown',
    "presentation_skills" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "last_reset_hour" TIMESTAMP(3),
    "last_reset_day" TIMESTAMP(3),
    "last_reset_month" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "tenant_agent_configs_pkey" PRIMARY KEY ("id")
);

-- Ensure indexes and FK exist
CREATE UNIQUE INDEX IF NOT EXISTS "tenant_agent_configs_tenant_id_agent_id_key" ON "tenant_agent_configs"("tenant_id", "agent_id");
CREATE INDEX IF NOT EXISTS "tenant_agent_configs_tenant_id_idx" ON "tenant_agent_configs"("tenant_id");

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'tenant_agent_configs_tenant_id_fkey') THEN
    ALTER TABLE "tenant_agent_configs" ADD CONSTRAINT "tenant_agent_configs_tenant_id_fkey"
      FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

-- Seed 22 specialized AI agent configs into tenant_agent_configs for every tenant.
-- Each agent starts disabled (is_enabled = false) — tenant admin enables per-tenant.
-- Uses INSERT ... ON CONFLICT DO NOTHING on the (tenant_id, agent_id) unique constraint.

INSERT INTO "tenant_agent_configs" (
  "id",
  "tenant_id",
  "agent_id",
  "is_enabled",
  "provider_mode",
  "temperature",
  "max_tokens_per_call",
  "tokens_per_hour",
  "tokens_per_day",
  "tokens_per_month",
  "tokens_used_hour",
  "tokens_used_day",
  "tokens_used_month",
  "max_concurrent_runs",
  "trigger_mode",
  "trigger_config",
  "osint_sources",
  "output_format",
  "index_patterns",
  "presentation_skills",
  "created_at",
  "updated_at"
)
SELECT
  gen_random_uuid(),
  t.id,
  a.agent_id,
  false,
  'default',
  a.temperature,
  a.max_tokens_per_call,
  50000,
  500000,
  5000000,
  0,
  0,
  0,
  3,
  a.trigger_mode,
  '{}'::jsonb,
  '[]'::jsonb,
  a.output_format,
  ARRAY[]::text[],
  a.presentation_skills,
  NOW(),
  NOW()
FROM "tenants" t
CROSS JOIN (
  VALUES
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
    ('threat-intel-synthesis', 0.5,  4096, 'manual_only', 'rich_cards',      ARRAY['ioc_table','mitre_map']),
    ('ioc-enrichment',         0.4,  2048, 'manual_only', 'rich_cards',      ARRAY['ioc_table','risk_gauge']),
    ('misp-feed-review',       0.4,  2048, 'manual_only', 'rich_cards',      ARRAY['ioc_table']),
    ('knowledge-base',         0.5,  4096, 'manual_only', 'markdown',        ARRAY['workflow_summary']),
    ('notification-digest',    0.4,  2048, 'scheduled',   'markdown',        ARRAY['kpi_card']),
    ('provider-health',        0.3,  1024, 'scheduled',   'rich_cards',      ARRAY['kpi_card']),
    ('approval-advisor',       0.4,  2048, 'manual_only', 'rich_cards',      ARRAY['risk_gauge','severity_badge'])
) AS a(agent_id, temperature, max_tokens_per_call, trigger_mode, output_format, presentation_skills)
ON CONFLICT ("tenant_id", "agent_id") DO NOTHING;
