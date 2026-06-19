-- CreateTable: Tenant Agent Configs
CREATE TABLE IF NOT EXISTS "tenant_agent_configs" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "agent_id" VARCHAR(50) NOT NULL,
    "is_enabled" BOOLEAN NOT NULL DEFAULT true,
    "provider_mode" VARCHAR(100) NOT NULL DEFAULT 'default',
    "model" VARCHAR(255),
    "temperature" DOUBLE PRECISION NOT NULL DEFAULT 0.7,
    "max_tokens_per_call" INTEGER NOT NULL DEFAULT 2048,
    "system_prompt" TEXT,
    "prompt_suffix" TEXT,
    "index_patterns" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "tokens_per_hour" INTEGER NOT NULL DEFAULT 50000,
    "tokens_per_day" INTEGER NOT NULL DEFAULT 500000,
    "tokens_per_month" INTEGER NOT NULL DEFAULT 5000000,
    "tokens_used_hour" INTEGER NOT NULL DEFAULT 0,
    "tokens_used_day" INTEGER NOT NULL DEFAULT 0,
    "tokens_used_month" INTEGER NOT NULL DEFAULT 0,
    "max_concurrent_runs" INTEGER NOT NULL DEFAULT 3,
    "trigger_mode" VARCHAR(30) NOT NULL DEFAULT 'manual_only',
    "trigger_config" JSONB NOT NULL DEFAULT '{}',
    "osint_sources" JSONB NOT NULL DEFAULT '[]',
    "output_format" VARCHAR(20) NOT NULL DEFAULT 'markdown',
    "presentation_skills" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "last_reset_hour" TIMESTAMP(3),
    "last_reset_day" TIMESTAMP(3),
    "last_reset_month" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tenant_agent_configs_pkey" PRIMARY KEY ("id")
);

-- CreateTable: OSINT Source Configs
CREATE TABLE IF NOT EXISTS "osint_source_configs" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "source_type" VARCHAR(50) NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "is_enabled" BOOLEAN NOT NULL DEFAULT true,
    "encrypted_api_key" TEXT,
    "base_url" VARCHAR(500),
    "auth_type" VARCHAR(30) NOT NULL DEFAULT 'none',
    "header_name" VARCHAR(100),
    "query_param_name" VARCHAR(100),
    "response_path" VARCHAR(500),
    "request_method" VARCHAR(10) NOT NULL DEFAULT 'GET',
    "timeout" INTEGER NOT NULL DEFAULT 30000,
    "last_test_at" TIMESTAMP(3),
    "last_test_ok" BOOLEAN,
    "last_error" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "osint_source_configs_pkey" PRIMARY KEY ("id")
);

-- CreateTable: AI Approval Requests
CREATE TABLE IF NOT EXISTS "ai_approval_requests" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "agent_id" VARCHAR(50) NOT NULL,
    "action_type" VARCHAR(100) NOT NULL,
    "action_data" JSONB NOT NULL,
    "risk_level" VARCHAR(20) NOT NULL DEFAULT 'medium',
    "status" VARCHAR(20) NOT NULL DEFAULT 'pending',
    "requested_by" VARCHAR(320) NOT NULL,
    "reviewed_by" VARCHAR(320),
    "reviewed_at" TIMESTAMP(3),
    "comment" TEXT,
    "result" JSONB,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ai_approval_requests_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "tenant_agent_configs_tenant_id_idx" ON "tenant_agent_configs"("tenant_id");
CREATE INDEX IF NOT EXISTS "tenant_agent_configs_tenant_id_agent_id_is_enabled_idx" ON "tenant_agent_configs"("tenant_id", "agent_id", "is_enabled");
CREATE UNIQUE INDEX IF NOT EXISTS "tenant_agent_configs_tenant_id_agent_id_key" ON "tenant_agent_configs"("tenant_id", "agent_id");

CREATE INDEX IF NOT EXISTS "osint_source_configs_tenant_id_idx" ON "osint_source_configs"("tenant_id");
CREATE INDEX IF NOT EXISTS "osint_source_configs_tenant_id_source_type_idx" ON "osint_source_configs"("tenant_id", "source_type");
CREATE UNIQUE INDEX IF NOT EXISTS "osint_source_configs_tenant_id_source_type_name_key" ON "osint_source_configs"("tenant_id", "source_type", "name");

CREATE INDEX IF NOT EXISTS "ai_approval_requests_tenant_id_idx" ON "ai_approval_requests"("tenant_id");
CREATE INDEX IF NOT EXISTS "ai_approval_requests_tenant_id_status_idx" ON "ai_approval_requests"("tenant_id", "status");
CREATE INDEX IF NOT EXISTS "ai_approval_requests_tenant_id_agent_id_idx" ON "ai_approval_requests"("tenant_id", "agent_id");

-- AddForeignKey
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'tenant_agent_configs_tenant_id_fkey') THEN
    ALTER TABLE "tenant_agent_configs" ADD CONSTRAINT "tenant_agent_configs_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'osint_source_configs_tenant_id_fkey') THEN
    ALTER TABLE "osint_source_configs" ADD CONSTRAINT "osint_source_configs_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ai_approval_requests_tenant_id_fkey') THEN
    ALTER TABLE "ai_approval_requests" ADD CONSTRAINT "ai_approval_requests_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;
