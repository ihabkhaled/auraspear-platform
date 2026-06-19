-- CreateEnum
CREATE TYPE "SyncJobStatus" AS ENUM ('running', 'completed', 'failed');

-- CreateTable: connector_sync_jobs
CREATE TABLE "connector_sync_jobs" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "connector_type" "ConnectorType" NOT NULL,
    "status" "SyncJobStatus" NOT NULL DEFAULT 'running',
    "records_synced" INTEGER NOT NULL DEFAULT 0,
    "records_failed" INTEGER NOT NULL DEFAULT 0,
    "error_message" TEXT,
    "error_code" VARCHAR(100),
    "duration_ms" INTEGER,
    "initiated_by" VARCHAR(320) NOT NULL DEFAULT 'system',
    "cursor" VARCHAR(1000),
    "started_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "connector_sync_jobs_pkey" PRIMARY KEY ("id")
);

-- CreateTable: grafana_dashboards
CREATE TABLE "grafana_dashboards" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "uid" VARCHAR(255) NOT NULL,
    "title" VARCHAR(500) NOT NULL,
    "folder_title" VARCHAR(500),
    "url" VARCHAR(1000) NOT NULL,
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "type" VARCHAR(50) NOT NULL DEFAULT 'dash-db',
    "is_starred" BOOLEAN NOT NULL DEFAULT false,
    "synced_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "grafana_dashboards_pkey" PRIMARY KEY ("id")
);

-- CreateTable: velociraptor_endpoints
CREATE TABLE "velociraptor_endpoints" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "client_id" VARCHAR(255) NOT NULL,
    "hostname" VARCHAR(500) NOT NULL,
    "os" VARCHAR(100),
    "os_version" VARCHAR(255),
    "last_seen_at" TIMESTAMP(3),
    "labels" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "ip_address" VARCHAR(45),
    "synced_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "velociraptor_endpoints_pkey" PRIMARY KEY ("id")
);

-- CreateTable: velociraptor_hunts
CREATE TABLE "velociraptor_hunts" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "hunt_id" VARCHAR(255) NOT NULL,
    "description" TEXT,
    "creator" VARCHAR(255),
    "state" VARCHAR(50),
    "artifacts" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "total_clients" INTEGER NOT NULL DEFAULT 0,
    "finished_clients" INTEGER NOT NULL DEFAULT 0,
    "started_at" TIMESTAMP(3),
    "synced_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "velociraptor_hunts_pkey" PRIMARY KEY ("id")
);

-- CreateTable: velociraptor_notebooks
CREATE TABLE "velociraptor_notebooks" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "notebook_id" VARCHAR(255) NOT NULL,
    "name" VARCHAR(500) NOT NULL,
    "description" TEXT,
    "creator" VARCHAR(255),
    "modified_at" TIMESTAMP(3),
    "synced_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "velociraptor_notebooks_pkey" PRIMARY KEY ("id")
);

-- CreateTable: shuffle_workflows
CREATE TABLE "shuffle_workflows" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "workflow_id" VARCHAR(255) NOT NULL,
    "name" VARCHAR(500) NOT NULL,
    "description" TEXT,
    "is_valid" BOOLEAN NOT NULL DEFAULT false,
    "trigger_count" INTEGER NOT NULL DEFAULT 0,
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "synced_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "shuffle_workflows_pkey" PRIMARY KEY ("id")
);

-- CreateTable: notifications
CREATE TABLE "notifications" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "type" VARCHAR(50) NOT NULL,
    "actor_user_id" UUID NOT NULL,
    "recipient_user_id" UUID NOT NULL,
    "title" VARCHAR(500) NOT NULL,
    "message" TEXT NOT NULL,
    "entity_type" VARCHAR(50) NOT NULL,
    "entity_id" UUID NOT NULL,
    "case_id" UUID,
    "case_comment_id" UUID,
    "read_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- AlterTable: hunt_sessions — add new columns
