import { describe, it, expect } from 'vitest'
import { normalizeIocType, isFileOrHashType } from '@/lib/entity.utils'
import { extractVtAnalysisUrl, extractVtFileGuiUrl } from '@/lib/osint.utils'

describe('OSINT utility functions', () => {
  // ─── normalizeIocType ───────────────────────────────────────────

  describe('normalizeIocType', () => {
    it('should map ip-src to ip', () => {
      expect(normalizeIocType('ip-src')).toBe('ip')
    })

    it('should map hostname to domain', () => {
      expect(normalizeIocType('hostname')).toBe('domain')
    })

    it('should map filename|md5 to md5', () => {
      expect(normalizeIocType('filename|md5')).toBe('md5')
    })

    it('should map sha256 to sha256', () => {
      expect(normalizeIocType('sha256')).toBe('sha256')
    })

    it('should return original for unknown types', () => {
      expect(normalizeIocType('some_unknown_type')).toBe('some_unknown_type')
    })

    it('should handle case-insensitive input', () => {
      expect(normalizeIocType('IP-SRC')).toBe('ip')
      expect(normalizeIocType('SHA256')).toBe('sha256')
    })
  })

  // ─── isFileOrHashType ──────────────────────────────────────────

  describe('isFileOrHashType', () => {
    it('should return true for hash, md5, sha1, sha256', () => {
      expect(isFileOrHashType('hash')).toBe(true)
      expect(isFileOrHashType('md5')).toBe(true)
      expect(isFileOrHashType('sha1')).toBe(true)
      expect(isFileOrHashType('sha256')).toBe(true)
    })

    it('should return false for ip, domain, url', () => {
      expect(isFileOrHashType('ip')).toBe(false)
      expect(isFileOrHashType('domain')).toBe(false)
      expect(isFileOrHashType('url')).toBe(false)
    })

    it('should handle case-insensitive input', () => {
      expect(isFileOrHashType('MD5')).toBe(true)
      expect(isFileOrHashType('SHA256')).toBe(true)
    })
  })

  // ─── extractVtAnalysisUrl ──────────────────────────────────────

  describe('extractVtAnalysisUrl', () => {
    it('should extract /analyses/ URLs', () => {
      const rawResponse = {
        data: {
          links: {
            self: 'https://www.virustotal.com/api/v3/analyses/abc123',
          },
        },
      }
      expect(extractVtAnalysisUrl(rawResponse)).toBe(
        'https://www.virustotal.com/api/v3/analyses/abc123'
      )
    })

    it('should return null for direct result URLs', () => {
      const rawResponse = {
        data: {
          links: {
            self: 'https://www.virustotal.com/api/v3/files/abc123',
          },
        },
      }
      expect(extractVtAnalysisUrl(rawResponse)).toBeNull()
    })

    it('should return null for non-object input', () => {
      expect(extractVtAnalysisUrl(null)).toBeNull()
      expect(extractVtAnalysisUrl('string')).toBeNull()
      expect(extractVtAnalysisUrl(42)).toBeNull()
    })

    it('should return null for missing data or links', () => {
      expect(extractVtAnalysisUrl({})).toBeNull()
      expect(extractVtAnalysisUrl({ data: {} })).toBeNull()
      expect(extractVtAnalysisUrl({ data: { links: {} } })).toBeNull()
    })
  })

  // ─── extractVtFileGuiUrl ───────────────────────────────────────

  describe('extractVtFileGuiUrl', () => {
    it('should extract SHA256 from item link', () => {
      const data = {
        links: {
          item: 'https://www.virustotal.com/api/v3/files/abc123sha256hash',
        },
      }
      expect(extractVtFileGuiUrl(data)).toBe('https://www.virustotal.com/gui/file/abc123sha256hash')
    })

    it('should extract from type + id when no links', () => {
      const data = {
        type: 'file',
        id: 'sha256hash123',
      }
      expect(extractVtFileGuiUrl(data)).toBe('https://www.virustotal.com/gui/file/sha256hash123')
    })

    it('should handle domain type', () => {
      const data = {
        type: 'domain',
        id: 'example.com',
      }
      expect(extractVtFileGuiUrl(data)).toBe('https://www.virustotal.com/gui/domain/example.com')
    })

    it('should handle ip_address type', () => {
      const data = {
        type: 'ip_address',
        id: '1.2.3.4',
      }
      expect(extractVtFileGuiUrl(data)).toBe('https://www.virustotal.com/gui/ip-address/1.2.3.4')
    })

    it('should return null for non-object input', () => {
      expect(extractVtFileGuiUrl(null)).toBeNull()
      expect(extractVtFileGuiUrl(undefined)).toBeNull()
    })

    it('should return null for unrecognized structure', () => {
      expect(extractVtFileGuiUrl({})).toBeNull()
      expect(extractVtFileGuiUrl({ foo: 'bar' })).toBeNull()
    })
  })
})
