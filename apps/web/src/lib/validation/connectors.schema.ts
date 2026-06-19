import { z } from 'zod'
import { ConnectorAuthType, ConnectorType, LlmMaxTokensParameter } from '@/enums'

const BLOCKED_HOSTNAME_SUFFIXES = ['.local', '.internal', '.localhost'] as const

const PRIVATE_IP_PATTERNS = [
  /^127\.\d{1,3}\.\d{1,3}\.\d{1,3}$/, // 127.x.x.x loopback
  /^0\.0\.0\.0$/, // unspecified
  /^10\.\d{1,3}\.\d{1,3}\.\d{1,3}$/, // Class A private
  /^172\.(1[6-9]|2\d|3[01])\.\d{1,3}\.\d{1,3}$/, // Class B private (172.16-31.x.x)
  /^192\.168\.\d{1,3}\.\d{1,3}$/, // Class C private
  /^169\.254\.\d{1,3}\.\d{1,3}$/, // link-local
] as const

const isPrivateUrl = (url: string): boolean => {
  let parsed: URL
  try {
    parsed = new URL(url)
  } catch {
    return false
  }

  const { hostname } = parsed
  const lowerHostname = hostname.toLowerCase()

  if (lowerHostname === 'localhost') {
    return true
  }

  if (lowerHostname === '::1' || lowerHostname === '[::1]') {
    return true
  }

  if (lowerHostname.startsWith('fe80:') || lowerHostname.startsWith('[fe80:')) {
    return true
  }

  for (const suffix of BLOCKED_HOSTNAME_SUFFIXES) {
    if (lowerHostname.endsWith(suffix)) {
      return true
    }
  }

  for (const pattern of PRIVATE_IP_PATTERNS) {
    if (pattern.test(lowerHostname)) {
      return true
    }
  }

  return false
}

const connectorBaseSchema = z.object({
  name: z.string(),
  enabled: z.boolean(),
  baseUrl: z.string(),
  authType: z.nativeEnum(ConnectorAuthType),
  apiKey: z.string(),
  username: z.string(),
  password: z.string(),
  token: z.string(),
  verifyTLS: z.boolean(),
  timeoutSeconds: z.number(),
  tags: z.string(),
  notes: z.string(),
  // Wazuh
  managerUrl: z.string(),
  indexerUrl: z.string(),
  indexerUsername: z.string(),
  indexerPassword: z.string(),
  tenant: z.string(),
  // Graylog + Velociraptor
  apiUrl: z.string(),
  streamId: z.string(),
  indexSetId: z.string(),
  // Logstash
  pipelineId: z.string(),
  // Velociraptor
  orgId: z.string(),
  clientCert: z.string(),
  clientKey: z.string(),
  // Grafana
  grafanaUrl: z.string(),
  folderId: z.string(),
  datasourceUid: z.string(),
  // InfluxDB
  org: z.string(),
  bucket: z.string(),
  // MISP
  mispUrl: z.string(),
  mispAuthKey: z.string(),
  // Shuffle
  webhookUrl: z.string(),
  workflowId: z.string(),
  shuffleApiKey: z.string(),
  // Bedrock
  modelId: z.string(),
  region: z.string(),
  accessKeyId: z.string(),
  secretAccessKey: z.string(),
  endpoint: z.string(),
  nlHuntingEnabled: z.boolean(),
  explainableAiEnabled: z.boolean(),
  auditLoggingEnabled: z.boolean(),
  // LLM APIs
  llmBaseUrl: z.string(),
  llmApiKey: z.string(),
  defaultModel: z.string(),
  organizationId: z.string(),
  llmTimeout: z.number(),
  maxTokensParameter: z.nativeEnum(LlmMaxTokensParameter),
  // OpenClaw Gateway
  openclawBaseUrl: z.string(),
  openclawApiKey: z.string(),
  openclawTimeout: z.number(),
})

export type ConnectorFormValues = z.infer<typeof connectorBaseSchema>

