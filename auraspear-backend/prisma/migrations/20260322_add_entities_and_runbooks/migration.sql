-- CreateTable: Runbooks
CREATE TABLE IF NOT EXISTS "runbooks" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "title" VARCHAR(500) NOT NULL,
    "content" TEXT NOT NULL,
    "category" VARCHAR(100) NOT NULL DEFAULT 'general',
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "created_by" VARCHAR(320) NOT NULL,
    "updated_by" VARCHAR(320),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "runbooks_pkey" PRIMARY KEY ("id")
);

-- CreateTable: Entities
CREATE TABLE IF NOT EXISTS "entities" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "type" VARCHAR(50) NOT NULL,
    "value" VARCHAR(1000) NOT NULL,
    "display_name" VARCHAR(500),
    "first_seen" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "last_seen" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "risk_score" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "metadata" JSONB DEFAULT '{}',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "entities_pkey" PRIMARY KEY ("id")
);

-- CreateTable: Entity Relations
CREATE TABLE IF NOT EXISTS "entity_relations" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "from_entity_id" UUID NOT NULL,
    "to_entity_id" UUID NOT NULL,
    "relation_type" VARCHAR(100) NOT NULL,
    "confidence" DOUBLE PRECISION NOT NULL DEFAULT 1.0,
    "source" VARCHAR(255),
    "metadata" JSONB DEFAULT '{}',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "entity_relations_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "runbooks_tenant_id_idx" ON "runbooks"("tenant_id");
CREATE INDEX IF NOT EXISTS "runbooks_tenant_id_category_idx" ON "runbooks"("tenant_id", "category");

CREATE INDEX IF NOT EXISTS "entities_tenant_id_idx" ON "entities"("tenant_id");
CREATE INDEX IF NOT EXISTS "entities_tenant_id_type_idx" ON "entities"("tenant_id", "type");
CREATE INDEX IF NOT EXISTS "entities_tenant_id_risk_score_idx" ON "entities"("tenant_id", "risk_score");
CREATE UNIQUE INDEX IF NOT EXISTS "entities_tenant_id_type_value_key" ON "entities"("tenant_id", "type", "value");

CREATE INDEX IF NOT EXISTS "entity_relations_tenant_id_idx" ON "entity_relations"("tenant_id");
CREATE INDEX IF NOT EXISTS "entity_relations_from_entity_id_idx" ON "entity_relations"("from_entity_id");
CREATE INDEX IF NOT EXISTS "entity_relations_to_entity_id_idx" ON "entity_relations"("to_entity_id");
CREATE INDEX IF NOT EXISTS "entity_relations_tenant_id_relation_type_idx" ON "entity_relations"("tenant_id", "relation_type");

-- AddForeignKey
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'runbooks_tenant_id_fkey') THEN
    ALTER TABLE "runbooks" ADD CONSTRAINT "runbooks_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'entities_tenant_id_fkey') THEN
    ALTER TABLE "entities" ADD CONSTRAINT "entities_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'entity_relations_tenant_id_fkey') THEN
    ALTER TABLE "entity_relations" ADD CONSTRAINT "entity_relations_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'entity_relations_from_entity_id_fkey') THEN
    ALTER TABLE "entity_relations" ADD CONSTRAINT "entity_relations_from_entity_id_fkey" FOREIGN KEY ("from_entity_id") REFERENCES "entities"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'entity_relations_to_entity_id_fkey') THEN
    ALTER TABLE "entity_relations" ADD CONSTRAINT "entity_relations_to_entity_id_fkey" FOREIGN KEY ("to_entity_id") REFERENCES "entities"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;
