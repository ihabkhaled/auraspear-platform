-- CreateTable
CREATE TABLE "permission_definitions" (
    "id" UUID NOT NULL,
    "tenant_id" UUID,
    "key" VARCHAR(100) NOT NULL,
    "module" VARCHAR(50) NOT NULL,
    "label_key" VARCHAR(150) NOT NULL,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "permission_definitions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "role_permissions" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "role" "UserRole" NOT NULL,
    "permission_key" VARCHAR(100) NOT NULL,
    "allowed" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "role_permissions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "permission_definitions_tenant_id_idx" ON "permission_definitions"("tenant_id");

-- CreateIndex
CREATE INDEX "permission_definitions_module_idx" ON "permission_definitions"("module");

-- CreateIndex
CREATE UNIQUE INDEX "permission_definitions_tenant_id_key_key" ON "permission_definitions"("tenant_id", "key");

-- CreateIndex
CREATE INDEX "role_permissions_tenant_id_role_idx" ON "role_permissions"("tenant_id", "role");

-- CreateIndex
CREATE UNIQUE INDEX "role_permissions_tenant_id_role_permission_key_key" ON "role_permissions"("tenant_id", "role", "permission_key");

-- AddForeignKey
ALTER TABLE "permission_definitions" ADD CONSTRAINT "permission_definitions_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "role_permissions" ADD CONSTRAINT "role_permissions_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
