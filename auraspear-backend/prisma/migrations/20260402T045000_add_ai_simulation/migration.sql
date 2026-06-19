-- AI Simulation table
CREATE TABLE IF NOT EXISTS "ai_simulations" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "description" TEXT,
    "agent_id" VARCHAR(50) NOT NULL,
    "dataset_json" JSONB NOT NULL,
    "status" VARCHAR(30) NOT NULL DEFAULT 'pending',
    "total_cases" INTEGER NOT NULL DEFAULT 0,
    "completed_cases" INTEGER NOT NULL DEFAULT 0,
    "results_json" JSONB,
    "avg_score" DOUBLE PRECISION,
    "avg_latency_ms" DOUBLE PRECISION,
    "total_tokens" INTEGER NOT NULL DEFAULT 0,
    "error_message" TEXT,
    "started_at" TIMESTAMP(3),
    "completed_at" TIMESTAMP(3),
    "created_by" UUID NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ai_simulations_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "ai_simulations_tenant_id_idx" ON "ai_simulations"("tenant_id");
CREATE INDEX IF NOT EXISTS "ai_simulations_tenant_id_agent_id_idx" ON "ai_simulations"("tenant_id", "agent_id");

DO $$ BEGIN
  ALTER TABLE "ai_simulations" ADD CONSTRAINT "ai_simulations_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Seed AI Simulation permissions
INSERT INTO "permission_definitions" ("id", "tenant_id", "key", "module", "label_key", "sort_order", "created_at")
SELECT gen_random_uuid(), t.id, 'ai.simulation.view', 'aiSimulation', 'roleSettings.permissions.aiSimulation.view', 2900, NOW()
FROM "tenants" t
WHERE NOT EXISTS (
    SELECT 1 FROM "permission_definitions" pd WHERE pd.tenant_id = t.id AND pd.key = 'ai.simulation.view'
);

INSERT INTO "permission_definitions" ("id", "tenant_id", "key", "module", "label_key", "sort_order", "created_at")
SELECT gen_random_uuid(), t.id, 'ai.simulation.manage', 'aiSimulation', 'roleSettings.permissions.aiSimulation.manage', 2901, NOW()
FROM "tenants" t
WHERE NOT EXISTS (
    SELECT 1 FROM "permission_definitions" pd WHERE pd.tenant_id = t.id AND pd.key = 'ai.simulation.manage'
);

-- Grant simulation view+manage to PLATFORM_OPERATOR and TENANT_ADMIN
DO $$ BEGIN
  INSERT INTO "role_permissions" ("id", "tenant_id", "role", "permission_key", "allowed", "created_at", "updated_at")
  SELECT gen_random_uuid(), t.id, r.role::text::"UserRole", p.perm, true, NOW(), NOW()
  FROM "tenants" t
  CROSS JOIN (VALUES ('PLATFORM_OPERATOR'), ('TENANT_ADMIN')) AS r(role)
  CROSS JOIN (VALUES ('ai.simulation.view'), ('ai.simulation.manage')) AS p(perm)
  WHERE NOT EXISTS (
      SELECT 1 FROM "role_permissions" rp WHERE rp.tenant_id = t.id AND rp.role::text = r.role AND rp.permission_key = p.perm
  );
EXCEPTION WHEN others THEN
  RAISE NOTICE 'ai_simulation admin role_permissions insert skipped: %', SQLERRM;
END $$;

-- Grant simulation view to DETECTION_ENGINEER
DO $$ BEGIN
  INSERT INTO "role_permissions" ("id", "tenant_id", "role", "permission_key", "allowed", "created_at", "updated_at")
  SELECT gen_random_uuid(), t.id, 'DETECTION_ENGINEER'::"UserRole", 'ai.simulation.view', true, NOW(), NOW()
  FROM "tenants" t
  WHERE NOT EXISTS (
      SELECT 1 FROM "role_permissions" rp WHERE rp.tenant_id = t.id AND rp.role::text = 'DETECTION_ENGINEER' AND rp.permission_key = 'ai.simulation.view'
  );
EXCEPTION WHEN others THEN
  RAISE NOTICE 'ai_simulation detection_engineer role_permissions insert skipped: %', SQLERRM;
END $$;
