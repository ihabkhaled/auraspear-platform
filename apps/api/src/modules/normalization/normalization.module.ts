import { forwardRef, Module } from '@nestjs/common'
import { AiNormalizationController } from './ai-normalization.controller'
import { AiNormalizationService } from './ai-normalization.service'
import { NormalizationController } from './normalization.controller'
import { NormalizationExecutor } from './normalization.executor'
import { NormalizationRepository } from './normalization.repository'
import { NormalizationService } from './normalization.service'
import { AiModule } from '../ai/ai.module'
import { AppLogsModule } from '../app-logs/app-logs.module'

@Module({
  imports: [AppLogsModule, forwardRef(() => AiModule)],
  controllers: [NormalizationController, AiNormalizationController],
  providers: [
    NormalizationRepository,
    NormalizationService,
    NormalizationExecutor,
    AiNormalizationService,
  ],
  exports: [NormalizationRepository, NormalizationService, NormalizationExecutor],
})
export class NormalizationModule {}
