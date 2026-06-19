import { describe, it, expect } from 'vitest'
import {
  createLlmConnectorSchema,
  updateLlmConnectorSchema,
} from '@/lib/validation/llm-connector.schema'

const mockT = (key: string) => key

describe('createLlmConnectorSchema', () => {
  const schema = createLlmConnectorSchema(mockT)

  function makeValidInput(overrides: Record<string, unknown> = {}) {
    return {
      name: 'My LLM Connector',
      baseUrl: 'https://api.openai.com/v1',
      apiKey: 'sk-test-key-1234567890',
      description: 'Test connector',
      defaultModel: 'gpt-4',
      organizationId: 'org-123',
      maxTokensParam: 'max_tokens',
      timeout: 30000,
      ...overrides,
    }
  }

  it('should pass with valid data', () => {
    const result = schema.safeParse(makeValidInput())
    expect(result.success).toBe(true)
  })

  it('should pass with only required fields', () => {
    const result = schema.safeParse({
      name: 'Minimal',
      baseUrl: 'https://api.example.com',
      apiKey: 'sk-key123',
    })
    expect(result.success).toBe(true)
  })

  it('should fail when name is missing', () => {
    const result = schema.safeParse(makeValidInput({ name: '' }))
    expect(result.success).toBe(false)
  })

  it('should fail when name is too short', () => {
    const result = schema.safeParse(makeValidInput({ name: 'A' }))
    expect(result.success).toBe(false)
  })

  it('should fail when baseUrl is invalid (no protocol)', () => {
    const result = schema.safeParse(makeValidInput({ baseUrl: 'not-a-url' }))
    expect(result.success).toBe(false)
  })

  it('should fail when baseUrl is empty', () => {
    const result = schema.safeParse(makeValidInput({ baseUrl: '' }))
    expect(result.success).toBe(false)
  })

  it('should fail when apiKey is missing', () => {
    const result = schema.safeParse(makeValidInput({ apiKey: '' }))
    expect(result.success).toBe(false)
  })

  it('should pass with https:// URL', () => {
    const result = schema.safeParse(makeValidInput({ baseUrl: 'https://api.example.com/v1' }))
    expect(result.success).toBe(true)
  })

  it('should pass with http:// URL', () => {
    const result = schema.safeParse(makeValidInput({ baseUrl: 'http://localhost:8080' }))
    expect(result.success).toBe(true)
  })

  it('should pass with ws:// URL', () => {
    const result = schema.safeParse(makeValidInput({ baseUrl: 'ws://localhost:8080/ws' }))
    expect(result.success).toBe(true)
  })

  it('should pass with wss:// URL', () => {
    const result = schema.safeParse(makeValidInput({ baseUrl: 'wss://api.example.com/ws' }))
    expect(result.success).toBe(true)
  })

  it('should fail with ftp:// URL', () => {
    const result = schema.safeParse(makeValidInput({ baseUrl: 'ftp://files.example.com' }))
    expect(result.success).toBe(false)
  })

  it('should apply default values for optional fields', () => {
    const result = schema.safeParse({
      name: 'Test',
      baseUrl: 'https://api.example.com',
      apiKey: 'sk-key123',
    })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.description).toBe('')
      expect(result.data.defaultModel).toBe('')
      expect(result.data.organizationId).toBe('')
      expect(result.data.maxTokensParam).toBe('max_tokens')
      expect(result.data.timeout).toBe(30000)
    }
  })

  it('should fail when timeout is below 1000', () => {
    const result = schema.safeParse(makeValidInput({ timeout: 500 }))
    expect(result.success).toBe(false)
  })

  it('should fail when timeout exceeds 300000', () => {
    const result = schema.safeParse(makeValidInput({ timeout: 400000 }))
    expect(result.success).toBe(false)
  })

  it('should coerce timeout from string to number', () => {
    const result = schema.safeParse(makeValidInput({ timeout: '15000' }))
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.timeout).toBe(15000)
    }
  })

  it('should trim whitespace from name', () => {
    const result = schema.safeParse(makeValidInput({ name: '  My Connector  ' }))
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.name).toBe('My Connector')
    }
  })
})

describe('updateLlmConnectorSchema', () => {
  const schema = updateLlmConnectorSchema(mockT)

  function makeValidUpdate(overrides: Record<string, unknown> = {}) {
    return {
      name: 'Updated Connector',
      baseUrl: 'https://api.openai.com/v1',
      description: 'Updated description',
      defaultModel: 'gpt-4-turbo',
      organizationId: 'org-456',
      maxTokensParam: 'max_tokens',
      timeout: 60000,
      ...overrides,
    }
  }

  it('should pass with valid data', () => {
    const result = schema.safeParse(makeValidUpdate())
    expect(result.success).toBe(true)
  })

  it('should pass with empty apiKey (optional on update)', () => {
    const result = schema.safeParse(makeValidUpdate({ apiKey: '' }))
    expect(result.success).toBe(true)
  })

  it('should pass without apiKey field at all', () => {
    const result = schema.safeParse(makeValidUpdate())
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.apiKey).toBe('')
    }
  })

  it('should fail when name is too short', () => {
    const result = schema.safeParse(makeValidUpdate({ name: 'X' }))
    expect(result.success).toBe(false)
  })

  it('should fail when baseUrl is invalid', () => {
    const result = schema.safeParse(makeValidUpdate({ baseUrl: 'bad-url' }))
    expect(result.success).toBe(false)
  })

  it('should pass with a new apiKey value', () => {
    const result = schema.safeParse(makeValidUpdate({ apiKey: 'sk-new-key-abcdef' }))
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.apiKey).toBe('sk-new-key-abcdef')
    }
  })

  it('should accept ws:// URLs', () => {
    const result = schema.safeParse(makeValidUpdate({ baseUrl: 'ws://localhost:3000' }))
    expect(result.success).toBe(true)
  })

  it('should accept wss:// URLs', () => {
    const result = schema.safeParse(makeValidUpdate({ baseUrl: 'wss://secure.example.com' }))
    expect(result.success).toBe(true)
  })
})
