import { z } from 'zod'
import { LlmMaxTokensParameter } from '../connectors.enums'

// --- Config normalization helpers ---
// These ensure backward compatibility with existing encrypted configs that may
// use the old key names (verifyTLS, mispAuthKey, shuffleApiKey).

/**
 * Normalizes verifyTLS → verifyTls for backward compatibility.
 * If both are present, verifyTls takes precedence.
 */
function normalizeVerifyTls(config: Record<string, unknown>): Record<string, unknown> {
  if ('verifyTLS' in config) {
    const { verifyTLS, verifyTls: _old, ...rest } = config
    return { ...rest, verifyTls: verifyTLS }
  }
  return config
}

/**
 * Normalizes mispAuthKey → authKey for backward compatibility.
 * If both are present, authKey takes precedence.
 */
function normalizeMispAuthKey(config: Record<string, unknown>): Record<string, unknown> {
  if ('mispAuthKey' in config && !('authKey' in config)) {
    const { mispAuthKey, ...rest } = config
    return { ...rest, authKey: mispAuthKey }
  }
  if ('mispAuthKey' in config && 'authKey' in config) {
    const { mispAuthKey: _deprecated, ...rest } = config
    return rest
  }
  return config
}

/**
 * Normalizes shuffleApiKey → apiKey for backward compatibility.
 * If both are present, apiKey takes precedence.
 */
function normalizeShuffleApiKey(config: Record<string, unknown>): Record<string, unknown> {
  if ('shuffleApiKey' in config && !('apiKey' in config)) {
    const { shuffleApiKey, ...rest } = config
    return { ...rest, apiKey: shuffleApiKey }
  }
  if ('shuffleApiKey' in config && 'apiKey' in config) {
    const { shuffleApiKey: _deprecated, ...rest } = config
    return rest
  }
  return config
}

// --- Per-connector-type config schemas ---

export const WazuhConfigSchema = z
  .object({
    baseUrl: z.string().max(500).optional(),
    managerUrl: z.string().max(500).optional(),
    indexerUrl: z.string().max(500).optional(),
    username: z.string().max(255).optional(),
    password: z.string().max(255).optional(),
    apiKey: z.string().max(500).optional(),
    indexerUsername: z.string().max(255).optional(),
    indexerPassword: z.string().max(255).optional(),
    verifyTls: z.boolean().optional(),
    /** @deprecated Use verifyTls. Kept for backward compatibility with existing encrypted configs. */
    verifyTLS: z.boolean().optional(),
    tenant: z.string().max(255).optional(),
  })
  .passthrough()
  .transform(normalizeVerifyTls)

export const GraylogConfigSchema = z
  .object({
    baseUrl: z.string().max(500).optional(),
    username: z.string().max(255).optional(),
    password: z.string().max(255).optional(),
    apiKey: z.string().max(500).optional(),
    streamId: z.string().max(255).optional(),
    indexSetId: z.string().max(255).optional(),
    verifyTls: z.boolean().optional(),
    /** @deprecated Use verifyTls. Kept for backward compatibility with existing encrypted configs. */
    verifyTLS: z.boolean().optional(),
  })
  .passthrough()
  .transform(normalizeVerifyTls)

export const LogstashConfigSchema = z
  .object({
    baseUrl: z.string().max(500).optional(),
    username: z.string().max(255).optional(),
    password: z.string().max(255).optional(),
    apiKey: z.string().max(500).optional(),
    pipelineId: z.string().max(255).optional(),
    verifyTls: z.boolean().optional(),
    /** @deprecated Use verifyTls. Kept for backward compatibility with existing encrypted configs. */
    verifyTLS: z.boolean().optional(),
  })
  .passthrough()
  .transform(normalizeVerifyTls)

export const VelociraptorConfigSchema = z
  .object({
    baseUrl: z.string().max(500).optional(),
    apiUrl: z.string().max(500).optional(),
    username: z.string().max(255).optional(),
    password: z.string().max(255).optional(),
    orgId: z.string().max(255).optional(),
    clientCert: z.string().max(10000).optional(),
    clientKey: z.string().max(10000).optional(),
    caCert: z.string().max(10000).optional(),
    verifyTls: z.boolean().optional(),
    /** @deprecated Use verifyTls. Kept for backward compatibility with existing encrypted configs. */
    verifyTLS: z.boolean().optional(),
  })
  .passthrough()
  .transform(normalizeVerifyTls)

export const GrafanaConfigSchema = z
  .object({
    baseUrl: z.string().max(500).optional(),
    apiKey: z.string().max(500).optional(),
    token: z.string().max(500).optional(),
    grafanaUrl: z.string().max(500).optional(),
    folderId: z.string().max(255).optional(),
    datasourceUid: z.string().max(255).optional(),
    verifyTls: z.boolean().optional(),
    /** @deprecated Use verifyTls. Kept for backward compatibility with existing encrypted configs. */
    verifyTLS: z.boolean().optional(),
  })
  .passthrough()
  .transform(normalizeVerifyTls)

export const InfluxDBConfigSchema = z
  .object({
    baseUrl: z.string().max(500).optional(),
    token: z.string().max(500).optional(),
    org: z.string().max(255).optional(),
    bucket: z.string().max(255).optional(),
    verifyTls: z.boolean().optional(),
    /** @deprecated Use verifyTls. Kept for backward compatibility with existing encrypted configs. */
    verifyTLS: z.boolean().optional(),
  })
  .passthrough()
  .transform(normalizeVerifyTls)

