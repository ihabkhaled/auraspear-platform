import { Injectable, Logger, Inject, forwardRef } from '@nestjs/common'
import { CONFIGURABLE_ROLES } from './constants/default-permissions'
import { PERMISSION_DEFINITIONS } from './constants/permission-definitions'
import { ROLE_SETTINGS_MODULE } from './constants/role-settings.constants'
import { PermissionCacheService } from './permission-cache.service'
import { RoleSettingsRepository } from './role-settings.repository'
import {
  assertNoEscalation,
  assertProtectedRoleSettingsPermissionsUnchanged,
  assertResetAllowed,
  assertUsersControlPermissionsRestrictedToAllowedRoles,
  buildDefaultAllowedPermissionEntries,
  buildPermissionMatrixEntries,
  buildPermissionMatrixFromRecords,
  buildSeedPermissionEntries,
  getImpactedRoles,
} from './role-settings.utilities'
import { ALL_PERMISSIONS, Permission, AppLogFeature } from '../../common/enums'
import { UserRole as UserRoleEnum } from '../../common/interfaces/authenticated-request.interface'
import { AppLoggerService } from '../../common/services/app-logger.service'
import { ServiceLogger } from '../../common/services/service-logger'
import { PermissionUpdateReason } from '../notifications/notifications.enums'
import { NotificationsService } from '../notifications/notifications.service'
import { USERS_CONTROL_PERMISSION_KEYS } from '../users-control/users-control.constants'
import type { UserRole } from '@prisma/client'

@Injectable()
export class RoleSettingsService {
  private readonly logger = new Logger(RoleSettingsService.name)
  private readonly log: ServiceLogger

  constructor(
    private readonly repository: RoleSettingsRepository,
    private readonly cache: PermissionCacheService,
    private readonly appLogger: AppLoggerService,
    @Inject(forwardRef(() => NotificationsService))
    private readonly notificationsService: NotificationsService
  ) {
    this.log = new ServiceLogger(this.appLogger, AppLogFeature.ROLE_SETTINGS, 'RoleSettingsService')
  }

  private async emitRoleMatrixPermissionChanges(
    tenantId: string,
    impactedRoles: UserRole[]
  ): Promise<void> {
    if (impactedRoles.length === 0) {
      return
    }

    const userIds = await this.repository.findActiveUserIdsByRoles(tenantId, impactedRoles)
    this.notificationsService.emitPermissionsUpdatedToUsers(
      tenantId,
      userIds,
      PermissionUpdateReason.ROLE_MATRIX_UPDATED
    )
  }

  private async ensurePermissionDefinitionsInitialized(): Promise<void> {
    const definitionChecks = await Promise.all(
      USERS_CONTROL_PERMISSION_KEYS.map(permissionKey =>
        this.repository.hasPermissionDefinition(null, permissionKey)
      )
    )

    if (definitionChecks.every(Boolean)) {
      return
    }

    await this.seedPermissionDefinitions()
  }

  private async ensureTenantDefaultPermissionsInitialized(tenantId: string): Promise<void> {
    const permissionChecks = await Promise.all(
      USERS_CONTROL_PERMISSION_KEYS.map(permissionKey =>
        this.repository.hasPermissionByTenantAndRole(
          tenantId,
          UserRoleEnum.TENANT_ADMIN as UserRole,
          permissionKey
        )
      )
    )

    if (permissionChecks.every(Boolean)) {
      return
    }

    await this.repository.bulkCreatePermissions(tenantId, buildDefaultAllowedPermissionEntries())
    this.cache.invalidate(tenantId)
  }

  /* ---------------------------------------------------------------- */
  /* GET CONFIGURABLE ROLES                                            */
  /* ---------------------------------------------------------------- */

  getConfigurableRoles(): string[] {
    this.log.success('getConfigurableRoles', 'system')
    return [...CONFIGURABLE_ROLES]
  }

  /* ---------------------------------------------------------------- */
  /* GET PERMISSION MATRIX                                             */
  /* ---------------------------------------------------------------- */

  async getPermissionMatrix(tenantId: string): Promise<Record<string, string[]>> {
    this.log.entry('getPermissionMatrix', tenantId)

    await this.ensureTenantDefaultPermissionsInitialized(tenantId)
    const records = await this.repository.findPermissionsByTenant(tenantId)

    this.log.success('getPermissionMatrix', tenantId, { recordCount: records.length })

    return buildPermissionMatrixFromRecords(records)
  }

  /* ---------------------------------------------------------------- */
  /* UPDATE PERMISSION MATRIX                                          */
  /* ---------------------------------------------------------------- */

  async updatePermissionMatrix(
    tenantId: string,
    matrix: Record<string, string[]>,
    actorEmail: string,
    actorUserId: string,
    actorRole: string
  ): Promise<Record<string, string[]>> {
    const currentMatrix = await this.getPermissionMatrix(tenantId)
    assertProtectedRoleSettingsPermissionsUnchanged(currentMatrix, matrix, actorRole)
    assertUsersControlPermissionsRestrictedToAllowedRoles(matrix)
    await this.validateNoEscalation(tenantId, matrix, actorRole)

    const entries = buildPermissionMatrixEntries(matrix)
    await this.repository.bulkUpsertPermissions(tenantId, entries)
    this.cache.invalidate(tenantId)
    await this.emitRoleMatrixPermissionChanges(tenantId, getImpactedRoles(currentMatrix, matrix))

    this.log.success('updatePermissionMatrix', tenantId, { actorEmail, actorUserId })

    return this.getPermissionMatrix(tenantId)
  }

