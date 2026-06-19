-- ============================================================================
-- Row-Level Security (RLS) for Tenant Isolation
-- Defense-in-depth: ensures every tenant-scoped query is restricted to
-- the tenant identified by the PostgreSQL session variable
-- `app.current_tenant_id`.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 0. Create the bypass role for migrations / seeding (idempotent)
-- ---------------------------------------------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'prisma_migration') THEN
    CREATE ROLE prisma_migration NOLOGIN;
  END IF;
END
$$;

-- ---------------------------------------------------------------------------
-- 1. Tenant table — restrict to own row
-- ---------------------------------------------------------------------------
ALTER TABLE "tenants" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "tenants" FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS tenant_isolation_policy ON "tenants";
CREATE POLICY tenant_isolation_policy ON "tenants"
  USING ("id" = current_setting('app.current_tenant_id', true)::uuid);

DROP POLICY IF EXISTS bypass_rls ON "tenants";
CREATE POLICY bypass_rls ON "tenants" FOR ALL TO prisma_migration USING (true);

-- ---------------------------------------------------------------------------
-- 2. Tenant-scoped tables with required (NOT NULL) tenant_id
-- ---------------------------------------------------------------------------

-- role_permissions
ALTER TABLE "role_permissions" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "role_permissions" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation_policy ON "role_permissions";
CREATE POLICY tenant_isolation_policy ON "role_permissions"
  USING ("tenant_id" = current_setting('app.current_tenant_id', true)::uuid);
DROP POLICY IF EXISTS bypass_rls ON "role_permissions";
CREATE POLICY bypass_rls ON "role_permissions" FOR ALL TO prisma_migration USING (true);

-- tenant_memberships
ALTER TABLE "tenant_memberships" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "tenant_memberships" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation_policy ON "tenant_memberships";
CREATE POLICY tenant_isolation_policy ON "tenant_memberships"
  USING ("tenant_id" = current_setting('app.current_tenant_id', true)::uuid);
DROP POLICY IF EXISTS bypass_rls ON "tenant_memberships";
CREATE POLICY bypass_rls ON "tenant_memberships" FOR ALL TO prisma_migration USING (true);

-- connector_configs
ALTER TABLE "connector_configs" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "connector_configs" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation_policy ON "connector_configs";
CREATE POLICY tenant_isolation_policy ON "connector_configs"
  USING ("tenant_id" = current_setting('app.current_tenant_id', true)::uuid);
DROP POLICY IF EXISTS bypass_rls ON "connector_configs";
CREATE POLICY bypass_rls ON "connector_configs" FOR ALL TO prisma_migration USING (true);

-- alerts
ALTER TABLE "alerts" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "alerts" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation_policy ON "alerts";
CREATE POLICY tenant_isolation_policy ON "alerts"
  USING ("tenant_id" = current_setting('app.current_tenant_id', true)::uuid);
DROP POLICY IF EXISTS bypass_rls ON "alerts";
CREATE POLICY bypass_rls ON "alerts" FOR ALL TO prisma_migration USING (true);

-- case_cycles
ALTER TABLE "case_cycles" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "case_cycles" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation_policy ON "case_cycles";
CREATE POLICY tenant_isolation_policy ON "case_cycles"
  USING ("tenant_id" = current_setting('app.current_tenant_id', true)::uuid);
DROP POLICY IF EXISTS bypass_rls ON "case_cycles";
CREATE POLICY bypass_rls ON "case_cycles" FOR ALL TO prisma_migration USING (true);

-- cases
ALTER TABLE "cases" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "cases" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation_policy ON "cases";
CREATE POLICY tenant_isolation_policy ON "cases"
  USING ("tenant_id" = current_setting('app.current_tenant_id', true)::uuid);
DROP POLICY IF EXISTS bypass_rls ON "cases";
CREATE POLICY bypass_rls ON "cases" FOR ALL TO prisma_migration USING (true);

-- intel_iocs
ALTER TABLE "intel_iocs" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "intel_iocs" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation_policy ON "intel_iocs";
CREATE POLICY tenant_isolation_policy ON "intel_iocs"
  USING ("tenant_id" = current_setting('app.current_tenant_id', true)::uuid);
