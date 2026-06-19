-- Add LLM Connector permission definitions (global, tenant_id IS NULL)
INSERT INTO "permission_definitions" ("id", "key", "module", "label_key", "sort_order")
SELECT gen_random_uuid(), p.key, 'llmConnectors', p.label_key, p.sort_order
FROM (VALUES
  ('llmConnectors.view',   'roleSettings.permissions.llmConnectors.view',   410),
  ('llmConnectors.create', 'roleSettings.permissions.llmConnectors.create', 411),
  ('llmConnectors.update', 'roleSettings.permissions.llmConnectors.update', 412),
  ('llmConnectors.delete', 'roleSettings.permissions.llmConnectors.delete', 413),
  ('llmConnectors.test',   'roleSettings.permissions.llmConnectors.test',   414)
) AS p(key, label_key, sort_order)
WHERE NOT EXISTS (
  SELECT 1 FROM "permission_definitions" WHERE "key" = p.key AND "tenant_id" IS NULL
);
