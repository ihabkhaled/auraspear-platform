import { forwardRef, Module } from '@nestjs/common'
import { AiDetectionCopilotController } from './ai-detection-copilot.controller'
import { AiDetectionCopilotService } from './ai-detection-copilot.service'
import { DetectionRulesController } from './detection-rules.controller'
import { DetectionRulesExecutor } from './detection-rules.executor'
import { DetectionRulesRepository } from './detection-rules.repository'
import { DetectionRulesService } from './detection-rules.service'
import { RulesEngineController } from './rules-engine.controller'
import { AiModule } from '../ai/ai.module'
import { AppLogsModule } from '../app-logs/app-logs.module'

@Module({
  imports: [AppLogsModule, forwardRef(() => AiModule)],
  controllers: [DetectionRulesController, RulesEngineController, AiDetectionCopilotController],
  providers: [
    DetectionRulesRepository,
    DetectionRulesService,
    DetectionRulesExecutor,
    AiDetectionCopilotService,
  ],
  exports: [DetectionRulesRepository, DetectionRulesService, DetectionRulesExecutor],
})
export class DetectionRulesModule {}
