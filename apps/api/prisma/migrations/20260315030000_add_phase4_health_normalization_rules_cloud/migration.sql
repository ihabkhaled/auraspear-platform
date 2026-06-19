-- CreateEnum
CREATE TYPE "ServiceType" AS ENUM ('connector', 'database', 'api', 'queue', 'storage');

-- CreateEnum
CREATE TYPE "ServiceStatus" AS ENUM ('healthy', 'degraded', 'down', 'unknown');

-- CreateEnum
CREATE TYPE "MetricType" AS ENUM ('cpu', 'memory', 'disk', 'network', 'queue_depth', 'latency');

-- CreateEnum
CREATE TYPE "NormalizationSourceType" AS ENUM ('syslog', 'json', 'csv', 'cef', 'leef', 'custom');

-- CreateEnum
CREATE TYPE "NormalizationPipelineStatus" AS ENUM ('active', 'inactive', 'error');

-- CreateEnum
CREATE TYPE "DetectionRuleType" AS ENUM ('threshold', 'anomaly', 'chain', 'scheduled');

-- CreateEnum
CREATE TYPE "DetectionRuleSeverity" AS ENUM ('critical', 'high', 'medium', 'low', 'info');

-- CreateEnum
CREATE TYPE "DetectionRuleStatus" AS ENUM ('active', 'testing', 'disabled');

-- CreateEnum
CREATE TYPE "CloudProvider" AS ENUM ('aws', 'azure', 'gcp', 'oci');

-- CreateEnum
CREATE TYPE "CloudAccountStatus" AS ENUM ('connected', 'disconnected', 'error');

-- CreateEnum
CREATE TYPE "CloudFindingSeverity" AS ENUM ('critical', 'high', 'medium', 'low', 'info');

-- CreateEnum
CREATE TYPE "CloudFindingStatus" AS ENUM ('open', 'resolved', 'suppressed');

-- CreateTable
CREATE TABLE "system_health_checks" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "service_name" VARCHAR(255) NOT NULL,
    "service_type" "ServiceType" NOT NULL,
    "status" "ServiceStatus" NOT NULL DEFAULT 'unknown',
    "response_time_ms" INTEGER,
    "last_checked_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "error_message" TEXT,
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "system_health_checks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "system_metrics" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "metric_name" VARCHAR(255) NOT NULL,
    "metric_type" "MetricType" NOT NULL,
    "value" DOUBLE PRECISION NOT NULL,
    "unit" VARCHAR(50) NOT NULL,
    "tags" JSONB,
    "recorded_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "system_metrics_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "normalization_pipelines" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "description" TEXT,
    "source_type" "NormalizationSourceType" NOT NULL,
    "status" "NormalizationPipelineStatus" NOT NULL DEFAULT 'active',
    "parser_config" JSONB NOT NULL,
    "field_mappings" JSONB NOT NULL,
    "processed_count" BIGINT NOT NULL DEFAULT 0,
    "error_count" INTEGER NOT NULL DEFAULT 0,
    "last_processed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "normalization_pipelines_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "detection_rules" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "rule_number" VARCHAR(20) NOT NULL,
    "name" VARCHAR(500) NOT NULL,
    "description" TEXT,
    "rule_type" "DetectionRuleType" NOT NULL,
    "severity" "DetectionRuleSeverity" NOT NULL DEFAULT 'medium',
    "status" "DetectionRuleStatus" NOT NULL DEFAULT 'active',
    "conditions" JSONB NOT NULL,
    "actions" JSONB NOT NULL,
    "hit_count" INTEGER NOT NULL DEFAULT 0,
    "false_positive_count" INTEGER NOT NULL DEFAULT 0,
    "last_triggered_at" TIMESTAMP(3),
    "created_by" VARCHAR(320) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "detection_rules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cloud_accounts" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "provider" "CloudProvider" NOT NULL,
    "account_id" VARCHAR(255) NOT NULL,
    "alias" VARCHAR(255),
    "status" "CloudAccountStatus" NOT NULL DEFAULT 'connected',
    "region" VARCHAR(100),
    "last_scan_at" TIMESTAMP(3),
    "findings_count" INTEGER NOT NULL DEFAULT 0,
    "compliance_score" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "cloud_accounts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cloud_findings" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "cloud_account_id" UUID NOT NULL,
    "resource_type" VARCHAR(255) NOT NULL,
    "resource_id" VARCHAR(500) NOT NULL,
    "severity" "CloudFindingSeverity" NOT NULL DEFAULT 'medium',
    "title" VARCHAR(500) NOT NULL,
    "description" TEXT,
    "status" "CloudFindingStatus" NOT NULL DEFAULT 'open',
    "remediation_steps" TEXT,
    "detected_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolved_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "cloud_findings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "system_health_checks_tenant_id_idx" ON "system_health_checks"("tenant_id");

