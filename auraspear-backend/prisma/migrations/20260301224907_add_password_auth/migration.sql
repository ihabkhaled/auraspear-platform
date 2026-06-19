-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('GLOBAL_ADMIN', 'TENANT_ADMIN', 'SOC_ANALYST_L2', 'SOC_ANALYST_L1', 'THREAT_HUNTER', 'EXECUTIVE_READONLY');

-- CreateEnum
CREATE TYPE "ConnectorType" AS ENUM ('wazuh', 'graylog', 'velociraptor', 'grafana', 'influxdb', 'misp', 'shuffle', 'bedrock');

-- CreateEnum
CREATE TYPE "AuthType" AS ENUM ('basic', 'api_key', 'token', 'iam');

-- CreateEnum
CREATE TYPE "CaseStatus" AS ENUM ('open', 'in_progress', 'closed');

-- CreateEnum
CREATE TYPE "CaseSeverity" AS ENUM ('critical', 'high', 'medium', 'low');

-- CreateTable
CREATE TABLE "tenants" (
    "id" UUID NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "slug" VARCHAR(100) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tenants_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tenant_users" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "oidc_sub" VARCHAR(255),
    "email" VARCHAR(320) NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "role" "UserRole" NOT NULL DEFAULT 'SOC_ANALYST_L1',
    "password_hash" VARCHAR(255),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tenant_users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "connector_configs" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "type" "ConnectorType" NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT false,
    "auth_type" "AuthType" NOT NULL DEFAULT 'basic',
    "encrypted_config" TEXT NOT NULL,
    "last_test_at" TIMESTAMP(3),
    "last_test_ok" BOOLEAN,
    "last_error" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "connector_configs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cases" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "title" VARCHAR(500) NOT NULL,
    "description" TEXT,
    "severity" "CaseSeverity" NOT NULL DEFAULT 'medium',
    "status" "CaseStatus" NOT NULL DEFAULT 'open',
    "owner_user_id" UUID,
    "linked_alerts" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "closed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "cases_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "case_notes" (
    "id" UUID NOT NULL,
    "case_id" UUID NOT NULL,
    "author" VARCHAR(320) NOT NULL,
    "body" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "case_notes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "actor" VARCHAR(320) NOT NULL,
    "role" "UserRole" NOT NULL,
    "action" VARCHAR(100) NOT NULL,
    "resource" VARCHAR(255) NOT NULL,
    "resource_id" VARCHAR(255),
    "details" TEXT,
    "ip_address" VARCHAR(45),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ai_audit_logs" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "actor" VARCHAR(320) NOT NULL,
    "action" VARCHAR(100) NOT NULL,
    "model" VARCHAR(100) NOT NULL,
    "input_tokens" INTEGER NOT NULL DEFAULT 0,
    "output_tokens" INTEGER NOT NULL DEFAULT 0,
    "prompt" TEXT,
    "response" TEXT,
    "duration_ms" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ai_audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "saved_queries" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "query" TEXT NOT NULL,
    "description" TEXT,
    "created_by" VARCHAR(320) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "saved_queries_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "tenants_slug_key" ON "tenants"("slug");

-- CreateIndex
CREATE INDEX "tenant_users_tenant_id_idx" ON "tenant_users"("tenant_id");

-- CreateIndex
CREATE UNIQUE INDEX "tenant_users_tenant_id_oidc_sub_key" ON "tenant_users"("tenant_id", "oidc_sub");

-- CreateIndex
CREATE UNIQUE INDEX "tenant_users_tenant_id_email_key" ON "tenant_users"("tenant_id", "email");

-- CreateIndex
CREATE INDEX "connector_configs_tenant_id_idx" ON "connector_configs"("tenant_id");

-- CreateIndex
CREATE UNIQUE INDEX "connector_configs_tenant_id_type_key" ON "connector_configs"("tenant_id", "type");

-- CreateIndex
CREATE INDEX "cases_tenant_id_idx" ON "cases"("tenant_id");

-- CreateIndex
CREATE INDEX "cases_tenant_id_status_idx" ON "cases"("tenant_id", "status");

-- CreateIndex
CREATE INDEX "case_notes_case_id_idx" ON "case_notes"("case_id");

-- CreateIndex
CREATE INDEX "audit_logs_tenant_id_idx" ON "audit_logs"("tenant_id");

-- CreateIndex
CREATE INDEX "audit_logs_tenant_id_created_at_idx" ON "audit_logs"("tenant_id", "created_at");

-- CreateIndex
CREATE INDEX "ai_audit_logs_tenant_id_idx" ON "ai_audit_logs"("tenant_id");

-- CreateIndex
CREATE INDEX "ai_audit_logs_tenant_id_created_at_idx" ON "ai_audit_logs"("tenant_id", "created_at");

-- CreateIndex
CREATE INDEX "saved_queries_tenant_id_idx" ON "saved_queries"("tenant_id");

-- AddForeignKey
ALTER TABLE "tenant_users" ADD CONSTRAINT "tenant_users_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "connector_configs" ADD CONSTRAINT "connector_configs_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cases" ADD CONSTRAINT "cases_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "case_notes" ADD CONSTRAINT "case_notes_case_id_fkey" FOREIGN KEY ("case_id") REFERENCES "cases"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_audit_logs" ADD CONSTRAINT "ai_audit_logs_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "saved_queries" ADD CONSTRAINT "saved_queries_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
