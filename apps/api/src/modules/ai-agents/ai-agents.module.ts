import { forwardRef, Module } from '@nestjs/common'
import { AiAgentTaskHandler } from './ai-agent-task.handler'
import { AiAgentsController } from './ai-agents.controller'
import { AiAgentsRepository } from './ai-agents.repository'
import { AiAgentsService } from './ai-agents.service'
import { AiModule } from '../ai/ai.module'
import { AiWritebackModule } from '../ai/writeback/ai-writeback.module'
import { AppLogsModule } from '../app-logs/app-logs.module'
import { JobsModule } from '../jobs/jobs.module'

@Module({
  imports: [
    AppLogsModule,
    forwardRef(() => AiModule),
    forwardRef(() => JobsModule),
    AiWritebackModule,
  ],
  controllers: [AiAgentsController],
  providers: [AiAgentsRepository, AiAgentsService, AiAgentTaskHandler],
  exports: [AiAgentsService, AiAgentsRepository, AiAgentTaskHandler],
})
export class AiAgentsModule {}
