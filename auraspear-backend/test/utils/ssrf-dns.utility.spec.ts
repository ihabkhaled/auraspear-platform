import { BusinessException } from '../../src/common/exceptions/business.exception'
import { resolveAndValidateUrl } from '../../src/common/utils/ssrf.utility'

// Mock dns.promises.lookup
jest.mock('node:dns', () => ({
  promises: {
    lookup: jest.fn(),
  },
}))

// eslint-disable-next-line @typescript-eslint/no-require-imports
const { promises: dnsPromises } = require('node:dns') as {
  promises: { lookup: jest.Mock }
}

describe('DNS-Aware SSRF Defense (resolveAndValidateUrl)', () => {
  const originalEnvironment = process.env.NODE_ENV

  afterEach(() => {
    process.env.NODE_ENV = originalEnvironment
    jest.resetAllMocks()
  })

  describe('non-production environment', () => {
    beforeEach(() => {
      process.env.NODE_ENV = 'development'
    })

    it('should skip DNS resolution and allow private URLs in development', async () => {
      const result = await resolveAndValidateUrl('http://localhost:8080')
      expect(result.hostname).toBe('localhost')
      expect(dnsPromises.lookup).not.toHaveBeenCalled()
    })

    it('should skip DNS resolution and allow any URL in development', async () => {
      const result = await resolveAndValidateUrl('http://10.0.0.1:3000')
      expect(result.hostname).toBe('10.0.0.1')
      expect(dnsPromises.lookup).not.toHaveBeenCalled()
    })
  })

  describe('production environment', () => {
    beforeEach(() => {
      process.env.NODE_ENV = 'production'
    })

    it('should allow URLs that resolve to public IPs', async () => {
      dnsPromises.lookup.mockResolvedValue({ address: '93.184.216.34', family: 4 })
      const result = await resolveAndValidateUrl('https://example.com')
      expect(result.hostname).toBe('example.com')
      expect(dnsPromises.lookup).toHaveBeenCalledWith('example.com')
    })

    it('should block URLs whose hostname resolves to 127.x.x.x', async () => {
      dnsPromises.lookup.mockResolvedValue({ address: '127.0.0.1', family: 4 })
      await expect(resolveAndValidateUrl('https://evil.example.com')).rejects.toThrow(
        BusinessException
      )
      await expect(resolveAndValidateUrl('https://evil.example.com')).rejects.toMatchObject({
        messageKey: 'errors.connectors.ssrfBlocked',
      })
    })

    it('should block URLs whose hostname resolves to 10.x.x.x', async () => {
      dnsPromises.lookup.mockResolvedValue({ address: '10.0.0.5', family: 4 })
      await expect(resolveAndValidateUrl('https://attacker.example.com')).rejects.toThrow(
        BusinessException
      )
    })

    it('should block URLs whose hostname resolves to 192.168.x.x', async () => {
      dnsPromises.lookup.mockResolvedValue({ address: '192.168.1.1', family: 4 })
      await expect(resolveAndValidateUrl('https://internal.example.com')).rejects.toThrow(
        BusinessException
      )
    })

    it('should block URLs whose hostname resolves to 172.16.x.x', async () => {
      dnsPromises.lookup.mockResolvedValue({ address: '172.16.0.1', family: 4 })
      await expect(resolveAndValidateUrl('https://rebind.example.com')).rejects.toThrow(
        BusinessException
      )
    })

    it('should block URLs whose hostname resolves to 169.254.x.x (link-local)', async () => {
      dnsPromises.lookup.mockResolvedValue({ address: '169.254.169.254', family: 4 })
      await expect(resolveAndValidateUrl('https://metadata.example.com')).rejects.toThrow(
        BusinessException
      )
    })

    it('should throw dnsResolutionFailed when DNS lookup fails', async () => {
      dnsPromises.lookup.mockRejectedValue(new Error('ENOTFOUND'))
      await expect(resolveAndValidateUrl('https://nonexistent.example.com')).rejects.toThrow(
        BusinessException
      )
      await expect(resolveAndValidateUrl('https://nonexistent.example.com')).rejects.toMatchObject({
        messageKey: 'errors.connectors.dnsResolutionFailed',
      })
    })

    it('should still reject invalid URLs before DNS check', async () => {
      await expect(resolveAndValidateUrl('not-a-url')).rejects.toThrow(BusinessException)
      expect(dnsPromises.lookup).not.toHaveBeenCalled()
    })

    it('should still reject private hostnames at URL parse level', async () => {
      await expect(resolveAndValidateUrl('https://localhost:4000')).rejects.toThrow(
        BusinessException
      )
      // DNS check should not even be reached since hostname-level check blocks it first
      expect(dnsPromises.lookup).not.toHaveBeenCalled()
    })

    it('should still enforce allowlist when provided', async () => {
      const allowed = ['trusted.com']
      await expect(resolveAndValidateUrl('https://evil.com', allowed)).rejects.toThrow(
        BusinessException
      )
      expect(dnsPromises.lookup).not.toHaveBeenCalled()
    })

    it('should perform DNS check for allowed hostnames', async () => {
      dnsPromises.lookup.mockResolvedValue({ address: '8.8.8.8', family: 4 })
      const allowed = ['trusted.com']
      const result = await resolveAndValidateUrl('https://api.trusted.com', allowed)
      expect(result.hostname).toBe('api.trusted.com')
      expect(dnsPromises.lookup).toHaveBeenCalledWith('api.trusted.com')
    })
  })
})
