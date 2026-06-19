-- Memory Retention Policy table
CREATE TABLE IF NOT EXISTS "memory_retention_policies" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "retention_days" INTEGER NOT NULL DEFAULT 0,
    "auto_cleanup" BOOLEAN NOT NULL DEFAULT false,
    "last_cleanup_at" TIMESTAMP(3),
    "last_cleanup_count" INTEGER NOT NULL DEFAULT 0,
    "created_by" UUID NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "memory_retention_policies_pkey" PRIMARY KEY ("id")
);

-- Unique constraint: one policy per tenant
CREATE UNIQUE INDEX IF NOT EXISTS "memory_retention_policies_tenant_id_key" ON "memory_retention_policies"("tenant_id");

-- Foreign key (idempotent)
DO $$ BEGIN
  ALTER TABLE "memory_retention_policies" ADD CONSTRAINT "memory_retention_policies_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Additional index on user_memories for governance queries (admin cross-user + retention cleanup)
CREATE INDEX IF NOT EXISTS "user_memories_tenant_id_is_deleted_updated_at_idx" ON "user_memories"("tenant_id", "is_deleted", "updated_at");

-- Seed AI Memory Governance permissions
INSERT INTO "permission_definitions" ("id", "tenant_id", "key", "module", "label_key", "sort_order", "created_at")
SELECT gen_random_uuid(), t.id, 'ai.memory.admin', 'aiMemory', 'roleSettings.permissions.aiMemory.admin', 2852, NOW()
FROM "tenants" t
WHERE NOT EXISTS (
    SELECT 1 FROM "permission_definitions" pd WHERE pd.tenant_id = t.id AND pd.key = 'ai.memory.admin'
);

INSERT INTO "permission_definitions" ("id", "tenant_id", "key", "module", "label_key", "sort_order", "created_at")
SELECT gen_random_uuid(), t.id, 'ai.memory.export', 'aiMemory', 'roleSettings.permissions.aiMemory.export', 2853, NOW()
FROM "tenants" t
WHERE NOT EXISTS (
    SELECT 1 FROM "permission_definitions" pd WHERE pd.tenant_id = t.id AND pd.key = 'ai.memory.export'
);

-- Grant AI Memory Admin to admin/operator roles
DO $$ BEGIN
  INSERT INTO "role_permissions" ("id", "tenant_id", "role", "permission_key", "allowed", "created_at", "updated_at")
  SELECT gen_random_uuid(), t.id, r.role::text::"UserRole", 'ai.memory.admin', true, NOW(), NOW()
  FROM "tenants" t
  CROSS JOIN (VALUES ('PLATFORM_OPERATOR'), ('TENANT_ADMIN')) AS r(role)
  WHERE NOT EXISTS (
      SELECT 1 FROM "role_permissions" rp WHERE rp.tenant_id = t.id AND rp.role::text = r.role AND rp.permission_key = 'ai.memory.admin'
  );
EXCEPTION WHEN others THEN
  RAISE NOTICE 'ai.memory.admin role_permissions insert skipped: %', SQLERRM;
END $$;

-- Grant AI Memory Export to admin/operator + auditor
DO $$ BEGIN
  INSERT INTO "role_permissions" ("id", "tenant_id", "role", "permission_key", "allowed", "created_at", "updated_at")
  SELECT gen_random_uuid(), t.id, r.role::text::"UserRole", 'ai.memory.export', true, NOW(), NOW()
  FROM "tenants" t
  CROSS JOIN (VALUES ('PLATFORM_OPERATOR'), ('TENANT_ADMIN'), ('AUDITOR_READONLY')) AS r(role)
  WHERE NOT EXISTS (
      SELECT 1 FROM "role_permissions" rp WHERE rp.tenant_id = t.id AND rp.role::text = r.role AND rp.permission_key = 'ai.memory.export'
  );
EXCEPTION WHEN others THEN
  RAISE NOTICE 'ai.memory.export role_permissions insert skipped: %', SQLERRM;
END $$;
