-- Add jobs.cancelAll permission definition (global, tenant_id IS NULL)
INSERT INTO "permission_definitions" ("id", "key", "module", "label_key", "sort_order")
SELECT gen_random_uuid(), 'jobs.cancelAll', 'jobs', 'roleSettings.permissions.jobs.cancelAll', 1452
WHERE NOT EXISTS (
  SELECT 1 FROM "permission_definitions" WHERE "key" = 'jobs.cancelAll' AND "tenant_id" IS NULL
);
