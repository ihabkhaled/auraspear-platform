-- CreateEnum
CREATE TYPE "UserSessionStatus" AS ENUM ('active', 'revoked', 'expired');

-- CreateEnum
CREATE TYPE "UserSessionOsFamily" AS ENUM (
    'windows',
    'macos',
    'linux',
    'ios',
    'android',
    'ipados',
    'unknown'
);

-- CreateEnum
CREATE TYPE "UserSessionClientType" AS ENUM (
    'desktop',
    'mobile',
    'tablet',
    'web',
    'unknown'
);

-- CreateTable
CREATE TABLE "user_sessions" (
    "id" UUID NOT NULL,
    "family_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "status" "UserSessionStatus" NOT NULL DEFAULT 'active',
    "os_family" "UserSessionOsFamily" NOT NULL DEFAULT 'unknown',
    "client_type" "UserSessionClientType" NOT NULL DEFAULT 'unknown',
    "ip_address" VARCHAR(64),
    "user_agent" VARCHAR(1024),
    "current_access_jti" VARCHAR(64),
    "current_access_expires_at" TIMESTAMP(3),
    "last_seen_at" TIMESTAMP(3) NOT NULL,
    "last_login_at" TIMESTAMP(3) NOT NULL,
    "revoked_at" TIMESTAMP(3),
    "revoked_by_user_id" UUID,
    "revoke_reason" VARCHAR(100),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "user_sessions_family_id_key" ON "user_sessions"("family_id");

-- CreateIndex
CREATE INDEX "user_sessions_tenant_id_status_idx" ON "user_sessions"("tenant_id", "status");

-- CreateIndex
CREATE INDEX "user_sessions_user_id_status_idx" ON "user_sessions"("user_id", "status");

-- CreateIndex
CREATE INDEX "user_sessions_last_seen_at_idx" ON "user_sessions"("last_seen_at");

-- AddForeignKey
ALTER TABLE "user_sessions"
ADD CONSTRAINT "user_sessions_family_id_fkey"
FOREIGN KEY ("family_id") REFERENCES "refresh_token_families"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_sessions"
ADD CONSTRAINT "user_sessions_user_id_fkey"
FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_sessions"
ADD CONSTRAINT "user_sessions_tenant_id_fkey"
FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
