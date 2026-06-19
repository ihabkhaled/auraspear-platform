import { forwardRef, Module } from '@nestjs/common'
import { AgentEventListenerService } from './agent-event-listener.service'
import { AgentGraphController } from './agent-graph.controller'
import { AgentGraphService } from './agent-graph.service'
import { AgentSchedulerService } from './agent-scheduler.service'
import { OrchestratorController } from './orchestrator.controller'
import { OrchestratorRepository } from './orchestrator.repository'
import { OrchestratorService } from './orchestrator.service'
import { ScheduleController } from './schedule/schedule.controller'
import { ScheduleRepository } from './schedule/schedule.repository'
import { ScheduleService } from './schedule/schedule.service'
import { PrismaModule } from '../../../prisma/prisma.module'
import { AgentConfigModule } from '../../agent-config/agent-config.module'
import { AppLogsModule } from '../../app-logs/app-logs.module'
import { JobsModule } from '../../jobs/jobs.module'
import { UsageBudgetModule } from '../usage-budget/usage-budget.module'

@Module({
  imports: [
    AgentConfigModule,
    forwardRef(() => JobsModule),
    UsageBudgetModule,
    AppLogsModule,
    PrismaModule,
  ],
  controllers: [OrchestratorController, ScheduleController, AgentGraphController],
  providers: [
    OrchestratorRepository,
    OrchestratorService,
    AgentEventListenerService,
    AgentSchedulerService,
    AgentGraphService,
    ScheduleRepository,
    ScheduleService,
  ],
  exports: [
    OrchestratorService,
    AgentEventListenerService,
    AgentSchedulerService,
    AgentGraphService,
    ScheduleService,
    ScheduleRepository,
  ],
})
export class OrchestratorModule {}
