import { forwardRef, Module } from '@nestjs/common'
import { AiEntityController } from './ai-entity.controller'
import { AiEntityService } from './ai-entity.service'
import { EntitiesController } from './entities.controller'
import { EntitiesRepository } from './entities.repository'
import { EntitiesService } from './entities.service'
import { EntityExtractionService } from './entity-extraction.service'
import { RiskScoringService } from './risk-scoring.service'
import { AiModule } from '../ai/ai.module'
import { AppLogsModule } from '../app-logs/app-logs.module'

@Module({
  imports: [AppLogsModule, forwardRef(() => AiModule)],
  controllers: [EntitiesController, AiEntityController],
  providers: [
    EntitiesRepository,
    EntitiesService,
    EntityExtractionService,
    RiskScoringService,
    AiEntityService,
  ],
  exports: [EntitiesService, EntitiesRepository, EntityExtractionService, RiskScoringService],
})
export class EntitiesModule {}
