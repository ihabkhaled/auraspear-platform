import { ALL_PERMISSIONS } from '../../src/common/enums/permission.enum'
import {
  PERMISSION_DEFINITIONS,
  type PermissionDefinitionSeed,
} from '../../src/modules/role-settings/constants/permission-definitions'

describe('Permission Definitions', () => {
  /* ---------------------------------------------------------------- */
  /* Every enum value has a definition entry                            */
  /* ---------------------------------------------------------------- */

  it('should have a definition for every Permission enum value', () => {
    const definedKeys = new Set(PERMISSION_DEFINITIONS.map(d => d.key))

    for (const permission of ALL_PERMISSIONS) {
      expect(definedKeys.has(permission)).toBe(true)
    }
  })

  it('should not define entries for keys that are not in the Permission enum', () => {
    const allPermissionValues = new Set<string>(ALL_PERMISSIONS)

    for (const definition of PERMISSION_DEFINITIONS) {
      expect(allPermissionValues.has(definition.key)).toBe(true)
    }
  })

  it('should have the same count as ALL_PERMISSIONS', () => {
    expect(PERMISSION_DEFINITIONS).toHaveLength(ALL_PERMISSIONS.length)
  })

  /* ---------------------------------------------------------------- */
  /* Sort orders are unique                                             */
  /* ---------------------------------------------------------------- */

  it('should have unique sortOrder values across all definitions', () => {
    const sortOrders = PERMISSION_DEFINITIONS.map(d => d.sortOrder)
    const uniqueSortOrders = new Set(sortOrders)

    expect(uniqueSortOrders.size).toBe(sortOrders.length)
  })

  /* ---------------------------------------------------------------- */
  /* Sort orders are positive integers                                  */
  /* ---------------------------------------------------------------- */

  it('should have positive integer sortOrder values', () => {
    for (const definition of PERMISSION_DEFINITIONS) {
      expect(Number.isInteger(definition.sortOrder)).toBe(true)
      expect(definition.sortOrder).toBeGreaterThan(0)
    }
  })

  /* ---------------------------------------------------------------- */
  /* Module groupings are correct                                       */
  /* ---------------------------------------------------------------- */

  it('should group alerts permissions under the alerts module', () => {
    const alertDefs = PERMISSION_DEFINITIONS.filter(d => d.key.startsWith('alerts.'))
    expect(alertDefs.length).toBeGreaterThan(0)
    for (const definition of alertDefs) {
      expect(definition.module).toBe('alerts')
    }
  })

  it('should group cases permissions under the cases module', () => {
    const caseDefs = PERMISSION_DEFINITIONS.filter(d => d.key.startsWith('cases.'))
    expect(caseDefs.length).toBeGreaterThan(0)
    for (const definition of caseDefs) {
      expect(definition.module).toBe('cases')
    }
  })

  it('should group incidents permissions under the incidents module', () => {
    const incidentDefs = PERMISSION_DEFINITIONS.filter(d => d.key.startsWith('incidents.'))
    expect(incidentDefs.length).toBeGreaterThan(0)
    for (const definition of incidentDefs) {
      expect(definition.module).toBe('incidents')
    }
  })

  it('should group admin.users permissions under the adminUsers module', () => {
    const adminUserDefs = PERMISSION_DEFINITIONS.filter(d => d.key.startsWith('admin.users.'))
    expect(adminUserDefs.length).toBeGreaterThan(0)
    for (const definition of adminUserDefs) {
      expect(definition.module).toBe('adminUsers')
    }
  })

  it('should group admin.tenants permissions under the adminTenants module', () => {
    const adminTenantDefs = PERMISSION_DEFINITIONS.filter(d => d.key.startsWith('admin.tenants.'))
    expect(adminTenantDefs.length).toBeGreaterThan(0)
    for (const definition of adminTenantDefs) {
      expect(definition.module).toBe('adminTenants')
    }
  })

  it('should group dashboard permissions under the dashboard module', () => {
    const dashDefs = PERMISSION_DEFINITIONS.filter(d => d.key.startsWith('dashboard.'))
    expect(dashDefs.length).toBeGreaterThan(0)
    for (const definition of dashDefs) {
      expect(definition.module).toBe('dashboard')
    }
  })

  it('should group hunt permissions under the hunt module', () => {
    const huntDefs = PERMISSION_DEFINITIONS.filter(d => d.key.startsWith('hunt.'))
    expect(huntDefs.length).toBeGreaterThan(0)
    for (const definition of huntDefs) {
      expect(definition.module).toBe('hunt')
    }
  })

  it('should group users control permissions under the usersControl module', () => {
    const usersControlDefs = PERMISSION_DEFINITIONS.filter(d => d.key.startsWith('usersControl.'))
    expect(usersControlDefs.length).toBeGreaterThan(0)
    for (const definition of usersControlDefs) {
      expect(definition.module).toBe('usersControl')
    }
  })

  /* ---------------------------------------------------------------- */
  /* Every definition has valid fields                                  */
  /* ---------------------------------------------------------------- */

  it('should have non-empty key, module, and labelKey for every definition', () => {
    for (const definition of PERMISSION_DEFINITIONS) {
      expect(definition.key.length).toBeGreaterThan(0)
      expect(definition.module.length).toBeGreaterThan(0)
      expect(definition.labelKey.length).toBeGreaterThan(0)
    }
  })

  it('should have labelKey starting with roleSettings.permissions.', () => {
    for (const definition of PERMISSION_DEFINITIONS) {
      expect(definition.labelKey).toMatch(/^roleSettings\.permissions\./)
    }
  })

  /* ---------------------------------------------------------------- */
  /* Sort orders are ordered within modules                             */
  /* ---------------------------------------------------------------- */

  it('should have sortOrder increasing within each module', () => {
    const byModule = new Map<string, PermissionDefinitionSeed[]>()

    for (const definition of PERMISSION_DEFINITIONS) {
      const existing = byModule.get(definition.module) ?? []
      existing.push(definition)
      byModule.set(definition.module, existing)
    }

    for (const [, defs] of byModule) {
      for (let index = 1; index < defs.length; index++) {
        expect(defs[index]!.sortOrder).toBeGreaterThan(defs[index - 1]!.sortOrder)
      }
    }
  })
})
