-- Create user_memories table for cross-chat long-term memory
CREATE TABLE "user_memories" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "content" TEXT NOT NULL,
    "category" VARCHAR(50) NOT NULL DEFAULT 'fact',
    "embedding" DOUBLE PRECISION[] DEFAULT '{}',
    "source_type" VARCHAR(50) NOT NULL,
    "source_id" UUID,
    "source_label" VARCHAR(255),
    "is_deleted" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "user_memories_pkey" PRIMARY KEY ("id")
);

-- Indexes
CREATE INDEX "user_memories_tenant_id_user_id_idx" ON "user_memories"("tenant_id", "user_id");
CREATE INDEX "user_memories_tenant_id_user_id_is_deleted_idx" ON "user_memories"("tenant_id", "user_id", "is_deleted");
CREATE INDEX "user_memories_tenant_id_user_id_updated_at_idx" ON "user_memories"("tenant_id", "user_id", "updated_at" DESC);

-- Foreign keys
ALTER TABLE "user_memories" ADD CONSTRAINT "user_memories_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "user_memories" ADD CONSTRAINT "user_memories_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Add memory_extraction to JobType enum
ALTER TYPE "JobType" ADD VALUE IF NOT EXISTS 'memory_extraction';