ALTER TABLE "hunt_sessions" ADD COLUMN "ai_analysis" TEXT;
ALTER TABLE "hunt_sessions" ADD COLUMN "executed_query" JSONB;
ALTER TABLE "hunt_sessions" ADD COLUMN "mitre_tactics" TEXT[] DEFAULT ARRAY[]::TEXT[];
ALTER TABLE "hunt_sessions" ADD COLUMN "mitre_techniques" TEXT[] DEFAULT ARRAY[]::TEXT[];
ALTER TABLE "hunt_sessions" ADD COLUMN "source_type" VARCHAR(50) NOT NULL DEFAULT 'wazuh';
ALTER TABLE "hunt_sessions" ADD COLUMN "threat_score" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "hunt_sessions" ADD COLUMN "time_range" VARCHAR(10) NOT NULL DEFAULT '24h';
ALTER TABLE "hunt_sessions" ADD COLUMN "unique_ips" INTEGER NOT NULL DEFAULT 0;

-- CreateIndex: connector_sync_jobs
CREATE INDEX "connector_sync_jobs_tenant_id_connector_type_idx" ON "connector_sync_jobs"("tenant_id", "connector_type");
CREATE INDEX "connector_sync_jobs_tenant_id_started_at_idx" ON "connector_sync_jobs"("tenant_id", "started_at");
CREATE INDEX "connector_sync_jobs_status_idx" ON "connector_sync_jobs"("status");

-- CreateIndex: grafana_dashboards
CREATE UNIQUE INDEX "grafana_dashboards_tenant_id_uid_key" ON "grafana_dashboards"("tenant_id", "uid");
CREATE INDEX "grafana_dashboards_tenant_id_idx" ON "grafana_dashboards"("tenant_id");

-- CreateIndex: velociraptor_endpoints
CREATE UNIQUE INDEX "velociraptor_endpoints_tenant_id_client_id_key" ON "velociraptor_endpoints"("tenant_id", "client_id");
CREATE INDEX "velociraptor_endpoints_tenant_id_idx" ON "velociraptor_endpoints"("tenant_id");
CREATE INDEX "velociraptor_endpoints_tenant_id_hostname_idx" ON "velociraptor_endpoints"("tenant_id", "hostname");

-- CreateIndex: velociraptor_hunts
CREATE UNIQUE INDEX "velociraptor_hunts_tenant_id_hunt_id_key" ON "velociraptor_hunts"("tenant_id", "hunt_id");
CREATE INDEX "velociraptor_hunts_tenant_id_idx" ON "velociraptor_hunts"("tenant_id");

-- CreateIndex: velociraptor_notebooks
CREATE UNIQUE INDEX "velociraptor_notebooks_tenant_id_notebook_id_key" ON "velociraptor_notebooks"("tenant_id", "notebook_id");
CREATE INDEX "velociraptor_notebooks_tenant_id_idx" ON "velociraptor_notebooks"("tenant_id");

-- CreateIndex: shuffle_workflows
CREATE UNIQUE INDEX "shuffle_workflows_tenant_id_workflow_id_key" ON "shuffle_workflows"("tenant_id", "workflow_id");
CREATE INDEX "shuffle_workflows_tenant_id_idx" ON "shuffle_workflows"("tenant_id");

-- CreateIndex: notifications
CREATE UNIQUE INDEX "notifications_recipient_user_id_case_comment_id_key" ON "notifications"("recipient_user_id", "case_comment_id");
CREATE INDEX "notifications_tenant_id_recipient_user_id_read_at_created_at_idx" ON "notifications"("tenant_id", "recipient_user_id", "read_at", "created_at");
CREATE INDEX "notifications_tenant_id_recipient_user_id_created_at_idx" ON "notifications"("tenant_id", "recipient_user_id", "created_at");
CREATE INDEX "notifications_case_comment_id_idx" ON "notifications"("case_comment_id");
