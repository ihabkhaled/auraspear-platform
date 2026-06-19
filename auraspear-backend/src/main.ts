import { randomUUID } from 'node:crypto'
import type { INestApplication } from '@nestjs/common'
import { NestFactory } from '@nestjs/core'
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger'
import cookieParser from 'cookie-parser'
import * as express from 'express'
import helmet from 'helmet'
import { Logger } from 'nestjs-pino'
import { AppModule } from './app.module'
import { GlobalExceptionFilter } from './common/filters/http-exception.filter'
import type { Express, Request, Response } from 'express'

let cachedApp: INestApplication | null = null

async function createApp(): Promise<INestApplication> {
  if (cachedApp) {
    return cachedApp
  }

  const app = await NestFactory.create(AppModule, { bufferLogs: true })

  // Structured logging
  app.useLogger(app.get(Logger))

  // Trust proxy (Vercel, load balancers) — ensures correct client IP for rate limiting/logging
  const expressApp = app.getHttpAdapter().getInstance() as Express
  expressApp.set('trust proxy', 1)

  // Request body size limits
  app.use(express.json({ limit: '1mb' }))
  app.use(express.urlencoded({ extended: true, limit: '1mb' }))

  // X-Request-ID middleware
  app.use(
    (
      req: { headers: Record<string, string | undefined> },
      res: { setHeader: (name: string, value: string) => void },
      next: () => void
    ) => {
      const requestId = req.headers['x-request-id'] ?? randomUUID()
      req.headers['x-request-id'] = requestId
      res.setHeader('x-request-id', requestId)
      next()
    }
  )

  // Security headers
  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: ["'self'"],
          styleSrc: ["'self'"],
          imgSrc: ["'self'", 'data:'],
          connectSrc: ["'self'"],
          fontSrc: ["'self'"],
          objectSrc: ["'none'"],
          frameAncestors: ["'none'"],
        },
      },
      hsts: { maxAge: 31536000, includeSubDomains: true, preload: true },
      frameguard: { action: 'deny' },
      referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
    })
  )

  // Cache-Control — prevent caching of authenticated API responses
  app.use(
    (
      req: { headers: Record<string, string | undefined> },
      res: { setHeader: (name: string, value: string) => void },
      next: () => void
    ) => {
      const cookieHeader = req.headers.cookie ?? ''
      const hasAuthCookies =
        cookieHeader.includes('access_token=') || cookieHeader.includes('refresh_token=')

      if (req.headers.authorization || hasAuthCookies) {
        res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate')
        res.setHeader('Pragma', 'no-cache')
        res.setHeader('Expires', '0')
      } else {
        res.setHeader('Vary', 'Authorization, Cookie')
      }
      next()
    }
  )

  // Cookie parsing (required for HttpOnly auth cookies)
  app.use(cookieParser())

  // CORS — validate origins
  const corsOrigins = (process.env.CORS_ORIGINS ?? 'http://localhost:3000')
    .split(',')
    .map(o => o.trim())
    .filter(o => {
      try {
        const url = new URL(o)
        return url.protocol === 'http:' || url.protocol === 'https:'
      } catch {
        return false
      }
    })

  if (process.env.NODE_ENV === 'production' && corsOrigins.length === 0) {
    throw new Error('CORS_ORIGINS must be set with valid URLs in production')
  }

  app.enableCors({ origin: corsOrigins, credentials: true })

  // Global prefix (exclude root route)
  app.setGlobalPrefix('api/v1', { exclude: ['/'] })

  // Global exception filter
  app.useGlobalFilters(new GlobalExceptionFilter())

  // Swagger
  if (process.env.NODE_ENV === 'development') {
    const config = new DocumentBuilder()
      .setTitle('AuraSpear SOC BFF')
      .setDescription('Multi-tenant SIEM Backend-for-Frontend API')
      .setVersion('1.0')
      .addBearerAuth()
      .addTag('auth', 'Authentication')
      .addTag('tenants', 'Tenant management')
      .addTag('connectors', 'Connector CRUD & testing')
      .addTag('alerts', 'Alert search & investigation')
      .addTag('dashboards', 'Dashboard data')
      .addTag('hunts', 'Threat hunting')
      .addTag('cases', 'Case management')
      .addTag('intel', 'Threat intelligence')
      .addTag('ai', 'AI/Bedrock endpoints')
      .addTag('health', 'Health checks')
      .build()

    const document = SwaggerModule.createDocument(app, config)
    SwaggerModule.setup('api/docs', app, document)
  }

  await app.init()
  cachedApp = app
  return app
}

// Vercel serverless handler — export for Vercel to use
export default async function handler(req: Request, res: Response): Promise<void> {
  const app = await createApp()
  const expressApp = app.getHttpAdapter().getInstance() as Express
  expressApp(req, res)
}

// Local development — start the server with app.listen()
if (process.env.NODE_ENV !== 'production' || !process.env.VERCEL) {
  void (async () => {
    const app = await createApp()
    const port = process.env.PORT ?? 4000

    const server = app.getHttpServer()
    server.setTimeout(120_000)

    await app.listen(port)
  })()
}
