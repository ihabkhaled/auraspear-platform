-- ============================================================
-- Migration: AI Writeback Persistence
-- Date: 2026-03-24
-- Description: Extends AiAgentSession, Alert, Notification models
--              and creates AiExecutionFinding table
-- ============================================================

-- 1. Extend ai_agent_sessions with writeback tracking fields
-- ============================================================

ALTER TABLE "ai_agent_sessions"
  ADD COLUMN IF NOT EXISTS "tenant_id" UUID,
  ADD COLUMN IF NOT EXISTS "trigger_type" VARCHAR(30) NOT NULL DEFAULT 'user',
  ADD COLUMN IF NOT EXISTS "source_module" VARCHAR(50),
  ADD COLUMN IF NOT EXISTS "source_entity_id" VARCHAR(255),
  ADD COLUMN IF NOT EXISTS "job_id" UUID,
  ADD COLUMN IF NOT EXISTS "confidence_score" DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS "findings_count" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "writebacks_count" INTEGER NOT NULL DEFAULT 0;

CREATE INDEX IF NOT EXISTS "ai_agent_sessions_tenant_id_idx"
  ON "ai_agent_sessions" ("tenant_id");

CREATE INDEX IF NOT EXISTS "ai_agent_sessions_tenant_id_trigger_type_idx"
  ON "ai_agent_sessions" ("tenant_id", "trigger_type");

CREATE INDEX IF NOT EXISTS "ai_agent_sessions_source_module_source_entity_id_idx"
  ON "ai_agent_sessions" ("source_module", "source_entity_id");

-- 2. Extend alerts with AI result fields
-- ============================================================

ALTER TABLE "alerts"
  ADD COLUMN IF NOT EXISTS "ai_summary" TEXT,
  ADD COLUMN IF NOT EXISTS "ai_confidence" DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS "ai_severity_suggestion" VARCHAR(20),
  ADD COLUMN IF NOT EXISTS "ai_escalation_suggestion" TEXT,
  ADD COLUMN IF NOT EXISTS "ai_last_run_at" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "ai_last_execution_id" UUID,
  ADD COLUMN IF NOT EXISTS "ai_status" VARCHAR(30);

-- 3. Create ai_execution_findings table
-- ============================================================

CREATE TABLE IF NOT EXISTS "ai_execution_findings" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id" UUID NOT NULL,
  "session_id" UUID NOT NULL,
  "agent_id" VARCHAR(50) NOT NULL,
  "source_module" VARCHAR(50) NOT NULL,
  "source_entity_id" VARCHAR(255),
  "finding_type" VARCHAR(50) NOT NULL,
  "title" VARCHAR(500) NOT NULL,
  "summary" TEXT NOT NULL,
  "confidence_score" DOUBLE PRECISION,
  "severity" VARCHAR(20),
  "evidence_json" JSONB,
  "recommended_action" TEXT,
  "status" VARCHAR(20) NOT NULL DEFAULT 'proposed',
  "applied_at" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "ai_execution_findings_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "ai_execution_findings"
  ADD CONSTRAINT "ai_execution_findings_tenant_id_fkey"
  FOREIGN KEY ("tenant_id") REFERENCES "tenants" ("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

CREATE INDEX IF NOT EXISTS "ai_execution_findings_tenant_id_idx"
  ON "ai_execution_findings" ("tenant_id");

CREATE INDEX IF NOT EXISTS "ai_execution_findings_tenant_id_session_id_idx"
  ON "ai_execution_findings" ("tenant_id", "session_id");

CREATE INDEX IF NOT EXISTS "ai_execution_findings_tenant_id_source_module_source_entity_id_idx"
  ON "ai_execution_findings" ("tenant_id", "source_module", "source_entity_id");

CREATE INDEX IF NOT EXISTS "ai_execution_findings_tenant_id_agent_id_idx"
  ON "ai_execution_findings" ("tenant_id", "agent_id");

CREATE INDEX IF NOT EXISTS "ai_execution_findings_tenant_id_finding_type_idx"
  ON "ai_execution_findings" ("tenant_id", "finding_type");

-- 4. Make notifications.actor_user_id nullable for system notifications
-- ============================================================

ALTER TABLE "notifications" ALTER COLUMN "actor_user_id" DROP NOT NULL;
