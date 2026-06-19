import { Inject, Injectable, Logger } from '@nestjs/common'
import Redis from 'ioredis'
import {
  REFRESH_FAMILY_PREFIX,
  REFRESH_FAMILY_REVOKED_PREFIX,
  TOKEN_BLACKLIST_PREFIX,
} from './auth.constants'
import { extractErrorMessage, extractErrorStack } from './token-blacklist.utilities'
import { AppLogFeature, RedisResponse } from '../../common/enums'
import { AppLoggerService } from '../../common/services/app-logger.service'
import { ServiceLogger } from '../../common/services/service-logger'
import { REDIS_CLIENT } from '../../redis'

@Injectable()
export class TokenBlacklistService {
  private readonly logger = new Logger(TokenBlacklistService.name)
  private readonly log: ServiceLogger

  constructor(
    @Inject(REDIS_CLIENT) private readonly redis: Redis,
    private readonly appLogger: AppLoggerService
  ) {
    this.log = new ServiceLogger(this.appLogger, AppLogFeature.AUTH, 'TokenBlacklistService')
  }

  async blacklist(jti: string, expSeconds: number): Promise<void> {
    try {
      const key = `${TOKEN_BLACKLIST_PREFIX}${jti}`
      const ttl = Math.max(expSeconds, 1)
      await this.redis.set(key, '1', 'EX', ttl)

      this.log.success('blacklist', 'system', { ttlSeconds: ttl })
    } catch (error) {
      this.logger.warn(`Failed to blacklist token ${jti}: ${extractErrorMessage(error)}`)
      this.log.error('blacklist', 'system', error, { stackTrace: extractErrorStack(error) })
    }
  }

  /**
   * Check whether a token JTI has been blacklisted (revoked).
   *
   * **Security trade-off (fail-open):** When Redis is unavailable, this method
   * returns `false` (not blacklisted) rather than `true`. This is an intentional
   * availability-over-security decision. See class-level docs for rationale.
   */
  async isBlacklisted(jti: string): Promise<boolean> {
    try {
      const key = `${TOKEN_BLACKLIST_PREFIX}${jti}`
      const result = await this.redis.exists(key)
      const blacklisted = result === 1

      if (blacklisted) {
        this.log.warn('isBlacklisted', 'system', 'Blacklisted token usage attempt detected')
      }

      return blacklisted
    } catch (error) {
      this.logger.warn(`Failed to check blacklist for ${jti}: ${extractErrorMessage(error)}`)
      this.log.error('isBlacklisted', 'system', error, { failOpen: true })

      return false
    }
  }

  async isRedisHealthy(): Promise<boolean> {
    try {
      const result = await this.redis.ping()
      return result === RedisResponse.PONG
    } catch {
      this.log.warn('isRedisHealthy', 'system', 'Token blacklist Redis connection is unhealthy')
      return false
    }
  }

  /* ---------------------------------------------------------------- */
  /* REFRESH TOKEN FAMILY TRACKING                                     */
  /* ---------------------------------------------------------------- */

  async setFamilyGeneration(family: string, generation: number, ttlSeconds: number): Promise<void> {
    try {
      const key = `${REFRESH_FAMILY_PREFIX}${family}`
      const ttl = Math.max(ttlSeconds, 1)
      await this.redis.set(key, String(generation), 'EX', ttl)

      this.log.success('setFamilyGeneration', 'system', { family, generation, ttlSeconds: ttl })
    } catch (error) {
      this.logger.warn(
        `Failed to set family generation for ${family}: ${extractErrorMessage(error)}`
      )
      this.log.error('setFamilyGeneration', 'system', error, {
        stackTrace: extractErrorStack(error),
      })
    }
  }

  async getFamilyGeneration(family: string): Promise<number | null> {
    try {
      const key = `${REFRESH_FAMILY_PREFIX}${family}`
      const result = await this.redis.get(key)
      if (result === null) {
        return null
      }
      return Number.parseInt(result, 10)
    } catch (error) {
      this.logger.warn(
        `Failed to get family generation for ${family}: ${extractErrorMessage(error)}`
      )
      this.log.error('getFamilyGeneration', 'system', error, { failOpen: true })

      return null
    }
  }

  async invalidateFamily(family: string): Promise<void> {
    try {
      await this.performFamilyInvalidation(family)
      this.log.warn(
        'invalidateFamily',
        'system',
        'Refresh token family invalidated (possible replay attack)',
        { family }
      )
    } catch (error) {
      this.logger.warn(`Failed to invalidate family ${family}: ${extractErrorMessage(error)}`)
      this.log.error('invalidateFamily', 'system', error, { stackTrace: extractErrorStack(error) })
    }
  }

  async isFamilyRevoked(family: string): Promise<boolean> {
    try {
      const key = `${REFRESH_FAMILY_REVOKED_PREFIX}${family}`
      const result = await this.redis.exists(key)
      const revoked = result === 1

      if (revoked) {
        this.log.warn('isFamilyRevoked', 'system', 'Revoked refresh token family usage detected', {
          family,
        })
      }

      return revoked
    } catch (error) {
      this.logger.warn(
        `Failed to check family revocation for ${family}: ${extractErrorMessage(error)}`
      )
      this.log.error('isFamilyRevoked', 'system', error, { family, failOpen: true })

      return false
    }
  }

  async deleteFamilyKey(family: string): Promise<void> {
    try {
      const key = `${REFRESH_FAMILY_PREFIX}${family}`
      await this.redis.del(key)

      this.log.success('deleteFamilyKey', 'system', { family })
    } catch (error) {
      this.logger.warn(`Failed to delete family key for ${family}: ${extractErrorMessage(error)}`)
      this.log.error('deleteFamilyKey', 'system', error, { stackTrace: extractErrorStack(error) })
    }
  }

  private async performFamilyInvalidation(family: string): Promise<void> {
    const familyKey = `${REFRESH_FAMILY_PREFIX}${family}`
    const revokedKey = `${REFRESH_FAMILY_REVOKED_PREFIX}${family}`

    const remainingTtl = await this.redis.ttl(familyKey)
    await this.redis.del(familyKey)

    const ttl = Math.max(remainingTtl, 1)
    await this.redis.set(revokedKey, '1', 'EX', ttl)
  }
}
