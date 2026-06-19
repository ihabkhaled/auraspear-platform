-- CreateEnum
CREATE TYPE "JobStatus" AS ENUM ('pending', 'running', 'completed', 'failed', 'retrying', 'cancelled');

-- CreateEnum
CREATE TYPE "JobType" AS ENUM ('connector_sync', 'detection_rule_execution', 'correlation_rule_execution', 'normalization_pipeline', 'soar_playbook', 'hunt_execution', 'ai_agent_task', 'report_generation');

-- CreateTable
CREATE TABLE "jobs" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "type" "JobType" NOT NULL,
    "status" "JobStatus" NOT NULL DEFAULT 'pending',
    "payload" JSONB NOT NULL DEFAULT '{}',
    "result" JSONB,
    "error" TEXT,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "max_attempts" INTEGER NOT NULL DEFAULT 3,
    "idempotency_key" VARCHAR(255),
    "scheduled_at" TIMESTAMP(3),
    "started_at" TIMESTAMP(3),
    "completed_at" TIMESTAMP(3),
    "created_by" VARCHAR(320),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "jobs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "jobs_tenant_id_idempotency_key_key" ON "jobs"("tenant_id", "idempotency_key");

-- CreateIndex
CREATE INDEX "jobs_tenant_id_type_status_idx" ON "jobs"("tenant_id", "type", "status");

-- CreateIndex
CREATE INDEX "jobs_status_scheduled_at_idx" ON "jobs"("status", "scheduled_at");

-- AddForeignKey
ALTER TABLE "jobs" ADD CONSTRAINT "jobs_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