DROP POLICY IF EXISTS bypass_rls ON "intel_iocs";
CREATE POLICY bypass_rls ON "intel_iocs" FOR ALL TO prisma_migration USING (true);

-- intel_misp_events
ALTER TABLE "intel_misp_events" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "intel_misp_events" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation_policy ON "intel_misp_events";
CREATE POLICY tenant_isolation_policy ON "intel_misp_events"
  USING ("tenant_id" = current_setting('app.current_tenant_id', true)::uuid);
DROP POLICY IF EXISTS bypass_rls ON "intel_misp_events";
CREATE POLICY bypass_rls ON "intel_misp_events" FOR ALL TO prisma_migration USING (true);

-- hunt_sessions
ALTER TABLE "hunt_sessions" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "hunt_sessions" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation_policy ON "hunt_sessions";
CREATE POLICY tenant_isolation_policy ON "hunt_sessions"
  USING ("tenant_id" = current_setting('app.current_tenant_id', true)::uuid);
DROP POLICY IF EXISTS bypass_rls ON "hunt_sessions";
CREATE POLICY bypass_rls ON "hunt_sessions" FOR ALL TO prisma_migration USING (true);

-- audit_logs
ALTER TABLE "audit_logs" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "audit_logs" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation_policy ON "audit_logs";
CREATE POLICY tenant_isolation_policy ON "audit_logs"
  USING ("tenant_id" = current_setting('app.current_tenant_id', true)::uuid);
DROP POLICY IF EXISTS bypass_rls ON "audit_logs";
CREATE POLICY bypass_rls ON "audit_logs" FOR ALL TO prisma_migration USING (true);

-- ai_audit_logs
ALTER TABLE "ai_audit_logs" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ai_audit_logs" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation_policy ON "ai_audit_logs";
CREATE POLICY tenant_isolation_policy ON "ai_audit_logs"
  USING ("tenant_id" = current_setting('app.current_tenant_id', true)::uuid);
DROP POLICY IF EXISTS bypass_rls ON "ai_audit_logs";
CREATE POLICY bypass_rls ON "ai_audit_logs" FOR ALL TO prisma_migration USING (true);

-- saved_queries
ALTER TABLE "saved_queries" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "saved_queries" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation_policy ON "saved_queries";
CREATE POLICY tenant_isolation_policy ON "saved_queries"
  USING ("tenant_id" = current_setting('app.current_tenant_id', true)::uuid);
DROP POLICY IF EXISTS bypass_rls ON "saved_queries";
CREATE POLICY bypass_rls ON "saved_queries" FOR ALL TO prisma_migration USING (true);

-- connector_sync_jobs
ALTER TABLE "connector_sync_jobs" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "connector_sync_jobs" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation_policy ON "connector_sync_jobs";
CREATE POLICY tenant_isolation_policy ON "connector_sync_jobs"
  USING ("tenant_id" = current_setting('app.current_tenant_id', true)::uuid);
DROP POLICY IF EXISTS bypass_rls ON "connector_sync_jobs";
CREATE POLICY bypass_rls ON "connector_sync_jobs" FOR ALL TO prisma_migration USING (true);

-- grafana_dashboards
ALTER TABLE "grafana_dashboards" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "grafana_dashboards" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation_policy ON "grafana_dashboards";
CREATE POLICY tenant_isolation_policy ON "grafana_dashboards"
  USING ("tenant_id" = current_setting('app.current_tenant_id', true)::uuid);
DROP POLICY IF EXISTS bypass_rls ON "grafana_dashboards";
CREATE POLICY bypass_rls ON "grafana_dashboards" FOR ALL TO prisma_migration USING (true);

-- velociraptor_endpoints
ALTER TABLE "velociraptor_endpoints" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "velociraptor_endpoints" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation_policy ON "velociraptor_endpoints";
CREATE POLICY tenant_isolation_policy ON "velociraptor_endpoints"
  USING ("tenant_id" = current_setting('app.current_tenant_id', true)::uuid);
DROP POLICY IF EXISTS bypass_rls ON "velociraptor_endpoints";
CREATE POLICY bypass_rls ON "velociraptor_endpoints" FOR ALL TO prisma_migration USING (true);