  private async validateNoEscalation(
    tenantId: string,
    matrix: Record<string, string[]>,
    actorRole: string
  ): Promise<void> {
    if (actorRole === UserRoleEnum.GLOBAL_ADMIN) {
      return
    }

    const actorPermissions = await this.getUserPermissions(tenantId, actorRole)
    assertNoEscalation(matrix, actorPermissions)
  }

  /* ---------------------------------------------------------------- */
  /* RESET TO DEFAULTS                                                 */
  /* ---------------------------------------------------------------- */

  async resetToDefaults(
    tenantId: string,
    actorEmail: string,
    actorUserId: string,
    actorRole: string
  ): Promise<Record<string, string[]>> {
    assertResetAllowed(actorRole)
    await this.repository.deleteAllByTenant(tenantId)
    await this.seedDefaultsForTenant(tenantId)
    this.cache.invalidate(tenantId)
    await this.emitRoleMatrixPermissionChanges(tenantId, CONFIGURABLE_ROLES as UserRole[])

    this.log.success('resetToDefaults', tenantId, { actorEmail, actorUserId })

    return this.getPermissionMatrix(tenantId)
  }

  /* ---------------------------------------------------------------- */
  /* GET USER PERMISSIONS (used by PermissionsGuard + auth response)    */
  /* ---------------------------------------------------------------- */

  async getUserPermissions(tenantId: string, role: string): Promise<string[]> {
    if (role === UserRoleEnum.GLOBAL_ADMIN) {
      return ALL_PERMISSIONS
    }

    const cached = this.cache.get(tenantId, role)
    if (cached) {
      this.log.success('getUserPermissions', tenantId, {
        role,
        source: 'cache',
        permissionCount: cached.size,
      })
      return [...cached]
    }

    const records = await this.repository.findPermissionsByTenantAndRole(tenantId, role as UserRole)
    const permissions = records.map(r => r.permissionKey)
    this.cache.set(tenantId, role, new Set(permissions))

    this.log.success('getUserPermissions', tenantId, {
      role,
      source: 'database',
      permissionCount: permissions.length,
    })

    return permissions
  }

  /* ---------------------------------------------------------------- */
  /* HAS PERMISSION (used by PermissionsGuard)                         */
  /* ---------------------------------------------------------------- */

  async hasPermission(tenantId: string, role: string, permission: Permission): Promise<boolean> {
    if (role === UserRoleEnum.GLOBAL_ADMIN) {
      return true
    }

    const userPermissions = await this.getUserPermissions(tenantId, role)
    const hasIt = userPermissions.includes(permission)

    this.log.success('hasPermission', tenantId, { role, permission, result: hasIt })

    return hasIt
  }

  /* ---------------------------------------------------------------- */
  /* SEED DEFAULTS                                                     */
  /* ---------------------------------------------------------------- */

  async seedDefaultsForTenant(tenantId: string): Promise<void> {
    this.log.entry('seedDefaultsForTenant', tenantId)

    const entries = buildSeedPermissionEntries()
    await this.repository.bulkUpsertPermissions(tenantId, entries)

    this.log.success('seedDefaultsForTenant', tenantId, { entryCount: entries.length })
  }

  async seedAllTenants(): Promise<void> {
    this.log.entry('seedAllTenants', 'system')

    const tenantIds = await this.repository.findAllTenantIds()

    const seedPromises = tenantIds.map(async tenantId => {
      await this.ensureTenantDefaultPermissionsInitialized(tenantId)
    })
    await Promise.all(seedPromises)

    this.log.success('seedAllTenants', 'system', { tenantCount: tenantIds.length })
  }

  /* ---------------------------------------------------------------- */
  /* PERMISSION DEFINITIONS (dynamic from DB)                          */
  /* ---------------------------------------------------------------- */

  async getPermissionDefinitions(
    tenantId: string,
    actorRole?: string
  ): Promise<Array<{ key: string; module: string; labelKey: string; sortOrder: number }>> {
    this.log.entry('getPermissionDefinitions', tenantId, { actorRole })

    await this.ensurePermissionDefinitionsInitialized()
    const definitions = await this.repository.findPermissionDefinitions(tenantId)

    if (actorRole === UserRoleEnum.TENANT_ADMIN) {
      const filtered = definitions.filter(definition => definition.module !== ROLE_SETTINGS_MODULE)
      this.log.success('getPermissionDefinitions', tenantId, {
        definitionCount: filtered.length,
        actorRole,
      })
      return filtered
    }

    this.log.success('getPermissionDefinitions', tenantId, {
      definitionCount: definitions.length,
      actorRole,
    })

    return definitions
  }

  async seedPermissionDefinitions(): Promise<void> {
    this.log.entry('seedPermissionDefinitions', 'system')

    const upsertPromises = PERMISSION_DEFINITIONS.map(definition =>
      this.repository.upsertPermissionDefinition(
        null,
        definition.key,
        definition.module,
        definition.labelKey,
        definition.sortOrder
      )
    )
    await Promise.all(upsertPromises)

    this.log.success('seedPermissionDefinitions', 'system', {
      definitionCount: PERMISSION_DEFINITIONS.length,
    })
  }
}
