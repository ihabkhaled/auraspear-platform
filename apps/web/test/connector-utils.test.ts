import { describe, it, expect } from 'vitest'
import { ConnectorAuthType, ConnectorType } from '@/enums'
import { recordToFormValues } from '@/lib/connector-utils'
import type { ConnectorRecord } from '@/types'

// ─── Helper to create a minimal ConnectorRecord ─────────────────

function makeRecord(config: Record<string, unknown>): ConnectorRecord {
  return {
    type: ConnectorType.WAZUH,
    name: 'Test Connector',
    enabled: true,
    authType: ConnectorAuthType.API_KEY,
    config,
    lastTestAt: null,
    lastTestOk: null,
    lastError: null,
  }
}

// ─── recordToFormValues ─────────────────────────────────────────

describe('recordToFormValues', () => {
  it('should map name and enabled from the record', () => {
    const record = makeRecord({})
    const result = recordToFormValues(record)

    expect(result.name).toBe('Test Connector')
    expect(result.enabled).toBe(true)
  })

  it('should map baseUrl from config', () => {
    const record = makeRecord({ baseUrl: 'https://example.com' })
    const result = recordToFormValues(record)

    expect(result.baseUrl).toBe('https://example.com')
  })

  it('should map authType from config when valid', () => {
    const record = makeRecord({ authType: ConnectorAuthType.BASIC })
    const result = recordToFormValues(record)

    expect(result.authType).toBe(ConnectorAuthType.BASIC)
  })

  it('should default authType to API_KEY when config authType is invalid', () => {
    const record = makeRecord({ authType: 'invalid_auth_type' })
    const result = recordToFormValues(record)

    expect(result.authType).toBe(ConnectorAuthType.API_KEY)
  })

  it('should default authType to API_KEY when config authType is missing', () => {
    const record = makeRecord({})
    const result = recordToFormValues(record)

    expect(result.authType).toBe(ConnectorAuthType.API_KEY)
  })

  it('should map string fields with empty-string defaults', () => {
    const record = makeRecord({})
    const result = recordToFormValues(record)

    expect(result.baseUrl).toBe('')
    expect(result.apiKey).toBe('')
    expect(result.username).toBe('')
    expect(result.password).toBe('')
    expect(result.token).toBe('')
    expect(result.notes).toBe('')
    expect(result.managerUrl).toBe('')
    expect(result.indexerUrl).toBe('')
    expect(result.indexerUsername).toBe('')
    expect(result.indexerPassword).toBe('')
    expect(result.tenant).toBe('')
    expect(result.apiUrl).toBe('')
    expect(result.streamId).toBe('')
    expect(result.indexSetId).toBe('')
    expect(result.pipelineId).toBe('')
    expect(result.orgId).toBe('')
    expect(result.clientCert).toBe('')
    expect(result.clientKey).toBe('')
    expect(result.grafanaUrl).toBe('')
    expect(result.folderId).toBe('')
    expect(result.datasourceUid).toBe('')
    expect(result.org).toBe('')
    expect(result.bucket).toBe('')
    expect(result.mispUrl).toBe('')
    expect(result.mispAuthKey).toBe('')
    expect(result.webhookUrl).toBe('')
    expect(result.workflowId).toBe('')
    expect(result.shuffleApiKey).toBe('')
    expect(result.modelId).toBe('')
    expect(result.region).toBe('')
    expect(result.accessKeyId).toBe('')
    expect(result.secretAccessKey).toBe('')
  })

  it('should map verifyTLS to true when config value is undefined', () => {
    const record = makeRecord({})
    const result = recordToFormValues(record)

    expect(result.verifyTLS).toBe(true)
  })

  it('should map verifyTLS to false when config value is false', () => {
    const record = makeRecord({ verifyTLS: false })
    const result = recordToFormValues(record)

    expect(result.verifyTLS).toBe(false)
  })

  it('should map verifyTLS to true when config value is true', () => {
    const record = makeRecord({ verifyTLS: true })
    const result = recordToFormValues(record)

    expect(result.verifyTLS).toBe(true)
  })

  it('should default timeoutSeconds to 30 when missing', () => {
    const record = makeRecord({})
    const result = recordToFormValues(record)

    expect(result.timeoutSeconds).toBe(30)
  })

  it('should map timeoutSeconds from config', () => {
    const record = makeRecord({ timeoutSeconds: 60 })
    const result = recordToFormValues(record)

    expect(result.timeoutSeconds).toBe(60)
  })

  it('should default timeoutSeconds to 30 when config value is 0 (falsy)', () => {
    const record = makeRecord({ timeoutSeconds: 0 })
    const result = recordToFormValues(record)

    expect(result.timeoutSeconds).toBe(30)
  })

  it('should join tags array into comma-separated string', () => {
    const record = makeRecord({ tags: ['tag1', 'tag2', 'tag3'] })
    const result = recordToFormValues(record)

    expect(result.tags).toBe('tag1, tag2, tag3')
  })

  it('should return empty string when tags is not an array', () => {
    const record = makeRecord({ tags: 'single-tag' })
    const result = recordToFormValues(record)

    expect(result.tags).toBe('')
  })

  it('should return empty string when tags is undefined', () => {
    const record = makeRecord({})
    const result = recordToFormValues(record)

    expect(result.tags).toBe('')
  })

  it('should map boolean feature flags to false when missing', () => {
    const record = makeRecord({})
    const result = recordToFormValues(record)

    expect(result.nlHuntingEnabled).toBe(false)
    expect(result.explainableAiEnabled).toBe(false)
    expect(result.auditLoggingEnabled).toBe(false)
  })

  it('should map boolean feature flags to true when set', () => {
    const record = makeRecord({
      nlHuntingEnabled: true,
      explainableAiEnabled: true,
      auditLoggingEnabled: true,
    })
    const result = recordToFormValues(record)

    expect(result.nlHuntingEnabled).toBe(true)
    expect(result.explainableAiEnabled).toBe(true)
    expect(result.auditLoggingEnabled).toBe(true)
  })

  it('should handle a fully populated config object', () => {
    const record = makeRecord({
      baseUrl: 'https://wazuh.example.com',
      authType: ConnectorAuthType.TOKEN,
      apiKey: 'key-123',
      username: 'admin',
      password: 'secret',
      token: 'tok-456',
      verifyTLS: true,
      timeoutSeconds: 45,
      tags: ['prod', 'siem'],
      notes: 'Production Wazuh',
      managerUrl: 'https://manager.example.com',
      indexerUrl: 'https://indexer.example.com',
      indexerUsername: 'idx-user',
      indexerPassword: 'idx-pass',
    })
    const result = recordToFormValues(record)

    expect(result.baseUrl).toBe('https://wazuh.example.com')
    expect(result.authType).toBe(ConnectorAuthType.TOKEN)
    expect(result.apiKey).toBe('key-123')
    expect(result.username).toBe('admin')
    expect(result.password).toBe('secret')
    expect(result.token).toBe('tok-456')
    expect(result.verifyTLS).toBe(true)
    expect(result.timeoutSeconds).toBe(45)
    expect(result.tags).toBe('prod, siem')
    expect(result.notes).toBe('Production Wazuh')
    expect(result.managerUrl).toBe('https://manager.example.com')
    expect(result.indexerUrl).toBe('https://indexer.example.com')
    expect(result.indexerUsername).toBe('idx-user')
    expect(result.indexerPassword).toBe('idx-pass')
  })

  it('should handle config being undefined (nullish coalescing)', () => {
    const record: ConnectorRecord = {
      type: ConnectorType.GRAYLOG,
      name: 'No Config',
      enabled: false,
      authType: ConnectorAuthType.API_KEY,
      config: undefined as unknown as Record<string, unknown>,
      lastTestAt: null,
      lastTestOk: null,
      lastError: null,
    }
    const result = recordToFormValues(record)

    expect(result.name).toBe('No Config')
    expect(result.enabled).toBe(false)
    expect(result.baseUrl).toBe('')
    expect(result.authType).toBe(ConnectorAuthType.API_KEY)
  })
})
