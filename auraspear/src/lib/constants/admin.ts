import { UserRole } from '@/enums'

export const ALL_LEVELS = 'all'
export const ALL_FEATURES = 'all'

/** Interval (ms) for polling /auth/me to sync permissions. */
export const PERMISSION_SYNC_INTERVAL = 60_000

/** CSS class strings for role badge styling, keyed by UserRole. */
export const ROLE_BADGE_CLASS_MAP: Readonly<Record<string, string>> = {
  [UserRole.GLOBAL_ADMIN]: 'bg-primary/10 text-primary border-primary/20',
  [UserRole.TENANT_ADMIN]: 'bg-primary/10 text-primary border-primary/20',
  [UserRole.SOC_ANALYST_L2]:
    'bg-[var(--chart-1)]/10 text-[var(--chart-1)] border-[var(--chart-1)]/20',
  [UserRole.SOC_ANALYST_L1]:
    'bg-[var(--chart-1)]/10 text-[var(--chart-1)] border-[var(--chart-1)]/20',
  [UserRole.THREAT_HUNTER]:
    'bg-[var(--chart-3)]/10 text-[var(--chart-3)] border-[var(--chart-3)]/20',
}
