import { forwardRef, Module } from '@nestjs/common'
import { IncidentsController } from './incidents.controller'
import { IncidentsRepository } from './incidents.repository'
import { IncidentsService } from './incidents.service'
import { OrchestratorModule } from '../ai/orchestrator/orchestrator.module'
import { AppLogsModule } from '../app-logs/app-logs.module'

@Module({
  imports: [AppLogsModule, forwardRef(() => OrchestratorModule)],
  controllers: [IncidentsController],
  providers: [IncidentsRepository, IncidentsService],
  exports: [IncidentsService],
})
export class IncidentsModule {}
