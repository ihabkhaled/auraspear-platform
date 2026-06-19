-- Add compliance fields to ai_chat_threads
ALTER TABLE "ai_chat_threads" ADD COLUMN IF NOT EXISTS "legal_hold" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "ai_chat_threads" ADD COLUMN IF NOT EXISTS "compliance_status" VARCHAR(30) NOT NULL DEFAULT 'none';
ALTER TABLE "ai_chat_threads" ADD COLUMN IF NOT EXISTS "redacted_at" TIMESTAMP(3);

-- Index for legal hold queries
CREATE INDEX IF NOT EXISTS "ai_chat_threads_tenant_id_legal_hold_idx" ON "ai_chat_threads"("tenant_id", "legal_hold");

-- AI Transcript Policy table
CREATE TABLE IF NOT EXISTS "ai_transcript_policies" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "chat_retention_days" INTEGER NOT NULL DEFAULT 0,
    "audit_retention_days" INTEGER NOT NULL DEFAULT 0,
    "auto_redact_pii" BOOLEAN NOT NULL DEFAULT false,
    "require_legal_hold" BOOLEAN NOT NULL DEFAULT false,
    "last_cleanup_at" TIMESTAMP(3),
    "last_cleanup_count" INTEGER NOT NULL DEFAULT 0,
    "created_by" UUID NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ai_transcript_policies_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "ai_transcript_policies_tenant_id_key" ON "ai_transcript_policies"("tenant_id");

DO $$ BEGIN
  ALTER TABLE "ai_transcript_policies" ADD CONSTRAINT "ai_transcript_policies_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Seed AI Transcript permissions
INSERT INTO "permission_definitions" ("id", "tenant_id", "key", "module", "label_key", "sort_order", "created_at")
SELECT gen_random_uuid(), t.id, 'ai.transcript.view', 'aiTranscript', 'roleSettings.permissions.aiTranscript.view', 2870, NOW()
FROM "tenants" t
WHERE NOT EXISTS (
    SELECT 1 FROM "permission_definitions" pd WHERE pd.tenant_id = t.id AND pd.key = 'ai.transcript.view'
);

INSERT INTO "permission_definitions" ("id", "tenant_id", "key", "module", "label_key", "sort_order", "created_at")
SELECT gen_random_uuid(), t.id, 'ai.transcript.manage', 'aiTranscript', 'roleSettings.permissions.aiTranscript.manage', 2871, NOW()
FROM "tenants" t
WHERE NOT EXISTS (
    SELECT 1 FROM "permission_definitions" pd WHERE pd.tenant_id = t.id AND pd.key = 'ai.transcript.manage'
);

INSERT INTO "permission_definitions" ("id", "tenant_id", "key", "module", "label_key", "sort_order", "created_at")
SELECT gen_random_uuid(), t.id, 'ai.transcript.export', 'aiTranscript', 'roleSettings.permissions.aiTranscript.export', 2872, NOW()
FROM "tenants" t
WHERE NOT EXISTS (
    SELECT 1 FROM "permission_definitions" pd WHERE pd.tenant_id = t.id AND pd.key = 'ai.transcript.export'
);

-- Grant transcript view+manage+export to admin/operator
DO $$ BEGIN
  INSERT INTO "role_permissions" ("id", "tenant_id", "role", "permission_key", "allowed", "created_at", "updated_at")
  SELECT gen_random_uuid(), t.id, r.role::text::"UserRole", p.perm, true, NOW(), NOW()
  FROM "tenants" t
  CROSS JOIN (VALUES ('PLATFORM_OPERATOR'), ('TENANT_ADMIN')) AS r(role)
  CROSS JOIN (VALUES ('ai.transcript.view'), ('ai.transcript.manage'), ('ai.transcript.export')) AS p(perm)
  WHERE NOT EXISTS (
      SELECT 1 FROM "role_permissions" rp WHERE rp.tenant_id = t.id AND rp.role::text = r.role AND rp.permission_key = p.perm
  );
EXCEPTION WHEN others THEN
  RAISE NOTICE 'transcript admin role_permissions insert skipped: %', SQLERRM;
END $$;

-- Grant transcript view+export to auditor
DO $$ BEGIN
  INSERT INTO "role_permissions" ("id", "tenant_id", "role", "permission_key", "allowed", "created_at", "updated_at")
  SELECT gen_random_uuid(), t.id, 'AUDITOR_READONLY'::"UserRole", p.perm, true, NOW(), NOW()
  FROM "tenants" t
  CROSS JOIN (VALUES ('ai.transcript.view'), ('ai.transcript.export')) AS p(perm)
  WHERE NOT EXISTS (
      SELECT 1 FROM "role_permissions" rp WHERE rp.tenant_id = t.id AND rp.role::text = 'AUDITOR_READONLY' AND rp.permission_key = p.perm
  );
EXCEPTION WHEN others THEN
  RAISE NOTICE 'transcript auditor role_permissions insert skipped: %', SQLERRM;
END $$;
