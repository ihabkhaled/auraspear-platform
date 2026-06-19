import type { PermissionDefinition, PermissionGroup } from '@/types'

/**
 * Build permission groups from the DB-backed permission definitions.
 * Groups by `module`, preserving sortOrder within each group.
 * Returns empty array if definitions is undefined/null.
 */
export function buildPermissionGroups(
  definitions: PermissionDefinition[] | undefined | null
): PermissionGroup[] {
  if (!definitions) return []

  const groupMap = new Map<string, PermissionGroup>()

  for (const def of definitions) {
    let group = groupMap.get(def.module)
    if (!group) {
      group = {
        key: def.module,
        labelKey: `roleSettings.modules.${def.module}`,
        permissions: [],
      }
      groupMap.set(def.module, group)
    }
    group.permissions.push(def.key)
  }

  return [...groupMap.values()]
}

/**
 * Build a map from permission key to its i18n labelKey from DB definitions.
 * Returns empty record if definitions is undefined/null.
 */
export function buildPermissionLabelMap(
  definitions: PermissionDefinition[] | undefined | null
): Record<string, string> {
  if (!definitions) return {}

  const map: Record<string, string> = {}
  for (const def of definitions) {
    Reflect.set(map, def.key, def.labelKey)
  }
  return map
}
