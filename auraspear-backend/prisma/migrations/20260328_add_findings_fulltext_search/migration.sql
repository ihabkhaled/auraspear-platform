-- Enable pg_trgm extension for fuzzy search
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Add full-text search vector column
ALTER TABLE "ai_execution_findings" ADD COLUMN IF NOT EXISTS "search_vector" tsvector;

-- Populate search vector from existing data
UPDATE "ai_execution_findings" SET "search_vector" =
  setweight(to_tsvector('english', COALESCE(title, '')), 'A') ||
  setweight(to_tsvector('english', COALESCE(summary, '')), 'B') ||
  setweight(to_tsvector('english', COALESCE(recommended_action, '')), 'C') ||
  setweight(to_tsvector('english', COALESCE(agent_id, '')), 'D') ||
  setweight(to_tsvector('english', COALESCE(source_module, '')), 'D');

-- Create GIN index for full-text search
CREATE INDEX IF NOT EXISTS "ai_execution_findings_search_vector_idx"
  ON "ai_execution_findings" USING GIN ("search_vector");

-- Create trigram indexes for fuzzy matching on key text fields
CREATE INDEX IF NOT EXISTS "ai_execution_findings_title_trgm_idx"
  ON "ai_execution_findings" USING GIN ("title" gin_trgm_ops);

CREATE INDEX IF NOT EXISTS "ai_execution_findings_summary_trgm_idx"
  ON "ai_execution_findings" USING GIN ("summary" gin_trgm_ops);

-- Add composite indexes for common filter+sort combinations
CREATE INDEX IF NOT EXISTS "ai_execution_findings_tenant_created_desc_idx"
  ON "ai_execution_findings" ("tenant_id", "created_at" DESC);

CREATE INDEX IF NOT EXISTS "ai_execution_findings_tenant_severity_idx"
  ON "ai_execution_findings" ("tenant_id", "severity");

CREATE INDEX IF NOT EXISTS "ai_execution_findings_tenant_status_created_idx"
  ON "ai_execution_findings" ("tenant_id", "status", "created_at" DESC);

-- Create trigger to auto-update search_vector on insert/update
CREATE OR REPLACE FUNCTION ai_findings_search_vector_trigger() RETURNS trigger AS $$
BEGIN
  NEW.search_vector :=
    setweight(to_tsvector('english', COALESCE(NEW.title, '')), 'A') ||
    setweight(to_tsvector('english', COALESCE(NEW.summary, '')), 'B') ||
    setweight(to_tsvector('english', COALESCE(NEW.recommended_action, '')), 'C') ||
    setweight(to_tsvector('english', COALESCE(NEW.agent_id, '')), 'D') ||
    setweight(to_tsvector('english', COALESCE(NEW.source_module, '')), 'D');
  RETURN NEW;
END
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS ai_findings_search_vector_update ON "ai_execution_findings";
CREATE TRIGGER ai_findings_search_vector_update
  BEFORE INSERT OR UPDATE ON "ai_execution_findings"
  FOR EACH ROW EXECUTE FUNCTION ai_findings_search_vector_trigger();
