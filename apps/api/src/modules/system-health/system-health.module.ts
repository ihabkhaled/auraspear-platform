import { Module } from '@nestjs/common'
import { SystemHealthController } from './system-health.controller'
import { SystemHealthRepository } from './system-health.repository'
import { SystemHealthService } from './system-health.service'
import { AppLogsModule } from '../app-logs/app-logs.module'

@Module({
  imports: [AppLogsModule],
  controllers: [SystemHealthController],
  providers: [SystemHealthRepository, SystemHealthService],
  exports: [SystemHealthService],
})
export class SystemHealthModule {}
