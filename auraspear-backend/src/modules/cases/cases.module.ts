import { forwardRef, Module } from '@nestjs/common'
import { AiCaseCopilotController } from './ai-case-copilot.controller'
import { AiCaseCopilotService } from './ai-case-copilot.service'
import { CasesController } from './cases.controller'
import { CasesRepository } from './cases.repository'
import { CasesService } from './cases.service'
import { AiModule } from '../ai/ai.module'
import { AlertsModule } from '../alerts/alerts.module'
import { AppLogsModule } from '../app-logs/app-logs.module'
import { EntitiesModule } from '../entities/entities.module'
import { NotificationsModule } from '../notifications/notifications.module'

@Module({
  imports: [
    AppLogsModule,
    NotificationsModule,
    forwardRef(() => AiModule),
    EntitiesModule,
    AlertsModule,
  ],
  controllers: [CasesController, AiCaseCopilotController],
  providers: [CasesRepository, CasesService, AiCaseCopilotService],
  exports: [CasesService],
})
export class CasesModule {}
