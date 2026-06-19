import { BusinessException } from '../../src/common/exceptions/business.exception'
import { validateUrl, isPrivateHost } from '../../src/common/utils/ssrf.utility'

describe('SSRF Protection', () => {
  const originalEnvironment = process.env.NODE_ENV

  afterEach(() => {
    process.env.NODE_ENV = originalEnvironment
  })

  describe('validateUrl', () => {
    it('should accept valid public HTTPS URLs', () => {
      const result = validateUrl('https://wazuh.example.com:55000/api')
      expect(result.hostname).toBe('wazuh.example.com')
    })

    it('should accept valid HTTP URLs', () => {
      const result = validateUrl('http://grafana.example.com:3000')
      expect(result.hostname).toBe('grafana.example.com')
    })

    it('should reject invalid URLs', () => {
      expect(() => validateUrl('not-a-url')).toThrow(BusinessException)
    })

    it('should reject FTP protocol', () => {
      expect(() => validateUrl('ftp://files.example.com')).toThrow(BusinessException)
    })

    it('should reject file protocol', () => {
      expect(() => validateUrl('file:///etc/passwd')).toThrow(BusinessException)
    })

    it('should enforce allowlist when provided', () => {
      const allowed = ['wazuh.corp.com', 'misp.corp.com']
      expect(() => validateUrl('https://evil.com', allowed)).toThrow(BusinessException)
      expect(validateUrl('https://wazuh.corp.com', allowed).hostname).toBe('wazuh.corp.com')
    })

    it('should allow subdomains of allowed hosts', () => {
      const allowed = ['corp.com']
      const result = validateUrl('https://api.wazuh.corp.com', allowed)
      expect(result.hostname).toBe('api.wazuh.corp.com')
    })

    it('should reject hosts not matching allowlist', () => {
      const allowed = ['corp.com']
      try {
        validateUrl('https://evil.example.com', allowed)
      } catch (error) {
        expect(error).toBeInstanceOf(BusinessException)
        expect((error as BusinessException).messageKey).toBe('errors.ssrf.hostNotAllowed')
      }
    })

    it('should return parsed URL with correct properties', () => {
      const result = validateUrl('https://api.example.com:8443/v1/health?check=true')
      expect(result.hostname).toBe('api.example.com')
      expect(result.port).toBe('8443')
      expect(result.pathname).toBe('/v1/health')
      expect(result.search).toBe('?check=true')
    })

    describe('production environment', () => {
      beforeEach(() => {
        process.env.NODE_ENV = 'production'
      })

      it('should reject private IP 127.0.0.1', () => {
        expect(() => validateUrl('http://127.0.0.1:8080')).toThrow(BusinessException)
      })

      it('should reject private IP 10.x.x.x', () => {
        expect(() => validateUrl('http://10.0.1.5:9200')).toThrow(BusinessException)
      })

      it('should reject private IP 192.168.x.x', () => {
        expect(() => validateUrl('http://192.168.1.1')).toThrow(BusinessException)
      })

      it('should reject private IP 172.16.x.x', () => {
        expect(() => validateUrl('http://172.16.0.1')).toThrow(BusinessException)
      })

      it('should reject localhost', () => {
        expect(() => validateUrl('http://localhost:4000')).toThrow(BusinessException)
      })

      it('should reject link-local addresses (169.254.x.x)', () => {
        expect(() => validateUrl('http://169.254.169.254')).toThrow(BusinessException)
      })

      it('should reject IPv6 loopback ::1', () => {
        expect(() => validateUrl('http://[::1]:4000')).toThrow(BusinessException)
      })

      it('should include correct messageKey for private network rejection', () => {
        try {
          validateUrl('http://localhost:4000')
        } catch (error) {
          expect(error).toBeInstanceOf(BusinessException)
          expect((error as BusinessException).messageKey).toBe('errors.ssrf.privateNetwork')
        }
      })

      it('should include correct messageKey for invalid URL', () => {
        try {
          validateUrl('not-a-url')
        } catch (error) {
          expect(error).toBeInstanceOf(BusinessException)
          expect((error as BusinessException).messageKey).toBe('errors.ssrf.invalidUrl')
        }
      })

      it('should include correct messageKey for unsupported protocol', () => {
        try {
          validateUrl('ftp://files.example.com')
        } catch (error) {
          expect(error).toBeInstanceOf(BusinessException)
          expect((error as BusinessException).messageKey).toBe('errors.ssrf.unsupportedProtocol')
        }
      })
    })

    describe('development environment', () => {
      beforeEach(() => {
        process.env.NODE_ENV = 'development'
      })

      it('should allow localhost URLs', () => {
        const result = validateUrl('http://localhost:4040')
        expect(result.hostname).toBe('localhost')
      })

      it('should allow 127.0.0.1', () => {
        const result = validateUrl('https://127.0.0.1:55000')
        expect(result.hostname).toBe('127.0.0.1')
      })

      it('should allow private IP 10.x.x.x', () => {
        const result = validateUrl('http://10.0.1.5:9200')
        expect(result.hostname).toBe('10.0.1.5')
      })

      it('should allow private IP 192.168.x.x', () => {
        const result = validateUrl('http://192.168.1.100:3000')
        expect(result.hostname).toBe('192.168.1.100')
      })

      it('should allow private IP 172.16.x.x', () => {
        const result = validateUrl('http://172.16.0.1:8080')
        expect(result.hostname).toBe('172.16.0.1')
      })

      it('should still reject non-HTTP protocols', () => {
        expect(() => validateUrl('ftp://localhost')).toThrow(BusinessException)
      })

      it('should still reject invalid URLs', () => {
        expect(() => validateUrl('not-a-url')).toThrow(BusinessException)
      })

      it('should still enforce allowlist in development', () => {
        const allowed = ['wazuh.corp.com']
        expect(() => validateUrl('http://localhost:4000', allowed)).toThrow(BusinessException)
      })
    })

    describe('test environment', () => {
      beforeEach(() => {
        process.env.NODE_ENV = 'test'
      })

      it('should allow localhost URLs in test environment', () => {
        const result = validateUrl('http://localhost:4040')
        expect(result.hostname).toBe('localhost')
      })

      it('should allow private IPs in test environment', () => {
        const result = validateUrl('http://10.0.0.1:9200')
        expect(result.hostname).toBe('10.0.0.1')
      })
    })
  })

  describe('isPrivateHost', () => {
    it('should detect 127.x.x.x as private', () => {
      expect(isPrivateHost('127.0.0.1')).toBe(true)
    })

    it('should detect 127.0.0.2 as private', () => {
      expect(isPrivateHost('127.0.0.2')).toBe(true)
    })

    it('should detect 10.x.x.x as private', () => {
      expect(isPrivateHost('10.0.0.1')).toBe(true)
    })

    it('should detect 172.16.x.x as private', () => {
      expect(isPrivateHost('172.16.0.1')).toBe(true)
    })

    it('should detect 172.31.x.x as private', () => {
      expect(isPrivateHost('172.31.255.255')).toBe(true)
    })

    it('should not detect 172.15.x.x as private', () => {
      expect(isPrivateHost('172.15.0.1')).toBe(false)
    })

    it('should not detect 172.32.x.x as private', () => {
      expect(isPrivateHost('172.32.0.1')).toBe(false)
    })

    it('should detect 192.168.x.x as private', () => {
      expect(isPrivateHost('192.168.0.1')).toBe(true)
    })

    it('should detect localhost as private', () => {
      expect(isPrivateHost('localhost')).toBe(true)
    })

    it('should detect LOCALHOST as private (case-insensitive)', () => {
      expect(isPrivateHost('LOCALHOST')).toBe(true)
    })

    it('should detect link-local 169.254.x.x as private', () => {
      expect(isPrivateHost('169.254.169.254')).toBe(true)
    })

    it('should detect 0.x.x.x as private', () => {
      expect(isPrivateHost('0.0.0.0')).toBe(true)
    })

    it('should detect IPv6 loopback as private', () => {
      expect(isPrivateHost('::1')).toBe(true)
    })

    it('should detect IPv6 fc00 range as private', () => {
      expect(isPrivateHost('fc00::1')).toBe(true)
    })

    it('should detect IPv6 fe80 range as private', () => {
      expect(isPrivateHost('fe80::1')).toBe(true)
    })

    it('should not flag public IPs', () => {
      expect(isPrivateHost('8.8.8.8')).toBe(false)
    })

    it('should not flag public domain names', () => {
      expect(isPrivateHost('wazuh.example.com')).toBe(false)
    })

    it('should not flag IP 1.2.3.4', () => {
      expect(isPrivateHost('1.2.3.4')).toBe(false)
    })
  })
})
