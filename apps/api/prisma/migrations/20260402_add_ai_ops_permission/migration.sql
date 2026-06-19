-- Seed AI Ops Workspace permission
INSERT INTO "permission_definitions" ("id", "tenant_id", "key", "module", "label_key", "sort_order", "created_at")
SELECT gen_random_uuid(), t.id, 'ai.ops.view', 'aiOps', 'roleSettings.permissions.aiOps.view', 2865, NOW()
FROM "tenants" t
WHERE NOT EXISTS (
    SELECT 1 FROM "permission_definitions" pd WHERE pd.tenant_id = t.id AND pd.key = 'ai.ops.view'
);

-- Grant AI Ops View to all roles
DO $$ BEGIN
  INSERT INTO "role_permissions" ("id", "tenant_id", "role", "permission_key", "allowed", "created_at", "updated_at")
  SELECT gen_random_uuid(), t.id, r.role::text::"UserRole", 'ai.ops.view', true, NOW(), NOW()
  FROM "tenants" t
  CROSS JOIN (VALUES
      ('PLATFORM_OPERATOR'), ('TENANT_ADMIN'), ('DETECTION_ENGINEER'),
      ('INCIDENT_RESPONDER'), ('THREAT_INTEL_ANALYST'), ('SOAR_ENGINEER'),
      ('THREAT_HUNTER'), ('SOC_ANALYST_L2'), ('SOC_ANALYST_L1'),
      ('EXECUTIVE_READONLY'), ('AUDITOR_READONLY')
  ) AS r(role)
  WHERE NOT EXISTS (
      SELECT 1 FROM "role_permissions" rp WHERE rp.tenant_id = t.id AND rp.role::text = r.role AND rp.permission_key = 'ai.ops.view'
  );
EXCEPTION WHEN others THEN
  RAISE NOTICE 'ai.ops.view role_permissions insert skipped: %', SQLERRM;
END $$;
