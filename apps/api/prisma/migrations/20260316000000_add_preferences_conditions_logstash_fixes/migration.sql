-- AlterTable: Add notification category preferences to user_preferences
ALTER TABLE "user_preferences" ADD COLUMN "notify_critical_alerts" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "user_preferences" ADD COLUMN "notify_high_alerts" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "user_preferences" ADD COLUMN "notify_case_assignments" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "user_preferences" ADD COLUMN "notify_incident_updates" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "user_preferences" ADD COLUMN "notify_compliance_alerts" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "user_preferences" ADD COLUMN "notify_case_updates" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "user_preferences" ADD COLUMN "notify_case_comments" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "user_preferences" ADD COLUMN "notify_case_activity" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "user_preferences" ADD COLUMN "notify_user_management" BOOLEAN NOT NULL DEFAULT true;

-- AlterTable: Add data retention preferences to user_preferences
ALTER TABLE "user_preferences" ADD COLUMN "retention_alerts" VARCHAR(20) NOT NULL DEFAULT '90';
ALTER TABLE "user_preferences" ADD COLUMN "retention_logs" VARCHAR(20) NOT NULL DEFAULT '90';
ALTER TABLE "user_preferences" ADD COLUMN "retention_incidents" VARCHAR(20) NOT NULL DEFAULT '365';
ALTER TABLE "user_preferences" ADD COLUMN "retention_audit_logs" VARCHAR(20) NOT NULL DEFAULT '365';

-- AlterTable: Add conditions JSON field to correlation_rules
ALTER TABLE "correlation_rules" ADD COLUMN "conditions" JSONB;

-- CreateTable: logstash_pipeline_logs (if not exists)
CREATE TABLE IF NOT EXISTS "logstash_pipeline_logs" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "pipeline_id" VARCHAR(255) NOT NULL,
    "pipeline_name" VARCHAR(255),
    "message" TEXT NOT NULL,
    "level" VARCHAR(50) NOT NULL DEFAULT 'info',
    "metadata" JSONB,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "logstash_pipeline_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "logstash_pipeline_logs_tenant_id_idx" ON "logstash_pipeline_logs"("tenant_id");
CREATE INDEX IF NOT EXISTS "logstash_pipeline_logs_tenant_id_level_idx" ON "logstash_pipeline_logs"("tenant_id", "level");
CREATE INDEX IF NOT EXISTS "logstash_pipeline_logs_tenant_id_pipeline_id_idx" ON "logstash_pipeline_logs"("tenant_id", "pipeline_id");
CREATE INDEX IF NOT EXISTS "logstash_pipeline_logs_tenant_id_timestamp_idx" ON "logstash_pipeline_logs"("tenant_id", "timestamp");

-- AddForeignKey
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'logstash_pipeline_logs_tenant_id_fkey'
    ) THEN
        ALTER TABLE "logstash_pipeline_logs" ADD CONSTRAINT "logstash_pipeline_logs_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;

-- Missing indexes from earlier migrations
CREATE INDEX IF NOT EXISTS "alerts_tenant_id_idx" ON "alerts"("tenant_id");
CREATE INDEX IF NOT EXISTS "case_comment_mentions_comment_id_idx" ON "case_comment_mentions"("comment_id");
CREATE INDEX IF NOT EXISTS "connector_sync_jobs_tenant_id_idx" ON "connector_sync_jobs"("tenant_id");
CREATE INDEX IF NOT EXISTS "hunt_events_event_id_idx" ON "hunt_events"("event_id");
CREATE INDEX IF NOT EXISTS "logstash_pipeline_logs_pipeline_id_idx" ON "logstash_pipeline_logs"("pipeline_id");
CREATE INDEX IF NOT EXISTS "notifications_tenant_id_idx" ON "notifications"("tenant_id");
CREATE INDEX IF NOT EXISTS "notifications_actor_user_id_idx" ON "notifications"("actor_user_id");
CREATE INDEX IF NOT EXISTS "notifications_recipient_user_id_idx" ON "notifications"("recipient_user_id");
CREATE INDEX IF NOT EXISTS "notifications_entity_id_idx" ON "notifications"("entity_id");
CREATE INDEX IF NOT EXISTS "shuffle_workflows_workflow_id_idx" ON "shuffle_workflows"("workflow_id");
CREATE INDEX IF NOT EXISTS "velociraptor_endpoints_client_id_idx" ON "velociraptor_endpoints"("client_id");
CREATE INDEX IF NOT EXISTS "velociraptor_hunts_hunt_id_idx" ON "velociraptor_hunts"("hunt_id");
CREATE INDEX IF NOT EXISTS "velociraptor_notebooks_notebook_id_idx" ON "velociraptor_notebooks"("notebook_id");