export function getConnectorSchema(type: ConnectorType) {
  return connectorBaseSchema.superRefine((data, ctx) => {
    if (!data.name) {
      ctx.addIssue({ code: 'custom', message: 'nameRequired', path: ['name'] })
    }

    const isAiOnlyConnector =
      type === ConnectorType.BEDROCK ||
      type === ConnectorType.LLM_APIS ||
      type === ConnectorType.OPENCLAW_GATEWAY

    if (
      !isAiOnlyConnector &&
      data.baseUrl &&
      !data.baseUrl.toLowerCase().startsWith('http://') &&
      !data.baseUrl.toLowerCase().startsWith('https://') &&
      !data.baseUrl.toLowerCase().startsWith('ws://') &&
      !data.baseUrl.toLowerCase().startsWith('wss://')
    ) {
      ctx.addIssue({ code: 'custom', message: 'urlFormat', path: ['baseUrl'] })
    }

    const isProduction = process.env['NEXT_PUBLIC_APP_ENV'] === 'production'
    if (isProduction && !isAiOnlyConnector && data.baseUrl && isPrivateUrl(data.baseUrl)) {
      ctx.addIssue({ code: 'custom', message: 'urlPrivateNetwork', path: ['baseUrl'] })
    }

    if (data.timeoutSeconds < 1) {
      ctx.addIssue({ code: 'custom', message: 'minTimeout', path: ['timeoutSeconds'] })
    }
    if (data.timeoutSeconds > 120) {
      ctx.addIssue({ code: 'custom', message: 'maxTimeout', path: ['timeoutSeconds'] })
    }

    const shouldValidateFields = isAiOnlyConnector || Boolean(data.baseUrl)

    if (shouldValidateFields) {
      if (!isAiOnlyConnector) {
        if (data.authType === ConnectorAuthType.API_KEY && !data.apiKey) {
          ctx.addIssue({ code: 'custom', message: 'apiKeyRequired', path: ['apiKey'] })
        }
        if (data.authType === ConnectorAuthType.BASIC && !data.username) {
          ctx.addIssue({ code: 'custom', message: 'usernameRequired', path: ['username'] })
        }
        if (data.authType === ConnectorAuthType.BASIC && !data.password) {
          ctx.addIssue({ code: 'custom', message: 'passwordRequired', path: ['password'] })
        }
        if (data.authType === ConnectorAuthType.TOKEN && !data.token) {
          ctx.addIssue({ code: 'custom', message: 'tokenRequired', path: ['token'] })
        }
      }

      if (type === ConnectorType.WAZUH && !data.indexerUrl) {
        ctx.addIssue({ code: 'custom', message: 'indexerUrlRequired', path: ['indexerUrl'] })
      }
      if (type === ConnectorType.GRAYLOG && !data.apiUrl) {
        ctx.addIssue({ code: 'custom', message: 'apiUrlRequired', path: ['apiUrl'] })
      }
      if (type === ConnectorType.VELOCIRAPTOR && !data.apiUrl) {
        ctx.addIssue({ code: 'custom', message: 'apiUrlRequired', path: ['apiUrl'] })
      }
      if (type === ConnectorType.GRAFANA && !data.grafanaUrl) {
        ctx.addIssue({ code: 'custom', message: 'grafanaUrlRequired', path: ['grafanaUrl'] })
      }
      if (type === ConnectorType.INFLUXDB) {
        if (!data.org) {
          ctx.addIssue({ code: 'custom', message: 'organizationRequired', path: ['org'] })
        }
        if (!data.bucket) {
          ctx.addIssue({ code: 'custom', message: 'bucketRequired', path: ['bucket'] })
        }
        if (!data.token) {
          ctx.addIssue({ code: 'custom', message: 'tokenRequired', path: ['token'] })
        }
      }
      if (type === ConnectorType.MISP) {
        if (!data.mispUrl) {
          ctx.addIssue({ code: 'custom', message: 'mispUrlRequired', path: ['mispUrl'] })
        }
        if (!data.mispAuthKey) {
          ctx.addIssue({ code: 'custom', message: 'authKeyRequired', path: ['mispAuthKey'] })
        }
      }
      if (type === ConnectorType.SHUFFLE) {
        if (!data.webhookUrl) {
          ctx.addIssue({ code: 'custom', message: 'webhookUrlRequired', path: ['webhookUrl'] })
        }
        if (!data.workflowId) {
          ctx.addIssue({ code: 'custom', message: 'workflowIdRequired', path: ['workflowId'] })
        }
      }
      if (type === ConnectorType.BEDROCK) {
        if (!data.modelId) {
          ctx.addIssue({ code: 'custom', message: 'modelRequired', path: ['modelId'] })
        }
        if (!data.region) {
          ctx.addIssue({ code: 'custom', message: 'regionRequired', path: ['region'] })
        }
      }
      if (type === ConnectorType.LLM_APIS) {
        if (!data.llmBaseUrl) {
          ctx.addIssue({ code: 'custom', message: 'llmBaseUrlRequired', path: ['llmBaseUrl'] })
        }
        if (!data.llmApiKey) {
          ctx.addIssue({ code: 'custom', message: 'llmApiKeyRequired', path: ['llmApiKey'] })
        }
        if (!data.defaultModel) {
          ctx.addIssue({ code: 'custom', message: 'defaultModelRequired', path: ['defaultModel'] })
        }
      }
      if (type === ConnectorType.OPENCLAW_GATEWAY) {
        if (!data.openclawBaseUrl) {
          ctx.addIssue({
            code: 'custom',
            message: 'openclawBaseUrlRequired',
            path: ['openclawBaseUrl'],
          })
        }
        if (!data.openclawApiKey) {
          ctx.addIssue({
            code: 'custom',
            message: 'openclawApiKeyRequired',
            path: ['openclawApiKey'],
          })
        }
      }
    }
  })
}
