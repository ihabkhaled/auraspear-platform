import { Global, Inject, Logger, Module, type OnModuleDestroy } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import Redis from 'ioredis'
import {
  REDIS_CLIENT,
  REDIS_DEFAULT_CONNECT_TIMEOUT,
  REDIS_DEFAULT_MAX_RETRIES,
} from './redis.constants'

@Global()
@Module({
  providers: [
    {
      provide: REDIS_CLIENT,
      useFactory: (configService: ConfigService): Redis => {
        const factoryLogger = new Logger('RedisModule')
        const host = configService.get<string>('REDIS_HOST', 'localhost')
        const port = configService.get<number>('REDIS_PORT', 6379)
        const password = configService.get<string>('REDIS_PASSWORD', '')

        const client = new Redis({
          host,
          port,
          password: password || undefined,
          connectTimeout: REDIS_DEFAULT_CONNECT_TIMEOUT,
          maxRetriesPerRequest: REDIS_DEFAULT_MAX_RETRIES,
          retryStrategy: () => null,
        })

        client.on('connect', () => {
          factoryLogger.log(`Redis connected to ${host}:${port}`)
        })

        client.on('error', (error: Error) => {
          factoryLogger.warn(`Redis connection error: ${error.message}`)
        })

        return client
      },
      inject: [ConfigService],
    },
  ],
  exports: [REDIS_CLIENT],
})
export class RedisModule implements OnModuleDestroy {
  constructor(@Inject(REDIS_CLIENT) private readonly redis: Redis) {}

  async onModuleDestroy(): Promise<void> {
    try {
      await this.redis.quit()
    } catch {
      // Redis already disconnected
    }
  }
}