export const MispConfigSchema = z
  .object({
    baseUrl: z.string().max(500).optional(),
    mispUrl: z.string().max(500).optional(),
    authKey: z.string().max(500).optional(),
    /** @deprecated Use authKey. Kept for backward compatibility with existing encrypted configs. */
    mispAuthKey: z.string().max(500).optional(),
    verifyTls: z.boolean().optional(),
    /** @deprecated Use verifyTls. Kept for backward compatibility with existing encrypted configs. */
    verifyTLS: z.boolean().optional(),
  })
  .passthrough()
  .transform(normalizeVerifyTls)
  .transform(normalizeMispAuthKey)

export const ShuffleConfigSchema = z
  .object({
    baseUrl: z.string().max(500).optional(),
    webhookUrl: z.string().max(500).optional(),
    workflowId: z.string().max(255).optional(),
    apiKey: z.string().max(500).optional(),
    /** @deprecated Use apiKey. Kept for backward compatibility with existing encrypted configs. */
    shuffleApiKey: z.string().max(500).optional(),
    verifyTls: z.boolean().optional(),
    /** @deprecated Use verifyTls. Kept for backward compatibility with existing encrypted configs. */
    verifyTLS: z.boolean().optional(),
  })
  .passthrough()
  .transform(normalizeVerifyTls)
  .transform(normalizeShuffleApiKey)

export const BedrockConfigSchema = z
  .object({
    region: z.string().max(50).optional(),
    accessKeyId: z.string().max(255).optional(),
    secretAccessKey: z.string().max(255).optional(),
    modelId: z.string().max(255).optional(),
    nlHuntingEnabled: z.boolean().optional(),
    explainableAiEnabled: z.boolean().optional(),
    auditLoggingEnabled: z.boolean().optional(),
  })
  .passthrough()

export const LlmApisConfigSchema = z
  .object({
    baseUrl: z.string().max(500),
    apiKey: z.string().max(500),
    defaultModel: z.string().max(255).optional(),
    organizationId: z.string().max(255).optional(),
    timeout: z.number().int().positive().optional(),
    maxTokensParameter: z
      .nativeEnum(LlmMaxTokensParameter)
      .optional()
      .default(LlmMaxTokensParameter.MAX_TOKENS),
  })
  .passthrough()

export const OpenClawGatewayConfigSchema = z
  .object({
    baseUrl: z.string().max(500),
    apiKey: z.string().max(500),
    timeout: z.number().int().positive().optional(),
  })
  .passthrough()

const connectorConfigSchemas = new Map<string, z.ZodType<Record<string, unknown>>>([
  ['wazuh', WazuhConfigSchema],
  ['graylog', GraylogConfigSchema],
  ['logstash', LogstashConfigSchema],
  ['velociraptor', VelociraptorConfigSchema],
  ['grafana', GrafanaConfigSchema],
  ['influxdb', InfluxDBConfigSchema],
  ['misp', MispConfigSchema],
  ['shuffle', ShuffleConfigSchema],
  ['bedrock', BedrockConfigSchema],
  ['llm_apis', LlmApisConfigSchema],
  ['openclaw_gateway', OpenClawGatewayConfigSchema],
])

/**
 * Validates a connector config against the type-specific schema.
 * Returns the parsed (validated) config, or throws a ZodError on invalid input.
 * If the type has no known schema, returns the config as-is.
 *
 * Note: Schema transforms automatically normalize deprecated keys:
 * - verifyTLS → verifyTls
 * - mispAuthKey → authKey (MISP)
 * - shuffleApiKey → apiKey (Shuffle)
 */
export function validateConnectorConfig(
  type: string,
  config: Record<string, unknown>
): Record<string, unknown> {
  const schema = connectorConfigSchemas.get(type)
  if (!schema) return config
  return schema.parse(config)
}

// --- Main DTO schemas ---

export const ConnectorTypeEnum = z.enum([
  'wazuh',
  'graylog',
  'logstash',
  'velociraptor',
  'grafana',
  'influxdb',
  'misp',
  'shuffle',
  'bedrock',
  'llm_apis',
  'openclaw_gateway',
])

export const CreateConnectorSchema = z.object({
  type: ConnectorTypeEnum,
  name: z.string().min(1).max(255),
  enabled: z.boolean().default(false),
  authType: z.enum(['basic', 'api_key', 'token', 'iam']).default('basic'),
  config: z
    .record(z.string().max(100), z.unknown())
    .refine(value => Object.keys(value).length <= 50, {
      message: 'Config must have at most 50 properties',
    }),
})

export type CreateConnectorDto = z.infer<typeof CreateConnectorSchema>

export const UpdateConnectorSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  enabled: z.boolean().optional(),
  authType: z.enum(['basic', 'api_key', 'token', 'iam']).optional(),
  config: z
    .record(z.string().max(100), z.unknown())
    .refine(value => Object.keys(value).length <= 50, {
      message: 'Config must have at most 50 properties',
    })
    .optional(),
})

export type UpdateConnectorDto = z.infer<typeof UpdateConnectorSchema>

export const TestConnectorSchema = z.object({
  type: ConnectorTypeEnum,
})

export type TestConnectorDto = z.infer<typeof TestConnectorSchema>
