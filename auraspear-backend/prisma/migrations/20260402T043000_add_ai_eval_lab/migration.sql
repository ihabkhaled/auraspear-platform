-- AI Eval Suite table
CREATE TABLE IF NOT EXISTS "ai_eval_suites" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "description" TEXT,
    "dataset_json" JSONB NOT NULL,
    "created_by" UUID NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ai_eval_suites_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "ai_eval_suites_tenant_id_idx" ON "ai_eval_suites"("tenant_id");

DO $$ BEGIN
  ALTER TABLE "ai_eval_suites" ADD CONSTRAINT "ai_eval_suites_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- AI Eval Run table
CREATE TABLE IF NOT EXISTS "ai_eval_runs" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "suite_id" UUID NOT NULL,
    "provider" VARCHAR(100) NOT NULL,
    "model" VARCHAR(255) NOT NULL,
    "status" VARCHAR(30) NOT NULL DEFAULT 'pending',
    "total_cases" INTEGER NOT NULL DEFAULT 0,
    "passed_cases" INTEGER NOT NULL DEFAULT 0,
    "failed_cases" INTEGER NOT NULL DEFAULT 0,
    "avg_score" DOUBLE PRECISION,
    "avg_latency_ms" DOUBLE PRECISION,
    "total_tokens" INTEGER NOT NULL DEFAULT 0,
    "results_json" JSONB,
    "error_message" TEXT,
    "started_at" TIMESTAMP(3),
    "completed_at" TIMESTAMP(3),
    "created_by" UUID NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ai_eval_runs_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "ai_eval_runs_tenant_id_idx" ON "ai_eval_runs"("tenant_id");
CREATE INDEX IF NOT EXISTS "ai_eval_runs_suite_id_idx" ON "ai_eval_runs"("suite_id");

DO $$ BEGIN
  ALTER TABLE "ai_eval_runs" ADD CONSTRAINT "ai_eval_runs_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "ai_eval_runs" ADD CONSTRAINT "ai_eval_runs_suite_id_fkey" FOREIGN KEY ("suite_id") REFERENCES "ai_eval_suites"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Seed AI Eval permissions
INSERT INTO "permission_definitions" ("id", "tenant_id", "key", "module", "label_key", "sort_order", "created_at")
SELECT gen_random_uuid(), t.id, 'ai.eval.view', 'aiEval', 'roleSettings.permissions.aiEval.view', 2880, NOW()
FROM "tenants" t
WHERE NOT EXISTS (
    SELECT 1 FROM "permission_definitions" pd WHERE pd.tenant_id = t.id AND pd.key = 'ai.eval.view'
);

INSERT INTO "permission_definitions" ("id", "tenant_id", "key", "module", "label_key", "sort_order", "created_at")
SELECT gen_random_uuid(), t.id, 'ai.eval.manage', 'aiEval', 'roleSettings.permissions.aiEval.manage', 2881, NOW()
FROM "tenants" t
WHERE NOT EXISTS (
    SELECT 1 FROM "permission_definitions" pd WHERE pd.tenant_id = t.id AND pd.key = 'ai.eval.manage'
);

-- Grant eval view+manage to PLATFORM_OPERATOR and TENANT_ADMIN
DO $$ BEGIN
  INSERT INTO "role_permissions" ("id", "tenant_id", "role", "permission_key", "allowed", "created_at", "updated_at")
  SELECT gen_random_uuid(), t.id, r.role::text::"UserRole", p.perm, true, NOW(), NOW()
  FROM "tenants" t
  CROSS JOIN (VALUES ('PLATFORM_OPERATOR'), ('TENANT_ADMIN')) AS r(role)
  CROSS JOIN (VALUES ('ai.eval.view'), ('ai.eval.manage')) AS p(perm)
  WHERE NOT EXISTS (
      SELECT 1 FROM "role_permissions" rp WHERE rp.tenant_id = t.id AND rp.role::text = r.role AND rp.permission_key = p.perm
  );
EXCEPTION WHEN others THEN
  RAISE NOTICE 'ai_eval admin role_permissions insert skipped: %', SQLERRM;
END $$;

-- Grant eval view to DETECTION_ENGINEER
DO $$ BEGIN
  INSERT INTO "role_permissions" ("id", "tenant_id", "role", "permission_key", "allowed", "created_at", "updated_at")
  SELECT gen_random_uuid(), t.id, 'DETECTION_ENGINEER'::"UserRole", 'ai.eval.view', true, NOW(), NOW()
  FROM "tenants" t
  WHERE NOT EXISTS (
      SELECT 1 FROM "role_permissions" rp WHERE rp.tenant_id = t.id AND rp.role::text = 'DETECTION_ENGINEER' AND rp.permission_key = 'ai.eval.view'
  );
EXCEPTION WHEN others THEN
  RAISE NOTICE 'ai_eval detection_engineer role_permissions insert skipped: %', SQLERRM;
END $$;
