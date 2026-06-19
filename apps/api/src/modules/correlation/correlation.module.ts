import { Module } from '@nestjs/common'
import { CorrelationController } from './correlation.controller'
import { CorrelationExecutor } from './correlation.executor'
import { CorrelationRepository } from './correlation.repository'
import { CorrelationService } from './correlation.service'
import { AppLogsModule } from '../app-logs/app-logs.module'

@Module({
  imports: [AppLogsModule],
  controllers: [CorrelationController],
  providers: [CorrelationRepository, CorrelationService, CorrelationExecutor],
  exports: [CorrelationRepository, CorrelationService, CorrelationExecutor],
})
export class CorrelationModule {}
