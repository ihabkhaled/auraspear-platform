-- CreateEnum
CREATE TYPE "SoarPlaybookStatus" AS ENUM ('active', 'inactive', 'draft');

-- CreateEnum
CREATE TYPE "SoarTriggerType" AS ENUM ('manual', 'alert', 'incident', 'scheduled');

-- CreateEnum
CREATE TYPE "SoarExecutionStatus" AS ENUM ('running', 'completed', 'failed', 'cancelled');

-- CreateEnum
CREATE TYPE "ComplianceStandard" AS ENUM ('iso_27001', 'nist', 'pci_dss', 'soc2', 'hipaa', 'gdpr');

-- CreateEnum
CREATE TYPE "ComplianceControlStatus" AS ENUM ('passed', 'failed', 'not_assessed', 'partially_met');

-- CreateEnum
CREATE TYPE "ReportType" AS ENUM ('executive', 'compliance', 'incident', 'threat', 'custom');

-- CreateEnum
CREATE TYPE "ReportFormat" AS ENUM ('pdf', 'csv', 'html');

-- CreateEnum
CREATE TYPE "ReportStatus" AS ENUM ('generating', 'completed', 'failed');

-- CreateTable
CREATE TABLE "soar_playbooks" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "description" TEXT,
    "status" "SoarPlaybookStatus" NOT NULL DEFAULT 'draft',
    "trigger_type" "SoarTriggerType" NOT NULL DEFAULT 'manual',
    "trigger_conditions" JSONB,
    "steps" JSONB NOT NULL DEFAULT '[]',
    "execution_count" INTEGER NOT NULL DEFAULT 0,
    "last_executed_at" TIMESTAMP(3),
    "created_by" VARCHAR(320) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "soar_playbooks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "soar_executions" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "playbook_id" UUID NOT NULL,
    "status" "SoarExecutionStatus" NOT NULL DEFAULT 'running',
    "trigger_source" VARCHAR(255),
    "triggered_by" VARCHAR(320) NOT NULL,
    "started_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completed_at" TIMESTAMP(3),
    "steps_completed" INTEGER NOT NULL DEFAULT 0,
    "total_steps" INTEGER NOT NULL DEFAULT 0,
    "output" JSONB,
    "error" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "soar_executions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "compliance_frameworks" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "description" TEXT,
    "standard" "ComplianceStandard" NOT NULL,
    "version" VARCHAR(50) NOT NULL,
    "total_controls" INTEGER NOT NULL DEFAULT 0,
    "passed_controls" INTEGER NOT NULL DEFAULT 0,
    "failed_controls" INTEGER NOT NULL DEFAULT 0,
    "overall_score" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "last_assessed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "compliance_frameworks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "compliance_controls" (
    "id" UUID NOT NULL,
    "framework_id" UUID NOT NULL,
    "control_number" VARCHAR(50) NOT NULL,
    "title" VARCHAR(500) NOT NULL,
    "description" TEXT,
    "status" "ComplianceControlStatus" NOT NULL DEFAULT 'not_assessed',
    "evidence" TEXT,
    "assessed_at" TIMESTAMP(3),
    "assessed_by" VARCHAR(320),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "compliance_controls_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reports" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "description" TEXT,
    "type" "ReportType" NOT NULL DEFAULT 'custom',
    "format" "ReportFormat" NOT NULL DEFAULT 'pdf',
    "status" "ReportStatus" NOT NULL DEFAULT 'generating',
    "generated_by" VARCHAR(320) NOT NULL,
    "parameters" JSONB,
    "file_url" VARCHAR(1000),
    "file_size" BIGINT,
    "generated_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "reports_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "soar_playbooks_tenant_id_name_key" ON "soar_playbooks"("tenant_id", "name");

-- CreateIndex
CREATE INDEX "soar_playbooks_tenant_id_idx" ON "soar_playbooks"("tenant_id");

-- CreateIndex
CREATE INDEX "soar_playbooks_tenant_id_status_idx" ON "soar_playbooks"("tenant_id", "status");

-- CreateIndex
CREATE INDEX "soar_playbooks_tenant_id_trigger_type_idx" ON "soar_playbooks"("tenant_id", "trigger_type");

-- CreateIndex
CREATE INDEX "soar_executions_tenant_id_idx" ON "soar_executions"("tenant_id");

-- CreateIndex
CREATE INDEX "soar_executions_tenant_id_status_idx" ON "soar_executions"("tenant_id", "status");

-- CreateIndex
CREATE INDEX "soar_executions_playbook_id_idx" ON "soar_executions"("playbook_id");

-- CreateIndex
CREATE INDEX "soar_executions_tenant_id_started_at_idx" ON "soar_executions"("tenant_id", "started_at");

-- CreateIndex
CREATE UNIQUE INDEX "compliance_frameworks_tenant_id_standard_version_key" ON "compliance_frameworks"("tenant_id", "standard", "version");

-- CreateIndex
CREATE INDEX "compliance_frameworks_tenant_id_idx" ON "compliance_frameworks"("tenant_id");

-- CreateIndex
CREATE INDEX "compliance_frameworks_tenant_id_standard_idx" ON "compliance_frameworks"("tenant_id", "standard");

-- CreateIndex
CREATE UNIQUE INDEX "compliance_controls_framework_id_control_number_key" ON "compliance_controls"("framework_id", "control_number");

-- CreateIndex
CREATE INDEX "compliance_controls_framework_id_idx" ON "compliance_controls"("framework_id");

-- CreateIndex
CREATE INDEX "compliance_controls_framework_id_status_idx" ON "compliance_controls"("framework_id", "status");

-- CreateIndex
CREATE INDEX "reports_tenant_id_idx" ON "reports"("tenant_id");

-- CreateIndex
CREATE INDEX "reports_tenant_id_type_idx" ON "reports"("tenant_id", "type");

-- CreateIndex
CREATE INDEX "reports_tenant_id_status_idx" ON "reports"("tenant_id", "status");

-- CreateIndex
CREATE INDEX "reports_tenant_id_created_at_idx" ON "reports"("tenant_id", "created_at");

-- AddForeignKey
ALTER TABLE "soar_playbooks" ADD CONSTRAINT "soar_playbooks_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "soar_executions" ADD CONSTRAINT "soar_executions_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "soar_executions" ADD CONSTRAINT "soar_executions_playbook_id_fkey" FOREIGN KEY ("playbook_id") REFERENCES "soar_playbooks"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "compliance_frameworks" ADD CONSTRAINT "compliance_frameworks_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "compliance_controls" ADD CONSTRAINT "compliance_controls_framework_id_fkey" FOREIGN KEY ("framework_id") REFERENCES "compliance_frameworks"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reports" ADD CONSTRAINT "reports_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
