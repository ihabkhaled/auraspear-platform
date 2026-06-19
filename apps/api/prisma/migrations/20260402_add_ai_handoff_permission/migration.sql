-- Seed AI Handoff permission
INSERT INTO "permission_definitions" ("id", "tenant_id", "key", "module", "label_key", "sort_order", "created_at")
SELECT gen_random_uuid(), t.id, 'ai.handoff.promote', 'aiHandoff', 'roleSettings.permissions.aiHandoff.promote', 2863, NOW()
FROM "tenants" t
WHERE NOT EXISTS (
    SELECT 1 FROM "permission_definitions" pd WHERE pd.tenant_id = t.id AND pd.key = 'ai.handoff.promote'
);

-- Grant to operational roles
DO $$ BEGIN
  INSERT INTO "role_permissions" ("id", "tenant_id", "role", "permission_key", "allowed", "created_at", "updated_at")
  SELECT gen_random_uuid(), t.id, r.role::text::"UserRole", 'ai.handoff.promote', true, NOW(), NOW()
  FROM "tenants" t
  CROSS JOIN (VALUES
      ('PLATFORM_OPERATOR'), ('TENANT_ADMIN'), ('INCIDENT_RESPONDER'), ('SOC_ANALYST_L2'), ('THREAT_HUNTER')
  ) AS r(role)
  WHERE NOT EXISTS (
      SELECT 1 FROM "role_permissions" rp WHERE rp.tenant_id = t.id AND rp.role::text = r.role AND rp.permission_key = 'ai.handoff.promote'
  );
EXCEPTION WHEN others THEN
  RAISE NOTICE 'ai.handoff.promote role_permissions insert skipped: %', SQLERRM;
END $$;
