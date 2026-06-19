import { describe, test, expect, vi, beforeEach } from 'vitest'
import { ConnectorAuthType, ConnectorType, LlmMaxTokensParameter } from '@/enums'
import { getConnectorSchema } from '@/lib/validation/connectors.schema'

function makeValidData(overrides: Record<string, unknown> = {}) {
  return {
    name: 'Test Connector',
    enabled: true,
    baseUrl: 'https://example.com',
    authType: ConnectorAuthType.API_KEY,
    apiKey: 'my-api-key',
    username: '',
    password: '',
    token: '',
    verifyTLS: true,
    timeoutSeconds: 30,
    tags: '',
    notes: '',
    managerUrl: '',
    indexerUrl: '',
    indexerUsername: '',
    indexerPassword: '',
    tenant: '',
    apiUrl: '',
    streamId: '',
    indexSetId: '',
    pipelineId: '',
    orgId: '',
    clientCert: '',
    clientKey: '',
    grafanaUrl: '',
    folderId: '',
    datasourceUid: '',
    org: '',
    bucket: '',
    mispUrl: '',
    mispAuthKey: '',
    webhookUrl: '',
    workflowId: '',
    shuffleApiKey: '',
    modelId: '',
    region: '',
    accessKeyId: '',
    secretAccessKey: '',
    endpoint: '',
    nlHuntingEnabled: false,
    explainableAiEnabled: false,
    auditLoggingEnabled: false,
    // LLM APIs
    llmBaseUrl: '',
    llmApiKey: '',
    defaultModel: '',
    organizationId: '',
    llmTimeout: 30,
    maxTokensParameter: LlmMaxTokensParameter.MAX_TOKENS,
    // OpenClaw Gateway
    openclawBaseUrl: '',
    openclawApiKey: '',
    openclawTimeout: 30,
    ...overrides,
  }
}

