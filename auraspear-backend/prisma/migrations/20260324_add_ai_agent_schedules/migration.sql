-- CreateTable
CREATE TABLE "ai_agent_schedules" (
    "id"                     UUID          NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id"              UUID,
    "agent_id"               VARCHAR(50)   NOT NULL,
    "seed_key"               VARCHAR(100)  NOT NULL,
    "module"                 VARCHAR(50)   NOT NULL,
    "cron_expression"        VARCHAR(100)  NOT NULL,
    "timezone"               VARCHAR(50)   NOT NULL DEFAULT 'UTC',
    "is_enabled"             BOOLEAN       NOT NULL DEFAULT false,
    "is_paused"              BOOLEAN       NOT NULL DEFAULT false,
    "execution_mode"         VARCHAR(30)   NOT NULL DEFAULT 'suggest_only',
    "risk_mode"              VARCHAR(20)   NOT NULL DEFAULT 'low',
    "approval_mode"          VARCHAR(30)   NOT NULL DEFAULT 'not_required',
    "max_concurrency"        INTEGER       NOT NULL DEFAULT 1,
    "allow_overlap"          BOOLEAN       NOT NULL DEFAULT false,
    "dedupe_window_seconds"  INTEGER       NOT NULL DEFAULT 300,
    "provider_preference"    VARCHAR(50),
    "model_preference"       VARCHAR(100),
    "scope_json"             JSONB,
    "is_system_default"      BOOLEAN       NOT NULL DEFAULT false,
    "last_run_at"            TIMESTAMP(3),
    "next_run_at"            TIMESTAMP(3),
    "last_status"            VARCHAR(20),
    "last_duration_ms"       INTEGER,
    "failure_streak"         INTEGER       NOT NULL DEFAULT 0,
    "success_streak"         INTEGER       NOT NULL DEFAULT 0,
    "disabled_reason"        TEXT,
    "created_by"             VARCHAR(320),
    "updated_by"             VARCHAR(320),
    "created_at"             TIMESTAMP(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at"             TIMESTAMP(3)  NOT NULL,

    CONSTRAINT "ai_agent_schedules_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ai_agent_schedules_seed_key_key" ON "ai_agent_schedules"("seed_key");

-- CreateIndex
CREATE INDEX "ai_agent_schedules_tenant_id_idx" ON "ai_agent_schedules"("tenant_id");

-- CreateIndex
CREATE INDEX "ai_agent_schedules_is_enabled_is_paused_idx" ON "ai_agent_schedules"("is_enabled", "is_paused");

-- CreateIndex
CREATE INDEX "ai_agent_schedules_module_idx" ON "ai_agent_schedules"("module");

-- CreateIndex
CREATE INDEX "ai_agent_schedules_agent_id_idx" ON "ai_agent_schedules"("agent_id");

-- CreateIndex
CREATE INDEX "ai_agent_schedules_next_run_at_idx" ON "ai_agent_schedules"("next_run_at");

-- AddForeignKey
ALTER TABLE "ai_agent_schedules"
    ADD CONSTRAINT "ai_agent_schedules_tenant_id_fkey"
    FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;

-- ============================================================
-- Seed 21 default schedules
-- ============================================================

-- 3 global schedules (tenant_id IS NULL)
INSERT INTO "ai_agent_schedules" (
    "id", "tenant_id", "agent_id", "seed_key", "module",
    "cron_expression", "timezone", "is_enabled", "is_paused",
    "execution_mode", "risk_mode", "approval_mode",
    "max_concurrency", "allow_overlap", "dedupe_window_seconds",
    "is_system_default", "failure_streak", "success_streak",
    "created_at", "updated_at"
)
VALUES
    (gen_random_uuid(), NULL, 'orchestrator', 'system.provider-health-check', 'system',
     '*/5 * * * *', 'UTC', false, false,
     'suggest_only', 'low', 'not_required',
     1, false, 300,
     true, 0, 0,
     NOW(), NOW()),

    (gen_random_uuid(), NULL, 'orchestrator', 'system.agent-scheduled-processing', 'jobs',
     '*/15 * * * *', 'UTC', false, false,
     'suggest_only', 'low', 'not_required',
     1, false, 300,
     true, 0, 0,
     NOW(), NOW()),

    (gen_random_uuid(), NULL, 'orchestrator', 'system.daily-digests', 'reports',
     '0 6 * * *', 'UTC', false, false,
     'suggest_only', 'low', 'not_required',
     1, false, 300,
     true, 0, 0,
     NOW(), NOW()),

    (gen_random_uuid(), NULL, 'orchestrator', 'jobs.health-monitor', 'jobs',
     '*/10 * * * *', 'UTC', false, false,
     'suggest_only', 'low', 'not_required',
     1, false, 300,
     true, 0, 0,
     NOW(), NOW())
ON CONFLICT ("seed_key") DO NOTHING;

-- 18 per-tenant schedules (one row per existing tenant)
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
    false,
    false,
    'suggest_only',
    'low',
    'not_required',
    1,
    false,
    300,
    true,
    0,
    0,
    NOW(),
    NOW()
FROM "tenants" t
CROSS JOIN (
    VALUES
        ('triage-agent',      'alerts.auto-triage.standard',         'alerts',           '*/10 * * * *'),
        ('enrichment-agent',  'cases.enrichment.standard',           'cases',            '*/20 * * * *'),
        ('escalation-agent',  'incidents.escalation-watch',          'incidents',        '*/10 * * * *'),
        ('correlation-agent', 'correlation.candidate-refresh',       'correlation',      '*/30 * * * *'),
        ('detection-agent',   'sigma.tuning.review',                 'detection_rules',  '30 2 * * *'),
        ('vuln-agent',        'vulnerabilities.prioritization',      'vulnerabilities',  '0 */4 * * *'),
        ('ueba-agent',        'ueba.anomaly-digest',                 'ueba',             '*/30 * * * *'),
        ('attack-path-agent', 'attack-path.refresh',                 'attack_paths',     '0 */6 * * *'),
        ('norm-agent',        'normalization.quality-review',        'normalization',    '*/45 * * * *'),
        ('rules-agent',       'rules.policy-check',                  'rules_engine',     '*/20 * * * *'),
        ('report-agent',      'reports.executive-weekly',            'reports',          '0 7 * * 1'),
        ('entity-agent',      'entity-graph.enrichment',             'entities',         '*/25 * * * *'),
        ('cloud-agent',       'cloud-security.finding-triage',       'cloud_security',   '*/15 * * * *'),
        ('soar-agent',        'soar.playbook-opportunities',         'soar',             '*/30 * * * *'),
        ('intel-agent',       'intel.feed-digest',                   'intel',            '0 */3 * * *'),
        ('ioc-agent',         'ioc.batch-enrichment',                'ioc',              '*/20 * * * *'),
        ('misp-agent',        'misp.feed-poll',                      'misp',             '*/15 * * * *')
) AS v("agent_id", "seed_key", "module", "cron_expression")
ON CONFLICT ("seed_key") DO NOTHING;