-- CreateIndex
CREATE INDEX "system_health_checks_tenant_id_service_type_idx" ON "system_health_checks"("tenant_id", "service_type");

-- CreateIndex
CREATE INDEX "system_health_checks_tenant_id_status_idx" ON "system_health_checks"("tenant_id", "status");

-- CreateIndex
CREATE INDEX "system_health_checks_tenant_id_last_checked_at_idx" ON "system_health_checks"("tenant_id", "last_checked_at");

-- CreateIndex
CREATE INDEX "system_metrics_tenant_id_idx" ON "system_metrics"("tenant_id");

-- CreateIndex
CREATE INDEX "system_metrics_tenant_id_metric_type_idx" ON "system_metrics"("tenant_id", "metric_type");

-- CreateIndex
CREATE INDEX "system_metrics_tenant_id_metric_name_idx" ON "system_metrics"("tenant_id", "metric_name");

-- CreateIndex
CREATE INDEX "system_metrics_tenant_id_recorded_at_idx" ON "system_metrics"("tenant_id", "recorded_at");

-- CreateIndex
CREATE UNIQUE INDEX "normalization_pipelines_tenant_id_name_key" ON "normalization_pipelines"("tenant_id", "name");

-- CreateIndex
CREATE INDEX "normalization_pipelines_tenant_id_idx" ON "normalization_pipelines"("tenant_id");

-- CreateIndex
CREATE INDEX "normalization_pipelines_tenant_id_status_idx" ON "normalization_pipelines"("tenant_id", "status");

-- CreateIndex
CREATE INDEX "normalization_pipelines_tenant_id_source_type_idx" ON "normalization_pipelines"("tenant_id", "source_type");

-- CreateIndex
CREATE UNIQUE INDEX "detection_rules_rule_number_key" ON "detection_rules"("rule_number");

-- CreateIndex
CREATE INDEX "detection_rules_tenant_id_idx" ON "detection_rules"("tenant_id");

-- CreateIndex
CREATE INDEX "detection_rules_tenant_id_rule_type_idx" ON "detection_rules"("tenant_id", "rule_type");

-- CreateIndex
CREATE INDEX "detection_rules_tenant_id_severity_idx" ON "detection_rules"("tenant_id", "severity");

-- CreateIndex
CREATE INDEX "detection_rules_tenant_id_status_idx" ON "detection_rules"("tenant_id", "status");

-- CreateIndex
CREATE INDEX "detection_rules_tenant_id_created_at_idx" ON "detection_rules"("tenant_id", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "cloud_accounts_tenant_id_provider_account_id_key" ON "cloud_accounts"("tenant_id", "provider", "account_id");

-- CreateIndex
CREATE INDEX "cloud_accounts_tenant_id_idx" ON "cloud_accounts"("tenant_id");

-- CreateIndex
CREATE INDEX "cloud_accounts_tenant_id_provider_idx" ON "cloud_accounts"("tenant_id", "provider");

-- CreateIndex
CREATE INDEX "cloud_accounts_tenant_id_status_idx" ON "cloud_accounts"("tenant_id", "status");

-- CreateIndex
CREATE INDEX "cloud_findings_tenant_id_idx" ON "cloud_findings"("tenant_id");

-- CreateIndex
CREATE INDEX "cloud_findings_tenant_id_severity_idx" ON "cloud_findings"("tenant_id", "severity");

-- CreateIndex
CREATE INDEX "cloud_findings_tenant_id_status_idx" ON "cloud_findings"("tenant_id", "status");

-- CreateIndex
CREATE INDEX "cloud_findings_cloud_account_id_idx" ON "cloud_findings"("cloud_account_id");

-- CreateIndex
CREATE INDEX "cloud_findings_tenant_id_detected_at_idx" ON "cloud_findings"("tenant_id", "detected_at");

-- AddForeignKey
ALTER TABLE "system_health_checks" ADD CONSTRAINT "system_health_checks_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "system_metrics" ADD CONSTRAINT "system_metrics_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "normalization_pipelines" ADD CONSTRAINT "normalization_pipelines_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "detection_rules" ADD CONSTRAINT "detection_rules_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cloud_accounts" ADD CONSTRAINT "cloud_accounts_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cloud_findings" ADD CONSTRAINT "cloud_findings_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cloud_findings" ADD CONSTRAINT "cloud_findings_cloud_account_id_fkey" FOREIGN KEY ("cloud_account_id") REFERENCES "cloud_accounts"("id") ON DELETE CASCADE ON UPDATE CASCADE;
