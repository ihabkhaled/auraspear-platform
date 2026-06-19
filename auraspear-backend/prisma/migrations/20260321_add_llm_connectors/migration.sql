-- CreateTable
CREATE TABLE IF NOT EXISTS "llm_connectors" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT false,
    "base_url" VARCHAR(500) NOT NULL,
    "encrypted_api_key" TEXT NOT NULL,
    "default_model" VARCHAR(255),
    "organization_id" VARCHAR(255),
    "max_tokens_param" VARCHAR(50) NOT NULL DEFAULT 'max_tokens',
    "timeout" INTEGER NOT NULL DEFAULT 60000,
    "last_test_at" TIMESTAMP(3),
    "last_test_ok" BOOLEAN,
    "last_error" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "llm_connectors_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "llm_connectors_tenant_id_idx" ON "llm_connectors"("tenant_id");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "llm_connectors_tenant_id_enabled_idx" ON "llm_connectors"("tenant_id", "enabled");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "llm_connectors_tenant_id_name_key" ON "llm_connectors"("tenant_id", "name");

-- AddForeignKey
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'llm_connectors_tenant_id_fkey'
    ) THEN
        ALTER TABLE "llm_connectors" ADD CONSTRAINT "llm_connectors_tenant_id_fkey"
            FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;
