-- Add AI Memory permissions for all tenants.

INSERT INTO "permission_definitions" ("id", "tenant_id", "key", "module", "label_key", "sort_order", "created_at")
SELECT gen_random_uuid(), t.id, v.key, v.module, v.label_key, v.sort_order, NOW()
FROM "tenants" t
CROSS JOIN (
  VALUES
    ('ai.memory.view', 'aiMemory', 'roleSettings.permissions.aiMemory.view', 2850),
    ('ai.memory.edit', 'aiMemory', 'roleSettings.permissions.aiMemory.edit', 2851)
) AS v(key, module, label_key, sort_order)
WHERE NOT EXISTS (
  SELECT 1 FROM "permission_definitions" pd
  WHERE pd."tenant_id" = t.id AND pd."key" = v.key
);

-- Grant AI Memory permissions to ALL roles.

INSERT INTO "role_permissions" ("id", "tenant_id", "role", "permission_key", "allowed", "created_at", "updated_at")
SELECT gen_random_uuid(), t.id, r.role::text::"UserRole", p.key, true, NOW(), NOW()
FROM "tenants" t
CROSS JOIN (
  VALUES
    ('ai.memory.view'),
    ('ai.memory.edit')
) AS p(key)
CROSS JOIN (
  VALUES
    ('PLATFORM_OPERATOR'),
    ('TENANT_ADMIN'),
    ('DETECTION_ENGINEER'),
    ('INCIDENT_RESPONDER'),
    ('THREAT_INTEL_ANALYST'),
    ('SOAR_ENGINEER'),
    ('THREAT_HUNTER'),
    ('SOC_ANALYST_L2'),
    ('SOC_ANALYST_L1'),
    ('EXECUTIVE_READONLY'),
    ('AUDITOR_READONLY')
) AS r(role)
WHERE NOT EXISTS (
  SELECT 1 FROM "role_permissions" rp
  WHERE rp."tenant_id" = t.id AND rp."role"::text = r.role AND rp."permission_key" = p.key
);
