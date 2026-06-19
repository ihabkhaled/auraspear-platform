import { forwardRef, Module } from '@nestjs/common'
import { AiAlertTriageController } from './ai-alert-triage.controller'
import { AiAlertTriageService } from './ai-alert-triage.service'
import { AlertsController } from './alerts.controller'
import { AlertsRepository } from './alerts.repository'
import { AlertsService } from './alerts.service'
import { AiModule } from '../ai/ai.module'
import { AppLogsModule } from '../app-logs/app-logs.module'
import { ConnectorsModule } from '../connectors/connectors.module'
import { EntitiesModule } from '../entities/entities.module'

@Module({
  imports: [ConnectorsModule, AppLogsModule, forwardRef(() => AiModule), EntitiesModule],
  controllers: [AlertsController, AiAlertTriageController],
  providers: [AlertsRepository, AlertsService, AiAlertTriageService],
  exports: [AlertsService, AlertsRepository],
})
export class AlertsModule {}
