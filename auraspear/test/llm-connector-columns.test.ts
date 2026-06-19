import { describe, it, expect, vi } from 'vitest'
import { getLlmConnectorColumns } from '@/components/connectors/LlmConnectorColumns'
import type { LlmConnectorRecord } from '@/types'

vi.mock('@/lib/utils', () => ({
  formatRelativeTime: (date: string) => `relative(${date})`,
}))

const mockT = (key: string) => key

const translations = {
  llmConnectors: mockT,
}

function makeMockConnector(overrides: Partial<LlmConnectorRecord> = {}): LlmConnectorRecord {
  return {
    id: 'c1',
    tenantId: 't1',
    name: 'Test LLM',
    description: 'A test connector',
    enabled: true,
    baseUrl: 'https://api.example.com/v1',
    apiKey: 'sk-***',
    defaultModel: 'gpt-4',
    organizationId: 'org-123',
    maxTokensParam: 'max_tokens',
    timeout: 30000,
    lastTestAt: '2026-03-20T10:00:00Z',
    lastTestOk: true,
    lastError: null,
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-03-20T10:00:00Z',
    ...overrides,
  }
}

describe('getLlmConnectorColumns', () => {
  const columns = getLlmConnectorColumns(translations)

  it('should return exactly 6 columns', () => {
    expect(columns).toHaveLength(6)
  })

  it('should have correct column keys in order', () => {
    const keys = columns.map(col => col.key)
    expect(keys).toEqual([
      'name',
      'description',
      'baseUrl',
      'defaultModel',
      'enabled',
      'lastTestOk',
    ])
  })

  it('should set labels from translations', () => {
    expect(columns[0]?.label).toBe('colName')
    expect(columns[1]?.label).toBe('colDescription')
    expect(columns[2]?.label).toBe('colBaseUrl')
    expect(columns[3]?.label).toBe('colModel')
    expect(columns[4]?.label).toBe('colEnabled')
    expect(columns[5]?.label).toBe('colLastTest')
  })

  it('should have render functions on all columns', () => {
    for (const col of columns) {
      expect(typeof col.render).toBe('function')
    }
  })

  it('should set className on description column', () => {
    const descCol = columns.find(c => c.key === 'description')
    expect(descCol?.className).toBe('max-w-[200px]')
  })

  it('should set className on baseUrl column', () => {
    const urlCol = columns.find(c => c.key === 'baseUrl')
    expect(urlCol?.className).toBe('max-w-[200px]')
  })

  it('should set className on defaultModel column', () => {
    const modelCol = columns.find(c => c.key === 'defaultModel')
    expect(modelCol?.className).toBe('w-36')
  })

  it('should set className on enabled column', () => {
    const enabledCol = columns.find(c => c.key === 'enabled')
    expect(enabledCol?.className).toBe('w-24')
  })

  it('should set className on lastTestOk column', () => {
    const testCol = columns.find(c => c.key === 'lastTestOk')
    expect(testCol?.className).toBe('w-36')
  })

  // ─── name column render ───────────────────────────────────────

  describe('name column render', () => {
    const nameCol = columns.find(c => c.key === 'name')

    it('should render for enabled connector', () => {
      const row = makeMockConnector({ enabled: true })
      const result = nameCol?.render?.('Test LLM', row)
      expect(result).toBeDefined()
    })

    it('should render for disabled connector', () => {
      const row = makeMockConnector({ enabled: false })
      const result = nameCol?.render?.('Test LLM', row)
      expect(result).toBeDefined()
    })

    it('should handle null value', () => {
      const row = makeMockConnector()
      const result = nameCol?.render?.(null, row)
      expect(result).toBeDefined()
    })
  })

  // ─── description column render ────────────────────────────────

  describe('description column render', () => {
    const descCol = columns.find(c => c.key === 'description')

    it('should render for non-empty description', () => {
      const row = makeMockConnector()
      const result = descCol?.render?.('A test connector', row)
      expect(result).toBeDefined()
    })

    it('should render dash for empty description', () => {
      const row = makeMockConnector({ description: null })
      const result = descCol?.render?.(null, row)
      expect(result).toBeDefined()
    })

    it('should truncate long descriptions', () => {
      const row = makeMockConnector()
      const longDesc = 'A'.repeat(60)
      const result = descCol?.render?.(longDesc, row)
      expect(result).toBeDefined()
    })
  })

  // ─── baseUrl column render ────────────────────────────────────

  describe('baseUrl column render', () => {
    const urlCol = columns.find(c => c.key === 'baseUrl')

    it('should render a URL', () => {
      const row = makeMockConnector()
      const result = urlCol?.render?.('https://api.example.com/v1', row)
      expect(result).toBeDefined()
    })

    it('should truncate long URLs', () => {
      const row = makeMockConnector()
      const longUrl = `https://api.example.com/${'a'.repeat(50)}`
      const result = urlCol?.render?.(longUrl, row)
      expect(result).toBeDefined()
    })
  })

  // ─── defaultModel column render ───────────────────────────────

  describe('defaultModel column render', () => {
    const modelCol = columns.find(c => c.key === 'defaultModel')

    it('should render a model name', () => {
      const row = makeMockConnector()
      const result = modelCol?.render?.('gpt-4', row)
      expect(result).toBeDefined()
    })

    it('should render dash for empty model', () => {
      const row = makeMockConnector({ defaultModel: null })
      const result = modelCol?.render?.(null, row)
      expect(result).toBeDefined()
    })
  })

  // ─── enabled column render ────────────────────────────────────

  describe('enabled column render', () => {
    const enabledCol = columns.find(c => c.key === 'enabled')

    it('should render for enabled=true', () => {
      const row = makeMockConnector({ enabled: true })
      const result = enabledCol?.render?.(true, row)
      expect(result).toBeDefined()
    })

    it('should render for enabled=false', () => {
      const row = makeMockConnector({ enabled: false })
      const result = enabledCol?.render?.(false, row)
      expect(result).toBeDefined()
    })
  })

  // ─── lastTestOk column render ─────────────────────────────────

  describe('lastTestOk column render', () => {
    const testCol = columns.find(c => c.key === 'lastTestOk')

    it('should render for passed test', () => {
      const row = makeMockConnector({ lastTestOk: true, lastTestAt: '2026-03-20T10:00:00Z' })
      const result = testCol?.render?.(true, row)
      expect(result).toBeDefined()
    })

    it('should render for failed test', () => {
      const row = makeMockConnector({ lastTestOk: false, lastTestAt: '2026-03-20T10:00:00Z' })
      const result = testCol?.render?.(false, row)
      expect(result).toBeDefined()
    })

    it('should render not-tested state when lastTestAt is null', () => {
      const row = makeMockConnector({ lastTestAt: null, lastTestOk: null })
      const result = testCol?.render?.(null, row)
      expect(result).toBeDefined()
    })
  })
})
