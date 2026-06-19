-- AI Cost Rates table
CREATE TABLE IF NOT EXISTS "ai_cost_rates" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "provider" VARCHAR(100) NOT NULL,
    "model" VARCHAR(255) NOT NULL,
    "input_cost_per_1k" DOUBLE PRECISION NOT NULL DEFAULT 0.003,
    "output_cost_per_1k" DOUBLE PRECISION NOT NULL DEFAULT 0.015,
    "effective_from" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" UUID NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ai_cost_rates_pkey" PRIMARY KEY ("id")
);

-- AI Budget Alerts table
CREATE TABLE IF NOT EXISTS "ai_budget_alerts" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "scope" VARCHAR(30) NOT NULL DEFAULT 'tenant',
    "scope_key" VARCHAR(100),
    "monthly_budget" DOUBLE PRECISION NOT NULL,
    "alert_thresholds" VARCHAR(100) NOT NULL DEFAULT '50,75,90,100',
    "last_alert_pct" INTEGER NOT NULL DEFAULT 0,
    "last_alert_at" TIMESTAMP(3),
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "created_by" UUID NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ai_budget_alerts_pkey" PRIMARY KEY ("id")
);

-- Unique constraints
CREATE UNIQUE INDEX IF NOT EXISTS "ai_cost_rates_tenant_id_provider_model_key" ON "ai_cost_rates"("tenant_id", "provider", "model");
CREATE UNIQUE INDEX IF NOT EXISTS "ai_budget_alerts_tenant_id_scope_scope_key_key" ON "ai_budget_alerts"("tenant_id", "scope", "scope_key");

-- Indexes
CREATE INDEX IF NOT EXISTS "ai_cost_rates_tenant_id_idx" ON "ai_cost_rates"("tenant_id");
CREATE INDEX IF NOT EXISTS "ai_budget_alerts_tenant_id_idx" ON "ai_budget_alerts"("tenant_id");

-- Additional indexes on existing ai_usage_ledger for FinOps queries
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'ai_usage_ledger') THEN
    CREATE INDEX IF NOT EXISTS "ai_usage_ledger_tenant_id_user_id_idx" ON "ai_usage_ledger"("tenant_id", "user_id");
    CREATE INDEX IF NOT EXISTS "ai_usage_ledger_tenant_id_model_idx" ON "ai_usage_ledger"("tenant_id", "model");
  END IF;
END $$;

-- Foreign keys (idempotent — skip if already exists)
DO $$ BEGIN
  ALTER TABLE "ai_cost_rates" ADD CONSTRAINT "ai_cost_rates_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "ai_budget_alerts" ADD CONSTRAINT "ai_budget_alerts_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Seed AI FinOps permissions
INSERT INTO "permission_definitions" ("id", "tenant_id", "key", "module", "label_key", "sort_order", "created_at")
SELECT gen_random_uuid(), t.id, 'ai.finops.view', 'aiFinops', 'roleSettings.permissions.aiFinops.view', 2860, NOW()
FROM "tenants" t
WHERE NOT EXISTS (
    SELECT 1 FROM "permission_definitions" pd WHERE pd.tenant_id = t.id AND pd.key = 'ai.finops.view'
);

INSERT INTO "permission_definitions" ("id", "tenant_id", "key", "module", "label_key", "sort_order", "created_at")
SELECT gen_random_uuid(), t.id, 'ai.finops.manage', 'aiFinops', 'roleSettings.permissions.aiFinops.manage', 2861, NOW()
FROM "tenants" t
WHERE NOT EXISTS (
    SELECT 1 FROM "permission_definitions" pd WHERE pd.tenant_id = t.id AND pd.key = 'ai.finops.manage'
);

-- Grant AI FinOps view to all roles (safe cast with exception handling)
DO $$ BEGIN
  INSERT INTO "role_permissions" ("id", "tenant_id", "role", "permission_key", "allowed", "created_at", "updated_at")
  SELECT gen_random_uuid(), t.id, r.role::text::"UserRole", 'ai.finops.view', true, NOW(), NOW()
  FROM "tenants" t
  CROSS JOIN (VALUES
      ('PLATFORM_OPERATOR'), ('TENANT_ADMIN'), ('DETECTION_ENGINEER'),
      ('INCIDENT_RESPONDER'), ('THREAT_INTEL_ANALYST'), ('SOAR_ENGINEER'),
      ('THREAT_HUNTER'), ('SOC_ANALYST_L2'), ('SOC_ANALYST_L1'),
      ('EXECUTIVE_READONLY'), ('AUDITOR_READONLY')
  ) AS r(role)
  WHERE NOT EXISTS (
      SELECT 1 FROM "role_permissions" rp WHERE rp.tenant_id = t.id AND rp.role::text = r.role AND rp.permission_key = 'ai.finops.view'
  );
EXCEPTION WHEN others THEN
  RAISE NOTICE 'ai.finops.view role_permissions insert skipped: %', SQLERRM;
END $$;

-- Grant AI FinOps manage to admin/operator roles only
DO $$ BEGIN
  INSERT INTO "role_permissions" ("id", "tenant_id", "role", "permission_key", "allowed", "created_at", "updated_at")
  SELECT gen_random_uuid(), t.id, r.role::text::"UserRole", 'ai.finops.manage', true, NOW(), NOW()
  FROM "tenants" t
  CROSS JOIN (VALUES ('PLATFORM_OPERATOR'), ('TENANT_ADMIN')) AS r(role)
  WHERE NOT EXISTS (
      SELECT 1 FROM "role_permissions" rp WHERE rp.tenant_id = t.id AND rp.role::text = r.role AND rp.permission_key = 'ai.finops.manage'
  );
EXCEPTION WHEN others THEN
  RAISE NOTICE 'ai.finops.manage role_permissions insert skipped: %', SQLERRM;
END $$;
