import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import {
  MAX_RETRIES,
  BASE_DELAY_MS,
  DEFAULT_CONNECTION_LIMIT,
  DEFAULT_POOL_TIMEOUT_SECONDS,
} from './prisma.constants'

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name)

  constructor(configService: ConfigService) {
    const databaseUrl = configService.get<string>('DATABASE_URL') ?? ''
    const separator = databaseUrl.includes('?') ? '&' : '?'
    const pooledUrl = `${databaseUrl}${separator}connection_limit=${DEFAULT_CONNECTION_LIMIT}&pool_timeout=${DEFAULT_POOL_TIMEOUT_SECONDS}`

    const adapter = new PrismaPg(pooledUrl)

    super({ adapter })

    this.logger.log(
      `Prisma connection pool configured: connection_limit=${DEFAULT_CONNECTION_LIMIT}, pool_timeout=${DEFAULT_POOL_TIMEOUT_SECONDS}s`
    )
  }

  async onModuleInit(): Promise<void> {
    await this.connectWithRetry(1)
  }

  async onModuleDestroy(): Promise<void> {
    await this.$disconnect()
  }

  private async connectWithRetry(attempt: number): Promise<void> {
    try {
      await this.$connect()
      this.logger.log('Database connection established')
    } catch (error: unknown) {
      if (attempt >= MAX_RETRIES) {
        this.logger.error(`Failed to connect after ${MAX_RETRIES} attempts`)
        throw error
      }
      const delay = BASE_DELAY_MS * attempt
      this.logger.warn(
        `Database connection attempt ${attempt}/${MAX_RETRIES} failed, retrying in ${delay}ms`
      )
      await new Promise<void>(resolve => {
        setTimeout(resolve, delay)
      })
      await this.connectWithRetry(attempt + 1)
    }
  }
}
