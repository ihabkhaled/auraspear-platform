-- CreateTable: AI Prompt Templates
CREATE TABLE IF NOT EXISTS "ai_prompt_templates" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "task_type" VARCHAR(100) NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "name" VARCHAR(255) NOT NULL,
    "content" TEXT NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_by" VARCHAR(320) NOT NULL,
    "reviewed_by" VARCHAR(320),
    "reviewed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ai_prompt_templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable: AI Feature Configs
CREATE TABLE IF NOT EXISTS "ai_feature_configs" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "feature_key" VARCHAR(100) NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "preferred_provider" VARCHAR(100),
    "max_tokens" INTEGER NOT NULL DEFAULT 2048,
    "approval_level" VARCHAR(50) NOT NULL DEFAULT 'none',
    "monthly_token_budget" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ai_feature_configs_pkey" PRIMARY KEY ("id")
);

-- CreateTable: AI Usage Ledger
CREATE TABLE IF NOT EXISTS "ai_usage_ledger" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "feature_key" VARCHAR(100) NOT NULL,
    "provider" VARCHAR(100) NOT NULL,
    "model" VARCHAR(255),
    "input_tokens" INTEGER NOT NULL DEFAULT 0,
    "output_tokens" INTEGER NOT NULL DEFAULT 0,
    "estimated_cost" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "user_id" UUID NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ai_usage_ledger_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "ai_prompt_templates_tenant_id_task_type_idx" ON "ai_prompt_templates"("tenant_id", "task_type");
CREATE INDEX IF NOT EXISTS "ai_prompt_templates_tenant_id_task_type_is_active_idx" ON "ai_prompt_templates"("tenant_id", "task_type", "is_active");
CREATE UNIQUE INDEX IF NOT EXISTS "ai_prompt_templates_tenant_id_task_type_version_key" ON "ai_prompt_templates"("tenant_id", "task_type", "version");

CREATE INDEX IF NOT EXISTS "ai_feature_configs_tenant_id_idx" ON "ai_feature_configs"("tenant_id");
CREATE INDEX IF NOT EXISTS "ai_feature_configs_tenant_id_feature_key_enabled_idx" ON "ai_feature_configs"("tenant_id", "feature_key", "enabled");
CREATE UNIQUE INDEX IF NOT EXISTS "ai_feature_configs_tenant_id_feature_key_key" ON "ai_feature_configs"("tenant_id", "feature_key");

CREATE INDEX IF NOT EXISTS "ai_usage_ledger_tenant_id_created_at_idx" ON "ai_usage_ledger"("tenant_id", "created_at");
CREATE INDEX IF NOT EXISTS "ai_usage_ledger_tenant_id_feature_key_idx" ON "ai_usage_ledger"("tenant_id", "feature_key");
CREATE INDEX IF NOT EXISTS "ai_usage_ledger_tenant_id_feature_key_created_at_idx" ON "ai_usage_ledger"("tenant_id", "feature_key", "created_at");

-- AddForeignKey
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ai_prompt_templates_tenant_id_fkey') THEN
    ALTER TABLE "ai_prompt_templates" ADD CONSTRAINT "ai_prompt_templates_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ai_feature_configs_tenant_id_fkey') THEN
    ALTER TABLE "ai_feature_configs" ADD CONSTRAINT "ai_feature_configs_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ai_usage_ledger_tenant_id_fkey') THEN
    ALTER TABLE "ai_usage_ledger" ADD CONSTRAINT "ai_usage_ledger_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;
