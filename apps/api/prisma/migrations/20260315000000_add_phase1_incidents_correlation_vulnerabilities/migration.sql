-- CreateEnum
CREATE TYPE "IncidentSeverity" AS ENUM ('critical', 'high', 'medium', 'low');

-- CreateEnum
CREATE TYPE "IncidentStatus" AS ENUM ('open', 'in_progress', 'contained', 'resolved', 'closed');

-- CreateEnum
CREATE TYPE "IncidentCategory" AS ENUM ('intrusion', 'insider', 'brute_force', 'exfiltration', 'malware', 'cloud', 'phishing', 'dos', 'other');

-- CreateEnum
CREATE TYPE "IncidentActorType" AS ENUM ('user', 'ai_agent', 'system');

-- CreateEnum
CREATE TYPE "RuleSource" AS ENUM ('sigma', 'custom', 'ai_generated');

-- CreateEnum
CREATE TYPE "RuleSeverity" AS ENUM ('critical', 'high', 'medium', 'low', 'info');

-- CreateEnum
CREATE TYPE "RuleStatus" AS ENUM ('active', 'review', 'disabled');

-- CreateEnum
CREATE TYPE "PatchStatus" AS ENUM ('patch_pending', 'patching', 'mitigated', 'scheduled', 'not_applicable');

-- CreateEnum
CREATE TYPE "VulnerabilitySeverity" AS ENUM ('critical', 'high', 'medium', 'low', 'info');

-- CreateTable
CREATE TABLE "incidents" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "incident_number" VARCHAR(20) NOT NULL,
    "title" VARCHAR(500) NOT NULL,
    "description" TEXT,
    "severity" "IncidentSeverity" NOT NULL DEFAULT 'medium',
    "status" "IncidentStatus" NOT NULL DEFAULT 'open',
    "category" "IncidentCategory" NOT NULL DEFAULT 'other',
    "assignee_id" UUID,
    "linked_alert_ids" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "linked_case_id" UUID,
    "mitre_tactics" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "mitre_techniques" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "created_by" VARCHAR(320) NOT NULL,
    "resolved_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "incidents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "incident_timeline" (
    "id" UUID NOT NULL,
    "incident_id" UUID NOT NULL,
    "event" TEXT NOT NULL,
    "actor_type" "IncidentActorType" NOT NULL DEFAULT 'system',
    "actor_name" VARCHAR(320) NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "incident_timeline_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "correlation_rules" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "rule_number" VARCHAR(20) NOT NULL,
    "title" VARCHAR(500) NOT NULL,
    "description" TEXT,
    "source" "RuleSource" NOT NULL DEFAULT 'custom',
    "severity" "RuleSeverity" NOT NULL DEFAULT 'medium',
    "status" "RuleStatus" NOT NULL DEFAULT 'active',
    "yaml_content" TEXT,
    "mitre_tactics" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "mitre_techniques" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "hit_count" INTEGER NOT NULL DEFAULT 0,
    "linked_incidents" INTEGER NOT NULL DEFAULT 0,
    "created_by" VARCHAR(320) NOT NULL,
    "last_fired_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "correlation_rules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "vulnerabilities" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "cve_id" VARCHAR(20) NOT NULL,
    "cvss_score" DOUBLE PRECISION NOT NULL,
    "severity" "VulnerabilitySeverity" NOT NULL DEFAULT 'medium',
    "description" TEXT NOT NULL,
    "affected_hosts" INTEGER NOT NULL DEFAULT 0,
    "exploit_available" BOOLEAN NOT NULL DEFAULT false,
    "patch_status" "PatchStatus" NOT NULL DEFAULT 'patch_pending',
    "affected_software" VARCHAR(500),
    "remediation" TEXT,
    "discovered_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "patched_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "vulnerabilities_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "incidents_incident_number_key" ON "incidents"("incident_number");

-- CreateIndex
CREATE INDEX "incidents_tenant_id_idx" ON "incidents"("tenant_id");

-- CreateIndex
CREATE INDEX "incidents_tenant_id_status_idx" ON "incidents"("tenant_id", "status");

-- CreateIndex
CREATE INDEX "incidents_tenant_id_severity_idx" ON "incidents"("tenant_id", "severity");

-- CreateIndex
CREATE INDEX "incidents_tenant_id_category_idx" ON "incidents"("tenant_id", "category");

-- CreateIndex
CREATE INDEX "incidents_tenant_id_created_at_idx" ON "incidents"("tenant_id", "created_at");

-- CreateIndex
CREATE INDEX "incident_timeline_incident_id_idx" ON "incident_timeline"("incident_id");

-- CreateIndex
CREATE INDEX "incident_timeline_incident_id_timestamp_idx" ON "incident_timeline"("incident_id", "timestamp");

-- CreateIndex
CREATE UNIQUE INDEX "correlation_rules_rule_number_key" ON "correlation_rules"("rule_number");

-- CreateIndex
CREATE INDEX "correlation_rules_tenant_id_idx" ON "correlation_rules"("tenant_id");

-- CreateIndex
CREATE INDEX "correlation_rules_tenant_id_source_idx" ON "correlation_rules"("tenant_id", "source");

-- CreateIndex
CREATE INDEX "correlation_rules_tenant_id_severity_idx" ON "correlation_rules"("tenant_id", "severity");

-- CreateIndex
CREATE INDEX "correlation_rules_tenant_id_status_idx" ON "correlation_rules"("tenant_id", "status");

-- CreateIndex
CREATE INDEX "correlation_rules_tenant_id_created_at_idx" ON "correlation_rules"("tenant_id", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "vulnerabilities_tenant_id_cve_id_key" ON "vulnerabilities"("tenant_id", "cve_id");

-- CreateIndex
CREATE INDEX "vulnerabilities_tenant_id_idx" ON "vulnerabilities"("tenant_id");

-- CreateIndex
CREATE INDEX "vulnerabilities_tenant_id_severity_idx" ON "vulnerabilities"("tenant_id", "severity");

-- CreateIndex
CREATE INDEX "vulnerabilities_tenant_id_patch_status_idx" ON "vulnerabilities"("tenant_id", "patch_status");

-- CreateIndex
CREATE INDEX "vulnerabilities_tenant_id_exploit_available_idx" ON "vulnerabilities"("tenant_id", "exploit_available");

-- CreateIndex
CREATE INDEX "vulnerabilities_tenant_id_created_at_idx" ON "vulnerabilities"("tenant_id", "created_at");

-- AddForeignKey
ALTER TABLE "incidents" ADD CONSTRAINT "incidents_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "incident_timeline" ADD CONSTRAINT "incident_timeline_incident_id_fkey" FOREIGN KEY ("incident_id") REFERENCES "incidents"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "correlation_rules" ADD CONSTRAINT "correlation_rules_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vulnerabilities" ADD CONSTRAINT "vulnerabilities_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
