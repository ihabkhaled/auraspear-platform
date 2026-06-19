-- 1. Create global users table (distinct on email from tenant_users)
CREATE TABLE "users" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "email" VARCHAR(320) NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "password_hash" VARCHAR(255),
    "oidc_sub" VARCHAR(255),
    "mfa_enabled" BOOLEAN NOT NULL DEFAULT false,
    "is_protected" BOOLEAN NOT NULL DEFAULT false,
    "last_login_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "users_email_key" ON "users"("email");
CREATE UNIQUE INDEX "users_oidc_sub_key" ON "users"("oidc_sub");

-- 2. Populate users from tenant_users (distinct on email, preserve isProtected if ANY row has it)
INSERT INTO "users" ("id", "email", "name", "password_hash", "oidc_sub", "mfa_enabled", "is_protected", "last_login_at", "created_at", "updated_at")
SELECT DISTINCT ON (tu.email)
    gen_random_uuid(),
    tu.email,
    tu.name,
    tu.password_hash,
    tu.oidc_sub,
    tu.mfa_enabled,
    (SELECT bool_or(t2.is_protected) FROM tenant_users t2 WHERE t2.email = tu.email),
    tu.last_login_at,
    tu.created_at,
    tu.updated_at
FROM tenant_users tu
ORDER BY tu.email, tu.created_at ASC;

-- 3. Create tenant_memberships table
CREATE TABLE "tenant_memberships" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "role" "UserRole" NOT NULL DEFAULT 'SOC_ANALYST_L1',
    "status" "UserStatus" NOT NULL DEFAULT 'active',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "tenant_memberships_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "tenant_memberships_user_id_tenant_id_key" ON "tenant_memberships"("user_id", "tenant_id");
CREATE INDEX "tenant_memberships_tenant_id_idx" ON "tenant_memberships"("tenant_id");
CREATE INDEX "tenant_memberships_user_id_idx" ON "tenant_memberships"("user_id");

-- 4. Populate tenant_memberships from tenant_users (one row per original row, mapping user_id via email join)
INSERT INTO "tenant_memberships" ("id", "user_id", "tenant_id", "role", "status", "created_at", "updated_at")
SELECT
    gen_random_uuid(),
    u.id,
    tu.tenant_id,
    tu.role,
    tu.status,
    tu.created_at,
    tu.updated_at
FROM tenant_users tu
JOIN users u ON u.email = tu.email;

-- 5. Drop old foreign key constraints BEFORE updating IDs (otherwise the old FK rejects new UUIDs)
ALTER TABLE "user_preferences" DROP CONSTRAINT IF EXISTS "user_preferences_user_id_fkey";

-- 6. Update cases.owner_user_id to point to users.id (join via old tenant_users email)
UPDATE cases SET owner_user_id = u.id
FROM tenant_users tu
JOIN users u ON u.email = tu.email
WHERE cases.owner_user_id = tu.id;

-- 7. Update user_preferences.user_id to point to users.id
UPDATE user_preferences SET user_id = u.id
FROM tenant_users tu
JOIN users u ON u.email = tu.email
WHERE user_preferences.user_id = tu.id;

-- 8. Drop old tenant_users table
DROP TABLE "tenant_users";

-- 9. Add foreign keys for new tables
ALTER TABLE "tenant_memberships" ADD CONSTRAINT "tenant_memberships_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "tenant_memberships" ADD CONSTRAINT "tenant_memberships_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "user_preferences" ADD CONSTRAINT "user_preferences_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
