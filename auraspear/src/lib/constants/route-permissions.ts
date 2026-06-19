import { Permission } from '@/enums'
import { USERS_CONTROL_ROUTE } from '@/lib/constants/users-control'

/**
 * Maps route path prefixes to the permission required to access them.
 * Routes not listed here are accessible to all authenticated users.
 *
 * The guard checks each entry with `pathname.startsWith(route)`,
 * so `/alerts` also covers `/alerts/123`.
 */
export const ROUTE_PERMISSION_MAP: ReadonlyArray<readonly [string, Permission]> = [
  ['/admin/system', Permission.ADMIN_TENANTS_VIEW],
  ['/admin/tenant', Permission.ADMIN_USERS_VIEW],
  ['/admin/role-settings', Permission.ROLE_SETTINGS_VIEW],
  [USERS_CONTROL_ROUTE, Permission.USERS_CONTROL_VIEW],
  ['/alerts', Permission.ALERTS_VIEW],
  ['/attack-paths', Permission.ATTACK_PATHS_VIEW],
  ['/ai-agents', Permission.AI_AGENTS_VIEW],
  ['/ai-chat', Permission.AI_CHAT_ACCESS],
  ['/ai-eval', Permission.AI_EVAL_VIEW],
  ['/ai-search', Permission.AI_OPS_VIEW],
  ['/ai-agent-graph', Permission.AI_AGENTS_VIEW],
  ['/ai-simulations', Permission.AI_SIMULATION_VIEW],
  ['/ai-config', Permission.AI_CONFIG_VIEW],
  ['/ai-findings', Permission.AI_AGENTS_VIEW],
  ['/ai-ops', Permission.AI_OPS_VIEW],
  ['/ai-handoffs', Permission.AI_HANDOFF_PROMOTE],
  ['/ai-finops', Permission.AI_FINOPS_VIEW],
  ['/ai-memory', Permission.AI_MEMORY_ADMIN],
  ['/ai-rag', Permission.AI_MEMORY_VIEW],
  ['/ai-transcripts', Permission.AI_TRANSCRIPT_VIEW],
  ['/ai-history', Permission.AI_AGENTS_VIEW],
  ['/cases', Permission.CASES_VIEW],
  ['/cloud-security', Permission.CLOUD_SECURITY_VIEW],
  ['/compliance', Permission.COMPLIANCE_VIEW],
  ['/connectors', Permission.CONNECTORS_VIEW],
  ['/correlation', Permission.CORRELATION_VIEW],
  ['/dashboard/mssp', Permission.MSSP_DASHBOARD_VIEW],
  ['/dashboard', Permission.DASHBOARD_VIEW],
  ['/detection-rules', Permission.DETECTION_RULES_VIEW],
  ['/entities', Permission.ENTITIES_VIEW],
  ['/explorer', Permission.EXPLORER_VIEW],
  ['/hunt', Permission.HUNT_VIEW],
  ['/knowledge', Permission.RUNBOOKS_VIEW],
  ['/incidents', Permission.INCIDENTS_VIEW],
  ['/intel', Permission.INTEL_VIEW],
  ['/jobs', Permission.JOBS_VIEW],
  ['/normalization', Permission.NORMALIZATION_VIEW],
  ['/profile', Permission.PROFILE_VIEW],
  ['/reports', Permission.REPORTS_VIEW],
  ['/settings', Permission.SETTINGS_VIEW],
  ['/soar', Permission.SOAR_VIEW],
  ['/system-health', Permission.SYSTEM_HEALTH_VIEW],
  ['/ueba', Permission.UEBA_VIEW],
  ['/vulnerabilities', Permission.VULNERABILITIES_VIEW],
] as const
