-- CreateEnum
CREATE TYPE "RefreshTokenFamilyStatus" AS ENUM ('active', 'revoked', 'expired');

-- CreateEnum
CREATE TYPE "RefreshTokenRotationStatus" AS ENUM ('active', 'used', 'revoked', 'replayed');

-- CreateTable
CREATE TABLE "refresh_token_families" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "current_generation" INTEGER NOT NULL DEFAULT 0,
    "status" "RefreshTokenFamilyStatus" NOT NULL DEFAULT 'active',
    "revoked_at" TIMESTAMP(3),
    "revoked_reason" VARCHAR(100),
    "expires_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "refresh_token_families_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "refresh_token_rotations" (
    "id" UUID NOT NULL,
    "family_id" UUID NOT NULL,
    "generation" INTEGER NOT NULL,
    "jti_hash" VARCHAR(64) NOT NULL,
    "parent_rotation_id" UUID,
    "status" "RefreshTokenRotationStatus" NOT NULL DEFAULT 'active',
    "issued_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "used_at" TIMESTAMP(3),
    "replaced_at" TIMESTAMP(3),
    "replayed_at" TIMESTAMP(3),
    "expires_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "refresh_token_rotations_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "refresh_token_families_tenant_id_status_idx" ON "refresh_token_families"("tenant_id", "status");

-- CreateIndex
CREATE INDEX "refresh_token_families_user_id_status_idx" ON "refresh_token_families"("user_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX "refresh_token_rotations_jti_hash_key" ON "refresh_token_rotations"("jti_hash");

-- CreateIndex
CREATE UNIQUE INDEX "refresh_token_rotations_family_id_generation_key" ON "refresh_token_rotations"("family_id", "generation");

-- CreateIndex
CREATE INDEX "refresh_token_rotations_family_id_status_idx" ON "refresh_token_rotations"("family_id", "status");

-- AddForeignKey
ALTER TABLE "refresh_token_families"
ADD CONSTRAINT "refresh_token_families_user_id_fkey"
FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "refresh_token_families"
ADD CONSTRAINT "refresh_token_families_tenant_id_fkey"
FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "refresh_token_rotations"
ADD CONSTRAINT "refresh_token_rotations_family_id_fkey"
FOREIGN KEY ("family_id") REFERENCES "refresh_token_families"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "refresh_token_rotations"
ADD CONSTRAINT "refresh_token_rotations_parent_rotation_id_fkey"
FOREIGN KEY ("parent_rotation_id") REFERENCES "refresh_token_rotations"("id") ON DELETE SET NULL ON UPDATE CASCADE;
