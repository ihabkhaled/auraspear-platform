-- ============================================================
-- Table 1: ai_schedule_templates
-- One row per authoritative job key. System-managed, read-only for tenants.
-- Provides default values for new tenant schedule creation.
-- ============================================================

CREATE TABLE "ai_schedule_templates" (
    "id"                          UUID          NOT NULL DEFAULT gen_random_uuid(),
    "job_key"                     VARCHAR(80)   NOT NULL,
    "display_name"                VARCHAR(255)  NOT NULL,
    "description"                 TEXT          NOT NULL DEFAULT '',
    "source_module"               VARCHAR(50)   NOT NULL,
    "target_module"               VARCHAR(50)   NOT NULL,
    "default_cron"                VARCHAR(100)  NOT NULL,
    "default_timezone"            VARCHAR(50)   NOT NULL DEFAULT 'UTC',
    "default_enabled"             BOOLEAN       NOT NULL DEFAULT false,
    "default_concurrency"         INTEGER       NOT NULL DEFAULT 1,
    "default_timeout_seconds"     INTEGER       NOT NULL DEFAULT 300,
    "default_retry_max"           INTEGER       NOT NULL DEFAULT 2,
    "default_approval_mode"       VARCHAR(30)   NOT NULL DEFAULT 'not_required',
    "default_risk_mode"           VARCHAR(20)   NOT NULL DEFAULT 'low',
    "default_execution_mode"      VARCHAR(30)   NOT NULL DEFAULT 'suggest_only',
    "default_notification_mode"   VARCHAR(30)   NOT NULL DEFAULT 'on_failure',
    "default_visibility_mode"     VARCHAR(30)   NOT NULL DEFAULT 'findings_panel',
    "trigger_type"                VARCHAR(20)   NOT NULL DEFAULT 'scheduled',
    "output_entity_type"          VARCHAR(50),
    "output_destination"          VARCHAR(100)  NOT NULL DEFAULT 'ai_execution_findings',
    "tenant_override_allowed"     BOOLEAN       NOT NULL DEFAULT true,
    "created_at"                  TIMESTAMP(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at"                  TIMESTAMP(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ai_schedule_templates_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ai_schedule_templates_job_key_key" ON "ai_schedule_templates"("job_key");
CREATE INDEX "ai_schedule_templates_source_module_idx" ON "ai_schedule_templates"("source_module");
CREATE INDEX "ai_schedule_templates_target_module_idx" ON "ai_schedule_templates"("target_module");

-- ============================================================
-- Table 2: ai_finding_output_links
-- Connects AI findings to entities in other modules (alerts, cases, etc.)
-- Enables "show AI outputs" in any module detail page.
-- ============================================================

CREATE TABLE "ai_finding_output_links" (
    "id"                UUID          NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id"         UUID          NOT NULL,
    "finding_id"        UUID          NOT NULL,
    "job_id"            UUID,
    "linked_module"     VARCHAR(50)   NOT NULL,
    "linked_entity_type" VARCHAR(50)  NOT NULL,
    "linked_entity_id"  VARCHAR(255)  NOT NULL,
    "relationship_type" VARCHAR(30)   NOT NULL DEFAULT 'produced_by',
    "created_at"        TIMESTAMP(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ai_finding_output_links_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ai_finding_output_links_tenant_id_idx" ON "ai_finding_output_links"("tenant_id");
CREATE INDEX "ai_finding_output_links_finding_id_idx" ON "ai_finding_output_links"("finding_id");
CREATE INDEX "ai_finding_output_links_linked_idx" ON "ai_finding_output_links"("tenant_id", "linked_module", "linked_entity_id");
CREATE INDEX "ai_finding_output_links_job_id_idx" ON "ai_finding_output_links"("job_id");

ALTER TABLE "ai_finding_output_links"
    ADD CONSTRAINT "ai_finding_output_links_tenant_id_fkey"
    FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ai_finding_output_links"
    ADD CONSTRAINT "ai_finding_output_links_finding_id_fkey"
    FOREIGN KEY ("finding_id") REFERENCES "ai_execution_findings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ============================================================
-- Table 3: ai_job_run_summaries
-- Enriched per-run view joining job + AI session + findings.
-- Materialized as a table for efficient querying/filtering.
-- ============================================================

CREATE TABLE "ai_job_run_summaries" (
    "id"                  UUID          NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id"           UUID          NOT NULL,
    "job_id"              UUID          NOT NULL,
    "schedule_id"         UUID,
    "job_key"             VARCHAR(80)   NOT NULL,
    "agent_id"            VARCHAR(50),
    "trigger_type"        VARCHAR(30)   NOT NULL DEFAULT 'scheduled',
    "status"              VARCHAR(20)   NOT NULL DEFAULT 'pending',
    "started_at"          TIMESTAMP(3),
    "completed_at"        TIMESTAMP(3),
    "duration_ms"         INTEGER,
    "provider_key"        VARCHAR(100),
    "model_key"           VARCHAR(255),
    "tokens_used"         INTEGER       NOT NULL DEFAULT 0,
    "findings_count"      INTEGER       NOT NULL DEFAULT 0,
    "writebacks_count"    INTEGER       NOT NULL DEFAULT 0,
    "source_module"       VARCHAR(50),
    "source_entity_id"    VARCHAR(255),
    "summary_text"        TEXT,
    "confidence_score"    FLOAT,
    "error_message"       TEXT,
    "created_at"          TIMESTAMP(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ai_job_run_summaries_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ai_job_run_summaries_tenant_id_idx" ON "ai_job_run_summaries"("tenant_id");
CREATE INDEX "ai_job_run_summaries_job_id_idx" ON "ai_job_run_summaries"("job_id");
CREATE INDEX "ai_job_run_summaries_schedule_id_idx" ON "ai_job_run_summaries"("schedule_id");
CREATE INDEX "ai_job_run_summaries_job_key_idx" ON "ai_job_run_summaries"("tenant_id", "job_key");
CREATE INDEX "ai_job_run_summaries_status_idx" ON "ai_job_run_summaries"("tenant_id", "status");
CREATE INDEX "ai_job_run_summaries_created_idx" ON "ai_job_run_summaries"("tenant_id", "created_at" DESC);

ALTER TABLE "ai_job_run_summaries"
    ADD CONSTRAINT "ai_job_run_summaries_tenant_id_fkey"
    FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ============================================================
-- Seed 37 schedule templates (29 AI agents + 8 job types)
-- ============================================================

INSERT INTO "ai_schedule_templates" (
    "job_key", "display_name", "description",
    "source_module", "target_module",
    "default_cron", "default_timezone", "default_enabled",
    "default_concurrency", "default_timeout_seconds", "default_retry_max",
    "default_approval_mode", "default_risk_mode", "default_execution_mode",
    "default_notification_mode", "default_visibility_mode",
    "trigger_type", "output_entity_type", "output_destination",
    "tenant_override_allowed"
) VALUES
    -- ── 29 AI Agent scheduled tasks ──
    ('agent.orchestrator',           'Orchestrator',                     'Coordinates multi-agent workflows',                    'ai',              'jobs',             '*/15 * * * *', 'UTC', false, 1, 300, 2, 'not_required', 'low',    'suggest_only', 'on_failure',  'findings_panel', 'scheduled', 'ai_execution_findings', 'ai_execution_findings', true),
    ('agent.l1_analyst',             'L1 SOC Analyst',                   'Alert triage and classification',                      'alerts',          'alerts',           '*/10 * * * *', 'UTC', false, 1, 300, 2, 'not_required', 'low',    'suggest_only', 'on_failure',  'findings_panel', 'scheduled', 'alert',                 'ai_execution_findings', true),
    ('agent.l2_analyst',             'L2 SOC Analyst',                   'Deep investigation and correlation',                   'cases',           'cases',            '*/30 * * * *', 'UTC', false, 1, 300, 2, 'not_required', 'low',    'suggest_only', 'on_failure',  'findings_panel', 'scheduled', 'case',                  'ai_execution_findings', true),
    ('agent.threat_hunter',          'Threat Hunter',                    'Proactive hypothesis scanning',                        'hunt',            'hunt',             '0 */4 * * *',  'UTC', false, 1, 600, 2, 'not_required', 'medium', 'suggest_only', 'on_failure',  'findings_panel', 'scheduled', NULL,                    'ai_execution_findings', true),
    ('agent.rules_analyst',          'Rules Analyst',                    'Detection rule tuning review',                         'detection_rules', 'detection_rules',  '30 2 * * *',   'UTC', false, 1, 300, 2, 'not_required', 'low',    'suggest_only', 'on_failure',  'findings_panel', 'scheduled', 'detection_rule',        'ai_execution_findings', true),
    ('agent.norm_verifier',          'Normalization Verifier',           'Pipeline quality review',                              'normalization',   'normalization',    '*/45 * * * *', 'UTC', false, 1, 300, 2, 'not_required', 'low',    'suggest_only', 'on_failure',  'findings_panel', 'scheduled', NULL,                    'ai_execution_findings', true),
    ('agent.dashboard_builder',      'Dashboard Builder',                'KPI refresh and visualization',                        'dashboard',       'dashboard',        '0 */6 * * *',  'UTC', false, 1, 300, 2, 'not_required', 'low',    'suggest_only', 'on_failure',  'findings_panel', 'scheduled', NULL,                    'ai_execution_findings', true),
    ('agent.alert_triage',           'Alert Triage Agent',               'Auto-triage and score alerts',                         'alerts',          'alerts',           '*/10 * * * *', 'UTC', false, 1, 300, 2, 'not_required', 'low',    'suggest_only', 'always',      'findings_panel', 'scheduled', 'alert',                 'ai_execution_findings', true),
    ('agent.case_creation',          'Case Creation Agent',              'Draft cases from grouped alerts',                      'cases',           'cases',            '*/20 * * * *', 'UTC', false, 1, 300, 2, 'not_required', 'medium', 'suggest_only', 'always',      'findings_panel', 'scheduled', 'case',                  'ai_execution_findings', true),
    ('agent.incident_escalation',    'Incident Escalation Agent',        'Escalate critical incidents',                          'incidents',       'incidents',        '*/10 * * * *', 'UTC', false, 1, 300, 2, 'not_required', 'high',   'suggest_only', 'always',      'findings_panel', 'scheduled', 'incident',              'ai_execution_findings', true),
    ('agent.correlation_synthesis',  'Correlation Synthesis Agent',      'Cross-source correlation discovery',                   'correlation',     'correlation',      '*/30 * * * *', 'UTC', false, 1, 600, 2, 'not_required', 'medium', 'suggest_only', 'on_failure',  'findings_panel', 'scheduled', NULL,                    'ai_execution_findings', true),
    ('agent.sigma_drafting',         'Sigma Drafting Agent',             'Draft Sigma detection rules',                          'detection_rules', 'detection_rules',  '0 3 * * *',    'UTC', false, 1, 600, 2, 'not_required', 'medium', 'suggest_only', 'on_failure',  'findings_panel', 'scheduled', 'detection_rule',        'ai_execution_findings', true),
    ('agent.vuln_prioritization',    'Vulnerability Prioritization',     'Risk-based vulnerability ranking',                     'vulnerabilities', 'vulnerabilities',  '0 */4 * * *',  'UTC', false, 1, 300, 2, 'not_required', 'low',    'suggest_only', 'on_failure',  'findings_panel', 'scheduled', 'vulnerability',         'ai_execution_findings', true),
    ('agent.ueba_narrative',         'UEBA Narrative Agent',             'Behavioral anomaly explanation',                       'ueba',            'ueba',             '*/30 * * * *', 'UTC', false, 1, 300, 2, 'not_required', 'low',    'suggest_only', 'on_failure',  'findings_panel', 'scheduled', 'ueba_anomaly',          'ai_execution_findings', true),
    ('agent.attack_path_summary',    'Attack Path Summary Agent',        'Attack chain summarization',                           'attack_paths',    'attack_paths',     '0 */6 * * *',  'UTC', false, 1, 600, 2, 'not_required', 'medium', 'suggest_only', 'on_failure',  'findings_panel', 'scheduled', 'attack_path',           'ai_execution_findings', true),
    ('agent.norm_verification',      'Normalization Verification Agent', 'Parser quality verification',                          'normalization',   'normalization',    '*/45 * * * *', 'UTC', false, 1, 300, 2, 'not_required', 'low',    'suggest_only', 'on_failure',  'findings_panel', 'scheduled', NULL,                    'ai_execution_findings', true),
    ('agent.rules_hygiene',          'Rules Hygiene Agent',              'Stale and conflicting rule detection',                 'rules_engine',    'rules_engine',     '*/20 * * * *', 'UTC', false, 1, 300, 2, 'not_required', 'low',    'suggest_only', 'on_failure',  'findings_panel', 'scheduled', NULL,                    'ai_execution_findings', true),
    ('agent.reporting',              'Reporting Agent',                  'SOC report generation',                                'reports',         'reports',          '0 7 * * 1',   'UTC', false, 1, 600, 2, 'not_required', 'low',    'suggest_only', 'always',      'findings_panel', 'scheduled', 'report',                'ai_execution_findings', true),
    ('agent.entity_linking',         'Entity Graph Linking Agent',       'Entity relationship discovery',                        'entities',        'entities',         '*/25 * * * *', 'UTC', false, 1, 600, 2, 'not_required', 'low',    'suggest_only', 'on_failure',  'findings_panel', 'scheduled', 'entity',                'ai_execution_findings', true),
    ('agent.job_health',             'Job Health Agent',                 'Job queue health monitoring',                           'jobs',            'jobs',             '*/10 * * * *', 'UTC', false, 1, 300, 2, 'not_required', 'low',    'suggest_only', 'on_failure',  'findings_panel', 'scheduled', NULL,                    'ai_execution_findings', true),
    ('agent.cloud_triage',           'Cloud Triage Agent',               'Cloud security finding triage',                        'cloud_security',  'cloud_security',   '*/15 * * * *', 'UTC', false, 1, 300, 2, 'not_required', 'low',    'suggest_only', 'on_failure',  'findings_panel', 'scheduled', 'cloud_finding',         'ai_execution_findings', true),
    ('agent.soar_drafting',          'SOAR Drafting Agent',              'SOAR playbook drafting',                               'soar',            'soar',             '*/30 * * * *', 'UTC', false, 1, 600, 2, 'not_required', 'medium', 'suggest_only', 'on_failure',  'findings_panel', 'scheduled', 'playbook',              'ai_execution_findings', true),
    ('agent.threat_intel_synthesis', 'Threat Intel Synthesis Agent',     'Threat intelligence feed synthesis',                   'intel',           'intel',            '0 */3 * * *',  'UTC', false, 1, 600, 2, 'not_required', 'low',    'suggest_only', 'on_failure',  'findings_panel', 'scheduled', 'ioc',                   'ai_execution_findings', true),
    ('agent.ioc_enrichment',         'IOC Enrichment Agent',             'IOC batch enrichment from OSINT',                      'ioc',             'intel',            '*/20 * * * *', 'UTC', false, 1, 300, 2, 'not_required', 'low',    'suggest_only', 'on_failure',  'findings_panel', 'scheduled', 'ioc',                   'ai_execution_findings', true),
    ('agent.misp_feed_review',       'MISP Feed Review Agent',           'MISP event feed quality review',                       'misp',            'intel',            '*/15 * * * *', 'UTC', false, 1, 300, 2, 'not_required', 'low',    'suggest_only', 'on_failure',  'findings_panel', 'scheduled', NULL,                    'ai_execution_findings', true),
    ('agent.knowledge_base',         'Knowledge Base Agent',             'Reusable knowledge extraction',                        'knowledge',       'knowledge',        '0 */8 * * *',  'UTC', false, 1, 600, 2, 'not_required', 'low',    'suggest_only', 'on_failure',  'findings_panel', 'scheduled', NULL,                    'ai_execution_findings', true),
    ('agent.notification_digest',    'Notification Digest Agent',        'Notification digest compilation',                      'notifications',   'notifications',    '0 6 * * *',    'UTC', false, 1, 300, 2, 'not_required', 'low',    'suggest_only', 'always',      'findings_panel', 'scheduled', NULL,                    'ai_execution_findings', true),
    ('agent.provider_health',        'Provider Health Agent',            'AI provider health monitoring',                        'system',          'system',           '*/5 * * * *',  'UTC', false, 1, 120, 2, 'not_required', 'low',    'suggest_only', 'on_failure',  'findings_panel', 'scheduled', NULL,                    'ai_execution_findings', true),
    ('agent.approval_advisor',       'Approval Advisor Agent',           'Pending approval recommendations',                     'approvals',       'approvals',        '*/15 * * * *', 'UTC', false, 1, 300, 2, 'not_required', 'low',    'suggest_only', 'on_failure',  'findings_panel', 'scheduled', NULL,                    'ai_execution_findings', true),
    -- ── 8 Infrastructure job types ──
    ('job.connector_sync',           'Connector Sync',                   'Sync data from external connectors (Wazuh, Graylog, MISP)',  'connectors',      'connectors',       '*/2 * * * *',  'UTC', true,  3, 120, 3, 'not_required', 'low',    'auto_execute', 'on_failure',  'connector_sync', 'interval',  'connector_sync_job',    'connector_sync_jobs',   false),
    ('job.detection_rule_execution', 'Detection Rule Execution',         'Execute active detection rules against ingested logs',        'detection_rules', 'alerts',           '*/5 * * * *',  'UTC', true,  5, 300, 2, 'not_required', 'low',    'auto_execute', 'on_failure',  'jobs_table',     'interval',  'alert',                 'jobs',                  false),
    ('job.correlation_rule_execution','Correlation Rule Execution',      'Execute correlation rules to find multi-source patterns',     'correlation',     'alerts',           '*/5 * * * *',  'UTC', true,  5, 300, 2, 'not_required', 'low',    'auto_execute', 'on_failure',  'jobs_table',     'interval',  'alert',                 'jobs',                  false),
    ('job.normalization_pipeline',   'Normalization Pipeline',           'Run log normalization pipelines on raw events',               'normalization',   'normalization',    '*/5 * * * *',  'UTC', true,  3, 300, 2, 'not_required', 'low',    'auto_execute', 'on_failure',  'jobs_table',     'interval',  NULL,                    'jobs',                  false),
    ('job.soar_playbook',            'SOAR Playbook Execution',         'Execute SOAR playbook actions',                               'soar',            'soar',             '*/5 * * * *',  'UTC', true,  2, 600, 2, 'not_required', 'medium', 'auto_execute', 'always',      'jobs_table',     'event',     'playbook_execution',    'jobs',                  false),
    ('job.hunt_execution',           'Hunt Execution',                   'Execute threat hunt queries',                                 'hunt',            'hunt',             '*/10 * * * *', 'UTC', true,  2, 600, 2, 'not_required', 'medium', 'auto_execute', 'on_failure',  'jobs_table',     'manual',    'hunt_result',           'jobs',                  false),
    ('job.ai_agent_task',            'AI Agent Task',                    'Execute AI agent tasks from orchestrator',                    'ai',              'ai',               '*/30 * * * * *','UTC',true,  5, 300, 2, 'not_required', 'low',    'suggest_only', 'on_failure',  'findings_panel', 'scheduled', 'ai_execution_findings', 'ai_execution_findings', false),
    ('job.report_generation',        'Report Generation',                'Generate scheduled or on-demand reports',                     'reports',         'reports',          '0 7 * * 1',   'UTC', true,  1, 600, 1, 'not_required', 'low',    'auto_execute', 'always',      'reports_page',   'manual',    'report',                'jobs',                  false)
ON CONFLICT ("job_key") DO NOTHING;

-- ============================================================
-- Backfill: Create ai_job_run_summaries from existing completed jobs
-- ============================================================

INSERT INTO "ai_job_run_summaries" (
    "tenant_id", "job_id", "schedule_id", "job_key",
    "agent_id", "trigger_type", "status",
    "started_at", "completed_at", "duration_ms",
    "provider_key", "model_key", "tokens_used",
    "findings_count", "source_module",
    "summary_text", "error_message", "created_at"
)
SELECT
    j."tenant_id",
    j."id",
    (j."payload"->>'scheduleId')::uuid,
    COALESCE('agent.' || (j."payload"->>'agentId'), 'job.' || j."type"),
    j."payload"->>'agentId',
    CASE
        WHEN j."payload"->>'source' LIKE 'scheduler:%' THEN 'scheduled'
        WHEN j."payload"->>'source' LIKE 'schedule:%' THEN 'manual_run_now'
        ELSE 'manual'
    END,
    j."status"::text,
    j."started_at",
    j."completed_at",
    EXTRACT(EPOCH FROM (j."completed_at" - j."started_at"))::integer * 1000,
    j."result"->>'provider',
    j."result"->>'model',
    COALESCE((j."result"->>'tokensUsed')::integer, 0),
    0,
    j."payload"->>'module',
    LEFT(j."result"->>'agentId', 500),
    j."error",
    j."created_at"
FROM "jobs" j
WHERE j."type" = 'ai_agent_task'
  AND j."status" IN ('completed', 'failed')
ON CONFLICT DO NOTHING;
