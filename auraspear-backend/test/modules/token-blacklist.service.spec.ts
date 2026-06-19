import { TokenBlacklistService } from '../../src/modules/auth/token-blacklist.service'

const mockRedis = {
  status: 'ready' as const,
  ping: jest.fn().mockResolvedValue('PONG'),
  set: jest.fn().mockResolvedValue('OK'),
  get: jest.fn().mockResolvedValue(null),
  del: jest.fn().mockResolvedValue(1),
  exists: jest.fn().mockResolvedValue(0),
  setex: jest.fn().mockResolvedValue('OK'),
  expire: jest.fn().mockResolvedValue(1),
  info: jest.fn().mockResolvedValue('redis_version:7.0.0'),
  quit: jest.fn().mockResolvedValue('OK'),
  on: jest.fn().mockReturnThis(),
  disconnect: jest.fn(),
}

const mockAppLogger = {
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
}

describe('TokenBlacklistService', () => {
  let service: TokenBlacklistService

  beforeEach(() => {
    jest.clearAllMocks()
    service = new TokenBlacklistService(mockRedis as never, mockAppLogger as never)
  })

  /* ------------------------------------------------------------------ */
  /* blacklist                                                           */
  /* ------------------------------------------------------------------ */

  describe('blacklist', () => {
    it('should set key in Redis with correct TTL', async () => {
      mockRedis.set.mockResolvedValue('OK')

      await service.blacklist('jti-001', 900)

      expect(mockRedis.set).toHaveBeenCalledWith('token:blacklist:jti-001', '1', 'EX', 900)
      expect(mockAppLogger.info).toHaveBeenCalledWith(
        'TokenBlacklistService => blacklist completed',
        expect.objectContaining({
          action: 'blacklist',
          outcome: 'success',
          metadata: expect.objectContaining({ ttlSeconds: 900 }),
        })
      )
    })

    it('should enforce a minimum TTL of 1 second', async () => {
      mockRedis.set.mockResolvedValue('OK')

      await service.blacklist('jti-expired', 0)

      expect(mockRedis.set).toHaveBeenCalledWith('token:blacklist:jti-expired', '1', 'EX', 1)
    })

    it('should enforce minimum TTL of 1 for negative expSeconds', async () => {
      mockRedis.set.mockResolvedValue('OK')

      await service.blacklist('jti-negative', -5)

      expect(mockRedis.set).toHaveBeenCalledWith('token:blacklist:jti-negative', '1', 'EX', 1)
    })

    it('should handle Redis error gracefully without throwing', async () => {
      mockRedis.set.mockRejectedValue(new Error('ECONNREFUSED'))

      await expect(service.blacklist('jti-fail', 600)).resolves.toBeUndefined()

      expect(mockAppLogger.error).toHaveBeenCalledWith(
        'TokenBlacklistService => blacklist failed',
        expect.objectContaining({
          action: 'blacklist',
          className: 'TokenBlacklistService',
          functionName: 'blacklist',
          sourceType: 'service',
          outcome: 'failure',
          metadata: expect.objectContaining({ error: 'ECONNREFUSED' }),
        })
      )
    })

    it('should handle non-Error thrown values gracefully', async () => {
      mockRedis.set.mockRejectedValue('string-error')

      await expect(service.blacklist('jti-string-err', 300)).resolves.toBeUndefined()

      expect(mockAppLogger.error).toHaveBeenCalledWith(
        'TokenBlacklistService => blacklist failed',
        expect.objectContaining({
          action: 'blacklist',
          className: 'TokenBlacklistService',
          functionName: 'blacklist',
          sourceType: 'service',
          outcome: 'failure',
        })
      )
    })
  })

  /* ------------------------------------------------------------------ */
  /* isBlacklisted                                                       */
  /* ------------------------------------------------------------------ */

  describe('isBlacklisted', () => {
    it('should return true when token exists in Redis (exists=1)', async () => {
      mockRedis.exists.mockResolvedValue(1)

      const result = await service.isBlacklisted('jti-blacklisted')

      expect(result).toBe(true)
      expect(mockRedis.exists).toHaveBeenCalledWith('token:blacklist:jti-blacklisted')
      expect(mockAppLogger.warn).toHaveBeenCalledWith(
        'TokenBlacklistService => Blacklisted token usage attempt detected',
        expect.objectContaining({
          action: 'isBlacklisted',
        })
      )
    })

    it('should return false when token does not exist in Redis (exists=0)', async () => {
      mockRedis.exists.mockResolvedValue(0)

      const result = await service.isBlacklisted('jti-valid')

      expect(result).toBe(false)
      expect(mockRedis.exists).toHaveBeenCalledWith('token:blacklist:jti-valid')
      // Should NOT log a warning for valid tokens
      expect(mockAppLogger.warn).not.toHaveBeenCalled()
    })

    it('should fail-open and return false when Redis throws an error', async () => {
      mockRedis.exists.mockRejectedValue(new Error('Connection timed out'))

      const result = await service.isBlacklisted('jti-error')

      expect(result).toBe(false)
      expect(mockAppLogger.error).toHaveBeenCalledWith(
        'TokenBlacklistService => isBlacklisted failed',
        expect.objectContaining({
          action: 'isBlacklisted',
          outcome: 'failure',
          metadata: expect.objectContaining({ error: 'Connection timed out' }),
        })
      )
    })

    it('should fail-open and handle non-Error thrown values', async () => {
      mockRedis.exists.mockRejectedValue('unexpected-rejection')

      const result = await service.isBlacklisted('jti-unknown-err')

      expect(result).toBe(false)
      expect(mockAppLogger.error).toHaveBeenCalledWith(
        'TokenBlacklistService => isBlacklisted failed',
        expect.objectContaining({
          outcome: 'failure',
          metadata: expect.objectContaining({ error: expect.any(String) }),
        })
      )
    })
  })

  /* ------------------------------------------------------------------ */
  /* isRedisHealthy                                                      */
  /* ------------------------------------------------------------------ */

  describe('isRedisHealthy', () => {
    it('should return true when Redis responds with PONG', async () => {
      mockRedis.ping.mockResolvedValue('PONG')

      const result = await service.isRedisHealthy()

      expect(result).toBe(true)
      expect(mockRedis.ping).toHaveBeenCalledTimes(1)
    })

    it('should return false when Redis responds with unexpected value', async () => {
      mockRedis.ping.mockResolvedValue('NOT_PONG')

      const result = await service.isRedisHealthy()

      expect(result).toBe(false)
    })

    it('should return false when Redis throws an error', async () => {
      mockRedis.ping.mockRejectedValue(new Error('ECONNREFUSED'))

      const result = await service.isRedisHealthy()

      expect(result).toBe(false)
      expect(mockAppLogger.warn).toHaveBeenCalledWith(
        'TokenBlacklistService => Token blacklist Redis connection is unhealthy',
        expect.objectContaining({
          action: 'isRedisHealthy',
        })
      )
    })
  })
})