-- velociraptor_hunts
ALTER TABLE "velociraptor_hunts" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "velociraptor_hunts" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation_policy ON "velociraptor_hunts";
CREATE POLICY tenant_isolation_policy ON "velociraptor_hunts"
  USING ("tenant_id" = current_setting('app.current_tenant_id', true)::uuid);
DROP POLICY IF EXISTS bypass_rls ON "velociraptor_hunts";
CREATE POLICY bypass_rls ON "velociraptor_hunts" FOR ALL TO prisma_migration USING (true);

-- velociraptor_notebooks
ALTER TABLE "velociraptor_notebooks" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "velociraptor_notebooks" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation_policy ON "velociraptor_notebooks";
CREATE POLICY tenant_isolation_policy ON "velociraptor_notebooks"
  USING ("tenant_id" = current_setting('app.current_tenant_id', true)::uuid);
DROP POLICY IF EXISTS bypass_rls ON "velociraptor_notebooks";
CREATE POLICY bypass_rls ON "velociraptor_notebooks" FOR ALL TO prisma_migration USING (true);

-- logstash_pipeline_logs
ALTER TABLE "logstash_pipeline_logs" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "logstash_pipeline_logs" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation_policy ON "logstash_pipeline_logs";
CREATE POLICY tenant_isolation_policy ON "logstash_pipeline_logs"
  USING ("tenant_id" = current_setting('app.current_tenant_id', true)::uuid);
DROP POLICY IF EXISTS bypass_rls ON "logstash_pipeline_logs";
CREATE POLICY bypass_rls ON "logstash_pipeline_logs" FOR ALL TO prisma_migration USING (true);

-- shuffle_workflows
ALTER TABLE "shuffle_workflows" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "shuffle_workflows" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation_policy ON "shuffle_workflows";
CREATE POLICY tenant_isolation_policy ON "shuffle_workflows"
  USING ("tenant_id" = current_setting('app.current_tenant_id', true)::uuid);
DROP POLICY IF EXISTS bypass_rls ON "shuffle_workflows";
CREATE POLICY bypass_rls ON "shuffle_workflows" FOR ALL TO prisma_migration USING (true);

-- incidents
ALTER TABLE "incidents" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "incidents" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation_policy ON "incidents";
CREATE POLICY tenant_isolation_policy ON "incidents"
  USING ("tenant_id" = current_setting('app.current_tenant_id', true)::uuid);
DROP POLICY IF EXISTS bypass_rls ON "incidents";
CREATE POLICY bypass_rls ON "incidents" FOR ALL TO prisma_migration USING (true);

-- correlation_rules
ALTER TABLE "correlation_rules" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "correlation_rules" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation_policy ON "correlation_rules";
CREATE POLICY tenant_isolation_policy ON "correlation_rules"
  USING ("tenant_id" = current_setting('app.current_tenant_id', true)::uuid);
DROP POLICY IF EXISTS bypass_rls ON "correlation_rules";
CREATE POLICY bypass_rls ON "correlation_rules" FOR ALL TO prisma_migration USING (true);

-- vulnerabilities
ALTER TABLE "vulnerabilities" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "vulnerabilities" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation_policy ON "vulnerabilities";
CREATE POLICY tenant_isolation_policy ON "vulnerabilities"
  USING ("tenant_id" = current_setting('app.current_tenant_id', true)::uuid);
DROP POLICY IF EXISTS bypass_rls ON "vulnerabilities";
CREATE POLICY bypass_rls ON "vulnerabilities" FOR ALL TO prisma_migration USING (true);

-- ai_agents
ALTER TABLE "ai_agents" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ai_agents" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation_policy ON "ai_agents";
CREATE POLICY tenant_isolation_policy ON "ai_agents"
  USING ("tenant_id" = current_setting('app.current_tenant_id', true)::uuid);
DROP POLICY IF EXISTS bypass_rls ON "ai_agents";
CREATE POLICY bypass_rls ON "ai_agents" FOR ALL TO prisma_migration USING (true);

-- ueba_entities
ALTER TABLE "ueba_entities" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ueba_entities" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation_policy ON "ueba_entities";
CREATE POLICY tenant_isolation_policy ON "ueba_entities"
  USING ("tenant_id" = current_setting('app.current_tenant_id', true)::uuid);
