-- PERF-02: Add status-leading indexes to support cross-tenant active-rule scheduler scans.
-- The scheduler queries detectionRule.findMany({ where: { status: 'active' } }) and
-- correlationRule.findMany({ where: { status: 'active' } }) without a tenantId filter.
-- The existing @@index([tenantId, status]) cannot serve these queries efficiently because
-- the leading column is tenantId, not status. Adding @@index([status, tenantId]) allows
-- the status-only scan to use the index and also serves future tenant-aware paging.

-- CreateIndex
CREATE INDEX "correlation_rules_status_tenant_id_idx" ON "correlation_rules"("status", "tenant_id");

-- CreateIndex
CREATE INDEX "detection_rules_status_tenant_id_idx" ON "detection_rules"("status", "tenant_id");
