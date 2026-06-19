import { Module } from '@nestjs/common'
import { HealthController } from './health.controller'
import { HealthRepository } from './health.repository'
import { HealthService } from './health.service'
import { AppLogsModule } from '../app-logs/app-logs.module'
import { ConnectorsModule } from '../connectors/connectors.module'

@Module({
  imports: [ConnectorsModule, AppLogsModule],
  controllers: [HealthController],
  providers: [HealthRepository, HealthService],
  exports: [HealthService],
})
export class HealthModule {}
