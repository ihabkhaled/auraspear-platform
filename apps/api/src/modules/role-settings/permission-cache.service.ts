import { Injectable } from '@nestjs/common'
import { CACHE_TTL_MS } from './role-settings.constants'
import { AppLogFeature } from '../../common/enums'
import { AppLoggerService } from '../../common/services/app-logger.service'
import { ServiceLogger } from '../../common/services/service-logger'
import { nowMs } from '../../common/utils/date-time.utility'
import type { PermissionCacheEntry } from './role-settings.types'

@Injectable()
export class PermissionCacheService {
  private readonly log: ServiceLogger

  constructor(private readonly appLogger: AppLoggerService) {
    this.log = new ServiceLogger(
      this.appLogger,
      AppLogFeature.ROLE_SETTINGS,
      'PermissionCacheService'
    )
  }

  private readonly cache = new Map<string, PermissionCacheEntry>()

  private buildKey(tenantId: string, role: string): string {
    return `${tenantId}:${role}`
  }

  get(tenantId: string, role: string): Set<string> | null {
    const key = this.buildKey(tenantId, role)
    const entry = this.cache.get(key)

    if (!entry) {
      this.log.success('cacheGet', tenantId, { role, hit: false })
      return null
    }

    if (nowMs() > entry.expiresAt) {
      this.cache.delete(key)
      this.log.success('cacheGet', tenantId, { role, hit: false, reason: 'expired' })
      return null
    }

    this.log.success('cacheGet', tenantId, {
      role,
      hit: true,
      permissionCount: entry.permissions.size,
    })

    return entry.permissions
  }

  set(tenantId: string, role: string, permissions: Set<string>): void {
    const key = this.buildKey(tenantId, role)
    this.cache.set(key, {
      permissions,
      expiresAt: nowMs() + CACHE_TTL_MS,
    })

    this.log.success('cacheSet', tenantId, { role, permissionCount: permissions.size })
  }

  invalidate(tenantId: string): void {
    let deletedCount = 0
    for (const key of this.cache.keys()) {
      if (key.startsWith(`${tenantId}:`)) {
        this.cache.delete(key)
        deletedCount++
      }
    }

    this.log.success('cacheInvalidate', tenantId, { deletedCount })
  }

  invalidateAll(): void {
    const totalEntries = this.cache.size
    this.cache.clear()

    this.log.success('cacheInvalidateAll', 'system', { clearedEntries: totalEntries })
  }
}