describe('getConnectorSchema', () => {
  beforeEach(() => {
    vi.stubEnv('NEXT_PUBLIC_APP_ENV', 'development')
  })

  test('valid Wazuh connector passes', () => {
    const schema = getConnectorSchema(ConnectorType.WAZUH)
    const data = makeValidData({
      authType: ConnectorAuthType.BASIC,
      username: 'admin',
      password: 'secret',
      indexerUrl: 'https://indexer.example.com',
    })
    const result = schema.safeParse(data)
    expect(result.success).toBe(true)
  })

  test('name is required', () => {
    const schema = getConnectorSchema(ConnectorType.WAZUH)
    const data = makeValidData({ name: '' })
    const result = schema.safeParse(data)
    expect(result.success).toBe(false)
  })

  test('baseUrl must be http/https', () => {
    const schema = getConnectorSchema(ConnectorType.WAZUH)
    const data = makeValidData({ baseUrl: 'ftp://example.com' })
    const result = schema.safeParse(data)
    expect(result.success).toBe(false)
  })

  test('timeout must be >= 1', () => {
    const schema = getConnectorSchema(ConnectorType.WAZUH)
    const data = makeValidData({ timeoutSeconds: 0 })
    const result = schema.safeParse(data)
    expect(result.success).toBe(false)
  })

  test('timeout must be <= 120', () => {
    const schema = getConnectorSchema(ConnectorType.WAZUH)
    const data = makeValidData({ timeoutSeconds: 121 })
    const result = schema.safeParse(data)
    expect(result.success).toBe(false)
  })

  test('API_KEY auth requires apiKey', () => {
    const schema = getConnectorSchema(ConnectorType.WAZUH)
    const data = makeValidData({
      authType: ConnectorAuthType.API_KEY,
      apiKey: '',
    })
    const result = schema.safeParse(data)
    expect(result.success).toBe(false)
  })

  test('BASIC auth requires username', () => {
    const schema = getConnectorSchema(ConnectorType.WAZUH)
    const data = makeValidData({
      authType: ConnectorAuthType.BASIC,
      username: '',
      password: 'pass',
    })
    const result = schema.safeParse(data)
    expect(result.success).toBe(false)
  })

  test('BASIC auth requires password', () => {
    const schema = getConnectorSchema(ConnectorType.WAZUH)
    const data = makeValidData({
      authType: ConnectorAuthType.BASIC,
      username: 'admin',
      password: '',
    })
    const result = schema.safeParse(data)
    expect(result.success).toBe(false)
  })

  test('TOKEN auth requires token', () => {
    const schema = getConnectorSchema(ConnectorType.WAZUH)
    const data = makeValidData({
      authType: ConnectorAuthType.TOKEN,
      token: '',
    })
    const result = schema.safeParse(data)
    expect(result.success).toBe(false)
  })

  test('Wazuh requires indexerUrl', () => {
    const schema = getConnectorSchema(ConnectorType.WAZUH)
    const data = makeValidData({
      authType: ConnectorAuthType.BASIC,
      username: 'admin',
      password: 'pass',
      indexerUrl: '',
    })
    const result = schema.safeParse(data)
    expect(result.success).toBe(false)
  })

  test('Graylog requires apiUrl', () => {
    const schema = getConnectorSchema(ConnectorType.GRAYLOG)
    const data = makeValidData({ apiUrl: '' })
    const result = schema.safeParse(data)
    expect(result.success).toBe(false)
  })

  test('Grafana requires grafanaUrl', () => {
    const schema = getConnectorSchema(ConnectorType.GRAFANA)
    const data = makeValidData({ grafanaUrl: '' })
    const result = schema.safeParse(data)
    expect(result.success).toBe(false)
  })

  test('InfluxDB requires org, bucket, and token', () => {
    const schema = getConnectorSchema(ConnectorType.INFLUXDB)
    const data = makeValidData({ org: '', bucket: '', token: '' })
    const result = schema.safeParse(data)
    expect(result.success).toBe(false)
  })

  test('MISP requires mispUrl and mispAuthKey', () => {
    const schema = getConnectorSchema(ConnectorType.MISP)
    const data = makeValidData({ mispUrl: '', mispAuthKey: '' })
    const result = schema.safeParse(data)
    expect(result.success).toBe(false)
  })

  test('Shuffle requires webhookUrl and workflowId', () => {
    const schema = getConnectorSchema(ConnectorType.SHUFFLE)
    const data = makeValidData({ webhookUrl: '', workflowId: '' })
    const result = schema.safeParse(data)
    expect(result.success).toBe(false)
  })

  test('Bedrock requires modelId and region', () => {
    const schema = getConnectorSchema(ConnectorType.BEDROCK)
    const data = makeValidData({
      modelId: '',
      region: '',
      baseUrl: '',
    })
    const result = schema.safeParse(data)
    expect(result.success).toBe(false)
  })

  test('Bedrock does not require baseUrl', () => {
    const schema = getConnectorSchema(ConnectorType.BEDROCK)
    const data = makeValidData({
      baseUrl: '',
      modelId: 'anthropic.claude-3-sonnet',
      region: 'us-east-1',
    })
    const result = schema.safeParse(data)
    expect(result.success).toBe(true)
  })

  test('Velociraptor requires apiUrl', () => {
    const schema = getConnectorSchema(ConnectorType.VELOCIRAPTOR)
    const data = makeValidData({ apiUrl: '' })
    const result = schema.safeParse(data)
    expect(result.success).toBe(false)
  })

  test('private URL allowed in development', () => {
    vi.stubEnv('NEXT_PUBLIC_APP_ENV', 'development')
    const schema = getConnectorSchema(ConnectorType.WAZUH)
    const data = makeValidData({
      baseUrl: 'https://localhost:9200',
      authType: ConnectorAuthType.BASIC,
      username: 'admin',
      password: 'pass',
      indexerUrl: 'https://localhost:9200',
    })
    const result = schema.safeParse(data)
    expect(result.success).toBe(true)
  })

  test('private URL rejected in production', () => {
    vi.stubEnv('NEXT_PUBLIC_APP_ENV', 'production')
    const schema = getConnectorSchema(ConnectorType.WAZUH)
    const data = makeValidData({
      baseUrl: 'https://localhost:9200',
      authType: ConnectorAuthType.BASIC,
      username: 'admin',
      password: 'pass',
      indexerUrl: 'https://localhost:9200',
    })
    const result = schema.safeParse(data)
    expect(result.success).toBe(false)
  })

  test('valid timeout passes', () => {
    const schema = getConnectorSchema(ConnectorType.WAZUH)
    const data = makeValidData({
      timeoutSeconds: 60,
      authType: ConnectorAuthType.BASIC,
      username: 'admin',
      password: 'pass',
      indexerUrl: 'https://indexer.example.com',
    })
    const result = schema.safeParse(data)
    expect(result.success).toBe(true)
  })
})
