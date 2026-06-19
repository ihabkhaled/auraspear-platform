-- Seed 4 new AI copilot permissions into permission_definitions for all tenants.
-- PermissionDefinition has no updated_at column.

INSERT INTO "permission_definitions" ("id", "tenant_id", "key", "module", "label_key", "sort_order", "created_at")
SELECT gen_random_uuid(), t.id, v.key, v.module, v.label_key, v.sort_order, NOW()
FROM "tenants" t
CROSS JOIN (
  VALUES
    ('ai.vulnerabilities.copilot', 'vulnerabilities', 'roleSettings.permissions.vulnerabilities.aiCopilot', 2800),
    ('ai.cloudSecurity.triage',    'cloudSecurity',   'roleSettings.permissions.cloudSecurity.aiTriage',    2810),
    ('ai.ueba.narrative',          'ueba',            'roleSettings.permissions.ueba.aiNarrative',          2820),
    ('ai.attackPaths.summary',     'attackPaths',     'roleSettings.permissions.attackPaths.aiSummary',      2830)
) AS v(key, module, label_key, sort_order)
WHERE NOT EXISTS (
  SELECT 1 FROM "permission_definitions" pd
  WHERE pd."tenant_id" = t.id AND pd."key" = v.key
);

-- Seed default role permissions for these 4 new permissions.
-- RolePermission has: id, tenant_id, role, permission_key, allowed, created_at, updated_at

INSERT INTO "role_permissions" ("id", "tenant_id", "role", "permission_key", "allowed", "created_at", "updated_at")
SELECT gen_random_uuid(), t.id, r.role::text::"UserRole", p.key, true, NOW(), NOW()
FROM "tenants" t
CROSS JOIN (
  VALUES
    ('ai.vulnerabilities.copilot'),
    ('ai.cloudSecurity.triage'),
    ('ai.ueba.narrative'),
    ('ai.attackPaths.summary')
) AS p(key)
CROSS JOIN (
  VALUES
    ('PLATFORM_OPERATOR'),
    ('TENANT_ADMIN'),
    ('SOC_ANALYST_L2'),
    ('INCIDENT_RESPONDER')
) AS r(role)
WHERE NOT EXISTS (
  SELECT 1 FROM "role_permissions" rp
  WHERE rp."tenant_id" = t.id AND rp."role"::text = r.role AND rp."permission_key" = p.key
);
