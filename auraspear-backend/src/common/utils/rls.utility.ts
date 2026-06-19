import { type PrismaClient } from '@prisma/client'

/**
 * Sets the `app.current_tenant_id` session variable so PostgreSQL
 * Row-Level Security policies restrict all subsequent queries in the
 * same transaction / connection to the given tenant.
 *
 * The third argument to `set_config` is `true` (local), meaning the
 * setting is scoped to the current transaction.
 */
export async function setTenantContext(prisma: PrismaClient, tenantId: string): Promise<void> {
  await prisma.$executeRawUnsafe("SELECT set_config('app.current_tenant_id', $1, true)", tenantId)
}

/**
 * Clears the `app.current_tenant_id` session variable.
 * After this call, RLS policies that compare against the setting will
 * see an empty string, effectively hiding all tenant-scoped rows.
 */
export async function clearTenantContext(prisma: PrismaClient): Promise<void> {
  await prisma.$executeRawUnsafe("SELECT set_config('app.current_tenant_id', '', true)")
}