DROP POLICY IF EXISTS bypass_rls ON "ueba_entities";
CREATE POLICY bypass_rls ON "ueba_entities" FOR ALL TO prisma_migration USING (true);

-- ueba_anomalies
ALTER TABLE "ueba_anomalies" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ueba_anomalies" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation_policy ON "ueba_anomalies";
CREATE POLICY tenant_isolation_policy ON "ueba_anomalies"
  USING ("tenant_id" = current_setting('app.current_tenant_id', true)::uuid);
DROP POLICY IF EXISTS bypass_rls ON "ueba_anomalies";
CREATE POLICY bypass_rls ON "ueba_anomalies" FOR ALL TO prisma_migration USING (true);

-- ml_models
ALTER TABLE "ml_models" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ml_models" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation_policy ON "ml_models";
CREATE POLICY tenant_isolation_policy ON "ml_models"
  USING ("tenant_id" = current_setting('app.current_tenant_id', true)::uuid);
DROP POLICY IF EXISTS bypass_rls ON "ml_models";
CREATE POLICY bypass_rls ON "ml_models" FOR ALL TO prisma_migration USING (true);

-- attack_paths
ALTER TABLE "attack_paths" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "attack_paths" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation_policy ON "attack_paths";
CREATE POLICY tenant_isolation_policy ON "attack_paths"
  USING ("tenant_id" = current_setting('app.current_tenant_id', true)::uuid);
DROP POLICY IF EXISTS bypass_rls ON "attack_paths";
CREATE POLICY bypass_rls ON "attack_paths" FOR ALL TO prisma_migration USING (true);

-- notifications
ALTER TABLE "notifications" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "notifications" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation_policy ON "notifications";
CREATE POLICY tenant_isolation_policy ON "notifications"
  USING ("tenant_id" = current_setting('app.current_tenant_id', true)::uuid);
DROP POLICY IF EXISTS bypass_rls ON "notifications";
CREATE POLICY bypass_rls ON "notifications" FOR ALL TO prisma_migration USING (true);

-- soar_playbooks
ALTER TABLE "soar_playbooks" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "soar_playbooks" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation_policy ON "soar_playbooks";
CREATE POLICY tenant_isolation_policy ON "soar_playbooks"
  USING ("tenant_id" = current_setting('app.current_tenant_id', true)::uuid);
DROP POLICY IF EXISTS bypass_rls ON "soar_playbooks";
CREATE POLICY bypass_rls ON "soar_playbooks" FOR ALL TO prisma_migration USING (true);

-- soar_executions
ALTER TABLE "soar_executions" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "soar_executions" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation_policy ON "soar_executions";
CREATE POLICY tenant_isolation_policy ON "soar_executions"
  USING ("tenant_id" = current_setting('app.current_tenant_id', true)::uuid);
DROP POLICY IF EXISTS bypass_rls ON "soar_executions";
CREATE POLICY bypass_rls ON "soar_executions" FOR ALL TO prisma_migration USING (true);

-- compliance_frameworks
ALTER TABLE "compliance_frameworks" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "compliance_frameworks" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation_policy ON "compliance_frameworks";
CREATE POLICY tenant_isolation_policy ON "compliance_frameworks"
  USING ("tenant_id" = current_setting('app.current_tenant_id', true)::uuid);
DROP POLICY IF EXISTS bypass_rls ON "compliance_frameworks";
CREATE POLICY bypass_rls ON "compliance_frameworks" FOR ALL TO prisma_migration USING (true);

-- reports
ALTER TABLE "reports" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "reports" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation_policy ON "reports";
CREATE POLICY tenant_isolation_policy ON "reports"
  USING ("tenant_id" = current_setting('app.current_tenant_id', true)::uuid);
DROP POLICY IF EXISTS bypass_rls ON "reports";
CREATE POLICY bypass_rls ON "reports" FOR ALL TO prisma_migration USING (true);

-- system_health_checks
ALTER TABLE "system_health_checks" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "system_health_checks" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation_policy ON "system_health_checks";
CREATE POLICY tenant_isolation_policy ON "system_health_checks"
  USING ("tenant_id" = current_setting('app.current_tenant_id', true)::uuid);
DROP POLICY IF EXISTS bypass_rls ON "system_health_checks";
CREATE POLICY bypass_rls ON "system_health_checks" FOR ALL TO prisma_migration USING (true);

