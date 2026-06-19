-- CreateEnum
CREATE TYPE "AlertSeverity" AS ENUM ('critical', 'high', 'medium', 'low', 'info');

-- CreateEnum
CREATE TYPE "AlertStatus" AS ENUM ('new_alert', 'acknowledged', 'in_progress', 'resolved', 'closed', 'false_positive');

-- CreateEnum
CREATE TYPE "HuntSessionStatus" AS ENUM ('running', 'completed', 'error');

-- AlterTable: add case_number as nullable first, backfill, then make NOT NULL
ALTER TABLE "cases" ADD COLUMN "case_number" VARCHAR(20),
ADD COLUMN "created_by" VARCHAR(320);

-- Backfill existing cases with generated case numbers
UPDATE "cases" c SET "case_number" = sub.cn
FROM (
  SELECT id, 'SOC-' || EXTRACT(YEAR FROM "created_at")::TEXT || '-' || LPAD(ROW_NUMBER() OVER (ORDER BY "created_at")::TEXT, 3, '0') AS cn
  FROM "cases"
  WHERE "case_number" IS NULL
) sub
WHERE c.id = sub.id;

-- Now make case_number NOT NULL
ALTER TABLE "cases" ALTER COLUMN "case_number" SET NOT NULL;

-- CreateTable
CREATE TABLE "user_preferences" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "theme" VARCHAR(20) NOT NULL DEFAULT 'system',
    "language" VARCHAR(10) NOT NULL DEFAULT 'en',
    "notifications_email" BOOLEAN NOT NULL DEFAULT true,
    "notifications_in_app" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_preferences_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "alerts" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "external_id" VARCHAR(500),
    "title" VARCHAR(1000) NOT NULL,
    "description" TEXT,
    "severity" "AlertSeverity" NOT NULL DEFAULT 'medium',
    "status" "AlertStatus" NOT NULL DEFAULT 'new_alert',
    "source" VARCHAR(50) NOT NULL,
    "rule_name" VARCHAR(500),
    "rule_id" VARCHAR(100),
    "agent_name" VARCHAR(255),
    "source_ip" VARCHAR(45),
    "destination_ip" VARCHAR(45),
    "mitre_tactics" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "mitre_techniques" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "raw_event" JSONB,
    "acknowledged_by" VARCHAR(320),
    "acknowledged_at" TIMESTAMP(3),
    "resolution" TEXT,
    "closed_at" TIMESTAMP(3),
    "closed_by" VARCHAR(320),
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "alerts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "case_timeline" (
    "id" UUID NOT NULL,
    "case_id" UUID NOT NULL,
    "type" VARCHAR(50) NOT NULL,
    "actor" VARCHAR(320) NOT NULL,
    "description" TEXT NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "case_timeline_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "intel_iocs" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "ioc_value" VARCHAR(1000) NOT NULL,
    "ioc_type" VARCHAR(50) NOT NULL,
    "source" VARCHAR(100) NOT NULL,
    "severity" VARCHAR(20) NOT NULL,
    "hit_count" INTEGER NOT NULL DEFAULT 0,
    "first_seen" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "last_seen" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "intel_iocs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "intel_misp_events" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "misp_event_id" VARCHAR(100) NOT NULL,
    "organization" VARCHAR(255) NOT NULL,
    "threat_level" VARCHAR(20) NOT NULL,
    "info" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "tags" JSONB NOT NULL DEFAULT '[]',
    "attribute_count" INTEGER NOT NULL DEFAULT 0,
    "published" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "intel_misp_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "hunt_sessions" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "query" TEXT NOT NULL,
    "status" "HuntSessionStatus" NOT NULL DEFAULT 'running',
    "started_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completed_at" TIMESTAMP(3),
    "started_by" VARCHAR(320) NOT NULL,
    "events_found" INTEGER NOT NULL DEFAULT 0,
    "reasoning" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "hunt_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "hunt_events" (
    "id" UUID NOT NULL,
    "hunt_session_id" UUID NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "severity" VARCHAR(20) NOT NULL,
    "event_id" VARCHAR(255) NOT NULL,
    "source_ip" VARCHAR(45),
    "user" VARCHAR(320),
    "description" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "hunt_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "user_preferences_user_id_key" ON "user_preferences"("user_id");

-- CreateIndex
CREATE INDEX "alerts_tenant_id_severity_idx" ON "alerts"("tenant_id", "severity");

-- CreateIndex
CREATE INDEX "alerts_tenant_id_status_idx" ON "alerts"("tenant_id", "status");

-- CreateIndex
CREATE INDEX "alerts_tenant_id_timestamp_idx" ON "alerts"("tenant_id", "timestamp");

-- CreateIndex
CREATE INDEX "alerts_tenant_id_source_idx" ON "alerts"("tenant_id", "source");

-- CreateIndex
CREATE UNIQUE INDEX "alerts_tenant_id_external_id_key" ON "alerts"("tenant_id", "external_id");

-- CreateIndex
CREATE INDEX "case_timeline_case_id_idx" ON "case_timeline"("case_id");

-- CreateIndex
CREATE INDEX "case_timeline_case_id_timestamp_idx" ON "case_timeline"("case_id", "timestamp");

-- CreateIndex
CREATE INDEX "intel_iocs_tenant_id_idx" ON "intel_iocs"("tenant_id");

-- CreateIndex
CREATE INDEX "intel_iocs_tenant_id_ioc_type_idx" ON "intel_iocs"("tenant_id", "ioc_type");

-- CreateIndex
CREATE UNIQUE INDEX "intel_iocs_tenant_id_ioc_value_ioc_type_key" ON "intel_iocs"("tenant_id", "ioc_value", "ioc_type");

-- CreateIndex
CREATE INDEX "intel_misp_events_tenant_id_idx" ON "intel_misp_events"("tenant_id");

-- CreateIndex
CREATE UNIQUE INDEX "intel_misp_events_tenant_id_misp_event_id_key" ON "intel_misp_events"("tenant_id", "misp_event_id");

-- CreateIndex
CREATE INDEX "hunt_sessions_tenant_id_idx" ON "hunt_sessions"("tenant_id");

-- CreateIndex
CREATE INDEX "hunt_sessions_tenant_id_started_at_idx" ON "hunt_sessions"("tenant_id", "started_at");

-- CreateIndex
CREATE INDEX "hunt_events_hunt_session_id_idx" ON "hunt_events"("hunt_session_id");

-- CreateIndex
CREATE UNIQUE INDEX "cases_case_number_key" ON "cases"("case_number");

-- AddForeignKey
ALTER TABLE "user_preferences" ADD CONSTRAINT "user_preferences_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "tenant_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "alerts" ADD CONSTRAINT "alerts_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "case_timeline" ADD CONSTRAINT "case_timeline_case_id_fkey" FOREIGN KEY ("case_id") REFERENCES "cases"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "intel_iocs" ADD CONSTRAINT "intel_iocs_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "intel_misp_events" ADD CONSTRAINT "intel_misp_events_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hunt_sessions" ADD CONSTRAINT "hunt_sessions_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hunt_events" ADD CONSTRAINT "hunt_events_hunt_session_id_fkey" FOREIGN KEY ("hunt_session_id") REFERENCES "hunt_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
