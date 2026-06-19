import { z } from 'zod'
import { LogLevel, NodeEnvironment } from '../common/enums'

export const envSchema = z
  .object({
    // Database
    DATABASE_URL: z.string().url(),

    // Redis
    REDIS_HOST: z.string().default('localhost'),
    REDIS_PORT: z.coerce.number().default(6379),
    REDIS_PASSWORD: z
      .string()
      .default('')
      .refine(value => process.env.NODE_ENV !== 'production' || value.length >= 16, {
        message: 'REDIS_PASSWORD must be at least 16 characters in production',
      }),

    // OIDC (optional — only needed when using OIDC auth)
    OIDC_ISSUER_URL: z.string().url().optional(),
    OIDC_AUDIENCE: z.string().optional(),
    OIDC_JWKS_URI: z.string().url().optional(),
    OIDC_CLIENT_ID: z.string().optional(),

    // JWT (for email/password auth) — should be 64-char hex (32 bytes)
    JWT_SECRET: z
      .string()
      .min(32)
      .refine(value => value.length >= 64 && /^[\da-f]+$/i.test(value), {
        message:
          "JWT_SECRET must be at least 64 hex characters. Generate: node -e \"console.log(require('crypto').randomBytes(32).toString('hex'))\"",
      })
      .refine(value => !/^0+$/.test(value), {
        message: 'JWT_SECRET must not be all zeros — generate a real secret',
      }),
    JWT_ACCESS_EXPIRY: z.string().default('15m'),
    JWT_REFRESH_EXPIRY: z.string().default('7d'),
    PLATFORM_ADMIN_PASSWORD: z
      .string()
      .min(12, { message: 'PLATFORM_ADMIN_PASSWORD must be at least 12 characters when set' })
      .optional(),

    // Rate limiting
    RATE_LIMIT_THROTTLE_TTL: z.coerce.number().default(60_000),
    RATE_LIMIT_THROTTLE_LIMIT: z.coerce.number().default(250),

    // Application
    PORT: z.coerce.number().default(4000),
    NODE_ENV: z.nativeEnum(NodeEnvironment).default(NodeEnvironment.PRODUCTION),
    LOG_LEVEL: z.nativeEnum(LogLevel).default(LogLevel.INFO),
    CORS_ORIGINS: z
      .string()
      .default('http://localhost:3000')
      .refine(
        value => {
          const origins = value
            .split(',')
            .map(o => o.trim())
            .filter(Boolean)
          return origins.every(o => {
            try {
              const url = new URL(o)
              return url.protocol === 'http:' || url.protocol === 'https:'
            } catch {
              return false
            }
          })
        },
        { message: 'CORS_ORIGINS must be a comma-separated list of valid http/https URLs' }
      )
      .refine(
        value => {
          if (process.env.NODE_ENV !== 'production') {
            return true
          }
          const origins = value
            .split(',')
            .map(o => o.trim())
            .filter(Boolean)
          return origins.length > 0
        },
        { message: 'CORS_ORIGINS must not be empty in production' }
      )
      .refine(
        value => {
          if (process.env.NODE_ENV !== 'production') {
            return true
          }
          const origins = value
            .split(',')
            .map(o => o.trim())
            .filter(Boolean)
          return origins.every(o => {
            try {
              const url = new URL(o)
              return url.hostname !== 'localhost' && url.hostname !== '127.0.0.1'
            } catch {
              return false
            }
          })
        },
        { message: 'CORS_ORIGINS must not include localhost origins in production' }
      ),

    // Encryption — must be exactly 64-char hex (32 bytes for AES-256)
    CONFIG_ENCRYPTION_KEY: z
      .string()
      .length(64)
      .regex(/^[\da-f]{64}$/i, {
        message:
          "CONFIG_ENCRYPTION_KEY must be exactly 64 hex characters (32 bytes). Generate: node -e \"console.log(require('crypto').randomBytes(32).toString('hex'))\"",
      })
      .refine(value => !/^0+$/.test(value), {
        message: 'CONFIG_ENCRYPTION_KEY must not be all zeros — generate a real key',
      }),

    // Connector defaults (optional — per-tenant config stored in DB)
    WAZUH_MANAGER_URL: z.string().url().optional(),
    WAZUH_INDEXER_URL: z.string().url().optional(),
    GRAYLOG_BASE_URL: z.string().url().optional(),
    LOGSTASH_BASE_URL: z.string().url().optional(),
    VELOCIRAPTOR_BASE_URL: z.string().url().optional(),
    GRAFANA_BASE_URL: z.string().url().optional(),
    INFLUXDB_BASE_URL: z.string().url().optional(),
    MISP_BASE_URL: z.string().url().optional(),
    SHUFFLE_BASE_URL: z.string().url().optional(),

    // AWS (for Bedrock AI module)
    AWS_REGION: z.string().default('us-east-1'),
    AWS_ACCESS_KEY_ID: z.string().optional(),
    AWS_SECRET_ACCESS_KEY: z.string().optional(),
    AWS_BEDROCK_MODEL_ID: z.string().default('global.anthropic.claude-sonnet-4-5-20250929-v1:0'),
  })
  .superRefine((data, ctx) => {
    // OIDC vars must be all-or-nothing — partial config causes runtime failures
    const oidcFields = [
      data.OIDC_ISSUER_URL,
      data.OIDC_AUDIENCE,
      data.OIDC_JWKS_URI,
      data.OIDC_CLIENT_ID,
    ]
    const oidcSet = oidcFields.filter(Boolean).length
    if (oidcSet > 0 && oidcSet < oidcFields.length) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message:
          'OIDC configuration is incomplete — set all of OIDC_ISSUER_URL, OIDC_AUDIENCE, OIDC_JWKS_URI, OIDC_CLIENT_ID or none of them',
        path: ['OIDC_ISSUER_URL'],
      })
    }
  })

export type EnvironmentConfig = z.infer<typeof envSchema>

export function validateEnvironment(config: Record<string, unknown>): EnvironmentConfig {
  const result = envSchema.safeParse(config)
  if (!result.success) {
    const formatted = result.error.issues
      .map(issue => `  ${issue.path.join('.')}: ${issue.message}`)
      .join('\n')
    throw new Error(`Environment validation failed:\n${formatted}`)
  }
  return result.data
}