-- system_metrics
ALTER TABLE "system_metrics" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "system_metrics" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation_policy ON "system_metrics";
CREATE POLICY tenant_isolation_policy ON "system_metrics"
  USING ("tenant_id" = current_setting('app.current_tenant_id', true)::uuid);
DROP POLICY IF EXISTS bypass_rls ON "system_metrics";
CREATE POLICY bypass_rls ON "system_metrics" FOR ALL TO prisma_migration USING (true);

-- normalization_pipelines
ALTER TABLE "normalization_pipelines" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "normalization_pipelines" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation_policy ON "normalization_pipelines";
CREATE POLICY tenant_isolation_policy ON "normalization_pipelines"
  USING ("tenant_id" = current_setting('app.current_tenant_id', true)::uuid);
DROP POLICY IF EXISTS bypass_rls ON "normalization_pipelines";
CREATE POLICY bypass_rls ON "normalization_pipelines" FOR ALL TO prisma_migration USING (true);

-- detection_rules
ALTER TABLE "detection_rules" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "detection_rules" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation_policy ON "detection_rules";
CREATE POLICY tenant_isolation_policy ON "detection_rules"
  USING ("tenant_id" = current_setting('app.current_tenant_id', true)::uuid);
DROP POLICY IF EXISTS bypass_rls ON "detection_rules";
CREATE POLICY bypass_rls ON "detection_rules" FOR ALL TO prisma_migration USING (true);

-- cloud_accounts
ALTER TABLE "cloud_accounts" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "cloud_accounts" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation_policy ON "cloud_accounts";
CREATE POLICY tenant_isolation_policy ON "cloud_accounts"
  USING ("tenant_id" = current_setting('app.current_tenant_id', true)::uuid);
DROP POLICY IF EXISTS bypass_rls ON "cloud_accounts";
CREATE POLICY bypass_rls ON "cloud_accounts" FOR ALL TO prisma_migration USING (true);

-- cloud_findings
ALTER TABLE "cloud_findings" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "cloud_findings" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation_policy ON "cloud_findings";
CREATE POLICY tenant_isolation_policy ON "cloud_findings"
  USING ("tenant_id" = current_setting('app.current_tenant_id', true)::uuid);
DROP POLICY IF EXISTS bypass_rls ON "cloud_findings";
CREATE POLICY bypass_rls ON "cloud_findings" FOR ALL TO prisma_migration USING (true);

-- jobs
ALTER TABLE "jobs" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "jobs" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation_policy ON "jobs";
CREATE POLICY tenant_isolation_policy ON "jobs"
  USING ("tenant_id" = current_setting('app.current_tenant_id', true)::uuid);
DROP POLICY IF EXISTS bypass_rls ON "jobs";
CREATE POLICY bypass_rls ON "jobs" FOR ALL TO prisma_migration USING (true);

-- ---------------------------------------------------------------------------
-- 3. Tenant-scoped tables with NULLABLE tenant_id
--    These allow system-level rows (tenant_id IS NULL) to be visible when
--    no tenant context is set (empty string from current_setting).
-- ---------------------------------------------------------------------------

-- permission_definitions (tenant_id nullable — NULL = system-wide defaults)
ALTER TABLE "permission_definitions" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "permission_definitions" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation_policy ON "permission_definitions";
CREATE POLICY tenant_isolation_policy ON "permission_definitions"
  USING (
    "tenant_id" IS NULL
    OR "tenant_id" = current_setting('app.current_tenant_id', true)::uuid
  );
DROP POLICY IF EXISTS bypass_rls ON "permission_definitions";
CREATE POLICY bypass_rls ON "permission_definitions" FOR ALL TO prisma_migration USING (true);

-- application_logs (tenant_id nullable — NULL = system-level logs)
ALTER TABLE "application_logs" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "application_logs" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation_policy ON "application_logs";
CREATE POLICY tenant_isolation_policy ON "application_logs"
  USING (
    "tenant_id" IS NULL
    OR "tenant_id" = current_setting('app.current_tenant_id', true)::uuid
  );
DROP POLICY IF EXISTS bypass_rls ON "application_logs";
CREATE POLICY bypass_rls ON "application_logs" FOR ALL TO prisma_migration USING (true);
