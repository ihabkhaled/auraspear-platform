-- CreateEnum
CREATE TYPE "ReportModule" AS ENUM (
    'dashboard',
    'alerts',
    'incidents',
    'cases',
    'vulnerabilities',
    'compliance',
    'ai_agents',
    'soar',
    'connectors',
    'system_health'
);

-- CreateEnum
CREATE TYPE "ReportTemplateKey" AS ENUM (
    'executive_overview',
    'incident_posture',
    'threat_exposure',
    'vulnerability_exposure',
    'compliance_posture',
    'automation_health',
    'connector_health'
);

-- CreateEnum
CREATE TYPE "DashboardDensity" AS ENUM (
    'compact',
    'comfortable',
    'expanded'
);

-- CreateEnum
CREATE TYPE "DashboardPanelKey" AS ENUM (
    'overview',
    'threat_operations',
    'automation',
    'governance',
    'infrastructure',
    'alert_trends',
    'severity_distribution',
    'mitre_techniques',
    'targeted_assets',
    'report_templates',
    'ai_canvas',
    'recent_activity'
);

-- AlterTable
ALTER TABLE "user_preferences"
ADD COLUMN "dashboard_density" "DashboardDensity" NOT NULL DEFAULT 'comfortable',
ADD COLUMN "collapsed_dashboard_panels" "DashboardPanelKey"[] NOT NULL DEFAULT ARRAY[]::"DashboardPanelKey"[];

-- AlterTable
ALTER TABLE "reports"
ADD COLUMN "template_id" UUID,
ADD COLUMN "module" "ReportModule",
ADD COLUMN "template_key" "ReportTemplateKey",
ADD COLUMN "filter_snapshot" JSONB;

-- CreateTable
CREATE TABLE "report_templates" (
    "id" UUID NOT NULL,
    "tenant_id" UUID,
    "key" "ReportTemplateKey" NOT NULL,
    "module" "ReportModule" NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "description" TEXT,
    "type" "ReportType" NOT NULL DEFAULT 'custom',
    "default_format" "ReportFormat" NOT NULL DEFAULT 'pdf',
    "parameters" JSONB,
    "is_system" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "report_templates_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "reports_tenant_id_module_idx" ON "reports"("tenant_id", "module");

-- CreateIndex
CREATE INDEX "reports_tenant_id_template_key_idx" ON "reports"("tenant_id", "template_key");

-- CreateIndex
CREATE INDEX "report_templates_tenant_id_idx" ON "report_templates"("tenant_id");

-- CreateIndex
CREATE INDEX "report_templates_module_idx" ON "report_templates"("module");

-- CreateIndex
CREATE INDEX "report_templates_key_idx" ON "report_templates"("key");

-- AddForeignKey
ALTER TABLE "reports"
ADD CONSTRAINT "reports_template_id_fkey"
FOREIGN KEY ("template_id") REFERENCES "report_templates"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "report_templates"
ADD CONSTRAINT "report_templates_tenant_id_fkey"
FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
