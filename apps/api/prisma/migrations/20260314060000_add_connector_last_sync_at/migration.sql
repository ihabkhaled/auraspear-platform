-- AlterTable
ALTER TABLE "connector_configs" ADD COLUMN IF NOT EXISTS "last_error" TEXT;
ALTER TABLE "connector_configs" ADD COLUMN IF NOT EXISTS "last_sync_at" TIMESTAMP(3);
ALTER TABLE "connector_configs" ADD COLUMN IF NOT EXISTS "sync_enabled" BOOLEAN NOT NULL DEFAULT true;
